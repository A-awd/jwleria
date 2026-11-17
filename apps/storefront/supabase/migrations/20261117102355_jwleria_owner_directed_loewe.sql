-- PROPOSED for application under decision 0026 (owner, 2026-11-17), on the decision 0025 route: the scoped activation of
-- LOEWE's official exact-product images under the owner's direction. There is no brand contact and no brand licence is
-- claimed. It is the same change as jwleria_owner_directed_bottega.sql, for LOEWE.
-- It needs jwleria_owner_directed_official.sql applied first, which provides the owner_directed_official grant kind and
-- its evidence rules (the file must be in the exact candidate's current gallery, on a recorded origin). Those rules are
-- unchanged here.
-- It changes only two rows: the LOEWE source row and its own grant row. LOEWE's gallery files are served from its own
-- origin, so the grant names that origin. The grant records background-only, non-generative extraction, because LOEWE's
-- originals are opaque photographs. Longchamp's and Bottega's rows are not touched.
-- Rollback: jwleria_owner_directed_loewe.rollback.sql.
begin;
lock table jwl_internal.media_grants, jwl_internal.sources in access exclusive mode;
do $do$ begin
  if not exists(select 1 from pg_constraint where conname='jwl_owner_directed_official_check' and conrelid='jwl_internal.media_grants'::regclass) then
    raise exception 'Apply jwleria_owner_directed_official.sql first';
  end if;
  -- A database without the LOEWE source row (an in-memory test replay) skips it; a row that differs refuses.
  if not exists(select 1 from jwl_internal.sources where id='loewe-official') then return;end if;
  update jwl_internal.sources set publication_allowed=true,permission_reference='Owner 2026-10-04 official private fact collection; exact product-path robots checked, official variant evidence retained privately. No brand media license or publication grant. Superseded for publication by decision 0025 (owner, 2026-11-09) and decision 0026 (owner, 2026-11-17): official exact-product images are published under owner direction, with no brand contact; this is not a brand licence.'
    where id='loewe-official' and enabled and not publication_allowed and permission_reference='Owner 2026-10-04 official private fact collection; exact product-path robots checked, official variant evidence retained privately. No brand media license or publication grant.';
  if not found then raise exception 'LOEWE source row differs from the reviewed state';end if;
  insert into jwl_internal.media_grants(grant_reference,kind,source_id,candidate_id,media_origins,website_publication,resize,webp_encode,background_removal,evidence_reference)
    values('owner-directed-loewe-0025','owner_directed_official','loewe-official',null,'["https://www.loewe.com"]'::jsonb,true,true,true,true,'decision-0025');
end $do$;
commit;
