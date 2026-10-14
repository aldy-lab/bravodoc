#!/usr/bin/env python3
"""Writes the site's pages from src/: one layout, shared header/footer/sprite,
and a sitemap generated from the same page list, so nothing drifts.

    python3 build.py

Edit src/pages/*.html and src/partials/*.html, never the root .html files.
"""
from pathlib import Path
import json

ROOT = Path(__file__).parent
SRC = ROOT / "src"
BASE = "https://aldy-lab.github.io/bravodoc/"

# path on the site, source page, <title>, description, nav key, in sitemap
PAGES = [
    ("", "index.html", "BravoDoc — AI document validator for engineering projects",
     "BravoDoc reads engineering documents, compares them and flags missing references, outdated revisions and conflicting values in seconds. Try it on your own files — they never leave your browser.",
     "home", True),
    ("investors.html", "investors.html", "BravoDoc — investor overview",
     "BravoDoc turns the manual cross-checking of engineering documents into software. The problem, the working prototype, the plan from pilot to SaaS, and how to reach the team.",
     "investors", True),
    ("privacy.html", "privacy.html", "Privacy — BravoDoc",
     "What this site does with your data: no cookies, no tracking, demo files never leave your browser, and form messages go to one mailbox.",
     "privacy", True),
    ("404.html", "404.html", "Page not found — BravoDoc",
     "This page does not exist.", "404", False),
]

LAYOUT = """<!doctype html>
<html lang="en" data-page="{key}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="#06080b">
{robots}<link rel="canonical" href="{url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="BravoDoc">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{base}assets/{og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<link rel="preload" href="assets/fonts/inter-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="css/style.css">
<script type="application/ld+json">{ld}</script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
{header}
{main}
{footer}
<div class="toast" data-toast role="status" hidden></div>
{sprite}
<script src="js/main.js" type="module"></script>
</body>
</html>
"""

ORG = {"@type": "Organization", "name": "Bravo Integrated Solutions", "url": BASE}
APP = {
    "@type": "SoftwareApplication", "name": "BravoDoc", "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web", "url": BASE, "publisher": ORG,
    "description": "AI document validator for engineering projects: checks references, revisions, standards, quantities and design values across a document package.",
}


def faq_ld(main: str):
    """FAQPage from the <details class="faq-q"> blocks, so the markup and the schema cannot disagree."""
    import re
    items = []
    for q, a in re.findall(r'<details class="faq-q"[^>]*>\s*<summary>(.*?)</summary>\s*(.*?)</details>', main, re.S):
        clean = lambda s: re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", s)).strip()
        items.append({"@type": "Question", "name": clean(q), "acceptedAnswer": {"@type": "Answer", "text": clean(a)}})
    return {"@type": "FAQPage", "mainEntity": items} if items else None


def build():
    part = lambda n: (SRC / "partials" / f"{n}.html").read_text()
    header, footer, sprite = part("header"), part("footer"), part("sprite")
    for path, src, title, desc, key, _ in PAGES:
        main = (SRC / "pages" / src).read_text()
        url = BASE + path
        graph = [ORG, APP]
        if key == "home":
            f = faq_ld(main)
            if f: graph.append(f)
        if key in ("investors", "privacy"):
            graph.append({"@type": "BreadcrumbList", "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "BravoDoc", "item": BASE},
                {"@type": "ListItem", "position": 2, "name": title.split(" — ")[-1] if key == "investors" else "Privacy", "item": url},
            ]})
        ld = json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False)
        html = LAYOUT.format(
            key=key, title=title, desc=desc, url=url, base=BASE, ld=ld,
            og="og-investors.jpg" if key == "investors" else "og.jpg",
            # GitHub Pages serves 404.html at any depth; the base keeps its relative links working there.
            robots='<meta name="robots" content="noindex">\n<base href="/bravodoc/">\n' if key == "404" else "",
            header=header.replace(f'data-nav="{key}"', f'data-nav="{key}" aria-current="page"'),
            main=main, footer=footer, sprite=sprite,
        )
        (ROOT / (path or "index.html")).write_text(html)
    locs = "\n".join(f"  <url><loc>{BASE}{p}</loc></url>" for p, *_, inmap in PAGES if inmap)
    (ROOT / "sitemap.xml").write_text(
        f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{locs}\n</urlset>\n'
    )
    print("built", ", ".join(p or "index.html" for p, *_ in PAGES))


if __name__ == "__main__":
    build()
