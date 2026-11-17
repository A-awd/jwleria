-- PROPOSED, NOT APPROVED (decision 0025, owner 2026-11-09): the scoped activation of Bottega Veneta's official
-- exact-product images under the owner's direction, with no brand contact and no brand licence claimed. No Bottega
-- production activation is approved; this file is prepared and tested only.
-- It needs jwleria_owner_directed_official.sql applied first (the owner_directed_official grant kind and its evidence
-- rules, unchanged here: the file must be in the exact candidate's current gallery, on a recorded origin) and changes
-- only two rows: the Bottega source row and its own grant row. The grant names the official gallery file host and
-- records background-only, non-generative extraction, because Bottega's originals are opaque photographs. Longchamp's
-- source and grant are not touched. Rollback: jwleria_owner_directed_bottega.rollback.sql.
begin;
lock table jwl_internal.media_grants, jwl_internal.sources in access exclusive mode;
do $do$ begin
  if not exists(select 1 from pg_constraint where conname='jwl_owner_directed_official_check' and conrelid='jwl_internal.media_grants'::regclass) then
    raise exception 'Apply jwleria_owner_directed_official.sql first';
  end if;
  -- A database without the Bottega source row (an in-memory test replay) skips it; a row that differs refuses.
  if not exists(select 1 from jwl_internal.sources where id='bottega-veneta-official') then return;end if;
  update jwl_internal.sources set publication_allowed=true,permission_reference='Owner 2026-10-04 official private fact collection; exact product-path robots checked, official variant evidence retained privately. No brand media license or publication grant. Superseded for publication by decision 0025 (owner, 2026-11-09): official exact-product images are published under owner direction, with no brand contact; this is not a brand licence.'
    where id='bottega-veneta-official' and enabled and not publication_allowed and permission_reference='Owner 2026-10-04 official private fact collection; exact product-path robots checked, official variant evidence retained privately. No brand media license or publication grant.';
  if not found then raise exception 'Bottega source row differs from the reviewed state';end if;
  insert into jwl_internal.media_grants(grant_reference,kind,source_id,candidate_id,media_origins,website_publication,resize,webp_encode,background_removal,evidence_reference)
    values('owner-directed-bottega-0025','owner_directed_official','bottega-veneta-official',null,'["https://bottega-veneta.dam.kering.com"]'::jsonb,true,true,true,true,'decision-0025');
end $do$;
commit;
