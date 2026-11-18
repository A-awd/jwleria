-- Rollback of jwleria_owner_directed_ap_jlc.sql. For each source it refuses while any approval or media evidence cites that
-- source's grant (revoke the grant first: the revocation cascade withdraws its products; then delete its public files), or
-- when the source row is not in the state the activation left. Nothing else is touched.
begin;
lock table jwl_internal.media_grants, jwl_internal.media_assets, jwl_internal.publication_approvals, jwl_internal.sources in access exclusive mode;
do $do$ begin
  if exists(select 1 from jwl_internal.publication_approvals where media_reference='owner-directed-audemars-piguet-0025')
    or exists(select 1 from jwl_internal.media_assets where grant_reference='owner-directed-audemars-piguet-0025') then
    raise exception 'Audemars Piguet owner-directed media is in use; revoke and clean it up first';
  end if;
  if exists(select 1 from jwl_internal.sources where id='audemars-piguet-official') then
    update jwl_internal.sources set publication_allowed=false,permission_reference='Owner instruction 2026-10-04 to collect official public product facts privately; robots assessment retained in private source inventory. No brand media license or public image grant.'
      where id='audemars-piguet-official' and publication_allowed and permission_reference='Owner instruction 2026-10-04 to collect official public product facts privately; robots assessment retained in private source inventory. No brand media license or public image grant. Superseded for publication by decision 0025 (owner, 2026-11-09), decision 0026 (owner, 2026-11-17) and decision 0027 (owner, 2026-11-18): official exact-product images are published under owner direction, with no brand contact; this is not a brand licence.';
    if not found then raise exception 'Audemars Piguet source row differs from the activated state';end if;
    delete from jwl_internal.media_grants where grant_reference='owner-directed-audemars-piguet-0025';
  end if;
  if exists(select 1 from jwl_internal.publication_approvals where media_reference='owner-directed-jaeger-lecoultre-0025')
    or exists(select 1 from jwl_internal.media_assets where grant_reference='owner-directed-jaeger-lecoultre-0025') then
    raise exception 'Jaeger-LeCoultre owner-directed media is in use; revoke and clean it up first';
  end if;
  if exists(select 1 from jwl_internal.sources where id='jaeger-lecoultre-official') then
    update jwl_internal.sources set publication_allowed=false,permission_reference='Owner instruction 2026-10-04 to collect official public product facts privately; robots assessment retained in private source inventory. No brand media license or public image grant.'
      where id='jaeger-lecoultre-official' and publication_allowed and permission_reference='Owner instruction 2026-10-04 to collect official public product facts privately; robots assessment retained in private source inventory. No brand media license or public image grant. Superseded for publication by decision 0025 (owner, 2026-11-09), decision 0026 (owner, 2026-11-17) and decision 0027 (owner, 2026-11-18): official exact-product images are published under owner direction, with no brand contact; this is not a brand licence.';
    if not found then raise exception 'Jaeger-LeCoultre source row differs from the activated state';end if;
    delete from jwl_internal.media_grants where grant_reference='owner-directed-jaeger-lecoultre-0025';
  end if;
end $do$;
commit;
