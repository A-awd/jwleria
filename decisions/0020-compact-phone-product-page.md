# 0020 — A compact phone product page; colour photo switching only where every colour has its own photograph

Status: accepted (owner direction)

Date: 2026-11-01

## Context

The owner reported three problems on a phone:
- choosing a colour meant scrolling down, and then the photograph was off the screen;
- the photograph should be smaller, and close to the options;
- every datum should stay, but the page should be tidy and short.

The owner rejected a colour change that ends in "photograph unavailable" as a demonstration of photo switching. Multi-colour switching may only be demonstrated with a product whose every offered colour has its own approved, matching photograph.

## Layout (shared, every brand and category)

1. **Order on a phone:** the brand, name and reference; the photograph; the options right below it; one inquiry action; then the specifications, sizes and how to inquire as disclosures. Every datum is kept.
2. **The photograph** shows the whole product, contained and never cropped, in a frame sized by the screen: `clamp(13rem, 40svh, 26rem)` instead of a tall 4:5 column. From 60rem up, the two-column layout keeps its 4:5 gallery.
3. **Tighter controls:**
   - the title is smaller on a phone;
   - a list's summary is one line (name, current value, chevron);
   - option rows are 44 px;
   - values made only in other sizes collapse into one row until opened;
   - a missing photograph is a short note beside a small, labelled thumbnail.
4. **After a choice,** the photograph and the control that was used are brought on screen together when they fit, with one short scroll. Otherwise the page keeps its place.
5. **Unchanged:**
   - native scrolling from the photograph (decision 0019), with no nested scroller or sticky overlay;
   - the latest-choice, cache and history safeguards;
   - URLs, references, facts and credits.

## Colour photographs: what exists

**Live read** (read-only, 2026-11-01 15:00:41Z):
- 4,097 active products;
- 2 photographed variants, with 2 grants and 2 live approvals:
  - `m126234-0015` is the only photographed variant of its 56-variant Datejust family: one colourway (Bright black, Jubilee, 36 mm);
  - `m126200-0006` is a one-variant model with no colour options.

No model has two or more colourways with their own approved photographs, so no valid multi-colour example exists today.

**Bounded source check** under decision 0016 (Claude: two searches; Codex: 126234 and 124300):
- The only Commons files found for the photographed design are the published black-dial 126234 series.
- The only 126200 file is the published `-0006`.
- Nothing was found for 126334 or 124300.
- The refused EMore98 files stay closed.

No eligible same-design colour pair was identified. This is the blocker. The review and publication steps are not.

**Remaining dependency:** an eligible pair of the same design in two colours. It can come from:
- verified open-licence photographs under decision 0016 (Commons, a credible author stating the reference, visible details that match, at least 960 px);
- written permission from a rights holder;
- the owner's own photographs.

A pair that is found is carried through decision 0016 to publication. Until then, a colour change shows the selected variant's own photograph when it is approved. Otherwise it shows the short "no approved photograph" note with the labelled representative. It never shows another colour's photograph as the selected one.
