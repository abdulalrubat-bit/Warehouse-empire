// Store art in the Pocket look (5.0): two launcher-icon candidates and a feature graphic.
// Run from the repo root after `npm install` in tests/:
//
//   node tools/pocket-art.js
//
// Writes, into docs/store-assets/:
//   pocket-icon-a.png / -fg.png   a little 3D warehouse, the diorama in one building
//   pocket-icon-b.png / -fg.png   the pallet icon players know, rebuilt in 3D pastel
//   pocket-icon-sheet.png         both beside the current icon at list sizes, masked, on
//                                 light and dark -- the sizes a store page actually shows
//   pocket-feature.png            1024x500: the title on the left, a live frame of the 3D
//                                 site on the right
//
// The icons are drawn with the same isometric primitives as the in-game diorama, so the
// icon and the game read as one thing. All art sits inside the centre 66% that Android's
// adaptive mask guarantees; the -fg files are that art on a transparent ground for
// assets/icon-foreground.png.
const path = require("path");
const fs = require("fs");
const P = require(path.join(__dirname, "..", "tests", "paths.js"));
const B = require(path.join(__dirname, "..", "tests", "browser.js"));
const OUT = path.join(__dirname, "..", "docs", "store-assets");
const BG = "#c9ebdc";

// The painter, as a string for the page: same projection and materials as the diorama.
const PAINTER = `
  const MAT = {
    wall:{top:"#fffcdf",left:"#c1dacf",right:"#deebe0"}, cream:{top:"#fffdf0",left:"#cad7d6",right:"#e5eee6"},
    teal:{top:"#70d4bf",left:"#289f9f",right:"#46b8aa"}, orange:{top:"#ffc26c",left:"#dd873d",right:"#efa04c"},
    blue:{top:"#98c8ef",left:"#537cae",right:"#74a6d2"}, crate:{top:"#f4c478",left:"#bb8648",right:"#dca45f"},
    dark:{top:"#526d82",left:"#2c425b",right:"#405970"}, concrete:{top:"#f7f2da",left:"#c5c9b7",right:"#e0dfc7"},
    green:{top:"#ade596",left:"#63b27e",right:"#87cc8c"}, coral:{top:"#ffb59d",left:"#d8725b",right:"#ec9278"}
  };
  let OX = 256, OY = 120, K = 1;
  const Pj = (x, y, z) => ({ x: OX + (x - y) * 0.82 * K, y: OY + (x + y) * 0.53 * K - (z || 0) * K });
  function poly(g, pts, fill, stroke, w){ g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.closePath(); g.fillStyle = fill; g.fill();
    if (stroke){ g.strokeStyle = stroke; g.lineWidth = w || 1; g.lineJoin = "round"; g.stroke(); } }
  function plane(g, x, y, w, h, z, fill){ poly(g, [Pj(x,y,z),Pj(x+w,y,z),Pj(x+w,y+h,z),Pj(x,y+h,z)], fill); }
  function box(g, x, y, w, h, z, ht, m){ const a=Pj(x,y,z+ht), b=Pj(x+w,y,z+ht), d=Pj(x,y+h,z+ht), e=Pj(x+w,y+h,z+ht), f=Pj(x+w,y+h,z);
    poly(g,[d,e,f,Pj(x,y+h,z)],m.left); poly(g,[b,e,f,Pj(x+w,y,z)],m.right); poly(g,[a,b,e,d],m.top,m.top,1.5); }
  function shadow(g, x, y, rx, ry){ const p = Pj(x, y); g.fillStyle = "rgba(28,76,80,.16)"; g.beginPath(); g.ellipse(p.x + 6*K, p.y + 6*K, rx*K, ry*K, 0, 0, Math.PI*2); g.fill(); }
  function crate(g, x, y, z, m){ box(g, x, y, 40, 40, z, 34, m); plane(g, x + 17, y + 2, 6, 36, z + 34.5, "rgba(255,243,198,.85)"); }
  // A: one warehouse, the diorama's building in miniature, with a lorry at the dock.
  function iconA(g){
    shadow(g, 60, 70, 150, 80);
    box(g, -40, -40, 200, 210, 0, 10, MAT.concrete);
    box(g, -30, -30, 180, 140, 10, 92, MAT.wall);
    box(g, -36, -36, 192, 152, 102, 12, MAT.orange);
    for (let n = 0; n < 4; n++) box(g, -30 + n * 48, 108, 8, 4, 10, 92, MAT.teal);
    for (let n = 0; n < 3; n++) box(g, -14 + n * 48, 108, 30, 3, 14, 58, MAT.blue);
    box(g, 152, -30, 4, 140, 10, 92, MAT.teal);
    for (let n = 0; n < 3; n++) box(g, 150, -12 + n * 44, 3, 30, 40, 26, MAT.blue);
    crate(g, 10, 124, 10, MAT.crate); crate(g, 56, 124, 10, MAT.orange); crate(g, 33, 124, 44, MAT.crate);
  }
  // B: the pallet icon, in 3D: four crates on a pallet, a stripe of hazard tape behind.
  function iconB(g){
    shadow(g, 40, 40, 140, 70);
    box(g, -40, -40, 160, 160, 0, 10, MAT.dark);
    for (let n = 0; n < 3; n++) box(g, -40, -40 + n * 66, 160, 28, 10, 6, MAT.concrete);
    const cr = [[-34,-34,MAT.crate],[44,-34,MAT.coral],[-34,44,MAT.orange],[44,44,MAT.crate]];
    cr.forEach(c => { box(g, c[0], c[1], 70, 70, 16, 60, c[2]); plane(g, c[0] + 31, c[1] + 2, 8, 66, 76.5, "rgba(255,243,198,.8)"); });
    box(g, -2, -2, 80, 80, 76, 58, MAT.teal); plane(g, 34, 0, 8, 76, 134.5, "rgba(255,255,255,.55)");
  }
`;

const page = (w, h, body, bg) => `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:${bg || "transparent"};}canvas{display:block}</style></head><body>${body}</body></html>`;

async function drawIcon(b, which, transparent, scale, dest){
  const ctx = await b.newContext({ viewport:{ width:512, height:512 }, deviceScaleFactor:scale || 1 });
  const p = await ctx.newPage();
  await p.setContent(page(512, 512, '<canvas id="c" width="512" height="512"></canvas>', transparent ? "transparent" : BG));
  await p.evaluate(([src, which, transparent, BG]) => {
    eval(src + "; window.__draw = { iconA, iconB, set:(ox,oy,k)=>{OX=ox;OY=oy;K=k;} };");
    const g = document.getElementById("c").getContext("2d");
    if (!transparent){
      const gr = g.createRadialGradient(180, 120, 20, 256, 256, 420);
      gr.addColorStop(0, "#f2f7d9"); gr.addColorStop(0.55, BG); gr.addColorStop(1, "#9fd8c6");
      g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
    }
    // Inside the adaptive safe circle: centre (256,256), radius ~165.
    if (which === "a"){ window.__draw.set(238, 248, 1.0); window.__draw.iconA(g); }
    else { window.__draw.set(250, 262, 1.1); window.__draw.iconB(g); }
  }, [PAINTER, which, transparent, BG]);
  const file = dest || path.join(OUT, "pocket-icon-" + which + (transparent ? "-fg" : "") + ".png");
  await p.screenshot({ path: file, omitBackground: !!transparent });
  await ctx.close();
  return file;
}

async function sheet(b){
  const img = f => "data:image/png;base64," + fs.readFileSync(f).toString("base64");
  const icons = [["current", path.join(__dirname, "..", "assets", "icon.png")], ["A · warehouse", path.join(OUT, "pocket-icon-a.png")], ["B · pallet", path.join(OUT, "pocket-icon-b.png")]];
  const row = (bg, ink) => `<div style="background:${bg};padding:18px 22px;display:flex;gap:40px">` + icons.map(([n, f]) =>
    `<div style="text-align:center;color:${ink};font:12px sans-serif">` +
    [96, 64, 48].map(s => `<img src="${img(f)}" style="width:${s}px;height:${s}px;border-radius:${s * 0.22}px;margin:0 6px;vertical-align:bottom">`).join("") +
    `<div style="margin-top:6px">${n}</div></div>`).join("") + `</div>`;
  const ctx = await b.newContext({ viewport:{ width:900, height:400 } });
  const p = await ctx.newPage();
  await p.setContent(`<!doctype html><html><body style="margin:0">${row("#ffffff", "#333")}${row("#1f1f1f", "#ddd")}</body></html>`);
  await p.waitForTimeout(200);
  const h = await p.evaluate(() => document.body.scrollHeight);
  await p.screenshot({ path: path.join(OUT, "pocket-icon-sheet.png"), clip: { x:0, y:0, width:900, height:h } });
  await ctx.close();
}

async function feature(b){
  const ctx = await b.newContext({ viewport:{ width:1024, height:500 }, deviceScaleFactor:1 });
  await ctx.route(/google-analytics/, r => r.fulfill({ status: 204, body: "" }));
  await ctx.addInitScript(() => {
    const now = Date.now();
    localStorage.setItem("warehouse-empire-save", JSON.stringify({ launches:6, lastDailyClaim:now - 6e4, dailyStreak:3, lastSeen:now, reviewAsked:true, notifAsked:true,
      lastTruck:{ version:1, status:"complete", reportSeen:true }, money:4e6, lifetime:4e7, total:4e7, contractsDone:9, prestiges:2, rep:40, flowGraceUntil:0,
      owned:{ picker:60, trolley:34, forklift:18, reach:8, conveyor:3, sorter:2, crane:1 }, corp:{ tower:1, hr:2, server:1, depot:1, solar:1 } }));
  });
  const p = await ctx.newPage();
  await p.goto("file://" + P.HTML);
  await p.waitForTimeout(2200);
  // Only the site, filling the frame, nudged right to leave room for the title.
  await p.evaluate(() => {
    document.querySelectorAll(".modal-screen").forEach(m => m.hidden = true);
    const keep = document.querySelector(".floorview");
    document.body.style.cssText += ";max-width:none;overflow:hidden;";
    [...document.body.children].forEach(el => { if (!el.contains(keep) && el.tagName !== "SCRIPT") el.style.display = "none"; });
    let n = keep; while (n && n !== document.body){ [...n.parentElement.children].forEach(s => { if (s !== n) s.style.display = "none"; }); n.style.cssText += ";margin:0;padding:0;"; n = n.parentElement; }
    [...keep.children].forEach(el => { if (el.id !== "wcanvas" && el.id !== "deptLabels") el.style.display = "none"; });
    const cv = document.getElementById("wcanvas");
    keep.style.cssText = "position:fixed;inset:0;margin:0;border:0;background:transparent;box-shadow:none;";
    cv.style.cssText = "width:1024px;height:500px;";
    document.getElementById("deptLabels").style.display = "none";
  });
  await p.waitForTimeout(500);
  await p.evaluate(() => { const D = window.__diorama.d; D.view.z = 1.25; D.view.ox = 250; D.view.oy = 20; });
  await p.evaluate(() => {
    const t = document.createElement("div");
    t.innerHTML = '<div style="font:900 13px Trebuchet MS,system-ui;letter-spacing:3px;color:#5f8a7a">BUILD A LITTLE. DREAM BIG.</div>' +
      '<div style="font:900 64px/1 Trebuchet MS,system-ui;letter-spacing:-2px;color:#315a59;margin-top:10px;text-shadow:0 3px #fff">Warehouse<br>Empire</div>' +
      '<div style="display:inline-block;margin-top:22px;padding:12px 20px;border-radius:18px;background:linear-gradient(#68cf9d,#45b88b);color:#fff;font:900 16px Trebuchet MS,system-ui;box-shadow:0 5px 0 #2f9e76">Idle logistics tycoon</div>';
    t.style.cssText = "position:fixed;left:56px;top:110px;z-index:99;";
    const fade = document.createElement("div");
    fade.style.cssText = "position:fixed;left:0;top:0;bottom:0;width:560px;z-index:98;background:linear-gradient(90deg,#e8f5e3 0,#e8f5e3f0 55%,#e8f5e300 100%);";
    document.body.appendChild(fade);
    document.body.appendChild(t);
  });
  await p.waitForTimeout(6000);   // let lorries and trolleys get moving
  // A pending incident is a tap target in play and a stray "!" in a store graphic.
  await p.evaluate(() => { window.__diorama.events().length = 0; });
  await p.waitForTimeout(150);
  await p.screenshot({ path: path.join(OUT, "pocket-feature.png") });
  await ctx.close();
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await B.launch();
  for (const w of ["a", "b"]){ await drawIcon(b, w, false); await drawIcon(b, w, true); }
  // The shipped launcher icon: A, at 1024 for the generator, with its adaptive foreground.
  // The release workflow's icon and splash background is the Pocket mint to match.
  const ASSETS = path.join(__dirname, "..", "assets");
  await drawIcon(b, "a", false, 2, path.join(ASSETS, "icon.png"));
  await drawIcon(b, "a", true, 2, path.join(ASSETS, "icon-foreground.png"));
  await sheet(b);
  await feature(b);
  await b.close();
  console.log("wrote pocket-icon-a/b(.png, -fg.png), pocket-icon-sheet.png, pocket-feature.png");
})();
