-- PROPOSED for application under decisions 0026 and 0027 (owner, 2026-11-17 and 2026-11-18), on the decision 0025 route:
-- the scoped activation of Audemars Piguet's and Jaeger-LeCoultre's official exact-product images under the owner's
-- direction. There is no brand contact and no brand licence is claimed. It is the same change as
-- jwleria_owner_directed_loewe.sql, for two sources whose media origins were reachable and permitted when read on
-- 2026-11-18 (Prada's was not reachable then and is not included).
-- It needs jwleria_owner_directed_official.sql applied first (the owner_directed_official grant kind and its evidence
-- rules: the file must be in the exact candidate's current gallery, on a recorded origin). Those rules are unchanged here.
-- It changes only four rows: each source row (only from its exact reviewed state) and its own grant row, which names only
-- the one origin that source's current galleries use. No other source or grant is touched; no recorded source stop is
-- lifted. Rollback: jwleria_owner_directed_ap_jlc.rollback.sql.
begin;
lock table jwl_internal.media_grants, jwl_internal.sources in access exclusive mode;
do $do$ begin
  if not exists(select 1 from pg_constraint where conname='jwl_owner_directed_official_check' and conrelid='jwl_internal.media_grants'::regclass) then
    raise exception 'Apply jwleria_owner_directed_official.sql first';
  end if;
  -- A database without a source row (an in-memory test replay) skips it; a row that differs refuses.
  -- Audemars Piguet: its gallery files are served from https://dynamicmedia.audemarspiguet.com.
  if exists(select 1 from jwl_internal.sources where id='audemars-piguet-official') then
    update jwl_internal.sources set publication_allowed=true,permission_reference='Owner instruction 2026-10-04 to collect official public product facts privately; robots assessment retained in private source inventory. No brand media license or public image grant. Superseded for publication by decision 0025 (owner, 2026-11-09), decision 0026 (owner, 2026-11-17) and decision 0027 (owner, 2026-11-18): official exact-product images are published under owner direction, with no brand contact; this is not a brand licence.'
      where id='audemars-piguet-official' and enabled and not publication_allowed and permission_reference='Owner instruction 2026-10-04 to collect official public product facts privately; robots assessment retained in private source inventory. No brand media license or public image grant.';
    if not found then raise exception 'Audemars Piguet source row differs from the reviewed state';end if;
    insert into jwl_internal.media_grants(grant_reference,kind,source_id,candidate_id,media_origins,website_publication,resize,webp_encode,background_removal,evidence_reference)
      values('owner-directed-audemars-piguet-0025','owner_directed_official','audemars-piguet-official',null,'["https://dynamicmedia.audemarspiguet.com"]'::jsonb,true,true,true,true,'decision-0025');
  end if;
  -- Jaeger-LeCoultre: its gallery files are served from https://img.jaeger-lecoultre.com.
  if exists(select 1 from jwl_internal.sources where id='jaeger-lecoultre-official') then
    update jwl_internal.sources set publication_allowed=true,permission_reference='Owner instruction 2026-10-04 to collect official public product facts privately; robots assessment retained in private source inventory. No brand media license or public image grant. Superseded for publication by decision 0025 (owner, 2026-11-09), decision 0026 (owner, 2026-11-17) and decision 0027 (owner, 2026-11-18): official exact-product images are published under owner direction, with no brand contact; this is not a brand licence.'
      where id='jaeger-lecoultre-official' and enabled and not publication_allowed and permission_reference='Owner instruction 2026-10-04 to collect official public product facts privately; robots assessment retained in private source inventory. No brand media license or public image grant.';
    if not found then raise exception 'Jaeger-LeCoultre source row differs from the reviewed state';end if;
    insert into jwl_internal.media_grants(grant_reference,kind,source_id,candidate_id,media_origins,website_publication,resize,webp_encode,background_removal,evidence_reference)
      values('owner-directed-jaeger-lecoultre-0025','owner_directed_official','jaeger-lecoultre-official',null,'["https://img.jaeger-lecoultre.com"]'::jsonb,true,true,true,true,'decision-0025');
  end if;
end $do$;
commit;
