-- PROPOSED rollback of jwleria_product_models.sql. Drops only the objects that proposal creates; the
-- catalog, candidates, publication functions and every existing grant stay exactly as they were.
begin;
drop function if exists public.jwl_brand_models_page(text,integer,integer);
drop function if exists public.jwl_product_model(text);
drop function if exists public.jwl_catalog_models_search(text);
drop view if exists public.jwl_catalog_models;
drop trigger if exists jwl_variant_revision_unmap on jwl_internal.candidates;
drop function if exists jwl_internal.unmap_changed_variant();
drop function if exists jwl_internal.apply_product_variants();
drop function if exists jwl_internal.derive_product_variants();
drop function if exists jwl_internal.arabic_measure(text);
drop table if exists jwl_internal.variant_evidence;
drop table if exists jwl_internal.term_translations;
drop table if exists public.jwl_product_variants;
commit;
