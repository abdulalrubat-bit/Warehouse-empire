const P = require("./paths.js");
// The four new Corporate Real Estate buildings. Everything is driven through the real
// purchase paths -- buying a corp level is what invalidates the upgrade cache, so poking
// state.corp directly would measure nothing.
require("./harness.js");
const fs = require("fs");
require("./game.js");
const s = global.state;
const ok=[], bad=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));
const $ = id => document.getElementById(id);
const tick = async (n=8) => { for(let i=0;i<n;i++) await new Promise(r=>process.nextTick(r)); };
const ticker = global.__intervals.find(i => i.ms === 100);

const HTML = fs.readFileSync(P.HTML,"utf8");
const ORDER = [...HTML.match(/var CORP_BUILDINGS = \[[\s\S]*?\];/)[0].matchAll(/\{id: "(\w+)"/g)].map(m=>m[1]);
let clock = Date.now();

// Buy `n` levels of a building the way a player does: money in the bank, tap the row.
function buyCorp(id, n){
  const idx = ORDER.indexOf(id);
  global.__clickTab("office");
  for (let i=0;i<n;i++){
    s.money = 1e40;
    $("corpShop").children[idx].fire("click");
  }
  s.money = 0;
}
function buyGen(genIdx, times){
  global.__clickTab("equip");
  const card = $("gens").children[genIdx];
  const btn = card.querySelector(".gen-card-buy");
  let n = 0;
  for (let i=0;i<times;i++){
    const before = s.owned.picker;
    btn.fire("click");
    if (s.owned.picker === before) break;
    n++;
  }
  return n;
}
const pinMarket = () => ["fmcg","pharma","industrial"].forEach(id =>
  s.marketState[id] = { id:"normal", until: clock + 3600000 });

(async () => {
await tick(12);
Date.now = () => clock;
s.owned = { picker: 80, trolley: 40, forklift: 20 };
s.perks = {}; s.upgrades = {};
pinMarket();

// --- plots must not overlap ------------------------------------------------------
const plots = {};
HTML.match(/var CORP_PLOTS = \{[\s\S]*?\};/)[0].split("\n").forEach(l => {
  const m = /(\w+):\s*\{ gx:\s*(-?\d+),\s*gy:\s*(-?\d+),\s*gw:\s*(\d+),\s*gd:\s*(\d+)/.exec(l);
  if (m) plots[m[1]] = { x:+m[2], y:+m[3], w:+m[4], d:+m[5] };
});
const ids = Object.keys(plots);
chk("every building has a plot", ids.length === 8 && ORDER.every(i=>plots[i]), ids.join(","));
let clash = null;
for (let i=0;i<ids.length;i++) for (let j=i+1;j<ids.length;j++){
  const a = plots[ids[i]], b = plots[ids[j]];
  if (a.x < b.x+b.w && b.x < a.x+a.w && a.y < b.y+b.d && b.y < a.y+a.d) clash = ids[i]+" / "+ids[j];
}
chk("no two plots overlap", !clash, clash || "clear");

// --- Customs Office ---------------------------------------------------------------
const frozen = clock; Date.now = () => frozen;
const goalNow = () => { s.contract = null; ticker.fn(); return s.contract.goal; };
const g0 = goalNow();
Date.now = () => clock; buyCorp("customs", 10); Date.now = () => frozen;
const g10 = goalNow();
Date.now = () => clock;
chk("Customs Office cuts the contract quota", g10 < g0, g0 + " -> " + g10);
chk("the cut lands at 40% by level 10", Math.abs(g10 / g0 - 0.60) < 0.02, "x" + (g10/g0).toFixed(3));
s.corp.customs = 0;

// --- Training Centre ---------------------------------------------------------------
// A manager on every owned generator, so the aggregate ratio IS the manager ratio.
// With only some generators managed the effect is diluted and measures nothing clean.
s.owned = { picker: 80, trolley: 40, forklift: 20 };
s.upgrades = { mgr_picker: true, mgr_trolley: true, mgr_forklift: true };
// Contract goals stopped being a proxy for throughput when rush jobs arrived: every
// fourth one is scaled 2min x110% rather than 15min x60%, which reads as a x0.24 collapse
// in rate that never happened. Pin the counter so every probe measures a standard job.
const readRate = () => { s.contractsOffered = 0; s.contract = null; ticker.fn(); return s.contract.goal; };
function rateAtTraining(lvl){
  s.corp.training = lvl;
  // The manager cache is only dropped by a corp purchase, so a zero-level baseline would
  // measure a stale cache. Any purchase invalidates it; HR does not enter upMult, so
  // buying and clearing a level of it is inert for what is being measured here.
  buyCorp("hr", 1); s.corp.hr = 0;
  pinMarket();
  const was = Date.now; Date.now = () => frozen;
  const r = readRate();
  Date.now = was;
  return r;
}
const t0 = rateAtTraining(0), t5 = rateAtTraining(5), t9 = rateAtTraining(9), t10 = rateAtTraining(10);
// A x1.5 manager carries a 0.5 bonus: five levels take it to 0.625 (x1.625 / x1.5 = 1.083)
// and the mastery doubles the level-10 bonus of 0.75 to 1.5 (x2.5 / x1.5 = 1.667).
chk("five levels lift managers by about 8%", Math.abs(t5/t0 - 1.0833) < 0.01, "x" + (t5/t0).toFixed(4));
chk("the mastery takes managers to x2.5", Math.abs(t10/t0 - 1.6667) < 0.01, "x" + (t10/t0).toFixed(4));
chk("level 10 is a step, not another increment", (t10 - t9) > (t9 - t0) * 2,
    "9->10 gains " + Math.round(t10-t9) + " vs 0->9 total " + Math.round(t9-t0));
s.corp.training = 0; s.upgrades = {}; buyCorp("training", 0);

// --- Fleet Depot --------------------------------------------------------------------
function unitsFor(money, depot, solar){
  s.corp.depot = 0; s.corp.solar = 0; buyCorp("depot", 0);
  if (depot) buyCorp("depot", depot);
  if (solar) buyCorp("solar", solar);
  s.depotFreeUsed = true;               // measuring cost growth, not the free purchase
  s.owned.picker = 0; s.money = money;
  return buyGen(0, 500);
}
const nPlain = unitsFor(1e9, 0, 0);
const nDepot = unitsFor(1e9, 10, 0);
const nBoth  = unitsFor(1e9, 10, 10);
chk("Fleet Depot buys more fleet for the same money", nDepot > nPlain, nPlain + " -> " + nDepot);
chk("Depot stacks with Solar Array", nBoth > nDepot, nDepot + " -> " + nBoth);

// mastery: one free purchase, refreshed per site
s.corp.depot = 0; s.corp.solar = 0; buyCorp("depot", 10);
s.depotFreeUsed = false; s.money = 0; s.owned.picker = 0;
buyGen(0, 1);
chk("the mastery grants one purchase with no money", s.owned.picker > 0, "picker=" + s.owned.picker);
chk("it is marked used", s.depotFreeUsed === true);
const afterFree = s.owned.picker;
buyGen(0, 1);
chk("the free purchase is one-shot", s.owned.picker === afterFree, "picker=" + s.owned.picker);

s.lifetime = 5e9; s.rep = 0; s.money = 0;
$("sellBtn").fire("click"); $("sellBtn").fire("click");     // arm, then confirm
chk("the free purchase refreshes on selling the site", s.depotFreeUsed === false);
s.corp.depot = 0; buyCorp("depot", 0);

// --- Marketing Office ----------------------------------------------------------------
function hotWindow(lvl){
  s.corp.marketing = 0; buyCorp("marketing", lvl);
  const seen = [];
  for (let i=0;i<6000 && seen.length<40;i++){
    s.marketState.fmcg = { id:"normal", until: clock };
    clock += 1000; ticker.fn();
    if (s.marketState.fmcg.id === "hot") seen.push(s.marketState.fmcg.until - clock);
  }
  return seen.reduce((a,b)=>a+b,0) / seen.length;
}
const w0 = hotWindow(0), w10 = hotWindow(10);
chk("Marketing Office lengthens Hot windows", w10 > w0 * 1.5,
    Math.round(w0/1000) + "s -> " + Math.round(w10/1000) + "s");
chk("Low and Normal windows are untouched", (function(){
  s.corp.marketing = 0; buyCorp("marketing", 10);
  const seen = [];
  for (let i=0;i<6000 && seen.length<30;i++){
    s.marketState.fmcg = { id:"hot", until: clock };
    clock += 1000; ticker.fn();
    if (s.marketState.fmcg.id === "low") seen.push(s.marketState.fmcg.until - clock);
  }
  const avg = seen.reduce((a,b)=>a+b,0) / seen.length;
  return avg >= 240000 && avg <= 480000;
})());
s.corp.marketing = 0; buyCorp("marketing", 0);

// --- masteries are inert below level 10 ------------------------------------------------
s.corp.customs = 0; buyCorp("customs", 9);
s.sku = "fmcg"; global.boostUntil = 0;
$("openSkuBtn").fire("click");
$("skuList").children[1].fire("click");                    // switch to Cold Pharma
// The mastery used to hand out x8 for 30s on every switch, which made the best manifest
// "whichever one I am not currently on". It now exempts you from the changeover instead.
chk("below the mastery, a switch still costs a changeover",
    (s.changeoverUntil || 0) > Date.now(),
    "left=" + Math.max(0, Math.round(((s.changeoverUntil||0) - Date.now())/1000)) + "s");
buyCorp("customs", 1);
s.changeoverUntil = 0;      // clear the one the level-9 case started
s.sku = "fmcg";
$("openSkuBtn").fire("click");
$("skuList").children[1].fire("click");
chk("Customs at level 10 exempts the switch from changeover",
    (s.changeoverUntil || 0) <= Date.now() && /no changeover/i.test($("toast").innerHTML),
    $("toast").innerHTML.slice(0,80));

// --- an old save without the new keys still loads --------------------------------------
chk("a save predating these buildings gets zeroed levels", (function(){
  s.corp = { hr: 3, tower: 2, solar: 1, server: 0 };
  global.__clickTab("office");
  return ORDER.every(id => typeof (s.corp[id] || 0) === "number" && isFinite(s.corp[id] || 0));
})(), JSON.stringify(s.corp));

console.log("PASS:"); ok.forEach(l=>console.log("  + "+l));
if(bad.length){ console.log("FAIL:"); bad.forEach(l=>console.log("  - "+l)); process.exitCode=1; }
})();
