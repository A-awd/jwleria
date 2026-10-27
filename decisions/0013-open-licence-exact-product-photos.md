# 0013 — Open-licence exact-product photographs

Accepted from the owner's direction relayed by Codex on 2026-10-27.

The owner directed completing the documented publication path for the reviewed open-licence sample, m126234-0015 first. m126200-0006 stays out: its only held file is a 500 px rendition, which fails the large-image gate.

This narrows decision 0011's rejection of open licences for **m126234-0015 only**, and only for the following kind of photograph:

- Third-party photographs under CC BY, CC BY-SA or CC0 (the database allowlist: CC0 1.0, CC BY 4.0/3.0/2.0, CC BY-SA 4.0/3.0/2.0; never NC or ND) that each show one exact catalogue reference. They are never described as official brand photography.
- Every image carries a visible credit wherever it appears: creator, licence with a link to its deed, source page and the changes made.
- A Wikimedia-served rendition may be used only when it is recorded as a rendition with its width. Nothing published from it is wider than that rendition.
- No sibling reference is substituted, nothing is upscaled, and no generated or altered imagery is used.
- On a takedown request, the grant is revoked, which withdraws the product at once, and its public files are deleted.

The relayed direction concerns this sample; it is not recorded in the repository beyond the summary above, so it is not read as a standing policy. Any further reference needs its own exact-match review **and** an amendment of this file that names it, followed by a reviewed migration: the database and the pipeline accept this file only for the references it lists (`jwl_internal.open_license_decisions()` and `openLicenseDecisions` in `scripts/catalog-intake/media-pipeline.mjs`, which a test keeps identical), and refuse any other decision file, decision 0011 included.

Execution remains subject to every existing gate:

- owner approvals: applying the open-licence migration (which includes the source-flag exemption described below, stated as its own line in the approval request), creating the product-media bucket, deploying the upload function, and a Worker release that renders the credits;
- the database confirmation path: fresh read, rendered statements and recorded receipts;
- evidence gates: exact candidate revision, recorded licence review, an independent identity verification in which every check passes, and confirmation of any rendition URL that was constructed rather than logged;
- technical delivery gates, owned by the implementation owner under decision 0010 and not owner approvals: every derivative within the card byte budget of the 21 October performance checkpoint (150,000 bytes) and at or above the minimum fidelity floor, and an independent visual comparison of every included derivative against its reference.

Grants cite this file as `decisions/0013-open-licence-exact-product-photos.md`.

Implementation note (recorded by the implementation owner under decision 0010; **not owner-approved**). The proposed migration lets an open-licence approval publish without the source's `publication_allowed` flag, because the photograph is not the source's own media. It also stops that flag alone from withdrawing such an approval. This applies only when the approval is live and verified, cites a live open-licence grant for this exact candidate and source, and the product is already public as facts at the same revision. Such a call may change only the images and media state: every displayed fact and the search text must equal the public row, or it is refused.

Everything else stays as before:

- other grant kinds still need the flag and are still withdrawn by it;
- a disabled source still withdraws every media publication;
- facts-only rows are never touched;
- revoking the grant or approval, or a new revision, still withdraws the product.

This exemption changes decision 0011's rule that a source's publication flag for media stays a separate owner decision (0011 carries a cross-reference). It takes effect only if the owner approves the migration with this exemption named as a separate line of the approval request; until that approval is recorded it is a proposal.

Status on 2026-10-27: the independent visual verification of the five held m126234-0015 renditions marked `exact_reference` as uncertain for all five. Case size and bezel metal cannot be confirmed from pixels. It also marked colour/variant as uncertain for three files and the view as unclear for the box photograph. None of the five may be published under this decision until a new verification passes every check.
