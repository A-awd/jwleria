# Website media coverage and image-rights evidence — 2026-10-26

Scope: the website-only milestone, which is real original product photos visible on jwleria.com. This ledger records evidence. It is not a publication record.

## Live status

- Approved product images on the live site: **0**. The database has 0 media grants, 0 media assets, 0 publication approvals and no storage bucket. Live state was read on 2026-10-26 and is unchanged since the checkpoint.
- Every public product is facts-only (`media_state = facts_only`).
- Nothing in this ledger was downloaded into production, uploaded, approved or published.

## Official brand images — permission evidence

The question checked was whether an official permission or licence exists that would let an independent commercial showcase display the brand's own product photographs. Legal and press pages were read. Origins with recorded refusals or closures were read through search-engine results only.

| Brand | Usable for this site | Decisive evidence (short) | Smallest action that would make it usable |
|---|---|---|---|
| Rolex | No | Terms forbid copying, downloading or displaying content "for commercial purposes" without Rolex's prior written agreement. The newsroom is for journalists' editorial use only. | A signed written licence from Rolex SA naming the images. In practice that comes through an Official Rolex Retailer agreement. |
| Prada | No | Legal notice allows personal, non-commercial use only. | A written image licence from the Prada rights holder. |
| LOEWE | No | Copies are allowed only "for private and personal use and not for profit or commercial use". | A written licence from LOEWE S.A. |
| Longchamp | No | Reproduction is forbidden except for personal and private use, and even links need prior written agreement. | A written licence from LONGCHAMP SAS through its press department. |
| Bottega Veneta | Unknown | No press or licence terms found. Automated access was refused earlier, so a person must read the legal page in a browser. | Record the legal page by hand, then get a written licence. |
| Audemars Piguet | No | Uses other than personal non-commercial use need "the prior written consent of Audemars Piguet". | A signed licence from Audemars Piguet (Marketing) S.A. |
| Cartier, Van Cleef & Arpels, IWC, Jaeger-LeCoultre, Panerai, Piaget (Richemont) | No | The Richemont Media Centre terms allow editorial use only, with no cropping or derivatives. Maison site terms allow personal use only. Piaget and Panerai also forbid automated access without written approval. | A written licence from each Maison. |

Conclusion: **0 official images are eligible** for the reviewed sources at this checkpoint, because no applicable grant was observed. It does not mean a brand would refuse a request. Press and media images limited to editorial use do not cover this commercial showcase. A reachable image URL is never permission.

## Open-licence exact-product photographs (proposal only — not published)

Decision 0011 rejects open licences until attribution display exists and the owner decides. The storefront code that renders a visible credit under each image is prepared on this branch but is **not deployed**. The open-licence grant kind is a proposed, unapplied migration (`apps/storefront/supabase/proposed/jwleria_open_license_media.sql`).

Wikimedia Commons was searched for photographs that show exactly a reference in the public catalog. Each candidate's licence was re-read from the Commons API, and the image was checked visually against our recorded facts: dial, bezel, bracelet type, case material and visible text. "Exact" means one specific catalog variant beyond reasonable doubt.

| Catalog reference | Commons file | Licence | Creator | Verdict | Provenance notes |
|---|---|---|---|---|---|
| m126234-0015 (Datejust 36, bright black dial, fluted white gold bezel, Jubilee) | [Rolex_Datejust_126234.jpg](https://commons.wikimedia.org/wiki/File:Rolex_Datejust_126234.jpg) and five more photos of the same watch by the same photographer: [Black Sunburst Dial](https://commons.wikimedia.org/wiki/File:Rolex_Datejust_36_-_Black_Sunburst_Dial_(50826887656).jpg), [At an Angle](https://commons.wikimedia.org/wiki/File:Rolex_Datejust_36_-_At_an_Angle_(50826143003).jpg), [On Display](https://commons.wikimedia.org/wiki/File:Rolex_Datejust_36_-_On_Display_(50826140918).jpg), [Presentation Ready](https://commons.wikimedia.org/wiki/File:Rolex_Datejust_36_-_Presentation_Ready_(50826141683).jpg), [Ready in the Box](https://commons.wikimedia.org/wiki/File:Rolex_Datejust_36_-_Ready_in_the_Box_(50826141328).jpg) | CC BY 2.0 | Ajay Suresh | Exact (6 independent checks) | Flickr-origin series by one photographer. m126234-0016, the same dial on an Oyster bracelet, was ruled out. |
| m126200-0006 (Datejust 36, Oystersteel, bright blue dial, Oyster) | [Rolex_Datejust_36_126200-0006.jpg](https://commons.wikimedia.org/wiki/File:Rolex_Datejust_36_126200-0006.jpg) | CC BY-SA 4.0 | Remi Mathis | Exact | Established contributor. 36 mm is inferred from proportions and the title. |
| m126500ln-0001 (Cosmograph Daytona, white dial, black counters) | [Rolex_Cosmograph_Daytona_Panda.jpg](https://commons.wikimedia.org/wiki/File:Rolex_Cosmograph_Daytona_Panda.jpg) | CC BY-SA 4.0 | Shuntfield | Exact | Weak own-work evidence: a new account with stripped camera metadata. |
| m126900-0001 (Air-King) | [Rolex_Air-King_ref._126900, risalente al 2022](https://commons.wikimedia.org/wiki/File:Rolex_Air-King_ref._126900,_risalente_al_2022.jpg) | CC BY-SA 4.0 | EMore98 | Exact | This uploader has had other files nominated for deletion for missing permission. Treat as a provenance risk. |
| m126713grnr-0001 (GMT-Master II) | [Rolex_GMT-Master_II_ref._126713GRNR.jpg](https://commons.wikimedia.org/wiki/File:Rolex_GMT-Master_II_ref._126713GRNR.jpg) | CC BY-SA 4.0 | EMore98 | Exact | Same uploader provenance risk. |

Rejected or unresolved:
- 3 photos could not be tied to one reference. The case size was not provable for a Land-Dweller dial, an Oyster Perpetual on the wrist, and a Wimbledon-dial Datejust.
- 3 photos were not verified before a container restart: one more photo from the Ajay Suresh series and two Oyster Perpetual photos by EMore98.

Lower-risk subset if the owner accepts open licences: **m126234-0015** (the CC BY 2.0 series) and **m126200-0006**.

Conditions that would still apply:
- Attribution under every image: creator, licence name and link, source link, and "resized and converted to WebP".
- The licence covers copyright only, not trademarks.
- A takedown on request.
- The usual grant, checksum, derivative and visual-verification evidence chain, bound to the exact candidate revision.

## Coverage ledger (per brand, from the read-only models dry run)

Displayed models are what the visitor catalog shows once the proposed models migration is applied. Variants are the existing public source rows, each one exact reference.

| Brand | Public variants | Displayed models (proposed) | Approved images | Eligible official images | Open-licence exact candidates (unpublished) |
|---|---:|---:|---:|---:|---|
| Rolex | 1,465 | 674 | 0 | 0 | m126234-0015, m126200-0006, m126500ln-0001, m126900-0001, m126713grnr-0001 |
| Prada | 851 | 851 | 0 | 0 | none found |
| Van Cleef & Arpels | 498 | 498 | 0 | 0 | not searched (closed source) |
| Cartier | 463 | 463 | 0 | 0 | not searched (closed source) |
| LOEWE | 407 | 232 | 0 | 0 | none found |
| Longchamp | 390 | 145 | 0 | 0 | none found (colour and size not provable from photos) |
| Bottega Veneta | 8 | 8 | 0 | 0 | none found |
| Audemars Piguet, IWC, Jaeger-LeCoultre, Panerai, Piaget | 3 each | 3 each | 0 | 0 | none found |
| **Total** | **4,097** | **2,886** | **0** | **0** | **5 references (10 files)** |

Genuine gaps: every model lacks an approved photograph. Where an exact open-licence photo exists, it covers one variant, never the other variants of its model, and is never shown for them.
