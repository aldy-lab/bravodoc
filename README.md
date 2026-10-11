# BravoDoc — landing

AI document validator for engineering projects, by Bravo Integrated Solutions.
Live: https://aldy-lab.github.io/bravodoc/

Static site, no build step. Open `index.html` through any static server:

```sh
npm run serve      # http://localhost:8090
npm test           # rule-engine tests
```

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
dead link. `formEndpoint` blank → the pilot form opens a prefilled email to
`email`; both blank → the form is removed.
