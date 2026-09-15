// Each manifest runs its own market clock. These check the roll weighting, the window
// lengths, that the multiplier reaches rate and contract payouts, and that the player is
// nudged only for their own manifest turning good.
require("./harness.js");
require("./game.js");
const s = global.state;
const ok=[], bad=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));
const $ = id => document.getElementById(id);
const tick = () => new Promise(r=>process.nextTick(r));
const ticker = global.__intervals.find(i => i.ms === 100);
const toast = $("toast");

let clock = Date.now();
Date.now = () => clock;
const SKUS = ["fmcg","pharma","industrial"];
const setMkt = (id, st, ms) => { s.marketState[id] = { id: st, until: clock + (ms === undefined ? 3600000 : ms) }; };
const pinAll = st => SKUS.forEach(id => setMkt(id, st || "normal"));

(async () => {
for (let i=0;i<12;i++) await tick();
Date.now = () => clock;
s.owned.picker = 50; s.owned.trolley = 20; s.perks = {}; s.corp = {hr:0,tower:0,solar:0,server:0};

// --- every manifest gets its own independent clock -------------------------------
pinAll("normal");
chk("each manifest carries its own market entry",
    SKUS.every(id => s.marketState[id] && s.marketState[id].id === "normal"));

setMkt("fmcg", "peak"); setMkt("pharma", "low");
chk("manifests hold different states at once",
    s.marketState.fmcg.id === "peak" && s.marketState.pharma.id === "low");

// --- the multiplier reaches the rate --------------------------------------------
const rateAt = st => { pinAll(st); global.render(); return $("rate").textContent; };
const num = str => { const m=/^\$?([\d.]+)([KMBT])?$/.exec(str.trim());
  return m ? parseFloat(m[1]) * ({undefined:1,K:1e3,M:1e6,B:1e9,T:1e12}[m[2]]) : NaN; };

// flowEfficiency() puts a wall-clock sine on gross, so freeze it by sampling at one instant.
const frozen = clock;
Date.now = () => frozen;
const rNormal = num(rateAt("normal")), rLow = num(rateAt("low"));
const rHot = num(rateAt("hot")), rPeak = num(rateAt("peak"));
Date.now = () => clock;

chk("Low cuts the rate", rLow < rNormal, rLow + " < " + rNormal);
chk("Hot lifts the rate", rHot > rNormal, rHot + " > " + rNormal);
chk("Peak is the strongest", rPeak > rHot, rPeak + " > " + rHot);
// The strip shows net, and the market lifts gross without touching the wage bill, so net
// moves by more than the raw 1.8x. That is the intent -- demand raises revenue, not costs.
chk("Peak lifts net by more than its 1.8x on gross", rPeak / rNormal > 1.8 && rPeak / rNormal < 2.4,
    "x" + (rPeak / rNormal).toFixed(2));

// --- contract payouts reflect the market when the contract is written ------------
function freshContractCash(st){
  pinAll(st);
  const was = Date.now; Date.now = () => frozen;
  s.contract = null;
  ticker.fn();                           // renderContract() writes a new one
  const cash = s.contract.cash, goal = s.contract.goal;
  Date.now = was;
  return { cash, goal };
}
const cNormal = freshContractCash("normal"), cPeak = freshContractCash("peak");
chk("a contract written in Peak pays more", cPeak.cash > cNormal.cash,
    Math.round(cNormal.cash) + " -> " + Math.round(cPeak.cash));
chk("the payout beats the larger goal, so Peak is worth catching",
    (cPeak.cash / cPeak.goal) > (cNormal.cash / cNormal.goal) * 1.4,
    "reward/goal " + (cNormal.cash/cNormal.goal).toFixed(2) + " -> " + (cPeak.cash/cPeak.goal).toFixed(2));

// --- windows roll over, and Peak never repeats straight into itself --------------
pinAll("normal");
setMkt("fmcg", "peak", 0);              // window already closed
clock += 1000; ticker.fn();
chk("a closed window rolls to a new state", s.marketState.fmcg.id !== "peak", s.marketState.fmcg.id);
chk("the new window has a future deadline", s.marketState.fmcg.until > clock);

chk("Peak windows are short (60-90s)", (function(){
  // drive the roll until it lands on peak, then read the window it was given
  for (let i=0;i<5000;i++){
    setMkt("pharma", "normal", 0); clock += 1000; ticker.fn();
    if (s.marketState.pharma.id === "peak"){
      const w = s.marketState.pharma.until - clock;
      return w >= 59000 && w <= 91000;
    }
  }
  return false;
})());

// --- weighting: Peak rare, Hot uncommon -----------------------------------------
const counts = { low:0, normal:0, hot:0, peak:0 };
for (let i=0;i<6000;i++){
  setMkt("industrial", "normal", 0);
  clock += 1000;
  ticker.fn();
  counts[s.marketState.industrial.id]++;
}
const pct = k => (counts[k] / 6000) * 100;
chk("Peak is rare (~5%)", pct("peak") > 2 && pct("peak") < 9, pct("peak").toFixed(1) + "%");
chk("Hot is uncommon (~20%)", pct("hot") > 14 && pct("hot") < 27, pct("hot").toFixed(1) + "%");
chk("Normal and Low carry the rest", pct("normal") + pct("low") > 65,
    "normal " + pct("normal").toFixed(1) + "% low " + pct("low").toFixed(1) + "%");

// --- the nudge fires for the player's manifest only ------------------------------
s.sku = "fmcg";
pinAll("normal");
toast.innerHTML = "";
setMkt("pharma", "normal", 0);
let sawOther = false;
for (let i=0;i<60 && !sawOther;i++){
  clock += 1000; ticker.fn();
  if (/market on/i.test(toast.innerHTML) && /Pharma/i.test(toast.innerHTML)) sawOther = true;
  setMkt("pharma", "normal", 0);
}
chk("no nudge for a manifest the player is not running", !sawOther);

toast.innerHTML = "";
setMkt("fmcg", "hot");                  // already Hot, window open
clock += 1000; ticker.fn();
chk("no nudge while a window is merely open", toast.innerHTML === "");

// force fmcg to roll until it turns Hot or Peak, and check the player hears about it
let heard = false;
for (let i=0;i<3000 && !heard;i++){
  toast.innerHTML = "";
  setMkt("fmcg", "normal", 0);
  clock += 1000; ticker.fn();
  if (/market on/i.test(toast.innerHTML)) heard = true;
}
chk("the player is told when their own manifest turns good", heard, toast.innerHTML.slice(0,70));

// --- badges -----------------------------------------------------------------------
s.sku = "fmcg"; setMkt("fmcg", "peak"); global.renderMarket ? global.renderMarket() : null;
$("openSkuBtn").fire("click");
const badge = $("activeSkuMkt");
chk("the strip badge names the state", /Peak/i.test(badge.textContent), badge.textContent);
chk("the strip badge is colour-coded by state", /\bpeak\b/.test(badge.className), badge.className);
setMkt("fmcg", "low"); clock += 1; ticker.fn();
$("openSkuBtn").fire("click");
chk("the badge follows a state change", /Low/i.test($("activeSkuMkt").textContent), $("activeSkuMkt").textContent);

// --- a broken or absent market entry repairs itself --------------------------------
s.marketState = {};
chk("a missing market map is rebuilt", (global.render(), !!s.marketState[s.sku]));
s.marketState.fmcg = { id: "nonsense", until: NaN };
global.render();
chk("a corrupt entry is replaced rather than propagated",
    s.marketState.fmcg.id === "normal" && isFinite(s.marketState.fmcg.until),
    JSON.stringify(s.marketState.fmcg));

console.log("PASS:"); ok.forEach(l=>console.log("  + "+l));
if(bad.length){ console.log("FAIL:"); bad.forEach(l=>console.log("  - "+l)); process.exitCode=1; }
})();
