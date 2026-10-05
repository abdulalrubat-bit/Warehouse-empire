const P = require("./paths.js");
// The 3D diorama and the Pocket look are the default from 5.0. These are the things a
// player would notice first if they broke: a blank site, a model that never changes as
// they buy, taps that land on nothing, and the opening shift losing its choreography.
const B = require("./browser.js");
const ok=[], bad=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));

async function open(b, save){
  const ctx = await b.newContext({ viewport:{ width:412, height:915 }, deviceScaleFactor:1, isMobile:true, hasTouch:true });
  await ctx.route(/google-analytics/, r => r.fulfill({ status: 204, body: "" }));
  if (save) await ctx.addInitScript(sv => {
    if (sessionStorage.getItem("s")) return; sessionStorage.setItem("s", "1");
    const now = Date.now();
    localStorage.setItem("warehouse-empire-save", JSON.stringify(Object.assign({ launches:4, lastDailyClaim:now - 6e4, dailyStreak:2, lastSeen:now,
      reviewAsked:true, notifAsked:true, lastTruck:{ version:1, status:"complete", reportSeen:true } }, sv)));
  }, save);
  const p = await ctx.newPage();
  p.on("pageerror", e => bad.push("PAGEERROR: " + e.message));
  await p.goto("file://" + P.HTML);
  await p.waitForTimeout(2000);
  await p.evaluate(() => document.querySelectorAll(".modal-screen").forEach(m => m.hidden = true));
  return { ctx, p };
}
// Distinct colours in a region of the canvas, as a cheap measure of how much is drawn there.
const colours = (p, x0, y0, x1, y1) => p.evaluate(([x0, y0, x1, y1]) => {
  const c = document.getElementById("wcanvas"), g = c.getContext("2d");
  const k = c.width / c.clientWidth, d = g.getImageData(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k).data, seen = new Set();
  let painted = 0;
  for (let i = 0; i < d.length; i += 16){ if (d[i + 3] > 0) painted++; seen.add((d[i] >> 4) + "," + (d[i + 1] >> 4) + "," + (d[i + 2] >> 4)); }
  return { colours: seen.size, painted };
}, [x0, y0, x1, y1]);

(async () => {
  const b = await B.launch();

  // ---- a business: the model is the default, and it is drawn ----------------------------------
  { const { ctx, p } = await open(b, { money:1e9, lifetime:4e6, total:4e6, contractsDone:7, prestiges:1, owned:{ picker:40, trolley:20, forklift:12, reach:6, conveyor:2 } });
    chk("Pocket is the default look", await p.evaluate(() => document.body.classList.contains("pocket")));
    chk("and the 3D site is the default view", await p.evaluate(() => window.__diorama.active()));
    const all = await p.evaluate(() => { const c = document.getElementById("wcanvas"); return [c.clientWidth, c.clientHeight]; });
    const full = await colours(p, 0, 0, all[0], all[1]);
    chk("the site is drawn, not blank", full.painted > 1000 && full.colours > 40, JSON.stringify(full));

    // Buying a crane stands a gantry in the dispatch yard.
    const yard = await p.evaluate(() => { const D = window.__diorama.d, Y = D.YARD.dispatch, a = D.toScreen(Y.x, Y.y, 0), b2 = D.toScreen(Y.x + Y.w, Y.y + Y.h, 120);
      return [Math.max(0, Math.min(a.x, b2.x) - 60), Math.max(0, b2.y - 60), Math.max(a.x, b2.x) + 60, Math.max(a.y, b2.y) + 20]; });
    const before = await p.evaluate(([x0, y0, x1, y1]) => { const c = document.getElementById("wcanvas"); const g = c.getContext("2d"); return Array.from(g.getImageData(x0, y0, x1 - x0, y1 - y0).data.filter((_, i) => i % 64 === 0)).join(","); }, yard);
    await p.evaluate(() => { window.state.owned.crane = 3; });
    await p.waitForTimeout(400);
    const after = await p.evaluate(([x0, y0, x1, y1]) => { const c = document.getElementById("wcanvas"); const g = c.getContext("2d"); return Array.from(g.getImageData(x0, y0, x1 - x0, y1 - y0).data.filter((_, i) => i % 64 === 0)).join(","); }, yard);
    chk("buying a crane changes what stands in the dispatch yard", before !== after);

    // The four numbered labels float over the model, inside it.
    const lab = await p.evaluate(() => {
      const c = document.getElementById("wcanvas").getBoundingClientRect();
      return [...document.querySelectorAll(".dept-labels.iso .dept-label")].filter(e => e.style.display !== "none")
        .map(e => e.getBoundingClientRect()).filter(r => r.left >= c.left - 2 && r.right <= c.right + 2 && r.top >= c.top - 2 && r.bottom <= c.bottom + 2).length;
    });
    chk("the four department labels sit over the model", lab === 4, lab + " inside");

    // Tapping a yard opens that department.
    const yardPt = await p.evaluate(() => { const D = window.__diorama.d, Y = D.YARD.pack, s = D.toScreen(Y.x + Y.w * 0.75, Y.y + Y.h * 0.8, 0), r = document.getElementById("wcanvas").getBoundingClientRect(); return { x: r.left + s.x, y: r.top + s.y }; });
    await p.mouse.click(yardPt.x, yardPt.y); await p.waitForTimeout(300);
    chk("tapping a yard opens that department", await p.evaluate(() => !document.getElementById("canvasZoneInfo").hidden && /pack/i.test(document.getElementById("canvasZoneTitle").textContent)),
        await p.evaluate(() => document.getElementById("canvasZoneTitle").textContent));
    await p.evaluate(() => { document.getElementById("canvasZoneInfo").hidden = true; });

    // An incident is drawn in the model and clears when tapped there.
    await p.evaluate(() => { const ev = window.__diorama.events(); ev.length = 0; ev.push({ gx:820, gy:780, type:"spill", t:0, ttl:60 }); });
    await p.waitForTimeout(200);
    const cash0 = await p.evaluate(() => window.state.money);
    const incPt = await p.evaluate(() => { const D = window.__diorama.d, wx = (820 - 300) / 830 * 540, wy = (780 - 30) / 980 * 480, s = D.toScreen(wx, wy, 8), r = document.getElementById("wcanvas").getBoundingClientRect(); return { x: r.left + s.x, y: r.top + s.y }; });
    await p.mouse.click(incPt.x, incPt.y); await p.waitForTimeout(300);
    chk("an incident can be tapped away in the model", await p.evaluate(() => window.__diorama.events().length === 0), await p.evaluate(() => window.__diorama.events().length + " left"));
    chk("and pays out", await p.evaluate(c => window.state.money > c, cash0));

    // Explore: drag pans, Overview puts it back.
    await p.click("#canvasExplore");
    const r = await p.evaluate(() => { const c = document.getElementById("wcanvas").getBoundingClientRect(); return { x: c.left + c.width / 2, y: c.top + c.height / 2 }; });
    await p.evaluate(() => window.__diorama.d.zoom(2));
    await p.mouse.move(r.x, r.y); await p.mouse.down(); await p.mouse.move(r.x + 60, r.y + 30, { steps: 5 }); await p.mouse.up();
    const moved = await p.evaluate(() => window.__diorama.d.view.ox);
    chk("in Explore a drag pans the model", Math.abs(moved) > 20, moved);
    await p.click("#canvasOverview"); await p.waitForTimeout(100);
    chk("and Overview puts it back", await p.evaluate(() => { const v = window.__diorama.d.view; return v.ox === 0 && v.oy === 0 && v.z === 1; }));

    // The Office switches.
    await p.evaluate(() => document.querySelector('.tabs button[data-tab="office"]').click()); await p.waitForTimeout(200);
    await p.click("#viewPlan");
    chk("the Office switches to the plan", await p.evaluate(() => !window.__diorama.active() && window.state.mapView === "plan"));
    await p.click("#lookClassic");
    chk("and to the Classic look", await p.evaluate(() => !document.body.classList.contains("pocket") && window.state.uiTheme === "classic"));
    await p.click("#lookPocket"); await p.click("#viewIso");
    chk("and back", await p.evaluate(() => document.body.classList.contains("pocket") && window.__diorama.active()));
    await ctx.close(); }

  // ---- a new install: the opening shift is choreographed on the plan --------------------------------
  { const { ctx, p } = await open(b, null);
    chk("during the opening shift the plan is shown", await p.evaluate(() => window.state.lastTruck && window.state.lastTruck.status === "active" && !window.__diorama.active()));
    await ctx.close(); }

  await b.close();
  console.log("PASS:"); ok.forEach(l=>console.log("  + "+l));
  if(bad.length){ console.log("FAIL:"); bad.forEach(l=>console.log("  - "+l)); process.exitCode=1; }
})();
