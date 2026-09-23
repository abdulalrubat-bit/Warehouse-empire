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
  // A returning save may open on the streak calendar; these checks are about the page under it.
  if (!(await p.evaluate(() => document.getElementById("modalDaily").hidden))) {
    await p.click("#btnClaimDaily"); await p.waitForTimeout(250);
  }
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
    // Read once, then gone: it was a permanent card at the top of the Floor.
    await p.evaluate(() => document.getElementById("ltAction").click()); await p.waitForTimeout(200);
    await p.evaluate(() => document.querySelector('.tabs button[data-tab="floor"]').click()); await p.waitForTimeout(200);
    chk("and once its button is used the report leaves the Floor",
        await p.evaluate(() => document.getElementById("lastTruckCard").hidden === true));

    // The Floor is the site, one card saying what next, the contracts, the boosts and a
    // drawer -- not nine cards stacked end to end.
    const cards = await p.evaluate(() => {
      const f = document.getElementById("tab-floor");
      return [...f.children].filter(c => !c.hidden && getComputedStyle(c).display !== "none" &&
        !c.classList.contains("pickwrap") && c.getBoundingClientRect().height > 0).map(c => c.id || c.className);
    });
    chk("the Floor shows at most six blocks below the site", cards.length <= 7, cards.join(", "));
    chk("with one card saying what to do next",
        await p.evaluate(() => ["objective","bottleneck"].filter(id => !document.getElementById(id).hidden).length === 1));
    await ctx.close(); }

  // ---- the readout gives the page its room back ----
  { const { ctx, p } = await phone(b, { launches:3, lifetime:5e5, total:5e5, money:1000, contractsDone:2,
                                        lastTruck:{ version:1, status:"complete" } });
    const h = () => p.evaluate(() => Math.round(document.querySelector(".topbar").getBoundingClientRect().height));
    const full = await h();
    chk("at the top of the page the readout is a panel, not a third of the screen", full < 270, full + "px");
    await p.evaluate(() => window.scrollTo(0, 500)); await p.waitForTimeout(300);
    const folded = await h();
    chk("scrolled into the page it folds to one line", folded < 90, folded + "px");
    chk("and still shows the balance and the rate", await p.evaluate(() => {
      const vis = id => { const r = document.getElementById(id).getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      return vis("money") && vis("rate");
    }));
    await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(300);
    chk("and unfolds again at the top", await h() === full, (await h()) + "px");

    // A notice hangs under the readout rather than over the middle of the page.
    await p.evaluate(() => window.scrollTo(0, 500)); await p.waitForTimeout(300);
    await p.evaluate(() => window.__toast("Award Unlocked: <b>Test</b>")); await p.waitForTimeout(450);
    const t = await p.evaluate(() => {
      const r = document.getElementById("toast").getBoundingClientRect();
      const tb = document.querySelector(".topbar").getBoundingClientRect();
      return { top: Math.round(r.top), bottom: Math.round(r.bottom), under: Math.round(tb.bottom), vh: innerHeight };
    });
    chk("a notice sits just under the readout", t.top >= t.under && t.top - t.under < 20, JSON.stringify(t));
    chk("and stays in the top fifth of the screen", t.bottom < t.vh * 0.2, JSON.stringify(t));
    await p.click("#toast"); await p.waitForTimeout(400);
    chk("a tap dismisses it", await p.evaluate(() => !document.getElementById("toast").classList.contains("show")));
    await ctx.close(); }

  // ---- during the shift the readout is folded, so the site and the task both fit ----
  { const { ctx, p } = await phone(b);
    const r = await p.evaluate(() => {
      const tb = document.querySelector(".topbar").getBoundingClientRect();
      const cv = document.getElementById("wcanvas").getBoundingClientRect();
      const dock = document.querySelector(".pickwrap").getBoundingClientRect();
      return { head: Math.round(tb.height), canvasVisible: Math.round(Math.min(cv.bottom, dock.top) - Math.max(cv.top, tb.bottom)) };
    });
    chk("the opening shift folds the readout", r.head < 90, r.head + "px");
    chk("leaving most of the site on screen above the task card", r.canvasVisible > 280, r.canvasVisible + "px of canvas visible");
    await ctx.close(); }

  // ---- the site opens on the working building, and Overview still shows the estate ----
  { const { ctx, p } = await phone(b, { launches:3, lifetime:5e6, total:5e6, money:2e6, contractsDone:4,
                                        owned:{ picker:25, trolley:12, forklift:6 },
                                        lastTruck:{ version:1, status:"complete" } });
    await p.waitForTimeout(1200);
    const open = await p.evaluate(() => {
      const P = window.__plan, c = document.getElementById("wcanvas"), z = P.zones;
      const a = P.toScreen(z.receive.x, z.receive.y), b2 = P.toScreen(z.ship.x + z.ship.w, z.ship.y);
      return { z: P.cam().z, recvTop: a.y, shipTop: b2.y, h: c.clientHeight, w: c.clientWidth };
    });
    // Under a quarter scale was what the estate framing gave a portrait phone.
    chk("the site opens at a scale its labels survive", open.z >= 0.35, "z=" + open.z.toFixed(3));
    chk("with receiving and shipping both in frame",
        open.recvTop > -40 && open.shipTop < open.h, JSON.stringify(open));
    await p.click("#canvasOverview"); await p.waitForTimeout(1500);
    const over = await p.evaluate(() => {
      const P = window.__plan, a = P.toScreen(P.site.x, P.net.y), b2 = P.toScreen(P.site.x + P.site.w, P.site.y + P.site.h);
      const c = document.getElementById("wcanvas");
      return { l: a.x, t: a.y, r: b2.x, b: b2.y, w: c.clientWidth, h: c.clientHeight };
    });
    chk("Overview pulls out to the whole estate, Network band included",
        over.l >= -2 && over.r <= over.w + 2 && over.t >= -2 && over.b <= over.h + 2, JSON.stringify(over));
    await ctx.close(); }

  await b.close();
  console.log("PASS:"); ok.forEach(l=>console.log("  + "+l));
  if(bad.length){ console.log("FAIL:"); bad.forEach(l=>console.log("  - "+l)); process.exitCode=1; }
})();
