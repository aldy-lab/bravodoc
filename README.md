# BravoDoc — landing

AI document validator for engineering projects, by Bravo Integrated Solutions.
Live: https://aldy-lab.github.io/bravodoc/

Static site. Pages are generated from `src/` — edit `src/pages/*.html` and
`src/partials/*.html`, never the root `.html` files.

```sh
npm run build      # python3 build.py → index, investors, privacy, 404, sitemap.xml
npm run serve      # http://localhost:8090
npm test           # rule-engine tests
npm run render     # (needs `npm i`) investor PDF + investor share card, from the served site
```

## Pages

- `/` — for engineering teams: the problem with sources, who it is for, the live demo, how it works, a cost-of-manual-checking calculator, your documents, roadmap, partnership, FAQ, a form with four intents (pilot, co-development, investing, other).
- `/investors.html` — the investor overview, and `assets/BravoDoc-investor-overview.pdf` printed from it.
- `/privacy.html`, `/404.html`.

## What is where

| File | What it does |
| --- | --- |
| `index.html` | The page. Content follows the BravoDoc deck (2025). |
| `css/style.css` | Tokens at the top: palette → roles → type scale. |
| `js/main.js` | **Go-live values at the top (`CONFIG`)**, reveals, the hero loop, the demo UI, the pilot form. |
| `js/engine.js` | The rule engine: references, revisions, standard editions, quantities, design values. Pure — runs in the browser and in Node. |
| `js/samples.js` | The invented sample package behind “Run the sample package”. |
| `vendor/` | pdf.js 4.10 and mammoth 1.8, self-hosted so the page makes no third-party requests. |

## The live demo

Files a visitor drops are read in the browser (pdf.js for PDF, mammoth for
.docx) and checked by `engine.js`. Nothing is uploaded. It is the rule layer
only — scans and CAD files need OCR, which the page says is part of the pilot.

## Go-live values

`CONFIG` in `js/main.js`. A blank value removes its element, never leaves a
dead link. `formEndpoint` blank → the form opens a prefilled email to
`email`; both blank → the form is removed. `plausibleDomain` switches on
cookieless analytics — update `privacy.html` in the same change.

`CONFIG.investor` holds what only the company can confirm: the round
(`ask`, `instrument`), `traction`, `useOfFunds`, `team`. Each block on the
investor page stays hidden until its field is filled. After filling it, run
`npm run render` so the PDF says the same as the page.

The two figures on the problem sections are sourced and linked: Get It Right
Initiative (21% of project cost on avoidable error) and Robinson 2010 (56% of
engineers' time on information).
