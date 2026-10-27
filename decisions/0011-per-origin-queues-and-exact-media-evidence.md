# 0011 — Per-origin queues, missing-only intake and exact media evidence

Status: accepted technical decision by the implementation owner (decision 0010), 2026-10-26. It narrows existing gates; it grants no source or media permission.

## Collection

Each permitted official origin runs in exactly one queue, and origins run concurrently. An origin keeps its own pacing (at least two seconds, the larger of config, the database source interval and robots crawl-delay), resumable private state and deduplication. Access refusal, challenge pages or repeated redirects block only that origin until a reviewer resumes it with its recorded review token. A rate limit defers only that origin until the later of Retry-After and fifteen minutes. Transient errors retry with bounded exponential backoff and then fail explicitly. Robots refusals, single redirects and extraction failures are recorded per URL and never followed or guessed. Cartier, Van Cleef & Arpels, CELINE and RIMOWA remain closed in code; a configuration flag cannot restart them. The database source registry can only narrow a local configuration.

## Intake

Validated records are processed one by one as they arrive. Private ingestion is missing-only: a record whose candidate already exists with another revision is held for review and never overwritten, because guarded repairs, current revisions and live public rows depend on it. Ingestion requires a fresh revision export and the database missing-only RPC re-checks existence. Factual publication readiness is reported separately; publication still uses the current-revision factual guard. No stale prepared payload is replayed.

## Media

An official image URL or reachable asset is never permission. A media approval can cite only public files that have append-only private evidence: the exact candidate revision, the untouched original's checksum, each derivative's checksum and dimensions, one recorded grant (owner's own photograph of one exact product, or written permission covering the source, origins, website publication, resizing and WebP encoding) and a recorded visual verification of the exact reference and colour/variant. New approvals need responsive variants. Revoking or expiring a grant revokes its approvals and withdraws the products. Open licenses are not accepted until attribution display exists and the owner decides. Enabling a source's publication flag for media remains a separate owner decision. Generated, editorial or mismatched images are never substituted.

Cross-reference added on 27 October 2026: decision 0013 narrows the open-licence rejection above for m126234-0015 only, and its proposed migration contains an open-licence publication lane that would let such an approval publish images without the source's `publication_allowed` flag and would stop that flag alone from withdrawing it. That lane changes the source-flag rule above. It is proposed, not applied, and takes effect only if the owner approves that migration with this exemption stated separately in the approval request.
