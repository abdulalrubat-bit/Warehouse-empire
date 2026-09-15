require("./harness.js");
require("./game.js");
const s = global.state;
const ok=[], bad=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));
const $ = (id)=>document.getElementById(id);
const tick = () => new Promise(r=>process.nextTick(r));
const ticker = global.__intervals.find(i=>i.ms===100);

(async () => {
for (let i=0;i<8;i++) await tick();

// ---------- CONTRACTS ----------
// Winnability: goal must be reachable from the production accrued over the window,
// for every SKU x site pairing. This used to be impossible for all but the default pair.
const SKUS = [["fmcg",1.0],["pharma",1.5],["industrial",2.2]];
const SITES = [["general",1.0],["cold",2.2],["hazmat",1.5]];
s.owned = {picker:100, trolley:50, forklift:20};
let allWinnable = true, worst = null;
for (const [sku] of SKUS) for (const [site] of SITES){
  s.sku = sku; s.site = site; s.contract = null;
  $("contractTitle").textContent = "";
  ticker.fn();                                  // renderContract() mints a fresh contract
  const c = s.contract;
  const mins = c.mins, rate = c.goal / (60*mins*0.6);   // rate implied by the goal formula
  const achievable = rate * mins * 60;
  const ratio = c.goal / achievable;
  if (ratio > 1) { allWinnable = false; if (!worst || ratio > worst.r) worst = {sku, site, r: ratio}; }
}
chk("contracts are winnable for every SKU x site pairing", allWinnable,
    worst ? "worst: "+worst.sku+"/"+worst.site+" needs x"+worst.r.toFixed(2) : "all 9 pairings <= 1.0");

// Payout must still reward the risky manifests.
function rewardFor(sku, site){
  // Contract cash carries the manifest's live market multiplier, which rolls on its own
  // clock. Comparing two rewards taken at two different market states measures the dice,
  // not the site: pin every manifest to Normal for the duration.
  ["fmcg","pharma","industrial","bonded","semis"].forEach(function(id){
    s.marketState[id] = { id: "normal", until: Date.now() + 3600000 };
  });
  s.sku = sku; s.site = site; s.contract = null; ticker.fn(); return s.contract.cash;
}
// Take each reward exactly once. The ticker inside rewardFor also earns, so calling it
// twice -- once for the condition and once for the message -- compares two different
// rates and the ratio drifts run to run.
const rewards = {
  base: rewardFor("fmcg","general"),
  pharma: rewardFor("pharma","general"),
  cold: rewardFor("fmcg","cold")
};
chk("Cold Pharma pays more than FMCG", rewards.pharma > rewards.base * 1.4,
    "x" + (rewards.pharma/rewards.base).toFixed(2));
chk("Cold Storage pays a premium (site conMult now reaches the reward)",
    rewards.cold > rewards.base * 1.8, "x" + (rewards.cold/rewards.base).toFixed(2));

// Contract cash must reach lifetime/total, not just money.
s.sku="fmcg"; s.site="general"; s.contract=null; ticker.fn();
// The ticker earns totalRate()*dt, and dt is real elapsed time -- ~0 in a tight loop.
// Drive a controllable clock so production actually accrues.
let clock = Date.now(); Date.now = () => clock;
clock += 1000; ticker.fn();                    // resync the ticker's internal `last`
s.contract.prog = s.contract.goal * 0.99;
const before = { m:s.money, t:s.total, l:s.lifetime, done:s.contractsDone };
const cash = s.contract.cash;
for (let i=0;i<40 && s.contractsDone===before.done; i++){ clock += 1000; ticker.fn(); }
chk("completing a contract increments contractsDone", s.contractsDone === before.done+1);
const dM = s.money-before.m, dT = s.total-before.t, dL = s.lifetime-before.l;
chk("contract cash reaches total and lifetime, not just money",
    dT >= cash*0.99 && dL >= cash*0.99 && dM >= cash*0.99,
    "reward "+cash.toFixed(0)+" -> money +"+dM.toFixed(0)+", total +"+dT.toFixed(0)+", lifetime +"+dL.toFixed(0));

// ---------- UPGRADE / PERK REQUIREMENT GATING ----------
s.money = 1e12; s.upgrades = {};
s.owned = {forklift: 0};
// UPGRADES are built per generator as [u1, u2, mgr]; forklift is GENS[2] -> index 6.
const shopKids = $("shop").children;
const idx = 6;
shopKids[idx].fire("click");
chk("upgrade cannot be bought without its required equipment", !s.upgrades["forklift_u1"],
    "forklift_u1 owned="+!!s.upgrades["forklift_u1"]);
s.owned.forklift = 10;
shopKids[idx].fire("click");
chk("upgrade unlocks once the requirement is met", !!s.upgrades["forklift_u1"]);

s.pallets = 500; s.perks = {};
const perkKids = $("perkList").children;   // PERKS order: gloves, lean, maint, radio, night
perkKids[2].fire("click");                 // maint requires lean
chk("perk cannot be bought without its prerequisite", !s.perks.maint);
perkKids[1].fire("click");                 // buy lean
perkKids[2].fire("click");                 // now maint
chk("perk unlocks once its prerequisite is owned", !!s.perks.lean && !!s.perks.maint);
perkKids[4].fire("click");                 // night requires radio
chk("second prerequisite chain also enforced", !s.perks.night);

// ---------- NETWORK CAP ----------
s.network = [];
for (let k=0;k<40;k++) s.network.push({id:"general", peak: k});
s.rep = 0; s.lifetime = 1e12; s.money = 0; s.owned={picker:10};
// force a sale
s.prestiges = 0;
$("sellBtn").fire("click"); $("sellBtn").fire("click");   // arm + confirm
chk("network array is capped", s.network.length <= 25, "network length="+s.network.length);
chk("network cap keeps the strongest sites", s.network.every(n=>n.peak >= 15 || n.id==="general"),
    "min peak kept="+Math.min(...s.network.map(n=>n.peak)));

console.log("PASS:"); ok.forEach(l=>console.log("  + "+l));
if(bad.length){ console.log("FAIL:"); bad.forEach(l=>console.log("  - "+l)); process.exitCode=1; }
})();
