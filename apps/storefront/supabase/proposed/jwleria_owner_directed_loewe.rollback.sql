-- Rollback of jwleria_owner_directed_loewe.sql. It refuses in two cases:
-- - while any approval or media evidence cites the LOEWE grant. Revoke the grant first: the revocation cascade withdraws
--   its products. Then delete its public files.
-- - when the LOEWE source row is not in the state the activation left.
-- The base owner_directed_official migration and the Longchamp and Bottega rows are not touched.
begin;
lock table jwl_internal.media_grants, jwl_internal.media_assets, jwl_internal.publication_approvals, jwl_internal.sources in access exclusive mode;
do $do$ begin
  if exists(select 1 from jwl_internal.publication_approvals where media_reference='owner-directed-loewe-0025')
    or exists(select 1 from jwl_internal.media_assets where grant_reference='owner-directed-loewe-0025') then
    raise exception 'LOEWE owner-directed media is in use; revoke and clean it up first';
  end if;
  if not exists(select 1 from jwl_internal.sources where id='loewe-official') then return;end if;
  update jwl_internal.sources set publication_allowed=false,permission_reference='Owner 2026-10-04 official private fact collection; exact product-path robots checked, official variant evidence retained privately. No brand media license or publication grant.'
    where id='loewe-official' and publication_allowed and permission_reference='Owner 2026-10-04 official private fact collection; exact product-path robots checked, official variant evidence retained privately. No brand media license or publication grant. Superseded for publication by decision 0025 (owner, 2026-11-09) and decision 0026 (owner, 2026-11-17): official exact-product images are published under owner direction, with no brand contact; this is not a brand licence.';
  if not found then raise exception 'LOEWE source row differs from the activated state';end if;
  delete from jwl_internal.media_grants where grant_reference='owner-directed-loewe-0025';
end $do$;
commit;
