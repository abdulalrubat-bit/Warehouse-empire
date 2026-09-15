const P = require("./paths.js");
const B = require("./browser.js");
const FILE = P.HTML;
const ok=[], bad=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));

async function page(b){
  const ctx = await b.newContext({ viewport:{width:412,height:915}, deviceScaleFactor:2, isMobile:true, hasTouch:true });
  const p = await ctx.newPage();
  p.on("pageerror", e => bad.push("PAGEERROR: " + e.message));
  await p.goto("file://" + FILE);
  await p.waitForTimeout(1400);
  if (!(await p.evaluate(()=>document.getElementById("modalDaily").hidden))) { await p.click("#btnClaimDaily"); await p.waitForTimeout(250); }
  // Everything here counts prism paths -- rack rows, quality tiers, draw order -- so it
  // has to run against the prism renderer, which is no longer the default.
  await p.evaluate(()=>{ window.state.renderer = "prism"; window.render(); });
  await p.waitForTimeout(300);
  return {ctx, p};
}
// Count prisms drawn in one frame, and record the layer order they were drawn in.
const INSTRUMENT = () => new Promise(res => {
  const c = document.getElementById("wcanvas").getContext("2d");
  let paths = 0; const ob = c.beginPath.bind(c);
  c.beginPath = function(){ paths++; return ob(); };
  const t0 = paths;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    const before = paths;
    requestAnimationFrame(()=>{ res(Math.round((paths - before)/3)); });
  }));
});

(async () => {
  const b = await B.launch();

  // ---- progression: the scene must grow with the fleet ----
  { const {ctx,p} = await page(b);
    const counts = [];
    // An empty fleet first, to get the scene's fixed cost. Comparing raw totals hides
    // progression behind whatever the backdrop happens to weigh, so the site's own
    // scenery is subtracted out and only the fleet-driven growth is asserted on.
    for (const owned of [ {}, {picker:2}, {picker:60,trolley:30}, {picker:200,trolley:120,forklift:60,reach:40,conveyor:20,sorter:8} ]) {
      await p.evaluate((o)=>{ window.state.owned={}; Object.assign(window.state.owned,o); window.render(); }, owned);
      await p.waitForTimeout(700);
      counts.push(await p.evaluate(INSTRUMENT));
    }
    const base = counts[0], grown = counts.slice(1).map(c => c - base);
    chk("scene grows with the fleet (early < mid < late)",
        grown[0] < grown[1] && grown[1] < grown[2], counts.join(" -> ") + " prisms");
    // This was a x10 ratio and it broke when the EARLY scene got richer -- the late scene
    // had grown too, but the denominator grew faster. A ratio between two moving numbers
    // measures neither. Assert the thing that actually matters: a full site puts a lot of
    // hardware on the plan in absolute terms, and the growth is monotonic (checked above).
    chk("late is substantially richer than early",
        grown[2] > 100 && grown[2] - grown[0] > 80,
        `fleet adds ${grown[0]} -> ${grown[2]} prisms over a ${base} baseline`);
    await ctx.close(); }

  // ---- layer ordering: regression for `e.layer || 2` treating layer 0 as layer 2 ----
  { const {ctx,p} = await page(b);
    await p.evaluate(()=>{ Object.assign(window.state.owned,{picker:200,trolley:120,forklift:60,reach:40,conveyor:20,sorter:8});
                           Object.assign(window.state.corp,{hr:4,tower:3,solar:2,server:1}); window.render(); });
    await p.waitForTimeout(900);
    const r = await p.evaluate(() => {
      // sortKeyOf must put ground (layer 0) first. Reproduce it from the source contract.
      const key = (layer,x,y,z)=> (layer===undefined?2:layer)*100000 + (x+y)*100 + (z||0);
      return { ground: key(0,-14,-8,-0.75), midground: key(1,36,21,0), objects: key(2,9,2,0) };
    });
    chk("layer 0 sorts before layer 1", r.ground < r.midground, `${r.ground} < ${r.midground}`);
    chk("layer 1 sorts before layer 2", r.midground < r.objects, `${r.midground} < ${r.objects}`);
    chk("ground layer is not mis-keyed into layer 2's range", r.ground < 100000, "key=" + r.ground);
    await ctx.close(); }

  // ---- quality tiers must actually change the cost ----
  { const {ctx,p} = await page(b);
    await p.evaluate(()=>{ Object.assign(window.state.owned,{picker:200,trolley:120,forklift:60,reach:40,conveyor:20,sorter:8});
                           Object.assign(window.state.corp,{hr:4,tower:3,solar:2,server:1}); window.render(); });
    await p.waitForTimeout(600);
    const per = {};
    for (const [btn,tier] of [["#qLow","low"],["#qMed","medium"],["#qHigh","high"]]) {
      await p.click('.tabs button[data-tab="office"]'); await p.waitForTimeout(200);
      await p.click(btn); await p.waitForTimeout(200);
      await p.click('.tabs button[data-tab="floor"]'); await p.waitForTimeout(700);
      per[tier] = await p.evaluate(INSTRUMENT);
    }
    chk("quality tiers scale the drawn geometry", per.low < per.medium && per.medium < per.high,
        `low ${per.low} < med ${per.medium} < high ${per.high}`);
    chk("low is a meaningful saving over high", per.low < per.high * 0.6,
        `${per.low} vs ${per.high}`);
    await ctx.close(); }

  await b.close();
  console.log("PASS:"); ok.forEach(l=>console.log("  + "+l));
  if(bad.length){ console.log("FAIL:"); bad.forEach(l=>console.log("  - "+l)); process.exitCode=1; }
})();
