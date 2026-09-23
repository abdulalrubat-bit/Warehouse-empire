// Play Store phone screenshots, 1080x1920. Run from the repo root after `npm install` in
// tests/ (it borrows the suite's Playwright and browser lookup):
//
//   node tools/storeshots.js            # all eight, into docs/store-screenshots/
//   node tools/storeshots.js 04 07      # only the shots whose names start with these
//
// Committed rather than left in a scratchpad this time: the 4.0 script was, and the next
// recapture had to be rebuilt from the README's description of it.
//
// Each shot opens its own page from a seeded save, so no shot inherits another's state.
// Google Analytics is answered with a 204 before it leaves the machine, and any page error
// fails the run -- a screenshot of a broken build is worse than none.
const path = require("path");
const fs = require("fs");
const P = require(path.join(__dirname, "..", "tests", "paths.js"));
const B = require(path.join(__dirname, "..", "tests", "browser.js"));

const OUT = path.join(__dirname, "..", "docs", "store-screenshots");
const only = process.argv.slice(2);
const errors = [];

// A mid-game operation: enough plant that freight crosses the site continuously and the
// Floor shows a live contract, past the opening shift so its card is not in the way.
const MID = {
  launches: 6, lifetime: 4.2e7, total: 4.2e7, money: 3.8e6, contractsDone: 9, taps: 1400,
  owned: { picker: 60, trolley: 34, forklift: 18, reach: 8, conveyor: 3, sorter: 1 },
  corp: { hr: 2, tower: 1 },
  lastTruck: { version: 1, status: "complete", reportSeen: true }
};
const LATE = Object.assign({}, MID, {
  lifetime: 6e13, total: 6e13, money: 4.1e12, rep: 180, prestiges: 6,
  owned: { picker: 300, trolley: 200, forklift: 150, reach: 100, conveyor: 60, sorter: 30, crane: 12, hub: 5 },
  corp: { hr: 6, customs: 4, marketing: 3, tower: 5, training: 2, solar: 2, depot: 1, server: 2 }
});

async function open(b, save){
  const ctx = await b.newContext({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2,
                                   isMobile: true, hasTouch: true });
  await ctx.route(/google-analytics\.com/, r => r.fulfill({ status: 204, body: "" }));
  // Today's stipend already claimed and every one-time ask already asked: a seasoned save
  // otherwise opens on the streak calendar, which then re-queues behind the review prompt
  // and lands over whatever the shot was of.
  if (save) await ctx.addInitScript(sv => {
    const now = Date.now();
    const full = Object.assign({ lastDailyClaim: now - 60000, dailyStreak: 3, lastSeen: now,
                                 reviewAsked: true, notifAsked: true }, sv);
    try { localStorage.setItem("warehouse-empire-save", JSON.stringify(full)); } catch(e){}
  }, save);
  const p = await ctx.newPage();
  p.on("pageerror", e => errors.push(e.message));
  await p.goto("file://" + P.HTML);
  await p.waitForTimeout(1800);
  // A seasoned save earns the streak calendar, the review prompt and the like, and they
  // queue behind one another. None of them is what any shot is of; the one shot that is of
  // a modal opens it after this. Twice, for whichever was waiting behind the first.
  for (let i = 0; i < 2; i++){
    await p.evaluate(() => document.querySelectorAll(".modal-screen").forEach(m => { m.hidden = true; }));
    await p.waitForTimeout(500);
  }
  return { ctx, p };
}

// Freight takes about ten seconds to cross the site. A frame grabbed before that shows an
// empty plan -- the headline feature photographed as missing -- so wait, and say how much
// was moving, so an idle shot is obvious rather than silent.
async function settle(p, ms){
  await p.waitForTimeout(ms || 11000);
  return p.evaluate(() => window.__freightCount ? window.__freightCount() : -1);
}
async function tab(p, name){
  await p.evaluate(n => document.querySelector('.tabs button[data-tab="' + n + '"]').click(), name);
  await p.waitForTimeout(500);
}
async function shot(p, name, note, keepModal){
  await p.evaluate(keep => {
    const t = document.getElementById("toast"); if (t) t.classList.remove("show");
    if (!keep) document.querySelectorAll(".modal-screen").forEach(m => { m.hidden = true; });
  }, !!keepModal);
  await p.screenshot({ path: path.join(OUT, name + ".png") });
  console.log("  " + name + (note ? "  (" + note + ")" : ""));
}

const SHOTS = [
  ["01-site", async b => {
    const { ctx, p } = await open(b, MID);
    const n = await settle(p);
    await shot(p, "01-site", n + " freight in flight"); await ctx.close();
  }],
  ["02-last-truck", async b => {
    // A fresh install, three pallets in and loading the last one: the opening shift with
    // its task docked above PICK ORDER.
    const { ctx, p } = await open(b, null);
    await p.evaluate(() => { const h = window.state.lastTruck; h.cleared = 3; h.elapsed = 17; window.render(); });
    await p.waitForTimeout(3000);
    await shot(p, "02-last-truck"); await ctx.close();
  }],
  ["03-port", async b => {
    // Overview: at the working-building framing the quay and the water are out of shot, and
    // without them this is just another floor.
    const { ctx, p } = await open(b, Object.assign({}, MID, { site: "port", prestiges: 2, rep: 40 }));
    await p.click("#canvasOverview");
    const n = await settle(p);
    await shot(p, "03-port", n + " freight in flight"); await ctx.close();
  }],
  ["04-night-livery", async b => {
    const { ctx, p } = await open(b, Object.assign({}, MID, { site: "hazmat", prestiges: 3, rep: 70,
      theme: "nightshift", themesOwned: { nightshift: true } }));
    await p.click("#canvasOverview");
    const n = await settle(p);
    await shot(p, "04-night-livery", n + " freight in flight"); await ctx.close();
  }],
  ["05-rush", async b => {
    // A rush behind schedule: the one card that outranks everything, carrying Expedite.
    const { ctx, p } = await open(b, MID);
    await settle(p, 6000);
    await p.evaluate(() => {
      const s = window.state;
      s.contract = { goal: 1.2e6, prog: 2.9e5, mins: 2, deadline: Date.now() + 71000,
                     label: "RUSH: Clear the backlog", cash: 9.5e5, pallets: 5, rush: true };
      window.render();
    });
    await p.waitForTimeout(600);
    await p.evaluate(() => document.getElementById("objective").scrollIntoView({ block: "center" }));
    await p.evaluate(() => document.getElementById("bottleneck").scrollIntoView({ block: "center" }));
    await p.waitForTimeout(600);
    await shot(p, "05-rush"); await ctx.close();
  }],
  ["06-manifests", async b => {
    // A modal on purpose: nothing here may hide modals.
    const { ctx, p } = await open(b, Object.assign({}, MID, { lifetime: 3e9, total: 3e9 }));
    await p.evaluate(() => document.getElementById("openSkuBtn").click());
    await p.waitForTimeout(700);
    await shot(p, "06-manifests", "", true); await ctx.close();
  }],
  ["07-fleet", async b => {
    const { ctx, p } = await open(b, Object.assign({}, MID, { money: 2.4e7 }));
    await tab(p, "equip");
    await shot(p, "07-fleet"); await ctx.close();
  }],
  ["08-network", async b => {
    const names = ["Truganina","Dandenong","Laverton","Port Melbourne","Somerton","Keysborough","Derrimut",
                   "Campbellfield","Braeside","Altona","Epping","Pakenham","Tullamarine","Clayton"];
    const ids = ["general","cold","hazmat","port"];
    const network = names.map((n, i) => ({ id: ids[i % 4], peak: 2.4e8 * (1 + (i * 7) % 5), suburb: n, inv: (i * 3) % 6 }));
    const { ctx, p } = await open(b, Object.assign({}, LATE, { network }));
    await tab(p, "office");
    await p.evaluate(() => document.getElementById("netMapWrap").scrollIntoView({ block: "center" }));
    await p.waitForTimeout(700);
    await shot(p, "08-network"); await ctx.close();
  }]
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await B.launch();
  for (const [name, run] of SHOTS)
    if (!only.length || only.some(o => name.startsWith(o))) await run(b);
  await b.close();
  if (errors.length){ console.error("page errors:\n  " + errors.join("\n  ")); process.exit(1); }
})();
