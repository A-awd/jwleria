# Product models dry run — 26 October 2026

**Status: a read-only dry run of a PROPOSED, unapplied migration.** `apps/storefront/supabase/proposed/jwleria_product_models.sql` is not applied. No object was created and no row was written in production. The storefront still shows one card per catalog row. Applying the migration and running `jwl_internal.apply_product_variants()` are separate production changes that need their own owner approval.

The rules are those in `docs/WEBSITE-MODELS-AND-VARIANTS-CONTRACT.md`.

## Method

The body of `jwl_internal.derive_product_variants()` was copied from the migration into one `SELECT`. The reviewed term dictionary is an inline `VALUES` list and `arabic_measure` is inlined. The query reads the live public catalog and the candidate revisions it was published from. It aggregates the derived mapping into a single JSON report. The generated text was scanned before each run: it is one statement and contains no `INSERT`, `UPDATE`, `DELETE`, `CREATE`, `DROP`, `ALTER`, `GRANT`, `TRUNCATE`, `COPY`, `SET` or locking keyword outside string literals and comments. On a local PGlite database, the inline query gives the same report as the installed function.

Production reads, in order:

1. First dry run: the client stopped it after 60 seconds and no result came back. The cause was a quadratic step in the derivation (see *Defects found and fixed*). This was a defect in the migration, not a database problem.
2. Second dry run, after the performance fix: it completed.
3. One spot-check `SELECT` (at most 40 rows), built on the same derivation.
4. One final dry run after the Arabic-name fix. Its only change is the Arabic-name sources: 7 Rolex models moved from `primary` to `shared_size`. Every other figure was identical to run 2. The figures below are from this final run.

**What is saved.** The stream's working files are in its scratch directory `vdb-scratch/`, outside the repository:

- The SQL text of runs 2, 3 and 4: `dryrun-v2.sql`, `spotcheck.sql` and `dryrun-final.sql`. Each can be rebuilt exactly from the migration as committed. Runs 2 and 3 come from commit `151d158` and run 4 from commit `2347e63`.
- One result: run 2's report, `dryrun-v2-result.json`. It was saved without its `untranslated` section.

The results of runs 3 and 4 were read in the session but not saved. Three parts of this document therefore cannot be re-audited without another read-only production read:

- the untranslated-terms table;
- run 4's Arabic-name split (100 / 7 / 1 for Rolex) and its statement that nothing else changed;
- the spot-check facts. These include the Rolex fact census and the `126200` pairs described under *Splits, ambiguity and missing options*.

Every other figure is in the saved run 2 report.

The next read-only dry run uses `dryrun-next.sql` and `spotcheck-next.sql` from the same directory. Both are built from the migration at commit `8ea934d`. Locally, both pass the same keyword scan, and the report equals the one built on the installed function. The report adds the rows now kept single by an unresolved Arabic name, and a count of key collisions, which should be 0. Save the complete JSON results next to them, as `dryrun-next-result.json` and `spotcheck-next-result.json`, before updating any figure here.

## Changes since run 4 (not yet measured in production)

Review round 3 changed the derivation after run 4; see defects 3 to 5 below. The figures in the following sections are still those of run 4. The expected effect:

- The one model whose Arabic name fell back to the primary variant's name, Rolex `278344rbr`, is no longer formed. Each of its variants stays its own model, under the rule `single:arabic-name-mismatch`. Run 4 did not save its member count, k. Rolex grouped models therefore go from 108 to 107, grouped variants from 914 to 914 − k, and displayed models from 2,871 to 2,870 + k. Every other grouped model took its Arabic name from `shared`, `shared_size` or `colour_tail`. Those rules are unchanged.
- Single models now have the key `<source>:ref:<reference>`. Grouped keys are unchanged, and no count changes.
- The LOEWE style code may no longer contain `:`. No captured LOEWE reference is expected to contain one. One that does would become `single:unrecognised-reference`.
- One duplicate index was removed. This has no effect on the mapping.

## Totals

| | Count |
|---|---:|
| Public variants (active catalog rows) | 4,097 |
| Displayed models (cards after mapping) | 2,871 |
| Grouped models (two or more variants) | 284 |
| Variants inside grouped models | 1,510 |
| Single-variant models | 2,587 |

Today every one of the 4,097 variants is its own card. With the mapping, there would be 2,871 model cards and the same 4,097 variant URLs.

## Per source

| Source | Variants | Displayed models | Grouped models (variants) | Largest model | Rules hit |
|---|---:|---:|---:|---:|---|
| Rolex | 1,465 | 659 | 108 (914) | 26 | `rolex-model-number` 914, `single:ambiguous-options` 502, `single:only-variant` 49 |
| LOEWE | 407 | 232 | 94 (269) | 9 | `loewe-style-code` 269, `single:only-variant` 138 |
| Longchamp | 390 | 145 | 82 (327) | 10 | `longchamp-model-code` 327, `single:only-variant` 28, `single:unrecognised-reference` 19, `single:inconsistent` 16 |
| Bottega Veneta | 8 | 8 | 0 | 1 | `single:only-variant` 6, `single:inconsistent` 2 |
| Prada | 851 | 851 | 0 | 1 | `single:no-linking-evidence` 851 |
| Van Cleef & Arpels | 498 | 498 | 0 | 1 | `single:no-linking-evidence` 498 |
| Cartier | 463 | 463 | 0 | 1 | `single:no-linking-evidence` 463 |
| Audemars Piguet, IWC, Jaeger-LeCoultre, Panerai, Piaget | 3 each | 3 each | 0 | 1 | `single:no-linking-evidence` 3 each |

No row was `single:unbound-revision`. Every active row is bound to its exact published candidate revision.

Group-size distribution (variants per model: number of models):

- Rolex: 1: 551 · 2: 24 · 3: 1 · 4: 8 · 5: 2 · 6: 5 · 7: 8 · 8: 7 · 9: 7 · 10: 14 · 11: 4 · 12: 5 · 14: 11 · 16: 9 · 22: 1 · 26: 2
- LOEWE: 1: 138 · 2: 52 · 3: 19 · 4: 14 · 5: 5 · 6: 3 · 9: 1
- Longchamp: 1: 63 · 2: 19 · 3: 21 · 4: 11 · 5: 17 · 6: 9 · 7: 1 · 8: 2 · 10: 2
- All other sources: every model has one variant.

The largest models are two Rolex models with 26 variants each. They were not spot-checked individually. The largest LOEWE model (9 variants) was spot-checked.

## Splits, ambiguity and missing options

- **Consistency splits (`single:inconsistent`), 18 variants.**
  - Longchamp: 16 variants in 2 model-code groups. Their recorded material differs within the code. Examples: `L1621089001`, `L1621089002`, `L1621089218`, `L1621089349`, `L1621089504`, `L1621089510`.
  - Bottega Veneta: 2 variants in 1 group (`569041VMAA02248`, `569041VMAA03715`). Their product names differ.
  - Each of these rows stays its own model.
- **Ambiguous options (`single:ambiguous-options`), 502 Rolex variants in 62 model numbers.** Inside these model numbers, two or more references record identical dial, bracelet and bracelet material. The Rolex candidates record exactly eight facts per reference: colour, diameter, material, movement, bracelet type, bracelet material, power reserve and water resistance. Each fact is present on all 1,465 rows. Nothing captured tells such references apart. Hour markers or other dial details are not recorded. Each of these references therefore stays its own model and keeps its full name with the reference.
  - Example: the four ambiguous `126200` references (`m126200-0005`, `m126200-0006`, `m126200-0029`, `m126200-0030`) form two pairs. One pair is a bright blue dial on Jubilee and the other a bright blue dial on Oyster.
  - Further examples: `m126201-0013`, `m126201-0014`.
  - The model card for `126200` therefore lists its 12 distinguishable variants and no bright blue option.
- **Missing option (`single:missing-option`): none.** No grouped member lacks a varying option.
- **Unrecognised reference (`single:unrecognised-reference`), 19 Longchamp rows.** Their reference does not have the eight-character model code plus three-character colour code shape. They are not guessed into a group.

## Option kinds

| Source | Option kind | Option cells |
|---|---|---:|
| Rolex | dial | 906 |
| Rolex | bracelet | 583 |
| Rolex | bracelet material | 5 |
| LOEWE | colour | 269 |
| Longchamp | colour | 327 |

Of the 914 grouped Rolex variants, 906 carry a dial option. The other 8 belong to models whose only varying option is the bracelet or the bracelet material. No size option appears: no source records sizes of one model as such.

## Arabic model names

| Source | Identical names (`shared`) | Same name with or without the shared diameter (`shared_size`) | Shared base with a colour tail (`colour_tail`) | Primary variant's name (`primary`) |
|---|---:|---:|---:|---:|
| Rolex | 100 | 7 | 0 | 1 |
| LOEWE | 94 | 0 | 0 | 0 |
| Longchamp | 0 | 0 | 82 | 0 |

In run 4, the single remaining `primary` model was `278344rbr`. Its members are named `ساعة رولكس ديت جست 31، 31 مم` and `ساعة رولكس ديت جست، 31 مم`. The model used the primary variant's existing name, `ساعة رولكس ديت جست، 31 مم`.

That fallback no longer exists (defect 3). When member Arabic names differ in a way none of the three rules explains, the group is not formed. Each variant then stays its own model with its own names. Every grouped model name is an existing catalog name. Only the reference, the shared-diameter difference or a verified colour tail is removed. No name is invented.

## Untranslated terms per spec kind

A cell is untranslated when its value has no reviewed Arabic and is shown in its source English with `value_lang: "en"`.

| Source | Spec kind | Untranslated cells / cells | Untranslated distinct values / distinct |
|---|---|---:|---:|
| Rolex | dial | 91 / 1,465 | 7 / 102 |
| Rolex | material | 9 / 1,465 | 6 / 16 |
| Rolex | bracelet material | 2 / 1,465 | 1 / 12 |
| Rolex | diameter, bracelet, movement, power reserve, water resistance | 0 | 0 |
| LOEWE | colour | 269 / 407 | 100 / 110 |
| LOEWE | material | 407 / 407 | 55 / 55 |
| LOEWE | dimensions | 407 / 407 | 101 / 101 |
| Longchamp | colour | 175 / 390 | 36 / 53 |
| Longchamp | material | 390 / 390 | 29 / 29 |
| Longchamp | dimensions | 369 / 369 | 82 / 82 |
| Longchamp | metallic hardware | 320 / 320 | 7 / 7 |
| Longchamp | weight | 291 / 291 | 72 / 72 |
| Longchamp | lining | 275 / 275 | 17 / 17 |
| Longchamp | closure | 272 / 272 | 20 / 20 |
| Bottega Veneta | colour | 6 / 7 | 6 / 7 |
| Bottega Veneta | material | 8 / 8 | 2 / 2 |
| Prada | material | 830 / 830 | 11 / 11 |
| Prada | dimensions | 539 / 539 | 152 / 152 |
| Cartier | material | 463 / 463 | 19 / 19 |
| Cartier | movement | 221 / 227 | 2 / 3 |
| Cartier | diameter | 0 / 33 | 0 / 10 |
| Van Cleef & Arpels | material | 498 / 498 | 21 / 21 |
| Audemars Piguet | material | 3 / 3 | 3 / 3 |
| IWC | material | 3 / 3 | 1 / 1 |
| Jaeger-LeCoultre | material | 2 / 2 | 2 / 2 |
| Jaeger-LeCoultre | calibre | 1 / 1 | 1 / 1 |
| Piaget | material | 3 / 3 | 2 / 2 |

Every other spec kind of the small watch sources (diameter, movement, IWC colour) is fully translated. The unit measures that translate are `mm`/`cm`/`in` values written as `N x N unit`. Formats such as `24.5X18.5X10 cm`, weights in `kg` and dimensions with annotations stay in English. Numbers and units are never converted.

## Spot check of three grouped models

The extra read-only query listed every member of three grouped models next to the facts recorded on its own candidate revision:

- **LOEWE `A039AS0X01`, 9 variants.** References `A039AS0X01-0018`, `-0241`, `-0371`, `-1100`, `-2100`, `-5557`, `-5652`, `-9538` and `-9579`. These are nine distinct catalog rows, each with its own recorded colour: Dark Chestnut, Carmine Red, Mineral Mist, Black, White, Sunrise Orange, Daisy Yellow, Clover Green and Mocha. All nine share material Soft calfskin and dimensions `24.5X18.5X10 cm`. Each option value is exactly that reference's recorded colour and every option key is unique. Black, White and Mocha carry reviewed Arabic; the other colours keep English. The model name is "Small Amazona 180 bag in soft calfskin" / `حقيبة أمازونا صغيرة`, shared by all members.
- **Longchamp `10317987`, 8 variants.** References `10317987001`, `…002`, `…244`, `…555`, `…M19`, `…M62`, `…M66` and `…P55`. Their recorded colours are Black, Mocha, Pistachio, Paper, Cashew, Tundra, Wave and Turtledove. All share material Cowhide leather and the same recorded dimensions. The model name is "Le Pliage Xtra XS Bucket bag" / `حقيبة باكيت Le Pliage Xtra، مقاس صغير جدًا`. That is each member's Arabic name without its colour tail, and every tail matches the member's recorded colour.
- **Rolex `126200`, 12 variants.** This is the largest Rolex model of at most 12 variants. References `m126200-0001` to `-0004`, `-0017`, `-0018` and `-0023` to `-0028`. These are 12 distinct dial and bracelet pairs: Silver, Bright black, Slate, Mint green, Green ombré and White, each on Jubilee and on Oyster. All are 36 mm Oystersteel. The options are exactly these 12 existing references. No combination was constructed; this group simply contains every one of these dials on both bracelets. Dial and bracelet values carry reviewed Arabic.

All three model codes match their references, and every listed reference is a distinct active catalog row. The same query showed the Arabic-name defect described below.

## Defects found and fixed

1. **Quadratic derivation.** Each row looked up its own facts by scanning every fact of the whole catalog, and did so up to nine times. Two later joins scaled the same way: the colour lookup for model names and the duplicate-slug count for option keys. Production could not finish within the client limit. Applying the mapping would also have held its share and exclusive locks for minutes. The facts are now aggregated once per row and carried forward. Option keys use a window function to detect a shared slug, and specs no longer join back to the base rows. On local PGlite with production-shaped synthetic data:
   - 2,091 rows: the derivation fell from 47 s to 1.9 s.
   - 5,091 rows: it takes 4.3 s.
   - The output was byte-for-byte identical to the previous version on the fixtures (91 rows) and on 1,091 and 2,091 synthetic rows.

   A new test derives 1,200 synthetic rows and fails above 10 s. The previous version took 17.9 s on that test.
2. **Arabic model name lost the shared diameter.** In 7 Rolex models, the primary variant's Arabic name omits the `، NN مم` that every other member carries. Examples: `ساعة رولكس ديت جست` against `ساعة رولكس ديت جست، 36 مم` in `126200`, and `ساعة رولكس أويستر بربتشوال` against `ساعة رولكس أويستر بربتشوال، 34 مم` in `124200`. The model fell back to the primary's shorter name, which is less specific than its English name and matches other Datejust sizes. The other five affected models are `126500ln`, `126621`, `126710blnr`, `128235` and `226570`. Now, when the names differ only by a trailing diameter that every member records with the same value, the model uses the existing name that includes it. That value is the case diameter, which the consistency check already requires to be identical. This case is recorded as `shared_size`. A fixture now reproduces the captured shape, and the tests assert the result.
3. **The fallback Arabic model name could carry one variant's colour or reference** (review round 3). When member Arabic names matched none of the three rules, the model took the primary variant's full Arabic name (`name_ar`), so every variant showed that one variant's words. Two synthetic cases show it:
   - A Longchamp pair whose Cognac row ends in a tail other than the reviewed `كونياك`. Both pages got the Black row's `… مقاس متوسط، أسود` as their model name.
   - A LOEWE pair whose Arabic names end in their own, different references. Both got the first row's reference.

   Such a group is now not formed. Its rows stay single (`single:arabic-name-mismatch`), and the evidence records `arabic_name: "unresolved"`. Fixtures cover both cases, plus a pair whose names are identical apart from the reference. The tests also check that no grouped model name contains a member's reference or a dial or colour value. In run 4, only `278344rbr` used the fallback, and its name was harmless. It now stays single (see *Changes since run 4*).
4. **A single could take a grouped model's key, which blocked every mapping.** One example is an eight-character Longchamp reference such as `L1899089`, which is an unrecognised single. Its key was `longchamp-official:L1899089`, the same as the group of `L1899089001` and its siblings. `apply_product_variants()` then refused the whole catalog. Singles are now keyed `<source>:ref:<reference>`, and no model code may contain `:`, so the two key spaces cannot overlap. Fixtures cover the Longchamp case and the matching LOEWE case. The next dry run reports `key_collisions`.
5. **Two smaller defects.**
   - The check in `apply_product_variants()` that refuses an inconsistent model was never exercised. A test now breaks each of its six conditions in turn for one model. It asserts the error and that the previous mapping is unchanged.
   - A second index on `(model_key, position)` duplicated the one the unique constraint already creates, so it was removed.

## Open observations (not changed)

- Option keys drop letters outside `a-z0-9`. For example, "Green ombré" becomes `green-ombr`. The keys are unique and stable but not pretty. They are not shown to visitors.
- Large reviewed-term gaps remain, mainly LOEWE colours, materials and every bag dimension, weight, lining and closure. They stay in English until a reviewed dictionary covers them.
- The 502 ambiguous Rolex references could be grouped only if the source recorded a distinguishing fact, for example hour markers. Without it, they stay single.
- **For the contract owner: the Rolex option `bracelet_material`.** The contract lists only dial and bracelet as Rolex options. The derivation also uses bracelet material, which run 4 shows in 5 option cells. It separates references with the same dial and bracelet type but a different recorded bracelet material. It is kept until the contract owner decides between two options:
  - add "Bracelet material / مادة السوار" to the contract's Rolex options; or
  - remove the kind, so that those references become `single:ambiguous-options` (the count needs a new dry run).
- **For the contract owner: the key of a single.** The contract describes `model_key` as `<source_id>:<model code>`. That is the form of a grouped key. A single's key is `<source_id>:ref:<reference>`.
