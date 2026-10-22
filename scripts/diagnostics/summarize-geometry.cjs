const fs = require("node:fs");
const path = require("node:path");
const source = process.argv[2];
if (!source) {
  console.error("Pemakaian: node scripts/diagnostics/summarize-geometry.cjs <geometri.json>");
  process.exit(1);
}
const d = JSON.parse(fs.readFileSync(path.resolve(source), "utf8"));
for (const [n, h] of Object.entries(d)) {
  console.log("\n== " + n);
  for (const [st, x] of [["sampul", h.sampul], ["spread", h.spread], ["belakang", h.belakang]]) {
    const p = x.el.halaman;
    console.log(` ${st}: ind=${x.ind} spread=${x.spread} zoom=${x.zoom} stage=${x.stage.w}x${x.stage.h} isi=${x.stage.isi.w}x${x.stage.isi.h} topbar=${x.topbar.b} toolbar=${x.toolbar.y}..${x.toolbar.b}`);
    console.log(`   host=${x.el.flipHost.x},${x.el.flipHost.y} ${x.el.flipHost.w}x${x.el.flipHost.h} wrapper=${x.el.wrapper.x},${x.el.wrapper.y} ${x.el.wrapper.w}x${x.el.wrapper.h}`);
    console.log(`   hal=${p.map(q=>`${q.k}@${q.x},${q.y} ${q.w}x${q.h}`).join(" | ")}`);
    console.log(`   tumpangTopbar=${JSON.stringify(x.tumpangTopbar)} tumpangToolbar=${JSON.stringify(x.tumpangToolbar)} keluarStage=${JSON.stringify(x.keluarStage)}`);
  }
}
