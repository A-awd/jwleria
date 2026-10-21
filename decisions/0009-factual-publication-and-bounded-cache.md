# 0009 — Interim factual publication and bounded public caching

Status: implemented interim behavior; the full photographed catalog remains required.

The owner requested immediate display of genuine products. Publish source-backed product facts and our own factual summaries separately from media. The facts-only lane exposes no image references, source marketing copy, claimed license or inferred supplier availability. It is not acceptance of a permanently photo-free catalog. Media publication retains its exact candidate/revision and image approval checks.

The owner subsequently required navigation speed to be fixed before expanding catalog/media. Cache only anonymous approved public HTML for at most 60 seconds, with locale/path/query/build partitioning. Bypass auth/cookies, search, API requests, writes, unsupported variants, errors and personalized responses. Keep publication readback APIs uncached. Content withdrawal can take up to the HTML cache TTL to appear on a cached page.

Known curated brand identity should not require another remote request per product card. Fetch independent public projections concurrently. Cache unversioned fonts for one day and existing unversioned editorial WebPs for one hour; reserve immutable caching for content-versioned assets.

Future product photos need approved source/usage evidence and responsive derivatives; do not substitute generated or unrelated pictures. Detailed product zoom must retain source detail while list cards should receive only their display size. No paid image service, account permission expansion or scheduled job was adopted by this decision.

Cold-brand follow-up on 21 October: use one read-only active-public snapshot for brand products/count, collections and directory rather than three remote reads. Retain SECURITY INVOKER/RLS, explicit public fields, maximum48 cards, curated empty-brand navigation and visible error handling. HTTP timing improvement is not evidence of completed image-loaded mobile performance.
Responsive media follow-up on21 October: keep original assets and permission/source bindings private. Publish only exact approved per-gallery URL/dimension/byte manifests. Cards request derivatives at most960px; secondary desktop gallery images declare their actual half-gallery display size. The offline helper generates uncropped lossless derivatives at320/640/960px where possible and at most1600px for detail, without enlargement; byte budgets require review rather than an unsupported performance claim. Reject repository/web-root/symlink output locations. These technical checks do not create image-use permission. The owner confirmed no approved photo source and deferred n8n reconnection; those dependencies remain open.
