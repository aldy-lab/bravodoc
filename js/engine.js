/* BravoDoc rule engine.
 *
 * Takes a set of documents as plain text (one string per page) and returns
 * what does not agree between them: references to documents that are not in
 * the set, references to an outdated revision, a standard cited in two
 * editions, a quantity that differs between a list and a drawing, a design
 * value that differs between two documents.
 *
 * Pure: no DOM, no network. The page runs it in the browser, the tests run it
 * in Node, and nothing a user drops on the page leaves their computer.
 */

const STD_BODIES = ["IEC", "EN", "ISO", "IEEE", "DIN", "VDE", "BS", "NFPA", "NEC", "UL", "ANSI", "CENELEC", "HD"];

// A document number: two to six capitals, then one to three dash groups, with a digit somewhere.
const ID_RE = /\b([A-Z]{2,6}(?:-[A-Z0-9]{1,8}){1,3})\b/g;
const REV_AFTER_RE = /^[\s,;(]*Rev(?:ision)?\.?\s*:?\s*([A-Z0-9]{1,3})\b/i;
const OWN_ID_RE = /\b(?:Doc(?:ument)?\.?\s*(?:No\.?|Number|ID|#)|Drawing\s*No\.?|Dwg\.?\s*No\.?)\s*[:\-]?\s*([A-Z]{2,6}(?:-[A-Z0-9]{1,8}){1,3})/i;
const OWN_REV_RE = /\bRev(?:ision)?\.?\s*(?:No\.?)?\s*[:\-]?\s*(?:Rev\.?\s*)?([A-Z0-9]{1,3})\b/i;
const STD_RE = new RegExp(
  "\\b(" + STD_BODIES.join("|") + ")(?:\\s|-)?(\\d{2,5}(?:[-.]\\d{1,3}){0,3})(?:\\s*[:/]\\s*((?:19|20)\\d{2}))?",
  "g"
);

const UNITS = {
  v: ["V", 1], kv: ["V", 1e3], mv: ["V", 1e6],
  a: ["A", 1], ka: ["A", 1e3],
  hz: ["Hz", 1],
  w: ["W", 1], kw: ["W", 1e3], mw: ["W", 1e6],
  va: ["VA", 1], kva: ["VA", 1e3], mva: ["VA", 1e6],
  "°c": ["°C", 1], degc: ["°C", 1],
  "mm²": ["mm²", 1], mm2: ["mm²", 1], sqmm: ["mm²", 1],
  mm: ["mm", 1], m: ["mm", 1e3],
  bar: ["bar", 1], mpa: ["bar", 10], kpa: ["bar", 0.01],
  "%": ["%", 1],
};
const UNIT_ALT = "kV|MV|V|kA|A|Hz|kW|MW|W|kVA|MVA|VA|°C|degC|mm²|mm2|sqmm|mm|m|bar|MPa|kPa|%";
const PARAM_RE = new RegExp(
  "((?:[A-Za-z][A-Za-z\\-]*[ \\t]){0,3}[A-Za-z][A-Za-z\\-]*)[ \\t]*[:=][ \\t]*(\\d+(?:[.,]\\d+)?)[ \\t]*(" + UNIT_ALT + ")(?![A-Za-z0-9])",
  "g"
);
const QTY_RES = [
  // "20 x circuit breaker", "20 pcs circuit breakers"
  /\b(\d{1,5})\s*(?:x|×|pcs\.?|pieces|units|no\.)\s+([A-Za-z][A-Za-z\- ]{2,40}?)(?=\s*(?:[,.;()\n]|$|\d))/gi,
  // "Circuit breakers: 20 pcs"
  /\b([A-Za-z][A-Za-z\- ]{2,40}?)\s*[:\-–]\s*(\d{1,5})\s*(?:pcs\.?|pieces|units|no\.)(?![A-Za-z])/gi,
];
const STOP = new Set(["the", "a", "an", "of", "for", "and", "type", "new", "total", "qty", "quantity", "supply", "scope"]);

const norm = (s) => s.replace(/\s+/g, " ").trim();
const singular = (w) => (/ss$/.test(w) ? w : w.replace(/(ches|shes|xes)$/, (m) => m.slice(0, -2)).replace(/ies$/, "y").replace(/s$/, ""));
const itemKey = (s) =>
  norm(s.toLowerCase())
    .split(" ")
    .filter((w) => w && !STOP.has(w))
    .map(singular)
    .join(" ");
const paramKey = (s) => {
  const words = norm(s.toLowerCase()).split(" ").filter((w) => !STOP.has(w));
  return words.slice(-3).join(" ");
};

function snippet(text, index, length) {
  const from = Math.max(0, index - 48);
  const to = Math.min(text.length, index + length + 48);
  return {
    before: (from > 0 ? "…" : "") + norm(text.slice(from, index)),
    match: norm(text.slice(index, index + length)),
    after: norm(text.slice(index + length, to)) + (to < text.length ? "…" : ""),
  };
}

function isStandardId(id) {
  const head = id.split("-")[0];
  return STD_BODIES.includes(head);
}

/** Who a document says it is: its number and revision, from the first page or the file name. */
function identify(doc) {
  const first = (doc.pages[0] || "").slice(0, 1500);
  let id = null;
  let rev = null;
  const own = first.match(OWN_ID_RE);
  if (own) id = own[1].toUpperCase();
  if (!id) {
    const fromName = doc.name.toUpperCase().match(/[A-Z]{2,6}(?:-[A-Z0-9]{1,8}){1,3}/);
    if (fromName && /\d/.test(fromName[0])) id = fromName[0];
  }
  if (!id) {
    ID_RE.lastIndex = 0;
    let m;
    while ((m = ID_RE.exec(first))) {
      if (/\d/.test(m[1]) && !isStandardId(m[1])) { id = m[1]; break; }
    }
  }
  const revZone = own ? first.slice(own.index, own.index + 400) : first;
  const r = revZone.match(OWN_REV_RE) || first.match(OWN_REV_RE);
  if (r) rev = r[1].toUpperCase();
  return { id, rev };
}

function eachMatch(re, text, fn) {
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(text))) {
    fn(m);
    if (m.index === re.lastIndex) re.lastIndex++;
  }
}

/**
 * @param {{name: string, pages: string[]}[]} docs
 */
export function analyse(docs) {
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const meta = docs.map((d) => ({ name: d.name, pages: d.pages.length, chars: d.pages.reduce((n, p) => n + p.length, 0), ...identify(d) }));
  const byId = new Map(meta.filter((m) => m.id).map((m) => [m.id, m]));

  const refs = []; // {id, rev, doc, page, snip}
  const stds = []; // {key, body, num, year, doc, page, snip}
  const qtys = []; // {key, label, n, doc, page, snip}
  const params = []; // {key, label, value, unit, raw, doc, page, snip}

  docs.forEach((d, di) => {
    const own = meta[di].id;
    d.pages.forEach((text, pi) => {
      const at = { doc: di, page: pi + 1 };

      eachMatch(ID_RE, text, (m) => {
        const id = m[1].toUpperCase();
        if (id === own || !/\d/.test(id) || isStandardId(id)) return;
        // Skip the document's own header line ("Document No: X").
        const tail = text.slice(m.index + m[0].length, m.index + m[0].length + 24);
        const rv = tail.match(REV_AFTER_RE);
        const len = m[0].length + (rv ? rv[0].length : 0);
        refs.push({ id, rev: rv ? rv[1].toUpperCase() : null, ...at, snip: snippet(text, m.index, len) });
      });

      eachMatch(STD_RE, text, (m) => {
        const body = m[1].toUpperCase();
        const num = m[2];
        stds.push({ key: body + " " + num, year: m[3] || null, ...at, snip: snippet(text, m.index, m[0].length) });
      });

      for (const re of QTY_RES) {
        eachMatch(re, text, (m) => {
          const numFirst = /^\d/.test(m[1]);
          const n = Number(numFirst ? m[1] : m[2]);
          const label = norm(numFirst ? m[2] : m[1]);
          const key = itemKey(label);
          if (!key || key.length < 3) return;
          qtys.push({ key, label, n, ...at, snip: snippet(text, m.index, m[0].length) });
        });
      }

      eachMatch(PARAM_RE, text, (m) => {
        const label = norm(m[1]);
        const key = paramKey(label);
        if (!key || /^(rev|revision|page|sheet|no|date)$/.test(key)) return;
        const u = UNITS[m[3].toLowerCase()];
        if (!u) return;
        const value = Number(m[2].replace(",", ".")) * u[1];
        params.push({ key, label, value, unit: u[0], raw: m[2] + " " + m[3], ...at, snip: snippet(text, m.index, m[0].length) });
      });
    });
  });

  const findings = [];
  const where = (x) => ({ doc: x.doc, page: x.page, snip: x.snip });
  const group = (arr, k) => arr.reduce((g, x) => (g.get(x[k]) || g.set(x[k], []).get(x[k])).push(x) && g, new Map());

  // 1. References: missing from the set, or pointing at a revision that is not the current one.
  for (const [id, list] of group(refs, "id")) {
    const target = byId.get(id);
    if (!target) {
      findings.push({
        sev: "warn", type: "missing",
        title: `${id} is referenced but not in the set`,
        detail: `Cited ${list.length === 1 ? "once" : list.length + " times"}. Add it to check the reference, or confirm it is outside this package.`,
        at: list.map(where),
      });
      const revs = [...new Set(list.map((r) => r.rev).filter(Boolean))];
      if (revs.length > 1)
        findings.push({
          sev: "error", type: "revision",
          title: `${id} is cited in ${revs.length} different revisions`,
          detail: `Revisions cited: ${revs.join(", ")}. Only one of them can be current.`,
          at: list.filter((r) => r.rev).map(where),
        });
      continue;
    }
    const stale = list.filter((r) => r.rev && target.rev && r.rev !== target.rev);
    if (stale.length)
      findings.push({
        sev: "error", type: "revision",
        title: `${id} is referenced at an outdated revision`,
        detail: `The set holds ${id} Rev ${target.rev}; ${stale.length === 1 ? "one reference cites" : stale.length + " references cite"} Rev ${[...new Set(stale.map((s) => s.rev))].join(", ")}.`,
        at: stale.map(where),
      });
  }

  // 2. Standards cited in more than one edition.
  for (const [key, list] of group(stds.filter((s) => s.year), "key")) {
    const years = [...new Set(list.map((s) => s.year))].sort();
    if (years.length > 1)
      findings.push({
        sev: "error", type: "standard",
        title: `${key} is cited in ${years.length} editions`,
        detail: `Editions cited: ${years.join(" and ")}. The documents should agree on one.`,
        at: list.map(where),
      });
  }

  // 3. Quantities that differ between documents.
  for (const [, list] of group(qtys, "key")) {
    const docsSeen = new Set(list.map((q) => q.doc));
    const counts = [...new Set(list.map((q) => q.n))];
    if (docsSeen.size > 1 && counts.length > 1)
      findings.push({
        sev: "error", type: "quantity",
        title: `${capital(list[0].label)}: ${counts.join(" vs ")}`,
        detail: `The count differs between documents. A list and its drawing should show the same number.`,
        at: list.map(where),
      });
  }

  // 4. Design values that differ between documents.
  for (const [, list] of group(params, "key")) {
    const values = [...new Set(list.map((p) => p.value + p.unit))];
    const docsSeen = new Set(list.map((p) => p.doc));
    if (docsSeen.size > 1 && values.length > 1)
      findings.push({
        sev: "error", type: "value",
        title: `${capital(list[0].label)}: ${[...new Set(list.map((p) => p.raw))].join(" vs ")}`,
        detail: `The same design value is stated differently. One source should own it — usually the Design Basis.`,
        at: list.map(where),
      });
  }

  // 5. Documents the engine could not identify.
  meta.forEach((m, i) => {
    if (!m.chars)
      findings.push({ sev: "info", type: "unreadable", title: `${m.name}: no text found`, detail: "Probably a scan or a drawing exported as an image. Reading those needs OCR, which is part of the pilot.", at: [] });
    else if (!m.id)
      findings.push({ sev: "info", type: "identity", title: `${m.name}: no document number found`, detail: "References to this file cannot be matched until it carries a document number.", at: [] });
    void i;
  });

  const order = { error: 0, warn: 1, info: 2 };
  findings.sort((a, b) => order[a.sev] - order[b.sev]);

  const resolved = refs.filter((r) => byId.has(r.id)).length;
  return {
    docs: meta,
    findings,
    stats: {
      documents: docs.length,
      pages: meta.reduce((n, m) => n + m.pages, 0),
      references: refs.length,
      resolved,
      standards: new Set(stds.map((s) => s.key)).size,
      values: params.length + qtys.length,
      errors: findings.filter((f) => f.sev === "error").length,
      warnings: findings.filter((f) => f.sev === "warn").length,
      ms: Math.max(1, Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - t0)),
    },
  };
}

function capital(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** The report as plain text, for the download button. */
export function reportText(result) {
  const lines = [];
  const s = result.stats;
  lines.push("BravoDoc validation report", new Date().toISOString().slice(0, 16).replace("T", " "), "");
  lines.push(`${s.documents} documents, ${s.pages} pages, ${s.references} references (${s.resolved} resolved), ${s.standards} standards`);
  lines.push(`${s.errors} errors, ${s.warnings} warnings`, "");
  lines.push("Documents");
  result.docs.forEach((d) => lines.push(`  ${d.id || "—"}  Rev ${d.rev || "—"}  ${d.name}`));
  lines.push("");
  result.findings.forEach((f, i) => {
    lines.push(`${i + 1}. [${f.sev.toUpperCase()}] ${f.title}`, `   ${f.detail}`);
    f.at.forEach((a) => lines.push(`   – ${result.docs[a.doc].name}, p. ${a.page}: ${a.snip.before} [${a.snip.match}] ${a.snip.after}`));
    lines.push("");
  });
  if (!result.findings.length) lines.push("No conflicts found.");
  return lines.join("\n");
}
