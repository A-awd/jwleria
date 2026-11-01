# 0017 — Sizes of one genuine design are variants of one model

Status: accepted (owner direction)

Date: 2026-11-01

## Direction

The owner directed that, across all brands and categories, the sizes of the same genuine product be variants of one listing card and one product page, not separate products.
- Case sizes, bag sizes and jewellery model sizes are included.
- The page shows the size options and a compact table of the sizes that exist, with their references and the facts that differ by size.
- Existing references, approvals, images and URLs are kept.
- Sizes, variants and combinations are never invented, and designs, collections and brands are never mixed.
- Where the evidence for a size or a design is missing, the rows stay ungrouped and are reported.

## Rules

The following are implementation rules under decision 0010, not separate owner policies.

**What can join a size family.** A family joins whole existing models, never parts of one, and only when all of these hold:
- the source itself states each size;
- the design identity matches exactly;
- every size has exactly one model;
- the English and Arabic names agree once the size is removed;
- each variant remains a distinct real combination of its options.

**Source rules.** Each source has its own rule, built from captured evidence only:
- **Rolex:** the case diameter, plus the case type, case material and bezel that the source description of each exact reference states, within one collection. Movement and power reserve may differ with size.
- **LOEWE:** a leading size word in the official name (Nano, Mini, Small, Medium, Large, XL), with the rest of the name and the material equal.
- **Longchamp:** the size letter between the line and the item type (XS to XXL), with the line, item type and material equal.
- **Prada:** a size word inside a named line ("Prada Galleria small …"). Because Prada records no colour names, the reference's material and colour codes must also match.
- **Cartier and Van Cleef & Arpels:** the maker's "… model" (small, classic, medium, large …) in both names, with the rest of the name and the source description's materials equal.
- **Van Cleef & Arpels watches:** "…, NN mm".
- **Other sources:** none. Bottega Veneta's "Maxi" is a design name, and Jaeger-LeCoultre's "Small Seconds" is a complication.

**Size kinds.** Each kind keeps the source's own units:
- `case_size`: a watch case diameter;
- `bag_size`, or `size` outside handbags: a named size word or letter as the source writes it, with the dimensions shown in the table;
- `model_size`: the maker's model size, which is not a fit size.

No source records ring, bracelet or shoe fit sizes as separate rows, so there are none to group.

**Names.** The model name carries no size, in either language.

**Ungrouped rows.** Each row that states a size but is not grouped keeps its earlier mapping. Its private evidence records why:
- the base model is incomplete;
- only one size exists;
- several models share one size;
- the names do not match;
- the options are unresolved.

## Photographs

- **Cards.** A model's card shows its first photographed variant when one exists, so a card image is always the exact photograph of the variant the card links to.
- **Variant pages without a photograph.** A page whose variant has no photograph of its own may show the model's representative photograph. It comes first from the same size, otherwise from the model. It is captioned with that photograph's own reference and size, and the caption says that it is not a photograph of the selected reference. It keeps its own credit.
- **Approvals.** No approval, grant or evidence is added to another reference, and no image is regenerated.

## Reads

`jwl_product_model_v2` returns:
- the addressed variant in full;
- every variant of its model as a light link (bounded at 2,000, with a visible note if a model were ever larger);
- the per-size table;
- the representative photograph.

The bounded `jwl_product_model` stays for the earlier Worker. The derivation runs only in the offline mapping rebuild, never per request.

## Rollback

`apps/storefront/supabase/proposed/jwleria_size_families.rollback.sql` restores the base derivation, the earlier card rule and the earlier mapping exactly.
