# Jwleria preview font provenance

Retrieved and checked: 2026-10-03. Status: optional local comparison assets; no permanent typography selection or font activation is made by this change.

## Sources and scope

WOFF2 binaries were obtained from the official Google Fonts CSS API and its `fonts.gstatic.com` delivery URLs. Only normal style, CSS weight 400, the three requested Arabic headline subsets, shared Arabic/Latin body subsets, and one Latin heading subset are included. No italics, additional weights, Cyrillic, mathematical or symbol bundles were downloaded. The binaries are unchanged from Google delivery.

- [Original Google Fonts CSS request](https://fonts.googleapis.com/css2?family=Amiri:wght@400&family=El+Messiri:wght@400&family=Aref+Ruqaa:wght@400&family=Noto+Sans+Arabic:wght@400&family=Cormorant+Garamond:wght@400&display=swap)

- License copies are pinned to [google/fonts commit `9710da1eacb3be272583c3224dcb70f9da6eadbb`](https://github.com/google/fonts/tree/9710da1eacb3be272583c3224dcb70f9da6eadbb). This is the license repository snapshot, not a claim that the delivery binaries were built from that exact commit.

- `apps/storefront/public/fonts/google-fonts-source.css` preserves the source response; `provenance.json` records request headers, original URLs, hashes, sizes and parsed font metadata. Neither source response nor manifest is used as a runtime stylesheet.

## Downloaded font files

| Family | Weight / style | Script subset | Local public URL | Original delivery | Bytes |
|---|---|---|---|---|---:|
| Amiri | 400 / normal | arabic | `/fonts/amiri-arabic-400.woff2` | [WOFF2 source](https://fonts.gstatic.com/s/amiri/v30/J7aRnpd8CGxBHpUrtLMA7w.woff2) | 108560 |
| El Messiri | 400 / normal | arabic | `/fonts/el-messiri-arabic-400.woff2` | [WOFF2 source](https://fonts.gstatic.com/s/elmessiri/v25/K2FhfZBRmr9vQ1pHEey6GIGo8_pv3myYjuXwe55ijDz-oQ.woff2) | 12016 |
| Aref Ruqaa | 400 / normal | arabic | `/fonts/aref-ruqaa-arabic-400.woff2` | [WOFF2 source](https://fonts.gstatic.com/s/arefruqaa/v26/WwkbxPW1E165rajQKDulIIIoVeo5.woff2) | 38132 |
| Noto Sans Arabic | 400 / normal | arabic | `/fonts/noto-sans-arabic-arabic-400.woff2` | [WOFF2 source](https://fonts.gstatic.com/s/notosansarabic/v33/nwpxtLGrOAZMl5nJ_wfgRg3DrWFZWsnVBJ_sS6tlqHHFlhQ5l3sQWIHPqzCfyGyfuXqAJQI.woff2) | 48840 |
| Noto Sans Arabic | 400 / normal | latin | `/fonts/noto-sans-arabic-latin-400.woff2` | [WOFF2 source](https://fonts.gstatic.com/s/notosansarabic/v33/nwpxtLGrOAZMl5nJ_wfgRg3DrWFZWsnVBJ_sS6tlqHHFlhQ5l3sQWIHPqzCfyGyfvHqA.woff2) | 10748 |
| Cormorant Garamond | 400 / normal | latin | `/fonts/cormorant-garamond-latin-400.woff2` | [WOFF2 source](https://fonts.gstatic.com/s/cormorantgaramond/v21/co3umX5slCNuHLi8bLeY9MK7whWMhyjypVO7abI26QOD_v86KnTOig.woff2) | 22876 |

Total WOFF2 payload on disk: 241172 bytes. Browser loading depends on the faces actually used and the unicode ranges; do not preload every comparison option on ordinary catalog pages.

| Font file | SHA256 |
|---|---|
| `amiri-arabic-400.woff2` | `9abf8a10b4a2f27b698740522c9beec9ded7728aeef0738ac0d6e175bf6249d7` |
| `el-messiri-arabic-400.woff2` | `1132f86f15bd538d7072e4ae4db3a64fe036ad05d6780d9d78b588f127b23d5f` |
| `aref-ruqaa-arabic-400.woff2` | `98156c60a0838ddb66303b31b3a048d46692e5e5fcafb04c17d44dac122b65f6` |
| `noto-sans-arabic-arabic-400.woff2` | `4e2ca0745c908761dc5c5db951662873887c59366fa1a5693ad22c0864abf1bd` |
| `noto-sans-arabic-latin-400.woff2` | `290bdad021425e6ba6263c27d38652403f9b1a9ee74f5bbd2c62905b13f71b8c` |
| `cormorant-garamond-latin-400.woff2` | `8048ac209bec741e1c29cd0cfac5aac1c0c2ba8c3ddbd4a58fa9bd92ef5c63c2` |

## Embedding licenses

All five families are distributed under SIL Open Font License 1.1. Each bundled license explicitly permits embedding and redistribution, including alongside commercial software, subject to its conditions. Keep the copyright notices and full OFL files with these assets. Fonts cannot be sold on their own; modified font software must remain under OFL and respect any Reserved Font Names. Aref Ruqaa declares the Reserved Font Name `EURM10`. No font binary was modified for this preview.

| Family | Bundled license | Pinned official source | SHA256 |
|---|---|---|---|
| Amiri | `/fonts/licenses/amiri/OFL.txt` | [OFL.txt](https://raw.githubusercontent.com/google/fonts/9710da1eacb3be272583c3224dcb70f9da6eadbb/ofl/amiri/OFL.txt) | `72de68e5954f4fdd24702292ef5a32f003ca960ec9330dc86e5eefb5dffb9b22` |
| El Messiri | `/fonts/licenses/elmessiri/OFL.txt` | [OFL.txt](https://raw.githubusercontent.com/google/fonts/9710da1eacb3be272583c3224dcb70f9da6eadbb/ofl/elmessiri/OFL.txt) | `b69113722df50071b68ea377ad261919f08fd0dd6672f68b8868445586a30770` |
| Aref Ruqaa | `/fonts/licenses/arefruqaa/OFL.txt` | [OFL.txt](https://raw.githubusercontent.com/google/fonts/9710da1eacb3be272583c3224dcb70f9da6eadbb/ofl/arefruqaa/OFL.txt) | `41ac14451a624c69490e24b9aaaaa1f65dc9dc17c3f6f38172fc43d5ba654a1b` |
| Noto Sans Arabic | `/fonts/licenses/notosansarabic/OFL.txt` | [OFL.txt](https://raw.githubusercontent.com/google/fonts/9710da1eacb3be272583c3224dcb70f9da6eadbb/ofl/notosansarabic/OFL.txt) | `07fc70bfeb985cc1a87a8587d0a0c80bab11c86c9dc3fd95b6f0cb332f983e96` |
| Cormorant Garamond | `/fonts/licenses/cormorantgaramond/OFL.txt` | [OFL.txt](https://raw.githubusercontent.com/google/fonts/9710da1eacb3be272583c3224dcb70f9da6eadbb/ofl/cormorantgaramond/OFL.txt) | `60700d351cac4650c51f3f9db318d2a420f8b45052dba2715eb5fec41f0f6956` |

## Registration and comparison recommendations

`/fonts/preview-fonts.css` contains complete local `@font-face` declarations copied from the official CSS response, with only `src` changed to local URLs. It registers these exact family names: `Amiri`, `El Messiri`, `Aref Ruqaa`, `Noto Sans Arabic`, and `Cormorant Garamond`. All are normal style and weight 400, use `font-display: swap`, and retain the source unicode ranges. Noto Sans Arabic has two declarations so mixed Arabic/Latin interface text can use one body family.

An illustrative registration is:

```css
@font-face {
  font-family: "El Messiri";
  src: url("/fonts/el-messiri-arabic-400.woff2") format("woff2");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  /* Use the full source unicode-range from preview-fonts.css. */
}
```

The optional comparison page can register the supplied stylesheet and use:

```css
/* Scope these rules to the comparison page, rather than the public default. */
.font-comparison { font-family: "Noto Sans Arabic", sans-serif; }
.sample-amiri { font-family: "Amiri", "Noto Sans Arabic", serif; }
.sample-el-messiri { font-family: "El Messiri", "Noto Sans Arabic", sans-serif; }
.sample-aref-ruqaa { font-family: "Aref Ruqaa", "Noto Sans Arabic", serif; }
.sample-latin { font-family: "Cormorant Garamond", Georgia, serif; }
.font-comparison h1,
.font-comparison h2 { font-weight: 400; font-synthesis: none; }
```

Use the same neutral Arabic headline, body text and mobile viewport across options. Amiri offers a classical Naskh direction; El Messiri a more contemporary display direction; Aref Ruqaa a calligraphic Ruqaa direction. These are visual comparison candidates, not an automatic ranking. Keep body copy in Noto Sans Arabic, and avoid forced letter spacing on joined Arabic text. Leave sufficient line height and vertical room for Arabic shaping and diacritics.

Cormorant Garamond supplies Latin lettering only here. The Arabic headline declarations intentionally cover Arabic ranges; Latin names fall back to the shared body face unless a Latin heading face is explicitly applied. Only weight 400 is bundled, so do not request 600/700 and silently synthesize a bold comparison.

## Validation

All six files have valid WOFF2 signatures, were decoded with FontTools, and had every font table decompiled successfully. Their OS/2 weight class is 400; Arabic subsets include Arabic alif and Latin subsets include Latin A. The original font and license bytes match the recorded SHA256 values. No installation, account change or third-party runtime font request is required. Actual rendering and mobile line-height review belong to the separate font comparison page.

Parsed legacy family names can differ from the preferred CSS family (notably the Cormorant binary). `provenance.json` retains both internal and preferred family names; registration follows the official Google Fonts CSS family and verified weight 400.
