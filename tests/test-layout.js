const P = require("./paths.js");
// What a player can actually see and reach on a phone. Every check here is a thing that
// was once wrong on a real screen: a button behind the pick bar, a card nobody could find.
const B = require("./browser.js");
const FILE = P.HTML;
const ok=[], bad=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));

// Is the centre of this element on screen and the thing a tap there would land on?
const REACHABLE = (sel) => {
  const el = document.querySelector(sel); if (!el) return { ok:false, why:"missing" };
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return { ok:false, why:"not laid out" };
  const x = r.left + r.width/2, y = r.top + r.height/2;
  if (y < 0 || y > innerHeight) return { ok:false, why:"off screen at y=" + Math.round(y) };
  const hit = document.elementFromPoint(x, y);
  return { ok: hit === el || el.contains(hit), why: hit ? (hit.id || hit.className || hit.tagName) : "nothing" };
};

async function phone(b, save){
  const ctx = await b.newContext({ viewport:{width:412,height:915}, deviceScaleFactor:2,
                                   isMobile:true, hasTouch:true });
  if (save) await ctx.addInitScript((sv) => {
    try { localStorage.setItem("warehouse-empire-save", JSON.stringify(sv)); } catch(e){}
  }, save);
  const p = await ctx.newPage();
  p.on("pageerror", e => bad.push("PAGEERROR: " + e.message));
  await p.goto("file://" + FILE);
  await p.waitForTimeout(1800);
  return { ctx, p };
}

(async () => {
  const b = await B.launch();

  // ---- a fresh install: the first task's button is on screen and takes the tap ----
  { const { ctx, p } = await phone(b);
    const r = await p.evaluate(REACHABLE, "#ltAction");
    chk("the first Last Truck button is on screen and not covered", r.ok, r.why);
    // Scrolling the page must not take it away either.
    await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await p.waitForTimeout(200);
    const r2 = await p.evaluate(REACHABLE, "#ltAction");
    chk("and stays reachable wherever the page is scrolled", r2.ok, r2.why);
    const pick = await p.evaluate(REACHABLE, "#pickBtn");
    chk("with PICK ORDER still reachable beside it", pick.ok, pick.why);
    await ctx.close(); }

  // ---- once the shift is over the card goes back into the page ----
  { const { ctx, p } = await phone(b, { launches:3, lifetime:5e5, total:5e5, money:1000, contractsDone:2,
                                        lastTruck:{ version:1, status:"complete" } });
    const docked = await p.evaluate(() => {
      const c = document.getElementById("lastTruckCard");
      return c ? !!c.closest(".pickwrap") : null;
    });
    chk("after the shift the report card is not pinned over the game", docked === false, String(docked));
    await ctx.close(); }

  await b.close();
  console.log("PASS:"); ok.forEach(l=>console.log("  + "+l));
  if(bad.length){ console.log("FAIL:"); bad.forEach(l=>console.log("  - "+l)); process.exitCode=1; }
})();
