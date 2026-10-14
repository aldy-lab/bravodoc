/* Renders the files that are made from the pages themselves:
 *   assets/BravoDoc-investor-overview.pdf  — investors.html, print styles, A4
 *   assets/og-investors.jpg                — the investor share card
 * Run after `python3 build.py` and after changing CONFIG.investor, with the
 * site served locally:  npm run serve  &  npm run render
 */
import { chromium } from "playwright";
const BASE = process.env.BASE || "http://127.0.0.1:8090/";
const b = await chromium.launch();

const p = await b.newPage();
await p.goto(BASE + "investors.html", { waitUntil: "networkidle" });
await p.emulateMedia({ media: "print" });
await p.pdf({ path: "assets/BravoDoc-investor-overview.pdf", format: "A4", printBackground: true, preferCSSPageSize: true });

const og = await b.newPage({ viewport: { width: 1200, height: 630 } });
await og.goto(BASE + "investors.html", { waitUntil: "networkidle" });
await og.addStyleTag({ content: ".hdr .nav,.hdr .btn,.cta-row,.lede,.snap div:nth-child(2){display:none!important}.inv-hero{padding-top:110px;min-height:630px}.inv>section:not(.inv-hero),.ftr{display:none!important}.h-inv{font-size:3.1rem}.snap{margin-top:40px}.reveal{opacity:1!important;transform:none!important}" });
await og.waitForTimeout(400);
await og.screenshot({ path: "assets/og-investors.jpg", type: "jpeg", quality: 86 });
await b.close();
console.log("rendered the overview PDF and og-investors.jpg");
