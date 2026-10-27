# 0013 — Open-licence exact-product photographs

Accepted from the owner's direction relayed by Codex on 2026-10-27.

The owner directed completing the documented publication path for the reviewed open-licence sample, m126234-0015 first. m126200-0006 stays out: its only held file is a 500 px rendition, which fails the large-image gate.

This narrows decision 0011's rejection of open licences for **m126234-0015 only**, and only for the following kind of photograph:

- Third-party photographs under CC BY, CC BY-SA or CC0 (the database allowlist: CC0 1.0, CC BY 4.0/3.0/2.0, CC BY-SA 4.0/3.0/2.0; never NC or ND) that each show one exact catalogue reference. They are never described as official brand photography.
- Every image carries a visible credit wherever it appears: creator, the work's title when its author supplied one, licence with a link to its deed, source page and the changes made. (The title was added on 2026-10-27 by the implementation owner under decision 0010: CC BY and BY-SA 2.0 and 3.0, section 4(b), require "the title of the Work if supplied". A file name chosen by an uploader or a caption written by Commons editors is not a supplied title.)
- A Wikimedia-served rendition may be used only when it is recorded as a rendition with its width. Nothing published from it is wider than that rendition.
- No sibling reference is substituted, nothing is upscaled, and no generated or altered imagery is used.
- On a takedown request, the grant is revoked, which withdraws the product at once, and its public files are deleted.

The relayed direction concerns this sample; it is not recorded in the repository beyond the summary above, so it is not read as a standing policy. Any further reference needs its own exact-match review **and** an amendment of this file that names it, followed by a reviewed migration: the database and the pipeline accept this file only for the references it lists (`jwl_internal.open_license_decisions()` and `openLicenseDecisions` in `scripts/catalog-intake/media-pipeline.mjs`, which a test keeps identical), and refuse any other decision file, decision 0011 included.

Execution remains subject to every existing gate:

- owner approvals: applying the open-licence migration (which includes the source-flag exemption described below, stated as its own line in the approval request), creating the product-media bucket, deploying the upload function, and a Worker release that renders the credits;
- the database confirmation path: fresh read, rendered statements and recorded receipts;
- evidence gates: exact candidate revision, recorded licence review, the identity gate below, and confirmation of any rendition URL that was constructed rather than logged;
- technical delivery gates, owned by the implementation owner under decision 0010 and not owner approvals: every derivative within its byte budget (150,000 B for card sizes) and at or above the minimum fidelity floor, unless an independent reviewed exception record covers that exact file (decision 0009 addendum), and an independent visual comparison of every derivative of every included file against its reference.

Identity gate (implementation rule recorded by the implementation owner under decision 0010). A file passes only when the independent visual record names its exact held bytes (sha256) and one of these holds:

1. every visual check is literally `true`, `exact_reference` included; or
2. all of the following:
   - `color_and_variant`, `authentic_product_photo`, `not_generated_or_altered` and `clear_product_view` are literally `true`;
   - `exact_reference` is literally `"uncertain"`, never `false`;
   - a separate independent identity determination names that exact file and sha256 with `identity_established` literally `true` and a `creator_stated_reference` equal to the full catalogue reference or its model segment (for m126234-0015: `m126234-0015`, `126234-0015`, `m126234` or `126234`; a fragment such as `1262` or a sibling such as `126334` is refused), from a reviewer other than the visual reviewer.

In the second case `exact_reference` stays `"uncertain"` in every record; it is never rounded up to `true`. The verification record quotes both records' reasons and names both reviewers. It states that case size and bezel material come from the creator-stated reference, not from the pixels. The pipeline (`requireVerification`) re-checks all of this. Identity is never inherited from another file of the same photographer, session or model name.

This gate relaxes what this file said before 27 October 2026 ("an independent identity verification in which every check passes", with no file publishable until a new verification passed every check) and decision 0011's "recorded visual verification of the exact reference" (0011 carries a cross-reference). In route 2 the reference rests on the creator's statement and the reviewer's knowledge of the numbering, not on the pixels. Because it is an implementation rule and not an owner approval, the owner's approval request for the migration states it as its own line: the front photograph's identity rests on the creator-stated reference 126234, not on what the pixels show, and its approval row carries `image_verified: true` because it passed this gate, while every record keeps `exact_reference` `"uncertain"`.

Grants cite this file as `decisions/0013-open-licence-exact-product-photos.md`.

Implementation note (recorded by the implementation owner under decision 0010; **not owner-approved**). The proposed migration lets an open-licence approval publish without the source's `publication_allowed` flag, because the photograph is not the source's own media. It also stops that flag alone from withdrawing such an approval. This applies only when the approval is live and verified, cites a live open-licence grant for this exact candidate and source, and the product is already public as facts at the same revision. Such a call may change only the images and media state: every displayed fact and the search text must equal the public row, or it is refused.

Everything else stays as before:

- other grant kinds still need the flag and are still withdrawn by it;
- a disabled source still withdraws every media publication;
- facts-only rows are never touched;
- revoking the grant or approval, or a new revision, still withdraws the product.

This exemption changes decision 0011's rule that a source's publication flag for media stays a separate owner decision (0011 carries a cross-reference). It takes effect only if the owner approves the migration with this exemption named as a separate line of the approval request; until that approval is recorded it is a proposal.

Status on 2026-10-27: the independent visual verification of the five held m126234-0015 renditions marked `exact_reference` as uncertain for all five. Case size and bezel metal cannot be confirmed from pixels. It also marked colour/variant as uncertain for three files and the view as unclear for the box photograph.

An independent identity determination then established the reference for the front photograph (`Rolex_Datejust_126234.jpg`) only. Its creator's Commons description states "ref. 126234, 36 mm case". The other four state no reference, so their identity is not established. Under the identity gate above, only the front photograph can be included. It still needs every other gate, and nothing is published.

Licence review of the front photograph (CC BY 2.0, 2026-10-27). The five-field credit met every requirement except the title. The Commons information template has no title field, but the author's embedded file metadata supplies the short title "Rolex Datejust 36 - Up High" (the author's other photographs of the same series follow the same "Rolex Datejust 36 - …" pattern). Its licensed-file record therefore carries `"title": "Rolex Datejust 36 - Up High"`, and its credit shows it untranslated. Whether embedded metadata counts as "supplied" is not settled by the licence text; showing it is the cautious reading. Resizing and WebP conversion are treated as mechanical changes rather than a derivative work, and the credit still states them.
