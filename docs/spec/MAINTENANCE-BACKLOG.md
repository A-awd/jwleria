# Maintenance backlog

These items are not blocked on the owner and are not part of the current release. Each one has a trigger: the event that makes it worth doing now. Pick one up when its trigger fires and its dependency is met, and close it only against its acceptance test. Owner decisions belong in [DECISION-APPROVAL-LEDGER.md](DECISION-APPROVAL-LEDGER.md), not here.

| Item | Trigger | Benefit | Owner | Dependency | Acceptance |
|---|---|---|---|---|---|
| 404 page metadata: add a `noindex` prop to `BaseLayout`, pass it from `404.astro`, and skip the canonical and alternates there (copy audit M1) | before `PUBLIC_RELEASE=live` | avoids a soft-404 that points to the home page | Claude | none | a live-mode build's 404 has `noindex` and no canonical or `hreflang` |
| Root redirect page: drop the relative canonical or make it absolute (copy audit M2) | before `PUBLIC_RELEASE=live` | no conflicting `noindex` and canonical signals | Claude | none | `/` has `noindex` and no relative canonical |
| Category meta description: use the result count instead of repeating the lead (copy audit M3) | next metadata pass | a distinct description per category | Claude | none | category pages render `name — count` |
| Brand-strip pause button: either a fixed label with `aria-pressed`, or a label swap without it (copy audit S1) | next accessibility pass, or the designer's strip work | no contradictory screen-reader announcement | Claude, or the designer stream | design ownership of the strip | screen reader announces one consistent state |
| Brand strip: allow touch scrolling while paused (copy audit S2) | the same pass | phone users can swipe the paused strip | Claude, or the designer stream | as above | paused strip scrolls on a touch emulator at 390 px |
| Brand strip: a visible cue that more names exist under reduced motion (copy audit S3) | the same pass | mouse users see that the list scrolls | designer stream | design choice | a cue is visible under `prefers-reduced-motion` |
| Product photos without `image_variants` keep `cover` (probe limitation) | the first live product with images but no responsive manifest | whole-photo framing for every product photo | Claude | a marker attribute in `productMedia` | such a product shows the whole photo at 360 px |
| Desktop gallery framing at 60rem and up (not measured by the probe) | before the first photo release | no crop on the desktop gallery's 1:1 second figure | Claude | a photo release candidate | probe at 1280 px shows the whole photo |
| English card reference breaks at its hyphen (for example `JWL-PROBE-001`) | next card styling pass | references stay readable | designer stream | none | a hyphenated reference stays on one line at 360 px |
| Inactive intake runner: fix the recorded verified defects | before any schedule activation | a safe scheduled intake | Claude | none | the review journal's defect list is closed with tests |
| Reviewed sitemaps for further origins | an eligible origin is chosen | more exact-reference facts | Claude | a source review; never a refused origin | a bounded run acquires records with 0 refusals bypassed |
| Re-check live cache labels (`HIT`, `STALE`) | after the next release | evidence for decision 0009's window | operator | traffic to one colo | `HIT` and `STALE` recorded with `Age` and colo |
| Retire the dead `DIRECTORY_SUMMARY` in `fixtures.ts`, or reuse it | next fixtures change | less dead copy | Claude | none | there is one source for the directory brand summary |
| Older Lovable app (`src/`) still holds concierge and personal-assistance strings | if that app is ever served again | consistent positioning | owner (scope), then Claude | a decision on retiring the old app | the strings are removed, or the app is retired |
