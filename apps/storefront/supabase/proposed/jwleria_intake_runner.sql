-- PROPOSED, NOT APPLIED. Applying it is a separate owner-approved production change; on approval it is
-- registered as a migration and moved to ../migrations with its registered version.
-- A least-privilege database identity for the scheduled n8n intake. The role can log in but has no
-- password here: the owner sets one privately and stores it only in n8n's credential store. It holds no
-- table privilege; it can only call the runner functions below, which keep per-origin locks, review
-- blocks and rate-limit deferrals in jwl_internal.intake_runs and ingest missing records only.
begin;
do $$ begin
  if not exists(select 1 from pg_roles where rolname='jwl_intake_runner') then
    create role jwl_intake_runner login noinherit nocreatedb nocreaterole noreplication connection limit 3;
  end if;
end $$;
grant usage on schema jwl_internal to jwl_intake_runner;

-- One origin at a time: a fresh database gate, a per-origin lock row, and fail-closed blocks.
-- A block is cleared only by a reviewer's later row: status 'success', error_code 'review_cleared'.
create function jwl_internal.runner_begin(p_source text, p_run_id text, p_lock_minutes integer default 120)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s jwl_internal.sources; latest jwl_internal.intake_runs; window_length interval; deferred_until timestamptz;
begin
  if p_run_id is null or p_run_id !~ '^[A-Za-z0-9:._-]{8,120}$' then raise exception 'Invalid run id';end if;
  window_length:=make_interval(mins=>greatest(30,least(coalesce(p_lock_minutes,120),720)));
  perform pg_advisory_xact_lock(hashtext('jwl-intake:'||coalesce(p_source,'')));
  select * into s from jwl_internal.sources where id=p_source;
  if s.id is null or not s.enabled or not s.acquisition_allowed or s.permission_reference is null then return jsonb_build_object('granted',false,'reason','registry_acquisition_not_allowed');end if;
  if p_source in ('cartier-official','van-cleef-and-arpels-official','celine-official','rimowa-official') then return jsonb_build_object('granted',false,'reason','recorded_source_stop');end if;
  -- A run that never finished inside its lock window is closed as abandoned, never resumed silently.
  update jwl_internal.intake_runs set status='error',finished_at=now(),error_code='abandoned_lock'
    where source_id=p_source and status='running' and started_at<now()-window_length;
  if exists(select 1 from jwl_internal.intake_runs where source_id=p_source and status='running') then return jsonb_build_object('granted',false,'reason','origin_queue_already_running');end if;
  if exists(select 1 from jwl_internal.intake_runs where run_id=p_run_id) then return jsonb_build_object('granted',false,'reason','run_id_reused');end if;
  select * into latest from jwl_internal.intake_runs where source_id=p_source order by started_at desc,run_id desc limit 1;
  if latest.status='blocked' then return jsonb_build_object('granted',false,'reason','source_review_required','blocked_run',latest.run_id,'blocked_reason',latest.error_code);end if;
  if latest.status='error' and latest.error_code like 'source_rate_limited%' then
    deferred_until:=greatest(latest.finished_at+interval '15 minutes',coalesce(nullif(split_part(latest.error_code,'@',2),'')::timestamptz,'-infinity'));
    if deferred_until>now() then return jsonb_build_object('granted',false,'reason','source_rate_limited','not_before',deferred_until);end if;
  end if;
  insert into jwl_internal.intake_runs(run_id,source_id,status) values(p_run_id,p_source,'running');
  return jsonb_build_object('granted',true,'run_id',p_run_id,'source_id',s.id,'origin',s.origin,'min_interval_seconds',s.min_interval_seconds);
end $$;

-- The complete identity list of the run's own source, only while its lock is held.
create function jwl_internal.runner_identities(p_run_id text)
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('source_id',r.source_id,'count',count(c.candidate_id),
    'ids',coalesce(jsonb_agg(lower(c.external_id) order by lower(c.external_id)) filter(where c.candidate_id is not null),'[]'::jsonb))
  from jwl_internal.intake_runs r left join jwl_internal.candidates c on c.source_id=r.source_id
  where r.run_id=p_run_id and r.status='running' group by r.source_id;
$$;

-- Missing-only ingestion for the run's own source; the existing RPC never overwrites a revision.
create function jwl_internal.runner_ingest_missing(p_run_id text, records jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r jwl_internal.intake_runs; receipt jsonb;
begin
  select * into r from jwl_internal.intake_runs where run_id=p_run_id for update;
  if r.run_id is null or r.status<>'running' then raise exception 'Ingestion needs this run''s live lock';end if;
  if jsonb_typeof(records) is distinct from 'array' or jsonb_array_length(records) not between 1 and 100 then raise exception 'Invalid intake batch';end if;
  if exists(select 1 from jsonb_array_elements(records) e where e->>'source_id' is distinct from r.source_id) then raise exception 'Records belong to another source';end if;
  receipt:=public.jwl_ingest_missing_batch(records);
  update jwl_internal.intake_runs set received=received+jsonb_array_length(records),changed=changed+jsonb_array_length(receipt->'inserted_ids') where run_id=p_run_id;
  return receipt;
end $$;

-- The persisted outcome: running → success, blocked (needs review) or error (rate limits carry their not-before).
create function jwl_internal.runner_finish(p_run_id text, p_status text, p_error_code text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r jwl_internal.intake_runs;
begin
  if p_status not in ('success','blocked','error') then raise exception 'Invalid run outcome';end if;
  if p_error_code is not null and (length(p_error_code)>200 or p_error_code !~ '^[a-z0-9_]{3,80}(@[0-9TZ:.+-]{10,40})?$') then raise exception 'Invalid run error code';end if;
  if p_status='blocked' and p_error_code is null then raise exception 'A block needs its reason';end if;
  update jwl_internal.intake_runs set status=p_status,finished_at=now(),error_code=p_error_code where run_id=p_run_id and status='running' returning * into r;
  if r.run_id is null then return jsonb_build_object('finished',false,'reason','run_not_running');end if;
  return jsonb_build_object('finished',true,'run_id',r.run_id,'source_id',r.source_id,'status',r.status,'received',r.received,'changed',r.changed,'error_code',r.error_code);
end $$;

-- Called by the schedule after each origin's sub-run, so a run that stopped early never stays locked.
create function jwl_internal.runner_close(p_run_id text)
returns jsonb language sql security definer set search_path='' as $$
  with closed as (update jwl_internal.intake_runs set status='error',finished_at=now(),error_code='incomplete_run'
    where run_id=p_run_id and status='running' returning run_id)
  select jsonb_build_object('closed',(select count(*) from closed));
$$;

-- Scheduled grant expiry: a lapsed grant is revoked (its approvals revoke and products withdraw through the
-- existing triggers) and its public files are listed for the approval-bound cleanup.
create function jwl_internal.runner_expire_grants()
returns jsonb language plpgsql security definer set search_path='' as $$
declare expired integer;
begin
  update jwl_internal.media_grants set revoked_at=now() where revoked_at is null and expires_at is not null and expires_at<=now();
  get diagnostics expired=row_count;
  return jsonb_build_object('expired_grants',expired,'revoked_files',public.jwl_revoked_media_files());
end $$;

revoke all on function jwl_internal.runner_begin(text,text,integer),jwl_internal.runner_identities(text),jwl_internal.runner_ingest_missing(text,jsonb),
  jwl_internal.runner_finish(text,text,text),jwl_internal.runner_close(text),jwl_internal.runner_expire_grants() from public,anon,authenticated;
grant execute on function jwl_internal.runner_begin(text,text,integer),jwl_internal.runner_identities(text),jwl_internal.runner_ingest_missing(text,jsonb),
  jwl_internal.runner_finish(text,text,text),jwl_internal.runner_close(text),jwl_internal.runner_expire_grants() to jwl_intake_runner,service_role;
commit;
