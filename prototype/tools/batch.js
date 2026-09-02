// Renders a list of GLB models to trimmed transparent PNGs at one shared world scale, so
// they compose on the game's grid. Records each sprite's trim offset relative to the
// model origin, which is what lets the renderer place them without per-model fudging.
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const KITS = "/tmp/claude-0/-home-user-abdulalrubat-bit-github-io/7b0013ff-c801-5afa-bda4-2f0c58277085/scratchpad/kits";
const OUT = path.join(__dirname, "sprites");

// TW_BASE is 18, so one tile is 36px wide at zoom 1. Rendered at 4x for zoom headroom:
// a tile diamond spans sqrt(2) camera units, so units-per-pixel = sqrt(2)/144.
const TILE_PX = 48;
const UPP = Math.SQRT2 / TILE_PX;
const CANVAS = 1024;

// The kits do not share a scale: road-straight is exactly 1x1 unit, but a whole
// industrial warehouse is 2.1 units while a car is 2.5. Left alone, a sedan renders
// larger than a distribution centre. Each kit is normalised to tiles-per-unit, with one
// game tile taken as 4 metres, and a model spanning T tiles renders at T * TILE_PX px.
const KIT_TILES = {
  "kenney_citykitroads": 1.0,     // road-straight is the reference: 1 unit == 1 tile
  "kenney_carkit":       0.6,     // truck 2.95u -> 1.8 tiles -> ~7m
  "industrial":          5.0,     // shed 2.12u -> 10.6 tiles -> ~42m
  "factory":             0.3      // pallet box 1.1u -> 0.33 tiles -> ~1.3m
};

const MODELS = JSON.parse(fs.readFileSync(path.join(__dirname, "models.json"), "utf8"));

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
    args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--allow-file-access-from-files"] });
  const p = await b.newPage({ viewport: { width: 1200, height: 1200 } });
  const errs = [];
  p.on("pageerror", e => errs.push(e.message));
  await p.goto("file://" + __dirname + "/render.html");
  await p.waitForFunction(() => window.__ready);

  const manifest = {};
  let done = 0, failed = [];
  for (const m of MODELS){
    const file = path.join(KITS, m.kit, "Models", "GLB format", m.model + ".glb");
    if (!fs.existsSync(file)) { failed.push(m.name + " (missing)"); continue; }
    // Directional things (vehicles, roads, fences) need one sprite per facing; blobs
    // like tanks and crates look the same from every side and only need one.
    // Big shells only get two facings: at 500px a sprite each, four rotations of five
    // buildings was most of the atlas, and a shed seen from behind is nearly the same
    // silhouette anyway.
    const yaws = m.rot2 ? [0, 90] : (m.rot ? [0, 90, 180, 270] : [0]);
    try {
      // A model unit renders at TILE_PX/2 px by default, so dividing by 2T makes it T tiles.
      const T = m.t !== undefined ? m.t : (KIT_TILES[m.kit] || 1);
      const upp = UPP / (2 * T);
      for (const yaw of yaws){
        const res = await p.evaluate(async ({ url, upp, canvas, yaw }) => {
          const obj = await window.__loadGLB(url);
          const info = window.__renderObject(obj, upp, canvas, canvas, yaw);
          return { info, data: document.querySelector("canvas").toDataURL("image/png") };
        }, { url: "file://" + file, upp: upp, canvas: CANVAS, yaw });
        const key = (m.rot || m.rot2) ? m.name + "-" + yaw : m.name;
        fs.writeFileSync(path.join(OUT, key + ".png"), Buffer.from(res.data.split(",")[1], "base64"));
        manifest[key] = { kit: m.kit, model: m.model, yaw, size: res.info.size, tiles: T, tags: m.tags || [] };
        done++;
      }
    } catch (e) { failed.push(m.name + " (" + String(e).slice(0, 60) + ")"); }
  }
  fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 1));
  console.log("rendered", done, "sprites from", MODELS.length, "models");
  if (failed.length) console.log("failed:", failed.slice(0, 10));
  if (errs.length) console.log("page errors:", errs.slice(0, 3));
  await b.close();
})();
