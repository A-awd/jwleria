# Public preview acceptance

These checks cover the local synthetic Jwleria storefront. They do not establish production readiness, product availability, media licensing, or WhatsApp delivery. Do not enter real customer records or connect business channels to perform preview acceptance.

## Automated HTTP acceptance

Start the Astro storefront on port 4321, then run from `apps/storefront`:

```sh
node --test tests/public-boundary.mjs
```

For another local port, set `PREVIEW_BASE_URL`. The test intentionally permits loopback hosts only. It requires Node with built-in `fetch`, `node:test`, and `Array.findLastIndex`.

The fixture preview is a statically prerendered Astro site. Its HTTP responses contain the catalog, while browser JavaScript applies query search and filters. The suite discovers visitor links and GET forms from rendered HTML. It does not import fixtures or application components and does not submit mutations. Coverage includes:

- Arabic and English document language and direction, meaningful headings, and catalog content available in the HTTP response without executing JavaScript.

- No displayed currency markers or numeric monetary statements, and no serialized monetary fields. Ordinary policy wording about prices and the requested WhatsApp CTA remains valid.

- No country/currency selector, login form, or account/cart/checkout/admin entry link. Direct requests to removed capabilities must return 404 or 410.

- Every discovered product detail route, with an explicitly identified synthetic preview alongside its heading/content, a visible reference, and the current Arabic CTA `التواصل عبر واتساب لمعرفة السعر`. A neutral English title such as an illustrative numbered study may use the adjacent preview disclosure rather than repeating the badge in its title.

- Demo labels on individual product cards, local illustrative product media that actually return nonempty image responses, and an identifiable local inquiry target. No unverified WhatsApp number or invented business destination.

- Crawlable brand/category detail pages, native GET search/category controls, and card-level brand/category metadata matching the public taxonomy pages. Brand selection may use directory/detail navigation rather than an additional catalog dropdown. Requests with positive, no-match and category query parameters must still return valid catalog HTML.

Duplicate card thumbnails may have empty alternative text when deliberately hidden from assistive technology and paired with a separate text link. The informative product gallery image still requires meaningful alternative text, and all product imagery retains its synthetic-preview disclosure.

The suite deliberately does not expect the static origin to reduce results for a query string. It does not execute the filtering JavaScript. A successful HTTP run cannot certify that search, filters, no-match state, URL restoration or clearing actually work. The browser checks below must independently establish those behaviors; missing or broken enhancement is a real acceptance failure.

Product discovery includes catalog pagination and one detail page for each taxonomy per locale. A bounded crawl fails instead of claiming complete coverage if the fixture grows beyond its limit. A passed suite does not certify unseen routes or products that are not linked from the public catalog.

## Browser acceptance

Use the Codex in-app browser with one working tab after the HTTP suite passes. These checks require actual interaction; HTML inspection alone cannot prove them:

1. Open Arabic, then English. Verify readable Arabic RTL, normal English LTR, navigation and language switching, and usable desktop/mobile layouts.

2. Search a displayed product term, select a brand and category, and clear the controls. Verify the result state and URL remain consistent, including refreshing the page and an empty result.

3. Open a product and click its inquiry CTA. The local preview dialogue must open, identify the selected product/reference, clearly state that this is a demonstration, and close using its visible control and Escape. Repeat with another product to detect a stale reference. Keyboard focus must enter the dialogue and return to the invoking control when it closes.

4. Check a sample of every visual asset and all product names. The synthetic demonstration must not present an invented exact luxury model as authentic or pair a real brand product name with unrelated media. Review any logo use separately; local file storage does not prove permission.

5. Confirm no country selection, monetary value, sign-in, shopping cart, payment, account or administration entry appears at narrow widths or inside menus.

## Record the result

Record the running revision, automated pass/failure, browser pass/failure, and unresolved defects separately in the owning checkpoint. Keep production WhatsApp configuration, real media rights approval and deployment acceptance as explicit later gates. Preparing these tests is not evidence that they have passed.

## Local automated receipt — 2026-10-03

The uncommitted working-tree preview at `http://127.0.0.1:4321` passed all seven checks with no skips. The run reviewed 74 HTML responses, including all 27 linked synthetic products in both locales. Product image requests returned nonempty image responses, and removed account/cart/checkout/admin routes returned 404 or 410 as required. This receipt covers the HTTP suite; browser search, filtering and dialogue acceptance are recorded separately by the root reviewer.

## Local browser and build receipt — 2026-10-03

The root reviewer used the Codex in-app browser and one working tab. Actual
interactions established the following, separately from the HTTP suite:

- Searching reference `JWL-PREVIEW-001` showed one watch fixture; an unknown
  query showed the no-match state. Selecting luggage showed three fixtures.

- Reloading restored the selected category; clearing restored all 27 items.
  Selecting accessible luxury showed only that directory section and retained
  it after reload. A real Coach directory page correctly had no synthetic
  branded inventory. Switching language opened its English equivalent.

- The inquiry action opened the native dialogue with the selected reference;
  copying reported success, and the visible close control closed it. Separate
  fixture actions displayed references 027 and 026 without a stale subject.
  Focus entered the dialogue and returned to the invoking control after closing.
  Escape dismissal was not separately exercised in this receipt.

- A real narrow-layout check initially found header overflow and triggered a
  fix. Afterwards the checked home/catalog views had equal document and scroll
  widths at a 312 CSS-pixel content width. The mobile menu opened and closed.
  The wide layout also had equal document and scroll widths. Viewport overrides
  were reset and the working tab was left on the Arabic home preview.

Fresh home/mobile/product captures were saved outside the public repository.
The final source check passed 24 files with zero errors, warnings or hints;
the final static build succeeded with 168 pages. These results do not certify
production performance, real inventory/media rights or WhatsApp delivery.

## Copy and moving-strip receipt — 2026-10-03

After the owner's correction, source checks again passed 24 files with zero
errors, warnings or hints, and the static build completed with 168 pages.
Actual Arabic/English home-page reads found no personal-shopping/service or
personal-conversation wording in the body, title or description. The former
hero eyebrow is absent and the footer is neutral in both locales.

The strip's transform advanced between browser reads, confirming actual
movement. Its visible control switched `animation-play-state` to `paused` and
then back to `running`, with corresponding accessible-label/pressed-state
updates. The checked page had equal document/scroll widths. Fresh visual
evidence was saved outside the public repository. Reduced-motion and keyboard
fallbacks are implemented; no additional browser emulation of those modes is
claimed in this receipt.

## Font comparison and pending-contact receipt — 2026-10-03

All three heading faces and the shared Arabic body face passed actual browser
font-readiness checks on the comparison page. Computed heading families were
Amiri, El Messiri and Aref Ruqaa. Clicking the Amiri site-preview link selected
the matching allowlisted homepage query and actual face. Settled document and
scroll widths were equal in the checked views; an immediate cross-page
transition capture was discarded in favor of settled evidence.

Generic contact controls were actual disabled buttons marked pending, with no
`href` or contact-page navigation. The owner has not yet prepared the business
number. Live WhatsApp opening/delivery is therefore not exercised or claimed.

The source check passed 26 files with zero errors, warnings or hints, the build
completed with 170 pages, and the existing seven HTTP checks passed with no
skips. The font-review routes remain local review material; final typography
selection and production release are separate steps.

## Selected font receipt — 2026-10-04

The owner selected option 2, El Messiri. It is the default Arabic display face
in the shared styles; the local face stylesheet is active on normal pages.
Noto Sans Arabic body copy and Cormorant Garamond Latin display text remain.
The comparison page identifies the selected option. Temporary comparison
queries remain optional and do not determine the normal page default.

Source checks passed 26 files with zero errors, warnings or hints; the static
build completed with 170 pages. On plain `/ar/`, actual browser font readiness
was true for El Messiri, computed headings used the selected family at weight
400, and no preview override was present. Document and scroll widths were
both 691 pixels in the checked settled view. A fresh screenshot is saved
outside the public repository. WhatsApp configuration and production release
remain pending.

## Lighter palette receipt — 2026-10-04

The local shared palette was lightened at the owner's request. The static
build completed with 170 pages. A settled browser heading readback confirmed
El Messiri remained selected, body background was `rgb(252, 250, 246)`, and
document/scroll widths were both 721 pixels. A native screenshot was inspected
and saved outside the public repository. No product files or live integrations
were changed. New roadmap/intake templates are preparation, not imported data.
