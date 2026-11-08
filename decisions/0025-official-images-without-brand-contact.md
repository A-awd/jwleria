# 0025 — Official product images without brand contact

Status: accepted (owner, 2026-11-09). This supersedes the earlier requirement that a brand's written permission be obtained before an official product photograph is published. That requirement appears in decisions 0011, 0015, 0016 and 0024, the source registry, the bulk-image architecture and the handoff.

## Owner direction

The owner's instruction (translation): "No, no, no. Save in all the project's data and plans that there is NO communication with ANY brand. We will take their images without any communication."

- **No brand contact:** no outreach, permission requests, messages, programme or affiliate applications, and no sending of drafts. The Longchamp request drafted earlier is cancelled and was never sent.
- **The image source:** publicly available official images of the exact product, taken from the brand's own product page or gallery.
- **What the next action never is:** contacting a brand, applying to a brand programme, or waiting for a brand reply.

## Truthful provenance

- This is the owner's operational direction. It is **not** a statement that any brand granted a licence.
- Records must say exactly that. Never record `written_permission`, Creative Commons terms, `owner_original` or an author grant for an official brand image.
- Each image keeps a truthful source record: the official page, the exact recorded gallery file, the sha256 of the original, and the time it was acquired.

## The active photo route

1. The official product page or gallery, and the original asset it publishes.
2. Binding to the exact model, reference and colour.
3. An immutable original and a truthful source record.
4. Native alpha, or a non-generative background-only extraction.
5. A flat `#f0f0f0` square with the whole product sized consistently, then light responsive WebP.
6. Review, then publication on the website.

Sizes and colours remain variants of one model (decisions 0017 and 0020).

## Unchanged limits

- **The product itself:** no generated product details, no upscaling, no retouching and no invented identity.
- **Access:** normal public requests within robots. No proxies, challenge bypass, constructed asset URLs, or retries through a real access refusal.
- **Recorded access stops remain:** the Rolex sitemap 403, the IWC robots 403, the Rolex newsroom 403, the closed lanes in code, and Prada's crawling exclusion. These are source-access blocks, not outreach, and lifting one needs a source-access review.
- **Existing controls:** security, JWT on the upload function, approval, evidence and revocation are all kept.

## Implementation gap

This gap is recorded for implementation; it is not an owner request. The runtime contract still assumes a rights grant:
- grant kinds are limited to `owner_original`, `written_permission` and `open_license`;
- publication requires `publication_allowed` and a `media_permission_reference` on the source;
- `acquireOriginal` fetches official files only under written permission.

The required change is an honestly named route: an owner-direction provenance kind for official images under this decision, which states that no brand licence exists. It needs a reviewed migration, matching pipeline code and tests, and then the usual package, apply and deploy steps. It is not implemented by this decision.
