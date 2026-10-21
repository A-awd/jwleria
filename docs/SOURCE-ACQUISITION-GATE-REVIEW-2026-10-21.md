# Source acquisition gate review

Reviewed on 21 October 2026 using saved evidence from 4 October 2026 only.
No new source retrieval, database mutation or publication occurred in this review.

## Evidence and proposed correction

| Source | Saved evidence | Proposed acquisition state |
|---|---|---|
| Cartier | Official indexed [Terms of Use](https://www.cartier.com/en-ae/terms-of-use.html), “Prohibited activities,” required prior written approval for automated access/copy/distribution. The actual [UK legal URL](https://www.cartier.com/en-gb/legal-and-privacy/terms-of-use) returned HTTP 403 during that review; a fresh live UK terms verification is not claimed. | Block automatic acquisition pending demonstrated source permission or a verified alternative permitted source. |
| Van Cleef & Arpels | The [official legal page](https://www.vancleefarpels.com/en/legal/legal-page.html), “Prohibited activities,” was read live on 4 October and required prior written approval for automated access/copy/distribution. | Block automatic acquisition pending demonstrated source permission or a verified alternative permitted source. |

The evidence contains no demonstrated written source permission for either
origin. Owner instructions and allowed robots paths do not establish that
permission. Current legal terms have not been re-fetched in this bounded review.

The narrow correction is `acquisition_allowed=false` for the two source records.
Preserve `enabled=true` and the existing `publication_allowed=false`; do not
delete candidates, rewrite facts, grant media rights, withdraw factual products
or alter other sources. Keep the historic permission reference as history,
without representing an owner collection instruction as brand authorization.
No such correction has been applied by this review.

## Preservation and verification

The existing source-withdrawal trigger runs after any source-row update, even
when only acquisition is changed. Its source branch targets media-linked
`published_revisions`; factual publication has its separate
`factual_publications` table. Inspect the live trigger definition before any
eventual correction rather than assuming a flag update cannot affect products.

Apply any separately authorized correction within one transaction, require the
two exact source identities/origins and expected current flags, and compare the
complete public catalog projection before and after. Roll back if any public
row changes. Then read back both acquisition flags, unchanged publication flags
and unchanged public facts. Do not disable triggers or broaden permissions.

Resumption requires evidence that covers the exact automated source, purpose
and fields, plus applicable access/rate-limit checks. Website-image permission
and exact-image visual approval remain separate requirements.

## Applied correction — 21 October 2026

The two exact owning source rows were narrowed to acquisition_allowed=false. Enabled=true and publication_allowed=false were preserved. The live withdrawal trigger was read first; the correction ran in a transaction that compared every public catalog row before/after and would roll back on any difference. Readback confirmed unchanged1,044 active factual products, zero product images and both narrowed acquisition flags. No new acquisition, rights grant or public withdrawal occurred.
