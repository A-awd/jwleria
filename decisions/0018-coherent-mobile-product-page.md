# 0018 — A coherent mobile product page: the size first, other options as current-value lists

Status: accepted (owner direction, after a failed phone acceptance)

Date: 2026-11-01

## Context

The owner sent a phone screenshot of the live Datejust 41 mm page and rejected it as scattered:
- after the size chips came a ragged pile of 15 dial pills of unequal widths and heights;
- most dials carried a "changes case diameter to 31 / 36 mm" note, because choosing them switched the size;
- the sticky inquiry bar added an abrupt divider.

The owner asked for a world-class, smooth and refined mobile product page, as one coherent design rather than a polish of the chip cloud, for every brand and category. This supersedes photo sourcing as the immediate priority.

The size-family data (decision 0017) is valid and unchanged. This is a presentation decision only.

## What visitors see

1. **Order.**
   - The product leads: its image, then the brand, the model name and the reference.
   - The options follow, then one inquiry action.
   - The details come last, as labelled disclosures: specifications, sizes of this model, and how to inquire.
   - Specifications are open by default only when the page has no photograph.
2. **Size.** The size is one row of equal segments. When the sizes are too many or too long for one row at phone width, it becomes a list.
3. **Other options** (dial, bracelet, colour, material and any other).
   - A few short values are shown as equal segments.
   - Otherwise the option shows its current value. Tapping it opens a list of only the values made at the selected size.
   - Each row is uniform, the selected row is checked and marked as current, and every target is at least 44 px.
   - No colour swatches are invented, and names are not truncated.
4. **Other sizes.**
   - Values made only in other sizes appear apart, under one heading ("In other sizes"), each with its sizes as explicit links.
   - A choice never changes the size unless it names the size. Every real combination stays reachable.
5. **Coupled changes.**
   - A choice that needs another option to change moves to the real variant at the same size.
   - Afterwards, one notice names the option that changed.
   - No value carries a note of its own.
6. **Changing the size.** It keeps the current dial or colour where that exists at the new size. Otherwise the resulting value is shown in its control and named in the notice.
7. **Sizes table.** The table stays compact, inside its disclosure, and no longer carries per-row change notes.
8. **Inquiry action.** It is placed in the page flow, with no sticky bar or hard divider, and its confirmation line appears once.
9. **Unchanged:**
   - URLs, the back button and canonical links;
   - the exact reference, facts and photo credits;
   - the representative-photo caption (decision 0017);
   - the inquiry-only copy (decision 0005) and the deferred contact configuration;
   - every model, variant, grant, approval and asset.
10. **Identity.** The palette (decision 0007), El Messiri and Noto Sans Arabic (decision 0006) and the Latin typography are kept. Directions A, B and C remain unselected.

## Implementation rules (Claude, technical delivery)

- **Pure rules.** `configurator()` and `controlLayout()` in `apps/storefront/src/components/variant-selection.mjs` decide what is offered and how. The page only renders them.
- **Segment widths.** One segment holds at most 20, 13, 10 or 7 characters when a row has 2, 3, 4 or 5 segments. Other options use segments only for up to 3 values, and only when none is made in another size alone.
- **Lists.**
  - They are native disclosures, so they work without JavaScript, by keyboard and with a screen reader.
  - They share one exclusive group, so only one is open at a time.
  - Escape closes the open list.
  - A long list scrolls inside a panel of at most `min(26rem, 62svh)`.
- **With JavaScript.**
  - The chosen variant's block replaces the current one in place.
  - Focus returns to the control that was used.
  - Opened or closed details sections keep their state.
  - The coupled-change notice is shown once and announced with the reference.

## Effect on earlier records

- Decision 0014: product facts remain short labelled paragraphs, now inside the Specifications disclosure.
- Decision 0017 and the models contract: the per-value and per-size "changes …" notes are withdrawn. A choice resolves to the real variant, and one notice names a coupled change.
- The storefront contract's selection bullet is amended accordingly.
