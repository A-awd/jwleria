# Image background-removal service costs: verified research only (2026-11-01)

**Status:** research. No purchase, subscription, account, paid call, credential, workflow activation, permission change, source-flag change or publication is authorized by it. The free-only direction stays in force until the owner approves an exact paid choice. No trial was run with any service.

Prices were verified by Codex on the official pages linked below.

## Assumptions

- **Exchange rate:** USD 1 = SAR 3.75 (SAMA, https://www.sama.gov.sa/en-us/currency/finexc/pages/currency.aspx). Search showed 29 Oct 2026; a direct fetch returned 502. SAR figures are rounded up to the whole riyal.
- **What is counted:** one successful paid result per unique image. Product cards, sizes and visitors are not counted.
  - 4,097 is a scenario count taken from the last catalogue denominator. It is not a live count, and not evidence that this many images are available or licensed.
- **What is not charged:**
  - an official packshot that already has alpha skips AI processing entirely, at zero charge;
  - duplicate originals (same hash) are processed once;
  - colour-specific images stay specific to their exact reference.
- **Excluded from the estimates:** VAT, bank fees, retries, repeated attempts, storage, egress, processing hosting, and image acquisition or rights.

## Costs

| Service | USD per image | SAR per 1,000 | SAR per 4,097 |
|---|---|---|---|
| 851-labs/background-remover (Replicate) | ≈ 0.00043 | 2 | 7 |
| BRIA remove-background (Replicate) | 0.018 | 68 | 277 |
| Photoroom Basic | 0.02 | 75 | 308 |
| Photoroom Plus | 0.10 | 375 | 1,537 |

### 851-labs (Replicate)

https://replicate.com/851-labs/background-remover
- **Price:** about USD 0.00043 per run (Nvidia T4, typically about 2 s). This is runtime- and input-dependent, not a fixed per-image price, and not a quality endorsement.
- **Package licence:** MIT, https://github.com/plemeri/transparent-background/blob/main/LICENSE.
- **Billing:** Replicate requires prepaid credit, https://replicate.com/docs/topics/billing/prepaid-credit. The consumption estimate above is not a minimum deposit or an invoice.
- **Handling any future trial:** the returned RGBA can estimate colours. So keep only its mask and recompose the source pixels locally and deterministically under the existing cutout contract. Never accept its RGB blindly.

### BRIA (Replicate)

https://replicate.com/bria/remove-background
- **Price:** USD 0.018 per output.
- **Rights:** its licensed training data grants no rights in an input image.

### Photoroom

https://www.photoroom.com/api/pricing and https://docs.photoroom.com/remove-background-api-basic-plan/pricing
- **Prices:** Basic USD 0.02; Plus (image editing) USD 0.10.
- **Billing:** monthly fixed-quantity prepaid buckets; for example, 1,000 Basic images cost USD 20.
  - There is no exact pay-as-you-go price for 4,097, and unused credits do not roll over, so an invoice can be higher than the consumed value in the table.
- **Free use:** 1,000 sandbox calls (watermarked, not for production) and 10 free production Basic calls with an account. Neither is being used.
- **Capabilities:**
  - WebP: https://docs.photoroom.com/remove-background-api-basic-plan/file-size-resolution-and-format
  - background, size and crop: https://docs.photoroom.com/remove-background-api-basic-plan/background-color-size-and-crop
- **Not needed:** Plus generative backgrounds, because the grey frame is CSS. Products are never generated.

### Infrastructure

- **n8n** (https://n8n.io/pricing) charges per workflow execution, not per step. The owner's existing n8n usage and headroom were not audited, so no extra plan or free capacity is assumed. Batching affects executions; image API charges stay per image.
- **Supabase** (https://supabase.com/pricing): Free includes 1 GB of storage. Pro starts at USD 25 a month (SAR 94), with 100 GB of storage and the first project included. Additional projects, compute or egress may cost extra. The organization's actual plan and invoice were not read, so SAR 94 is not a total for all projects.

## Proposed flow, if ever approved

1. The exact source, reference, colour and hash, with its rights basis.
2. n8n checks the alpha and the hash.
3. The removal API is called only when the image needs it.
4. Deterministic resize and WebP, with the master kept.
5. Quality review.
6. The existing approval-bound upload, storage and evidence.
7. Publication.

AI and n8n stay off the browsing path, so there is no per-visitor AI charge. n8n cloud image-editing capabilities are unconfirmed until tested on the instance; the existing local `sharp` path is kept.

## Recommendation (research)

- Keep the selected card style (decision 0023) and official alpha unchanged.
- If a service is ever approved, 851-labs is the cheapest screening candidate, with BRIA as the fallback, but only after a representative sample passes quality review. Price alone cannot certify delicate watch hands, logos, leather or straps.
- Photoroom is not automatically the cheapest.
