# Decision and approval ledger

This ledger classifies every gate on the website milestone, so that only genuine owner decisions reach the owner. Each gate gets one class:

| Class | Meaning | Who clears it |
|---|---|---|
| existing authorization | already granted in a recorded decision or approval; do not ask again | nobody, just apply it |
| implementation choice | a technical choice owned by Claude under decision 0010; recorded, not approved | Claude |
| evidence obtainable | can be settled by a read, a test or a measurement | Claude or the operator |
| platform interaction | needs a person to answer a dialog or run an authenticated tool | owner or operator, in an interactive session |
| genuine owner decision | changes policy, scope or rights; only the owner can decide | owner |

## The open-licence migration: three owner lines, not two

Earlier records (`STATE.md`, 2026-10-27) asked for the open-licence migration's approval "as two lines": the grant kind and the source-flag exemption. Decision 0013 also requires the identity route to be stated "as its own line" of the same approval request. The approval request therefore has **three** distinct lines, and each one changes a different earlier rule:

| Line | Exact effect | Rule it changes | Evidence | Class |
|---|---|---|---|---|
| (a) The `open_license` grant kind, for m126234-0015 only | Adds a grant kind for up to 20 Wikimedia Commons files by one creator under one allowlisted licence (CC0 1.0, CC BY 4.0/3.0/2.0, CC BY-SA 4.0/3.0/2.0; never NC or ND), for one exact candidate, citing exactly `decisions/0013-open-licence-exact-product-photos.md`. Every image must carry the exact credit derived from the grant and its file. | Decision 0011's rejection of open licences, narrowed to this reference | Proposed SQL with rollback and PGlite tests; licence review of the front photograph (CC BY 2.0) | genuine owner decision |
| (b) The source-flag exemption lane | A live, verified open-licence approval of a product that is already public as facts at the same revision may publish its images without the source's `publication_allowed`, and that flag alone does not withdraw it. The call may change only images and media state; every displayed fact and the search text must equal the public row. | Decision 0011: the source's publication flag for media stays a separate owner decision | PGlite lane tests; 0 media-lane rows exist for Rolex, and the 1,464 other Rolex rows are facts only | genuine owner decision |
| (c) The creator-stated-reference identity route | A file may pass when four visual checks are `true` and `exact_reference` is `"uncertain"` (never `false`), and a separate reviewer establishes identity from the creator's stated reference (for m126234-0015: `m126234-0015`, `126234-0015`, `m126234` or `126234`). `exact_reference` stays `"uncertain"` in every record, and the approval row carries `image_verified: true`. | Decision 0011's "recorded visual verification of the exact reference" and decision 0013's earlier every-check rule | Independent visual record and identity determination for `Rolex_Datejust_126234.jpg` (creator states "ref. 126234, 36 mm case") | genuine owner decision (recorded as an implementation rule under 0010, but the owner must accept it as its own line) |

Approving line (a) alone does not approve (b) or (c). Without (b), the front photograph cannot publish, because the Rolex source has `publication_allowed=false`. Without (c), it cannot pass the identity gate.

## All gates

| Gate | Class | State | Notes |
|---|---|---|---|
| Website-only priority, phone first | existing authorization | in force | owner, 2026-10-26 |
| Inquiry-only scope: no prices, login, cart, checkout, currency or country selectors, CRM or admin | existing authorization | in force | decisions 0003, 0004, 0008 |
| Neutral copy and the moving brand strip | existing authorization | in force | decision 0005; copy audit replacements applied on this branch |
| El Messiri for Arabic display; lighter palette | existing authorization | in force | decisions 0006, 0007 |
| Selecting design direction A, B or C | genuine owner decision | open | the designer stream presents; nothing selected |
| Facts-only publication and bounded cache | existing authorization | in force | decision 0009 |
| Lossy WebP ladder, byte budgets and SSIM floor | implementation choice | recorded | decision 0009 addendum |
| Identity gate mechanics (`requireVerification`) | implementation choice | recorded | decision 0013; the owner still accepts line (c) |
| Showing the work's title in the credit | implementation choice | done on this branch | CC BY 2.0 4(b) "title of the Work if supplied"; see below |
| Whole-photo framing on phones (`contain` for approved photos) | implementation choice | prepared | narrowest CSS; editorial imagery unchanged |
| Open-licence migration lines (a), (b), (c) | genuine owner decision | open | three lines, above |
| Action-time confirmation of each database write | platform interaction | blocked | MCP elicitation timeout (runbook, playbook DB-1) |
| Models migration `jwleria_product_models` | existing authorization for the change; platform interaction to execute | blocked | two attempts timed out at 60 s; no third attempt in that turn |
| Creating the product-media bucket | genuine owner decision | open | |
| Deploying the upload function | genuine owner decision | open | |
| Worker release carrying credits, the title, the copy and the framing | platform interaction (operator upload of a prepared package) | prepared | must be live before any titled credit is recorded |
| `confirm-renditions --network` for the front rendition | evidence obtainable | **done** | 2026-10-27 18:09Z: HTTP 200, served sha256 equals the held bytes; gate closed |
| Licence title outcome | evidence obtainable | **done** | title supplied: "Rolex Datejust 36 - Up High" (embedded short title); recorded on the licensed file and shown in the credit |
| Fresh read that still matches the prepared bundle | evidence obtainable | to repeat before execution | the bundle must be re-rendered for the title change first |
| Verified WhatsApp number | genuine owner decision (owner input) | open | blocks `PUBLIC_RELEASE=live` |
| Lifting a closed source (Cartier, Van Cleef & Arpels, CELINE, RIMOWA, Piaget, Panerai) | genuine owner decision, plus a reviewed code change | closed | terms, robots or challenge recorded |
| Activating the intake schedule; enabling the n8n database nodes | genuine owner decision | open | the recorded runner defects must be fixed first |
| Reconciling `jwleria-s-gembox`; merging the foundation branch | genuine owner decision | open | README merge gate |

## Licence title outcome

The licence review found that the five-field credit met every CC BY 2.0 requirement except the work's title "if supplied" (section 4(b)). The Commons information template has no title. The author's embedded file metadata supplies the short title "Rolex Datejust 36 - Up High", and the author's other photographs in the series follow the same pattern. The uploader's file name ("Rolex Datejust 126234") and the Commons caption do not count. The credit now carries an optional `title` end to end, and five-field credits stay valid. Whether embedded metadata counts as "supplied" is not settled by the licence text; including it is the cautious reading. This was an implementation choice and needs no owner approval. It does change the prepared SQL, so the private execution bundle must be re-rendered and re-hashed before use.
