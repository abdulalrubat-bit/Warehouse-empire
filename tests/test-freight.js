const P = require("./paths.js");
// Freight in motion. This is a rendering feature, so it is tested in a real browser rather
// than against the DOM stub -- the stub has no canvas and the whole point is what gets
// drawn and how often.
//
// The frame-budget numbers are asserted here too. The pool is FORCED to its cap rather
// than left to fill from the seeded economy: the first version of this gate reported 62fps
// with six units in flight against a cap of twenty-six and proved nothing about the cap.
const B = require("./browser.js");
const ok=[], bad=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));

const LATE = { picker:300, trolley:200, forklift:150, reach:100, conveyor:60, sorter:30, crane:12, hub:5 };

async function open(b, w, h, owned, quality){
  const ctx = await b.newContext({ viewport:{width:w,height:h}, deviceScaleFactor:2,
                                   isMobile:true, hasTouch:true });
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", e => errs.push("PAGEERROR: " + e.message));
  await p.route("**google-analytics.com/**", r => r.fulfill({status:204, body:""}));
  await p.goto(P.HTML_URL);
  await p.waitForTimeout(1500);
  await p.evaluate(()=>document.querySelectorAll(".modal-screen").forEach(m=>m.hidden=true));
  if (owned) await p.evaluate(o=>{ const s=window.state;
    s.lifetime = 5e13; s.money = 1e12; s.contractsDone = 11;
    s.owned = Object.assign({picker:0,trolley:0,forklift:0,reach:0,conveyor:0,sorter:0,crane:0,hub:0}, o);
    window.render(); }, owned);
  await p.evaluate(q=>{ const el=document.getElementById(q); if(el) el.click(); }, quality || "qHigh");
  await p.waitForTimeout(400);
  return { ctx, p, errs };
}
const fps = p => p.evaluate(()=>new Promise(r=>{let f=0;const t0=performance.now();
  (function t(){f++;if(performance.now()-t0<1000)requestAnimationFrame(t);else r(f);})();}));

(async () => {
  const b = await B.launch();

  // ---- the pool obeys its budget ------------------------------------------------------
  { const {ctx,p,errs} = await open(b, 412, 915, LATE, "qHigh");
    const cap = await p.evaluate(()=>window.__freightCap());
    chk("high quality budgets a freight pool", cap > 0, "cap=" + cap);
    // fill twice: the second call must not push past the cap
    await p.evaluate(()=>window.__freightFill());
    const first = await p.evaluate(()=>window.__freightCount());
    await p.evaluate(()=>window.__freightFill());
    const second = await p.evaluate(()=>window.__freightCount());
    chk("the pool fills to its cap", first === cap, first + "/" + cap);
    chk("and cannot be pushed past it", second === cap, second + "/" + cap);
    chk("no errors while freight is running", errs.length === 0, errs[0] || "clean");
    await ctx.close(); }

  // ---- low quality opts out entirely --------------------------------------------------
  { const {ctx,p} = await open(b, 360, 640, LATE, "qLow");
    const cap = await p.evaluate(()=>window.__freightCap());
    await p.evaluate(()=>window.__freightFill());
    await p.waitForTimeout(600);
    const n = await p.evaluate(()=>window.__freightCount());
    chk("low quality draws no freight at all", cap === 0 && n === 0, "cap=" + cap + " n=" + n);
    await ctx.close(); }

  // ---- a tap puts something on the plan -----------------------------------------------
  // The opening site is nearly idle by design, which makes this the first thing a new
  // player ever makes happen on the canvas.
  { const {ctx,p} = await open(b, 412, 915, { picker: 6 }, "qHigh");
    await p.evaluate(()=>{ window.state.lifetime = 400; window.state.money = 40; window.render(); });
    await p.waitForTimeout(1200);
    const before = await p.evaluate(()=>window.__freightCount());
    for (let i=0;i<5;i++){ await p.click("#pickBtn"); await p.waitForTimeout(110); }
    const after = await p.evaluate(()=>window.__freightCount());
    chk("an opening site is quiet until the player acts", before === 0, "before=" + before);
    chk("every tap puts a pallet into the flow", after >= 5, before + " -> " + after);
    await ctx.close(); }

  // ---- freight leaves, it does not accumulate -----------------------------------------
  { const {ctx,p} = await open(b, 412, 915, LATE, "qHigh");
    await p.evaluate(()=>window.__freightFill());
    const full = await p.evaluate(()=>window.__freightCount());
    // Strip the site so nothing new spawns, then let what is in flight run out.
    await p.evaluate(()=>{ const s=window.state;
      s.owned={picker:0,trolley:0,forklift:0,reach:0,conveyor:0,sorter:0,crane:0,hub:0};
      s.network=[]; s.rep=0; window.render(); });
    const dispatchedBefore = await p.evaluate(()=>window.__dispatched());
    await p.waitForTimeout(14000);
    const drained = await p.evaluate(()=>window.__freightCount());
    const dispatchedAfter = await p.evaluate(()=>window.__dispatched());
    chk("freight drains off the site rather than piling up", drained < full,
        full + " -> " + drained);
    // The readout counts real departures. If it were cosmetic it would not move here,
    // and it must account for everything that left rather than a sample of it.
    chk("the dispatched reading counts what actually left",
        dispatchedAfter - dispatchedBefore >= full - drained,
        `${dispatchedAfter - dispatchedBefore} counted, ${full - drained} left the site`);
    const shown = await p.evaluate(()=>document.getElementById("mDispatched").textContent);
    chk("and the strip shows it rather than a constant", shown !== "0", "reads " + shown);
    await ctx.close(); }

  // ---- the frame budget ----------------------------------------------------------------
  for (const [label, w, h] of [["360x640", 360, 640], ["412x915", 412, 915], ["800x1280", 800, 1280]]){
    const {ctx,p} = await open(b, w, h, LATE, "qHigh");
    await p.evaluate(()=>window.__freightFill());
    await p.waitForTimeout(700);
    const f = await fps(p);
    const n = await p.evaluate(()=>window.__freightCount());
    chk(`holds the frame at ${label}, late fleet, pool full`, f >= 55, f + "fps with " + n + " in flight");
    await ctx.close();
  }

  console.log("PASS:"); ok.forEach(x=>console.log("  + " + x));
  if (bad.length){ console.log("FAIL:"); bad.forEach(x=>console.log("  - " + x)); }
  console.log(`\n${ok.length} passed, ${bad.length} failed`);
  await b.close();
  process.exit(bad.length ? 1 : 0);
})();
