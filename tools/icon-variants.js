// Store-listing icon candidates for a Play Store Listing Experiment. Run from the repo root
// after `npm install` in tests/:
//
//   node tools/icon-variants.js
//
// Writes docs/store-assets/icon-test-{a,b,c}.png (512x512, what the experiment takes) and
// icon-test-sheet.png, which shows every candidate beside the current icon at list size, on
// Play's light and dark backgrounds, under Play's rounded mask -- the conditions the 1.7%
// impression-to-install rate was measured in.
//
// Drawn as SVG so a tweak is an edit, not a redraw. All art sits inside the centre 80% so
// Play's corner rounding never touches it.
const path = require("path");
const fs = require("fs");
const B = require(path.join(__dirname, "..", "tests", "browser.js"));
const OUT = path.join(__dirname, "..", "docs", "store-assets");

const NAVY = "#17253a", CREAM = "#fff6e8", KRAFT = "#d9a066", KRAFT_D = "#b9824c", ORANGE = "#f26a10";

// A cardboard box with tape, in its own 0..w,0..h frame.
const box = (x, y, w, h) => `
  <g transform="translate(${x},${y})">
    <rect width="${w}" height="${h}" rx="${w*0.06}" fill="${KRAFT}"/>
    <rect width="${w}" height="${h*0.16}" rx="${w*0.06}" fill="#e8b87e"/>
    <rect x="${w*0.44}" width="${w*0.12}" height="${h}" fill="${KRAFT_D}" opacity=".55"/>
  </g>`;
const pallet = (x, y, w) => `
  <g transform="translate(${x},${y})">
    <rect width="${w}" height="14" rx="4" fill="#9aa6b2"/>
    <rect x="${w*0.06}" y="14" width="${w*0.16}" height="12" fill="#6f7c88"/>
    <rect x="${w*0.42}" y="14" width="${w*0.16}" height="12" fill="#6f7c88"/>
    <rect x="${w*0.78}" y="14" width="${w*0.16}" height="12" fill="#6f7c88"/>
  </g>`;

const A = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="ga" cx="35%" cy="25%" r="85%"><stop offset="0" stop-color="#ffab3d"/><stop offset="1" stop-color="#e2470a"/></radialGradient>
  </defs>
  <rect width="512" height="512" fill="url(#ga)"/>
  <g opacity=".16" fill="${NAVY}">
    <polygon points="0,430 0,512 82,512"/><polygon points="40,512 120,512 0,392 0,472"/>
  </g>
  <ellipse cx="262" cy="420" rx="196" ry="20" fill="#000" opacity=".22"/>
  <!-- load: outlined, or kraft on orange is one colour -->
  <rect x="60" y="208" width="130" height="172" rx="10" fill="${NAVY}"/>
  ${box(66, 214, 118, 78)}${box(66, 296, 118, 78)}
  <rect x="58" y="374" width="150" height="14" rx="4" fill="${NAVY}"/>
  <!-- mast -->
  <rect x="200" y="112" width="22" height="290" rx="6" fill="${NAVY}"/>
  <rect x="226" y="112" width="12" height="290" rx="5" fill="#2c3f58"/>
  <!-- body -->
  <path d="M236 268 h150 a26 26 0 0 1 26 26 v76 a14 14 0 0 1 -14 14 h-162 z" fill="${CREAM}"/>
  <rect x="236" y="330" width="176" height="18" fill="${NAVY}" opacity=".9"/>
  <path d="M384 268 h28 a26 26 0 0 1 26 26 v90 h-54 z" fill="#e6dccb"/>
  <!-- cab frame -->
  <path d="M258 270 V150 a22 22 0 0 1 22 -22 h96 a22 22 0 0 1 22 22 V270" fill="none" stroke="${NAVY}" stroke-width="18" stroke-linejoin="round"/>
  <rect x="300" y="214" width="34" height="56" rx="10" fill="${NAVY}"/>
  <!-- wheels -->
  <circle cx="276" cy="392" r="50" fill="${NAVY}"/><circle cx="276" cy="392" r="20" fill="#c9d2db"/>
  <circle cx="396" cy="398" r="40" fill="${NAVY}"/><circle cx="396" cy="398" r="15" fill="#c9d2db"/>
  <!-- beacon -->
  <rect x="314" y="108" width="26" height="16" rx="6" fill="#ffd23a"/>
</svg>`;

const Bsvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="gb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a7fa8"/><stop offset="1" stop-color="#0e2c42"/></linearGradient>
    <linearGradient id="gold" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#ffb52e"/><stop offset="1" stop-color="#ffe08a"/></linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#gb)"/>
  <rect x="46" y="420" width="420" height="10" rx="5" fill="#65e0b0" opacity=".45"/>
  <!-- three rising stacks -->
  ${box(62, 330, 104, 66)}${pallet(56, 396, 116)}
  ${box(204, 262, 104, 66)}${box(204, 330, 104, 66)}${pallet(198, 396, 116)}
  ${box(346, 194, 104, 66)}${box(346, 262, 104, 66)}${box(346, 330, 104, 66)}${pallet(340, 396, 116)}
  <!-- growth arrow -->
  <path d="M84 284 L236 196 L290 232 L398 150" fill="none" stroke="#0b1d2b" stroke-width="40" stroke-linecap="round" stroke-linejoin="round" opacity=".35"/>
  <path d="M84 276 L236 188 L290 224 L398 142" fill="none" stroke="url(#gold)" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/>
  <polygon points="436,92 444,186 362,140" fill="#ffe08a"/>
</svg>`;

const C = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4fb6ff"/><stop offset="1" stop-color="#1b6fd0"/></linearGradient>
    <linearGradient id="glow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd98a"/><stop offset="1" stop-color="#ffb347"/></linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#gc)"/>
  <rect y="408" width="512" height="104" fill="#3a4654"/>
  <rect y="404" width="512" height="10" fill="#273140"/>
  <!-- building -->
  <rect x="62" y="186" width="388" height="222" fill="#e9eef3"/>
  <rect x="62" y="186" width="388" height="16" fill="#cfd8e1"/>
  <!-- sawtooth roof -->
  <path d="M50 192 L50 150 L180 92 L180 150 L310 92 L310 150 L462 82 L462 192 Z" fill="${ORANGE}"/>
  <path d="M50 192 L462 192 L462 176 L50 176 Z" fill="#c4520a"/>
  <!-- open roller door with stock inside -->
  <rect x="146" y="234" width="220" height="174" fill="url(#glow)"/>
  ${box(170, 318, 78, 56)}${box(258, 318, 78, 56)}${box(214, 262, 78, 56)}
  <rect x="164" y="374" width="184" height="12" rx="3" fill="#9aa6b2"/>
  <g fill="${NAVY}">
    <rect x="140" y="222" width="232" height="16" rx="3"/>
    <rect x="140" y="222" width="12" height="186"/><rect x="360" y="222" width="12" height="186"/>
  </g>
  <!-- hazard kerb -->
  <g transform="translate(140,396)">
    <rect width="232" height="14" fill="#ffd23a"/>
    <path d="M0 14 L14 0 H34 L20 14Z M46 14 L60 0 H80 L66 14Z M92 14 L106 0 H126 L112 14Z M138 14 L152 0 H172 L158 14Z M184 14 L198 0 H218 L204 14Z" fill="${NAVY}"/>
  </g>
  <!-- windows -->
  <rect x="84" y="246" width="40" height="26" rx="4" fill="#9fc7ea"/><rect x="388" y="246" width="40" height="26" rx="4" fill="#9fc7ea"/>
</svg>`;

const VARIANTS = { a: A, b: Bsvg, c: C };

(async () => {
  const b = await B.launch();
  const ctx = await b.newContext({ deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  for (const [k, svg] of Object.entries(VARIANTS)){
    await p.setViewportSize({ width: 512, height: 512 });
    await p.setContent(`<html><body style="margin:0">${svg.replace("<svg ", '<svg width="512" height="512" ')}</body></html>`);
    await p.screenshot({ path: path.join(OUT, "icon-test-" + k + ".png"), clip: { x:0, y:0, width:512, height:512 } });
  }
  // The comparison sheet: each icon at Play's list sizes, masked, on light and dark.
  const cur = "data:image/png;base64," + fs.readFileSync(path.join(__dirname, "..", "assets", "icon.png")).toString("base64");
  const imgs = [["Current", cur]].concat(Object.keys(VARIANTS).map(k =>
    [k.toUpperCase(), "data:image/png;base64," + fs.readFileSync(path.join(OUT, "icon-test-" + k + ".png")).toString("base64")]));
  const row = (bg, ink) => `<div style="background:${bg};padding:22px 26px;display:flex;gap:34px;align-items:flex-end">` +
    imgs.map(([n, src]) => `<div style="text-align:center;font:600 13px Arial;color:${ink}">
      <img src="${src}" style="width:150px;height:150px;border-radius:22%;display:block;margin-bottom:10px">
      <div style="display:flex;gap:10px;justify-content:center;align-items:flex-end">
        <img src="${src}" style="width:64px;height:64px;border-radius:22%"><img src="${src}" style="width:48px;height:48px;border-radius:22%">
      </div><div style="margin-top:8px">${n}</div></div>`).join("") + `</div>`;
  await p.setViewportSize({ width: 860, height: 700 });
  await p.setContent(`<html><body style="margin:0;width:860px">${row("#ffffff","#202124")}${row("#202124","#e8eaed")}</body></html>`);
  const h = await p.evaluate(() => document.body.scrollHeight);
  await p.screenshot({ path: path.join(OUT, "icon-test-sheet.png"), clip: { x:0, y:0, width:860, height:h } });
  await b.close();
  console.log("wrote icon-test-a/b/c.png and icon-test-sheet.png");
})();
