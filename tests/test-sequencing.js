// Two changes that are meant to further the game rather than widen it: hold back the
// content a new player cannot use yet, and make switching manifest a decision by giving
// it a price. Nothing may be removed, and no existing save may lose access to anything.
require("./harness.js");
const cvEl = document.getElementById("wcanvas"); cvEl._cw = 400; cvEl._ch = 300;
require("./game.js");

const s = global.state;
const ok=[], bad=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));
const tick = () => new Promise(r=>process.nextTick(r));
const settle = async () => { for (let i=0;i<20;i++) await tick(); };

const adRow   = () => document.getElementById("adRow");
const officeBtn = () => [...document.querySelectorAll('.tabs button')]
  .find(b => b.getAttribute("data-tab") === "office");
// The gate moved: the Office TAB now stays open from the start, because it also holds
// settings and the save controls, and hiding those was the wrong price to pay. What waits
// for the first contract is the operations desk inside it -- prestige, Corporate Real
// Estate, the Directorship and the Network -- with a panel in its place saying so.
const desk   = () => document.getElementById("officeProgression");
const locked = () => document.getElementById("officeProgressionLocked");
const fresh = () => {
  // What a new save really holds. A site opens with one Casual Picker, so an empty `owned`
  // is a state no player is ever in -- and the gates below are precisely the ones that used
  // to read that picker as "this player has started".
  s.owned = { picker: 1 }; s.taps = 0; s.contractsDone = 0; s.prestiges = 0; s.dailyStreak = 0;
  s.lifetime = 0; s.corp = { hr:0, customs:0, marketing:0, tower:0, training:0, solar:0, depot:0, server:0 };
  s.tree = {}; s.changeoverUntil = 0; s.changeoverSpan = 0; s.sku = "fmcg";
};

(async () => {
await settle();

// ---- what a new player is shown ---------------------------------------------------
fresh(); global.render(); await settle();

chk("a player with no plant is not offered a boost that multiplies nothing",
    adRow().hidden === true, "adRow hidden=" + adRow().hidden);
chk("the Office tab stays reachable, because settings live in it",
    officeBtn().hidden === false, "office tab hidden=" + officeBtn().hidden);
chk("but its operations desk is not offered before the first contract",
    desk().hidden === true && locked().hidden === false,
    "desk hidden=" + desk().hidden + " notice hidden=" + locked().hidden);

// The daily calendar must not open over a player who has not played yet -- and, crucially,
// must not be marked as shown, or it would be lost for the whole of their first day.
const beforeShown = s.dailyShownFor;
global.checkDaily ? global.checkDaily() : null;
chk("the streak calendar does not open before the first tap",
    document.getElementById("modalDaily").hidden === true,
    "modalDaily hidden=" + document.getElementById("modalDaily").hidden);
chk("and is not consumed by being held back", s.dailyShownFor === beforeShown,
    "dailyShownFor=" + s.dailyShownFor + " (was " + beforeShown + ")");

// ---- each thing arrives the moment it can mean something ---------------------------
s.owned.picker = 2; global.render(); await settle();
chk("buying a picker of their own brings the boosts in", adRow().hidden === false,
    "adRow hidden=" + adRow().hidden);
chk("the operations desk still waits for a contract",
    desk().hidden === true && locked().hidden === false,
    "desk hidden=" + desk().hidden + " notice hidden=" + locked().hidden);

s.contractsDone = 1; global.render(); await settle();
chk("completing a contract opens the operations desk",
    desk().hidden === false && locked().hidden === true,
    "desk hidden=" + desk().hidden + " notice hidden=" + locked().hidden);

// ---- nobody with a save loses anything ---------------------------------------------
fresh(); s.prestiges = 4; s.owned.forklift = 20; s.contractsDone = 0;
global.render(); await settle();
chk("a player who has prestiged keeps the desk regardless of contract count",
    desk().hidden === false && locked().hidden === true,
    "desk hidden=" + desk().hidden + " notice hidden=" + locked().hidden);
chk("and keeps the boosts", adRow().hidden === false, "adRow hidden=" + adRow().hidden);

// The old gate hid the tab itself, so it had to be proven that a gate revoked mid-session
// could not strand the player on a tab that had just vanished. Gating a block inside the
// tab removes that failure mode by construction -- but only if the player is genuinely
// left with a usable Office rather than an empty one, so that is what is asserted now.
fresh(); s.contractsDone = 1; global.render(); await settle();
global.__clickTab("office");
s.contractsDone = 0; s.prestiges = 0;          // a reset that revokes the gate mid-session
global.render(); await settle();
chk("revoking the gate mid-session leaves the player on a usable Office",
    document.getElementById("tab-office").hidden === false &&
    desk().hidden === true && locked().hidden === false,
    "office pane hidden=" + document.getElementById("tab-office").hidden +
    " desk hidden=" + desk().hidden);
chk("and the settings the tab exists for are still there",
    document.getElementById("qualityNote") !== null &&
    document.getElementById("achCountTag") !== null);

// ---- the manifest now costs something to change ------------------------------------
fresh(); s.owned = { picker: 40, forklift: 10 };
const P = global.window.__plan;                 // unused here, but proves the seam still loads
const flow = () => { global.render(); return parseFloat(document.getElementById("flowPct").textContent); };

chk("throughput sits at 100% when nothing is changing over", flow() === 100,
    document.getElementById("flowPct").textContent);

// Switching is driven the way a player does it: open the manifest list and pick a row.
const pickSku = (id) => {
  document.getElementById("openSkuBtn").fire("click");
  const rows = [...document.getElementById("skuList").children];
  const row = rows.find(r => /Cold Pharma/i.test(r._html || r.innerHTML || ""));
  if (row) row.fire("click");
  return row;
};
const row = pickSku("pharma");
chk("the manifest list is drivable", !!row, row ? "found the Cold Pharma row" : "no row matched");
chk("picking a different manifest assigns it", s.sku === "pharma", "sku=" + s.sku);
chk("and starts a changeover", s.changeoverUntil > Date.now(),
    "left=" + Math.round((s.changeoverUntil - Date.now())/1000) + "s");

const during = flow();
chk("throughput drops while the site turns over", during <= 45 && during >= 38,
    during + "% (floor is 40%)");
chk("the bar says why, and counts it down",
    /Changeover/i.test(document.querySelector(".logistics-flow .flow-tag").textContent) &&
    /\d+s/.test(document.getElementById("flowPct").textContent),
    document.querySelector(".logistics-flow .flow-tag").textContent + " / " +
    document.getElementById("flowPct").textContent);

// The whole point of scaling wages by the same factor: a changeover costs a share of net
// income, not all of it. Left unscaled, a new player on pickers would lose ~90%.
const realNow = Date.now;
s.changeoverUntil = 0;
const fullNet = global.window.__sim ? 0 : 0;     // net is read through the UI below instead
const netAt = () => { global.render(); return global.state.money, global.__netProbe; };
s.changeoverUntil = 0;
const before = global.activeRate ? global.activeRate() : null;
chk("net income is still positive during a changeover",
    (function(){
      s.changeoverUntil = Date.now() + 60000; s.changeoverSpan = 60000;
      global.render();
      const txt = document.getElementById("rate").textContent;
      return !/^-/.test(txt) && txt !== "0";
    })(), "rate reads " + document.getElementById("rate").textContent);

// ---- the changeover ends, and the two systems that modify it -----------------------
s.changeoverUntil = Date.now() - 1;
chk("throughput returns to 100% once the changeover finishes", flow() === 100,
    document.getElementById("flowPct").textContent);

fresh(); s.owned.picker = 40; s.tree = { flow: true };
document.getElementById("openSkuBtn").fire("click");
[...document.getElementById("skuList").children].find(r => /Cold Pharma/i.test(r.innerHTML || "")).fire("click");
const withFlow = s.changeoverUntil - Date.now();
fresh(); s.owned.picker = 40;
document.getElementById("openSkuBtn").fire("click");
[...document.getElementById("skuList").children].find(r => /Cold Pharma/i.test(r.innerHTML || "")).fire("click");
const without = s.changeoverUntil - Date.now();
chk("Flow Control halves the changeover", withFlow < without * 0.6 && withFlow > 0,
    Math.round(withFlow/1000) + "s with, " + Math.round(without/1000) + "s without");

fresh(); s.owned.picker = 40; s.corp.customs = 10;
document.getElementById("openSkuBtn").fire("click");
[...document.getElementById("skuList").children].find(r => /Cold Pharma/i.test(r.innerHTML || "")).fire("click");
chk("Customs at level 10 exempts you from it entirely",
    (s.changeoverUntil || 0) <= Date.now(), "left=" + Math.max(0, s.changeoverUntil - Date.now()));

// Re-picking the manifest you are already on must not cost anything -- otherwise closing
// and reopening the list to read the market would be punished.
fresh(); s.owned.picker = 40;
document.getElementById("openSkuBtn").fire("click");
[...document.getElementById("skuList").children].find(r => /FMCG/i.test(r.innerHTML || "")).fire("click");
chk("re-selecting the manifest you already run costs nothing",
    (s.changeoverUntil || 0) <= Date.now(), "left=" + Math.max(0, (s.changeoverUntil||0) - Date.now()));

// ---- and it survives being closed -------------------------------------------------
fresh(); s.owned.picker = 40;
document.getElementById("openSkuBtn").fire("click");
[...document.getElementById("skuList").children].find(r => /Cold Pharma/i.test(r.innerHTML || "")).fire("click");
global.saveGame ? global.saveGame() : null;
const raw = JSON.parse(global.localStorage.getItem("warehouse-empire-save") || "{}");
chk("a changeover in progress is written to the save",
    typeof raw.changeoverUntil === "number" && raw.changeoverUntil > 0,
    "saved changeoverUntil=" + raw.changeoverUntil);

console.log("PASS:"); ok.forEach(l=>console.log("  + "+l));
if(bad.length){ console.log("FAIL:"); bad.forEach(l=>console.log("  - "+l)); process.exitCode=1; }
})();
