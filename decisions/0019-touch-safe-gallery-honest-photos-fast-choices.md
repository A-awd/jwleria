# 0019 — A touch-safe gallery, honest photograph states and fast in-place variant choices

Status: accepted (owner direction, after a failed usability acceptance)

Date: 2026-11-01

## Context

The owner rejected the deployed product page on a phone:
- sizes and colours were "very heavy and difficult to navigate";
- the owner asked how the image would change when a client changes the colour;
- the image "hangs the site", because vertical scrolling worked only from the page edges.

The earlier visual acceptance (decision 0018) was not a touch-gesture or latency check. This decision covers mobile interaction and performance, not styling.

## Root cause of the trapped vertical swipe (from the code, reproduced live)

- **The gallery was a scroll container on both axes.** `.pdp__gallery` set `overflow-x: auto` with `scroll-snap-type: x mandatory`. By the CSS overflow rules, `overflow-y: visible` then computes to `auto`, so even a single photograph sat inside a nested vertical scroller. The photograph was 350 × 437.5 px at a 390 px width, and the gallery spanned the screen width.
- **A vertical scroll that started on the photograph went to that nested scroller.** The scroller could not move, so the page did not move either.
- **Codex reproduced it live at 390×844, with native scrolling in its in-app browser:**
  - The gallery computed `overflowX: auto`, `overflowY: auto` and `touchAction: auto`.
  - Scrolling from the page edge moved the document (scrollY 496 → 0).
  - Scrolling half a page down from the image centre left the document at 0 and `gallery.scrollTop` at 0.
- **A caution on that reading (Codex, at release).** The native scroll tool can return before the input settles, so an immediate read can show 0 where a settled read shows the moved position. The isolated earlier 0 is therefore not claimed as a sustained measurement. The owner's report and the root cause in the code stand. After the release, the settled public reading is document 422 with the gallery at 0, on one- and two-photograph pages.
- **The open option list was a second nested scroller.** It was capped at `min(26rem, 62svh)` with its own vertical scroll.
- **The home page's brand strip had the same `overflow-x`-only rule.**

## Decision

1. **Gallery.**
   - One photograph is a plain figure, with no scroll container and no carousel.
   - Several photographs form a carousel that scrolls only horizontally (`overflow-x: auto`, `overflow-y: hidden`, `overscroll-behavior-x: contain`, snapping on x).
   - No touch, wheel or scroll listener is added. Scrolling is the browser's own.
   - The brand strip also gets `overflow-y: hidden`.
2. **Option lists** flow with the page, with no capped height and no inner scroll.
3. **Photograph truth.**
   - A variant shows a photograph as itself only when it is its own approved photograph.
   - **Without one,** the gallery first says "No approved photograph of this reference yet" and names the selected reference. The model's representative photograph (decision 0017) follows, small and apart. Its caption gives its own reference, size and dial or colour (for example "m126234-0015 (36 mm · Bright black)"), and the photograph keeps its credit.
   - **During a choice,** the gallery says at once what is coming ("Loading the photograph of …", or "No approved photograph of … yet.") and dims the previous photograph, so it is never passed off as the new choice.
   - Nothing is generated or recoloured, and no grant is used for another reference.
   - Photograph coverage stays open. As exact photographs are approved, each variant shows its own automatically.
4. **Fast choices.**
   - **At once:** a choice shows its selected value, its reference and the gallery's state.
   - **The fetch:** only the variant's product block is fetched, from `/{locale}/products/{slug}/variant/`.
     - That route is an Astro partial of the same server render, without the layout or related pieces.
     - It is shared by the public page cache under the same freshness rules and is never indexed.
   - **The cache:**
     - Fetched blocks are cached in the page, bounded to 24.
     - A fetch starts on `pointerdown` (passive) or keyboard focus.
     - When the page is idle, at most 4 likely values of the first control are prefetched, and none in Save-Data mode.
   - **Ordering:** the latest choice wins.
   - **Images:** an identical, already decoded photograph is moved over rather than loaded again. A new first photograph is decoded before it appears, for at most 1.5 s.
   - **Position and focus:** the control that was used keeps its place on screen. Focus returns to it without scrolling.
   - **History:** Back and Forward show the variant of the restored address.
   - **Without JavaScript,** every choice is still a link to the real variant page.

## Measured (lab)

| Path of one choice | Before (live `13acacfb79d6`) | After (`/variant/`) |
|---|---|---|
| Fetched | the whole page: 31,378 B, or 7,469 B compressed | the product block: 19,641 B, or 3,691 B gzip (m126334-0028) |
| Local server, uncached, same database (3 requests) | full page 0.60–1.02 s | fragment 0.29–0.39 s |
| A revisited variant | another request | none (page cache) |
| Unchanged representative photograph | a new element, decoded again | the same element, moved over |
| Representative on a 390 px phone at 3× | 960w, 145,594 B | 640w at 3×, 78,538 B; 320w at 2×, 27,378 B |
| Feedback during the request | none; the previous photograph stays | at once |

## What can and cannot be proven here

- **Proven here:**
  - the stylesheet rules and listeners, by tests;
  - the swap controller: latest choice wins, shared requests, a bounded cache, failure fallback and the decode race, by tests;
  - the photograph-state logic, by tests;
  - the rendered HTML against live data on a local preview.
- **Codex's in-app browser** checks native scrolling at 390 px. That is not iPhone touch proof.
- **Owner-observed only:** a real iPhone swipe, in Safari, starting on the photograph.
