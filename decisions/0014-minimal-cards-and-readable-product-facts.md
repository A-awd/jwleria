# 0014 — Minimal listing cards and readable product facts

Status: accepted (owner display rule)

Date: 2026-10-29

The owner found category pages cluttered with group, reference, calibre, movement and similar detail. The owner directed this narrow display refinement and its release.

**Listing cards.** A card shows only:
- the product photograph, when a real approved one exists;
- that photograph's required credit, unchanged under the current licence policy (decision 0013);
- the brand;
- the product name.

Nothing else is rendered on a card: no collection, summary, reference, technical fragment, option count, preview badge or inquiry action. This applies to every listing through the shared card: home, catalogue and search, category, brand and related products. A missing photograph is never replaced by a fallback or generated image.

**Product pages.** A product page shows every truthful available fact as short labelled paragraphs in modest groups: identification, design and materials, technical details, and other details. A group appears only when it has a fact. Facts are not repeated between an introduction and the groups. The labels are the existing localized labels and the values are the published values; an untranslated value keeps its English text, marked as English. A fact is never invented, translated without review or shown as availability. The product-page inquiry action and its configuration are unchanged.

**Unchanged:** catalogue data, search, model grouping, variant controls and exact selected variants, image credits, routes, caching and indexing settings.

**Scope:**
- This is not the adoption of design direction A, B or C. The El Messiri display face (decision 0006) and the lighter palette (decision 0007) remain.
- The Photoroom cream-background sample is a private experiment only. It sets no global background, style or media policy, and no trial image is part of this release.
- The grouping of fact kinds and the reading of generated summaries are implementation rules under decision 0010, in `apps/storefront/src/components/product-facts.mjs`.
