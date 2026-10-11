import { analyse, reportText } from "../js/engine.js";
import { SAMPLE_SET } from "../js/samples.js";
import assert from "node:assert/strict";

const r = analyse(SAMPLE_SET);
const t = (type) => r.findings.filter((f) => f.type === type);

assert.deepEqual(r.docs.map((d) => [d.id, d.rev]), [["DB-EL-001", "3"], ["SPEC-EL-012", "2"], ["DWG-EL-104", "1"]]);
assert.equal(t("revision").length, 1, "one outdated revision");
assert.match(t("revision")[0].title, /DB-EL-001/);
assert.deepEqual(t("missing").map((f) => f.title.split(" ")[0]).sort(), ["CAB-EL-220", "PHIL-EL-002"]);
assert.equal(t("standard").length, 1);
assert.match(t("standard")[0].title, /IEC 61439-1/);
assert.equal(t("quantity").length, 1, "breakers only; CTs agree");
assert.match(t("quantity")[0].title, /20 vs 19/);
assert.equal(t("value").length, 1, "short-circuit only; voltage, frequency, temperature agree");
assert.match(t("value")[0].title, /25 kA vs 31.5 kA/);
assert.equal(r.stats.errors, 4);
assert.equal(r.stats.warnings, 2);

// A clean set raises nothing.
const clean = analyse([
  { name: "a.pdf", pages: ["Document No: AA-01 Rev A\nSee BB-02 Rev B. Nominal voltage: 400 V. 3 x pump"] },
  { name: "b.pdf", pages: ["Document No: BB-02 Rev B\nSee AA-01 Rev A. Nominal voltage: 0.4 kV. 3 x pumps"] },
]);
assert.equal(clean.findings.length, 0, JSON.stringify(clean.findings, null, 1));

// Unit conversion: 0.4 kV vs 400 V is the same value; 0.4 kV vs 230 V is not.
const units = analyse([
  { name: "a.pdf", pages: ["Document No: AA-01 Rev A\nNominal voltage: 0.4 kV"] },
  { name: "b.pdf", pages: ["Document No: BB-02 Rev A\nNominal voltage: 230 V"] },
]);
assert.equal(units.findings.length, 1);

// An empty file is reported, not crashed on.
const empty = analyse([{ name: "scan.pdf", pages: [""] }]);
assert.equal(empty.findings[0].type, "unreadable");

assert.ok(reportText(r).includes("20 vs 19"));
console.log("ok —", r.findings.length, "findings in the sample set");
for (const f of r.findings) console.log(" ", f.sev, "·", f.title);
