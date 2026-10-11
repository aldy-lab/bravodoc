/* ==========================================================================
   GO-LIVE VALUES — fill in, or leave "" to remove the element from the page.
   A blank value never ships as a dead link: the element and its empty
   container are removed instead.
   ========================================================================== */
const CONFIG = {
  contactName: "Andy Fayngold",              // from the deck, slide 14
  email: "bravointegrated@gmail.com",        // deck contact; pilot requests fall back to a prefilled email
  phone: "+420 608 141 908",                 // deck contact
  formEndpoint: "",                          // e.g. "https://formspree.io/f/xxxxxxxx" — POSTs JSON instead of opening email
};

import { analyse, reportText } from "./engine.js";
import { SAMPLE_SET } from "./samples.js";

const root = document.documentElement;
root.classList.add("js");
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/* ---------- config → DOM ---------- */
const mailto = (to, subject, body = "") =>
  `mailto:${to}?subject=${encodeURIComponent(subject || "")}${body ? "&body=" + encodeURIComponent(body) : ""}`;

$$("[data-cfg]").forEach((el) => {
  const key = el.dataset.cfg;
  const val = (CONFIG[key] || "").trim();
  if (!val) { el.remove(); return; }
  if (key === "email") { el.href = mailto(val, el.dataset.subject); el.textContent = val; }
  else if (key === "phone") { el.href = "tel:" + val.replace(/[^\d+]/g, ""); el.textContent = val; }
  else el.textContent = val;
});
$$("[data-contact-block]").forEach((b) => { if (!b.children.length) b.remove(); });
$$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

/* ---------- reveal on scroll ---------- */
// Siblings inside one parent stagger by 70 ms each.
const parents = new Map();
$$(".reveal").forEach((el) => {
  const p = el.parentElement;
  const i = parents.get(p) || 0;
  parents.set(p, i + 1);
  if (i) el.style.setProperty("--d", Math.min(i * 0.07, 0.42) + "s");
});
const io = new IntersectionObserver(
  (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }),
  { rootMargin: "0px 0px -8% 0px", threshold: 0.01 }
);
$$(".reveal, [data-road]").forEach((el) => io.observe(el));

/* ---------- header: solid after the hero starts to scroll; scroll-spy ---------- */
const hdr = $("[data-hdr]");
const navLinks = $$(".nav a");
const onScrollHeader = () => hdr.classList.toggle("is-solid", scrollY > 24);
const spy = new IntersectionObserver(
  (entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    navLinks.forEach((a) => a.classList.toggle("is-on", a.getAttribute("href") === "#" + e.target.id));
  }),
  { rootMargin: "-45% 0px -50% 0px" }
);
$$("main > section[id]").forEach((s) => spy.observe(s));

/* ---------- how-it-works: the line fills as you read down ---------- */
const steps = $("[data-steps]");
const stepItems = $$(".step", steps);
const fill = $("[data-steps-fill]");
function onScrollSteps() {
  const r = steps.getBoundingClientRect();
  const vh = innerHeight;
  const p = Math.min(1, Math.max(0, (vh * 0.7 - r.top) / (r.height || 1)));
  fill.parentElement.style.setProperty("--p", p.toFixed(3));
  stepItems.forEach((s) => s.classList.toggle("is-in", s.getBoundingClientRect().top < vh * 0.72));
}
if (reduced) { stepItems.forEach((s) => s.classList.add("is-in")); fill.parentElement.style.setProperty("--p", 1); }

let ticking = false;
addEventListener("scroll", () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => { ticking = false; onScrollHeader(); if (!reduced) onScrollSteps(); });
}, { passive: true });
onScrollHeader();
if (!reduced) onScrollSteps();

/* ---------- hero: three sheets, a scan, three findings, on a loop ---------- */
(function hero() {
  const fig = $("[data-sheets]");
  if (!fig) return;
  const cap = $("[data-cap]", fig);
  const capN = $("[data-cap-n]", fig);
  const hits = [
    { rows: ["ref"], link: "ref", flag: "ref" },
    { rows: ["sc1", "sc2"], link: "sc", flag: "sc" },
    { rows: ["cb1", "cb2"], link: "cb", flag: "cb" },
  ];
  const set = (sel, on) => $$(sel, fig).forEach((el) => el.classList.toggle("is-on", on));
  const hit = (h, on) => {
    h.rows.forEach((r) => $(`[data-row="${r}"]`, fig).classList.toggle("is-hit", on));
    set(`[data-link="${h.link}"]`, on);
    set(`[data-flag="${h.flag}"]`, on);
  };
  const final = () => { hits.forEach((h) => hit(h, true)); cap.textContent = "3 documents compared"; capN.textContent = "3 issues"; };
  if (reduced) { final(); return; }

  let visible = true, running = false;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !running) loop(); }, { threshold: 0.15 }).observe(fig);

  async function loop() {
    running = true;
    while (visible && !document.hidden) {
      hits.forEach((h) => hit(h, false));
      cap.textContent = "Reading 3 documents…";
      capN.textContent = "0 / 3 issues";
      fig.classList.remove("is-scanning");
      void fig.offsetWidth;
      fig.classList.add("is-scanning");
      await wait(900);
      cap.textContent = "Comparing references, values and counts…";
      for (let i = 0; i < hits.length; i++) {
        hit(hits[i], true);
        capN.textContent = `${i + 1} / 3 issues`;
        await wait(800);
      }
      cap.textContent = "3 documents compared";
      capN.textContent = "3 issues";
      await wait(4600);
    }
    running = false;
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden && visible && !running) loop(); });
})();

/* ---------- count-up ---------- */
function countTo(el, n, ms = 700) {
  if (reduced || n === 0) { el.textContent = n; return; }
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / ms);
    el.textContent = Math.round(n * (1 - Math.pow(1 - k, 3)));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ---------- demo ---------- */
(function demo() {
  const box = $("[data-demo]");
  if (!box) return;
  const drop = $("[data-drop]", box);
  const input = $("[data-file]", box);
  const list = $("[data-files]", box);
  const empty = $("[data-empty]", box);
  const busy = $("[data-busy]", box);
  const busyBar = $(".busy-bar i", box);
  const busyT = $("[data-busy-t]", box);
  const out = $("[data-out]", box);
  const MAX_FILES = 20, MAX_BYTES = 20 * 1024 * 1024;
  let last = null;

  const ext = (name) => (name.split(".").pop() || "").toLowerCase();

  let pdfjs = null;
  async function readPdf(buf) {
    if (!pdfjs) {
      pdfjs = await import("../vendor/pdf.min.mjs");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("../vendor/pdf.worker.min.mjs", import.meta.url).href;
    }
    const doc = await pdfjs.getDocument({ data: buf, isEvalSupported: false }).promise;
    const pages = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const tc = await page.getTextContent();
      // Rebuild lines from positions: a new y starts a line, a gap on the same line is a space.
      let text = "", lastY = null, lastEnd = null;
      for (const it of tc.items) {
        if (!("str" in it)) continue;
        const [, , , , x, y] = it.transform;
        if (lastY !== null && Math.abs(y - lastY) > 2) text += "\n";
        else if (lastEnd !== null && x - lastEnd > 1 && !/\s$/.test(text) && !/^\s/.test(it.str)) text += " ";
        text += it.str;
        if (it.hasEOL) text += "\n";
        lastY = y; lastEnd = x + (it.width || 0);
      }
      pages.push(text);
    }
    return pages;
  }

  let mammothP = null;
  function loadMammoth() {
    return (mammothP ||= new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = new URL("../vendor/mammoth.browser.min.js", import.meta.url).href;
      s.onload = () => res(window.mammoth);
      s.onerror = rej;
      document.head.append(s);
    }));
  }
  async function readDocx(buf) {
    const m = await loadMammoth();
    const r = await m.extractRawText({ arrayBuffer: buf });
    return [r.value];
  }

  async function readFile(file) {
    const e = ext(file.name);
    if (e === "pdf") return readPdf(await file.arrayBuffer());
    if (e === "docx") return readDocx(await file.arrayBuffer());
    if (["txt", "md", "csv"].includes(e)) return (await file.text()).split("\f");
    throw new Error("unsupported");
  }

  function fileRow(name, i) {
    const li = document.createElement("li");
    li.style.setProperty("--i", i);
    li.innerHTML = `<span class="f-ext">${esc(ext(name) || "?")}</span><span class="f-name">${esc(name)}</span><span class="f-st">queued</span>`;
    list.append(li);
    return $(".f-st", li);
  }

  function show(state) {
    empty.hidden = state !== "empty";
    busy.hidden = state !== "busy";
    out.hidden = state !== "out";
  }

  async function run(source) {
    list.innerHTML = "";
    show("busy");
    busyBar.style.width = "0%";
    const docs = [];
    const items = source.slice(0, MAX_FILES);
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const st = fileRow(it.name, i);
      busyT.textContent = `Reading ${it.name}`;
      try {
        if (it.pages) {
          await wait(reduced ? 0 : 260);
          docs.push({ name: it.name, pages: it.pages });
        } else if (it.size > MAX_BYTES) {
          throw new Error("over 20 MB");
        } else {
          docs.push({ name: it.name, pages: await readFile(it) });
        }
        const p = docs[docs.length - 1].pages;
        st.textContent = `${p.length} p.`;
        st.classList.add("ok");
      } catch (err) {
        st.textContent = err.message === "unsupported" ? "not supported" : err.message === "over 20 MB" ? "over 20 MB" : "could not read";
        st.classList.add("bad");
      }
      busyBar.style.width = ((i + 1) / items.length) * 80 + "%";
    }
    if (source.length > MAX_FILES) fileRow(`${source.length - MAX_FILES} more files skipped (limit ${MAX_FILES})`, items.length).classList.add("bad");
    if (!docs.length) { show("empty"); $("p", empty).textContent = "None of these files could be read. Try PDF or Word."; return; }

    busyT.textContent = "Comparing references, revisions and values…";
    await wait(reduced ? 0 : 420);
    busyBar.style.width = "100%";
    const result = analyse(docs);
    await wait(reduced ? 0 : 280);
    last = result;
    render(result);
  }

  function render(r) {
    show("out");
    const s = r.stats;
    ["documents", "references", "errors", "warnings"].forEach((k) => countTo($(`[data-stat="${k}"]`, out), s[k]));
    $("[data-doclist]", out).innerHTML = r.docs
      .map((d) => `<li><b>${esc(d.id || d.name)}</b>${d.rev ? " · Rev " + esc(d.rev) : ""}</li>`)
      .join("");
    const ol = $("[data-findings]", out);
    if (!r.findings.length) {
      ol.innerHTML = `<li class="ok-state"><b>No conflicts found</b>${s.references} references checked across ${s.documents} documents.</li>`;
    } else {
      ol.innerHTML = r.findings
        .map((f, i) => `
        <li class="finding${i === 0 ? " is-open" : ""}" data-sev="${f.sev}" style="--i:${i}">
          <button type="button" aria-expanded="${i === 0}">
            <span class="sev sev-${f.sev}">${f.sev === "warn" ? "warning" : f.sev}</span>
            <span class="f-title">${esc(f.title)}<span class="f-detail">${esc(f.detail)}</span></span>
            <svg class="chev" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg>
          </button>
          <div class="f-at"><ul>${f.at
            .map((a) => `<li><span class="f-src">${esc(r.docs[a.doc].id || r.docs[a.doc].name)} · p. ${a.page}</span>${esc(a.snip.before)} <mark>${esc(a.snip.match)}</mark> ${esc(a.snip.after)}</li>`)
            .join("")}</ul></div>
        </li>`)
        .join("");
    }
    $("[data-foot]", out).textContent = `${s.pages} pages · ${s.resolved}/${s.references} references resolved · ${s.standards} standards · checked in ${s.ms} ms, on this device`;
  }

  box.addEventListener("click", (e) => {
    const b = e.target.closest(".finding > button");
    if (!b) return;
    const li = b.parentElement;
    const open = li.classList.toggle("is-open");
    b.setAttribute("aria-expanded", open);
  });

  $("[data-pick]", box).addEventListener("click", (e) => { e.stopPropagation(); input.click(); });
  $("[data-sample]", box).addEventListener("click", (e) => { e.stopPropagation(); run(SAMPLE_SET); });
  drop.addEventListener("click", () => input.click());
  drop.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } });
  input.addEventListener("change", () => { if (input.files.length) run([...input.files]); input.value = ""; });
  ["dragenter", "dragover"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add("is-over"); }));
  ["dragleave", "drop"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove("is-over"); }));
  drop.addEventListener("drop", (e) => { const f = [...(e.dataTransfer?.files || [])]; if (f.length) run(f); });
  // Dropping a file anywhere else on the page should not navigate away from it.
  addEventListener("dragover", (e) => e.preventDefault());
  addEventListener("drop", (e) => e.preventDefault());

  $("[data-download]", box).addEventListener("click", () => {
    if (!last) return;
    const blob = new Blob([reportText(last)], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `bravodoc-report-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
})();

/* ---------- pilot request form ---------- */
(function form() {
  const f = $("[data-form]");
  if (!f) return;
  const msg = $("[data-form-msg]", f);
  const endpoint = CONFIG.formEndpoint.trim();
  const to = CONFIG.email.trim();
  if (!endpoint && !to) { f.remove(); return; }

  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.className = "f-msg";
    if (f.elements.website.value) return; // honeypot
    let bad = null;
    ["name", "company", "email"].forEach((n) => {
      const el = f.elements[n];
      const ok = el.value.trim() && (n !== "email" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim()));
      el.setAttribute("aria-invalid", ok ? "false" : "true");
      if (!ok && !bad) bad = el;
    });
    if (bad) { msg.textContent = "Please fill in your name, company and a work email."; msg.classList.add("is-err"); bad.focus(); return; }

    const data = {
      name: f.elements.name.value.trim(),
      company: f.elements.company.value.trim(),
      email: f.elements.email.value.trim(),
      documents: $$('input[name="docs"]:checked', f).map((c) => c.value).join(", "),
      message: f.elements.message.value.trim(),
    };
    if (endpoint) {
      const btn = $("button[type=submit]", f);
      btn.disabled = true;
      msg.textContent = "Sending…";
      try {
        const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(data) });
        if (!res.ok) throw new Error(res.status);
        f.reset();
        msg.textContent = "Thank you — we will reply within two working days.";
        msg.classList.add("is-ok");
      } catch {
        msg.innerHTML = to ? `Could not send. Please email <a href="${mailto(to, "BravoDoc pilot")}">${esc(to)}</a>.` : "Could not send. Please try again.";
        msg.classList.add("is-err");
      } finally { btn.disabled = false; }
      return;
    }
    const body = [
      `Name: ${data.name}`, `Company: ${data.company}`, `Email: ${data.email}`,
      data.documents && `Documents: ${data.documents}`, "", data.message,
    ].filter((l) => l !== false && l !== undefined).join("\n");
    location.href = mailto(to, `BravoDoc pilot — ${data.company}`, body);
    msg.textContent = "Your email app should open with the request filled in.";
    msg.classList.add("is-ok");
  });
})();

/* ---------- the footer stamp checks the page it is printed on ---------- */
(function stamp() {
  const b = $("[data-stamp]");
  const toast = $("[data-toast]");
  if (!b) return;
  let t;
  b.addEventListener("click", () => {
    const text = $$("main section:not(.hero)").map((s) => s.innerText).join("\n");
    const r = analyse([{ name: "this page", pages: ["Document No: BD-WEB-001 Revision: Rev 1\n" + text] }]);
    const n = r.stats.errors;
    b.classList.add("is-checked");
    b.textContent = "BD-WEB-001 · Rev 1 · checked";
    toast.textContent = n
      ? `This page has ${n} conflict${n > 1 ? "s" : ""}. We are on it.`
      : "BD-WEB-001 Rev 1, checked by BravoDoc: this page agrees with itself. 0 conflicts.";
    toast.hidden = false;
    clearTimeout(t);
    t = setTimeout(() => (toast.hidden = true), 4200);
  });
})();
