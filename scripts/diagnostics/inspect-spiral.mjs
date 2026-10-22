import { chromium } from "playwright";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = path.join(os.tmpdir(), "swipe-menu-spiral");
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ channel: "chromium" });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
await p.goto(pathToFileURL(path.join(PROJECT_ROOT, "index.html")).href, { waitUntil: "load" });
await p.waitForTimeout(700);
await p.click("#btn-contoh"); await p.waitForTimeout(600);
await p.evaluate(() => document.querySelector('.segmen[data-jilid="spiral"]').click());
await p.waitForTimeout(200);
await p.click("#btn-lihat"); await p.waitForTimeout(2600);

const baca = () => p.evaluate(() => {
  const ber = (el) => { const r = el.getBoundingClientRect(); return { x: +r.left.toFixed(1), y: +r.top.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) }; };
  const st = document.getElementById("book-stage");
  const w = st.querySelector(".stf__wrapper");
  const j = document.getElementById("jilid-buku");
  const cs = getComputedStyle(st);
  const loop = j.querySelector(".jilid__loop");
  return {
    spread: st.classList.contains("is-spread"),
    bukuX: cs.getPropertyValue("--buku-x").trim(),
    wrapper: ber(w),
    wrapperTengah: +(w.getBoundingClientRect().left + w.getBoundingClientRect().width / 2).toFixed(1),
    jilid: ber(j), jilidLeftInline: j.style.left,
    loop: loop ? ber(loop) : null,
    jumlahLoop: j.querySelectorAll(".jilid__loop").length,
    jumlahLubang: j.querySelectorAll(".jilid__lubang-baris").length,
    adaTepi: !!j.querySelector(".jilid__tepi"),
    lubang: [...j.querySelectorAll(".jilid__lubang-baris")].map((d) => ber(d).x),
  };
});
console.log("SAMPUL:", await baca());
await p.evaluate(() => document.getElementById("btn-berikut").click());
await p.waitForTimeout(2000);
console.log("SPREAD:", await baca());
await p.screenshot({ path: path.join(OUT, "spiral-1440-spread.png") });
await p.evaluate(() => window.dispatchEvent(new Event("resize")));
await p.waitForTimeout(500);
console.log("SPREAD setelah resize:", await baca());
await p.screenshot({ path: path.join(OUT, "spiral-1440-spread-resize.png") });
await b.close();
