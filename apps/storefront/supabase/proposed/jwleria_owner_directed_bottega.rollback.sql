-- Rollback of jwleria_owner_directed_bottega.sql. It refuses while any approval or media evidence cites the Bottega
-- grant (revoke the grant first: the revocation cascade withdraws its products; then delete its public files), and when
-- the Bottega source row is not in the state the activation left. The base owner_directed_official migration and
-- Longchamp's rows are not touched.
begin;
lock table jwl_internal.media_grants, jwl_internal.media_assets, jwl_internal.publication_approvals, jwl_internal.sources in access exclusive mode;
do $do$ begin
  if exists(select 1 from jwl_internal.publication_approvals where media_reference='owner-directed-bottega-0025')
    or exists(select 1 from jwl_internal.media_assets where grant_reference='owner-directed-bottega-0025') then
    raise exception 'Bottega owner-directed media is in use; revoke and clean it up first';
  end if;
  if not exists(select 1 from jwl_internal.sources where id='bottega-veneta-official') then return;end if;
  update jwl_internal.sources set publication_allowed=false,permission_reference='Owner 2026-10-04 official private fact collection; exact product-path robots checked, official variant evidence retained privately. No brand media license or publication grant.'
    where id='bottega-veneta-official' and publication_allowed and permission_reference='Owner 2026-10-04 official private fact collection; exact product-path robots checked, official variant evidence retained privately. No brand media license or publication grant. Superseded for publication by decision 0025 (owner, 2026-11-09): official exact-product images are published under owner direction, with no brand contact; this is not a brand licence.';
  if not found then raise exception 'Bottega source row differs from the activated state';end if;
  delete from jwl_internal.media_grants where grant_reference='owner-directed-bottega-0025';
end $do$;
commit;
