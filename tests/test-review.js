require("./harness.js");
require("./game.js");
const s = global.state;
const ok=[], bad=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));
const $ = (id)=>document.getElementById(id);
const tick = async (n=8) => { for(let i=0;i<n;i++) await new Promise(r=>process.nextTick(r)); };
const ticker = global.__intervals.find(i=>i.ms===100);
let clock = Date.now();

(async () => {
await tick(10);
Date.now = () => clock;

chk("no prompt before any milestone", $("modalReview").hidden === true);

// --- reaching the milestone grants the bonus and opens the dialog ---
s.contractsDone = 25;
const before = s.pallets;
clock += 2000; ticker.fn();
chk("milestone fires at 25 contracts", $("modalReview").hidden === false);
// checkAch runs in the same tick and can award its own pallets, so assert the
// milestone's contribution rather than an exact total.
chk("bonus granted", s.pallets >= before + 15, before + " -> " + s.pallets + " (>= +15)");
chk("bonus is described as already awarded", /Already added/.test($("modalReview").innerHTML) ||
    $("reviewBonus").textContent === "+15 Pallets", $("reviewBonus").textContent);

// --- the reward must NOT depend on reviewing: declining keeps it ---
$("btnReviewLater").fire("click");
chk("declining closes the dialog", $("modalReview").hidden === true);
const afterDecline = s.pallets;
chk("declining keeps the bonus", afterDecline >= before + 15, "pallets=" + afterDecline);

// --- and it never asks again ---
s.prestiges = 3;
clock += 2000; ticker.fn();
chk("never asks a second time", $("modalReview").hidden === true);
chk("second milestone grants no further prompt", s.reviewAsked === true);

// --- the store link hands off to Play, with a fallback for a device without it ---
const PLAY = "https://play.google.com/store/apps/details?id=com.abdulgames.warehouseempire";
const MARKET = "market://details?id=com.abdulgames.warehouseempire";
let tried = [], handles = true;
global.Capacitor = { Plugins: { App: { openUrl: (o) => {
  tried.push(o.url);
  // Play is not installed in this scenario, so nothing claims market://
  if (o.url.indexOf("market:") === 0 && !handles) return Promise.resolve({ completed: false });
  return Promise.resolve({ completed: true });
}}}};

async function rate(){
  tried = [];
  s.reviewAsked = false; s.milestones = {}; s.contractsDone = 25;
  clock += 2000; ticker.fn();
  $("btnReviewNow").fire("click");
  await tick(8);
}

await rate();
chk("the Play app is offered the listing first", tried[0] === MARKET, tried.join(" -> "));
chk("nothing further is tried once Play takes it", tried.length === 1, tried.join(" -> "));
chk("package id matches the shipped app", /com\.abdulgames\.warehouseempire$/.test(tried[0] || ""));

handles = false;                       // no Play app on this device
await rate();
chk("falls back to the web listing when Play is absent", tried[1] === PLAY, tried.join(" -> "));

// A resolved promise is not success: openUrl reports completed:false when nothing on
// the device claims the scheme, and that used to read as "opened".
chk("a completed:false response is treated as a failure, not a success",
    tried.length === 2, tried.join(" -> "));

console.log("PASS:"); ok.forEach(l=>console.log("  + "+l));
if(bad.length){ console.log("FAIL:"); bad.forEach(l=>console.log("  - "+l)); process.exitCode=1; }
})();
