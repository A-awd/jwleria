# 0013 — Open-licence exact-product photographs

Accepted from the owner's direction relayed by Codex on 2026-10-27.

The owner directed completing the documented publication path for the reviewed open-licence sample, m126234-0015 first. m126200-0006 stays out: its only held file is a 500 px rendition, which fails the large-image gate.

This narrows decision 0011's rejection of open licences for the following scope only:

- Third-party photographs under CC BY, CC BY-SA or CC0 (the database allowlist: CC0 1.0, CC BY 4.0/3.0/2.0, CC BY-SA 4.0/3.0/2.0; never NC or ND) that each show one exact catalogue reference. They are never described as official brand photography.
- Every image carries a visible credit wherever it appears: creator, licence with a link to its deed, source page and the changes made.
- A Wikimedia-served rendition may be used only when it is recorded as a rendition with its width. Nothing published from it is wider than that rendition.
- No sibling reference is substituted, nothing is upscaled, and no generated or altered imagery is used.
- On a takedown request, the grant is revoked, which withdraws the product at once, and its public files are deleted.

Each further reference needs its own exact-match review before any grant names it.

Execution remains subject to every existing gate:

- the owner's approval to apply the open-licence migration, create the product-media bucket and deploy the upload function, plus a Worker release that renders the credits;
- the database confirmation path: fresh read, rendered statements and recorded receipts;
- every evidence gate: exact candidate revision, recorded licence review, an independent visual verification in which every check passes, the derivative byte and fidelity budget, and confirmation of any rendition URL that was constructed rather than logged.

Grants cite this file as `decisions/0013-open-licence-exact-product-photos.md`.

Implementation note (recorded by the implementation owner under decision 0010). The proposed migration lets an open-licence approval publish without the source's `publication_allowed` flag, because the photograph is not the source's own media. It also stops that flag alone from withdrawing such an approval. This applies only when the approval is live and verified, cites a live open-licence grant for this exact candidate and source, and the product is already public as facts at the same revision.

Everything else stays as before:

- other grant kinds still need the flag and are still withdrawn by it;
- a disabled source still withdraws every media publication;
- facts-only rows are never touched;
- revoking the grant or approval, or a new revision, still withdraws the product.

This is part of the migration that the owner approves before it is applied.

Status on 2026-10-27: the independent visual verification of the five held m126234-0015 renditions marked `exact_reference` as uncertain for all five. Case size and bezel metal cannot be confirmed from pixels. It also marked colour/variant as uncertain for three files and the view as unclear for the box photograph. None of the five may be published under this decision until a new verification passes every check.
