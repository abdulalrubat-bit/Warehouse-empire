require("./harness.js");
require("./game.js");
const s = global.state;
const ok=[], bad=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));

s.owned.picker = 50; s.owned.trolley = 20; s.perks = {};

const ticker = global.__intervals.find(i => i.ms === 100);
const toast  = document.getElementById("toast");

// controllable clock
let clock = Date.now();
Date.now = () => clock;

function num(str){ const m=/^\$?([\d.]+)([KMBT])?$/.exec(str.trim()); if(!m) return NaN;
  return parseFloat(m[1]) * ({undefined:1,K:1e3,M:1e6,B:1e9,T:1e12}[m[2]]); }
const rateNow = () => { global.render(); return num(document.getElementById("rate").textContent); };

// The market runs its own clock and would drift between the baseline and peak samples,
// which is a different multiplier from the one under test. Pin every manifest to Normal
// and keep re-pinning, since the ticker rolls any window that has closed.
function pinMarket(){
  ["fmcg","pharma","industrial"].forEach(id => {
    s.marketState[id] = { id: "normal", until: clock + 3600000 };
  });
}
pinMarket();

// Advance `mins` of game time in 5s steps; count rush arrivals and peak rate seen.
function run(mins){
  let rushes = 0, peak = 0, base = (pinMarket(), rateNow());
  for (let t = 0; t < mins*60; t += 5){
    clock += 5000;
    pinMarket();
    ticker.fn();
    if (toast.innerHTML.indexOf("Rush order on the dock") !== -1){ rushes++; toast.innerHTML = ""; }
    const r = rateNow(); if (r > peak) peak = r;
  }
  return { rushes, peak, base };
}

// --- baseline: rushes exist, but are rare (8-14 min apart) ---
const quiet = run(6);
chk("no rush within the first 6 min without Radio", quiet.rushes === 0, "rushes="+quiet.rushes);

const hour = run(60);
chk("ambient rushes do arrive without Radio (~4-8/hr)", hour.rushes >= 3 && hour.rushes <= 9,
    hour.rushes + " rushes/hr");
// Can't assert exactly x8: flowEfficiency() applies a +/-15% sine to gross (but not to the
// wage bill), so base and peak are sampled at different phases. x8 +/- that wobble is the
// band. The market is pinned above, so it contributes nothing here.
chk("a rush actually applies the x8 output boost",
    hour.peak / hour.base > 6 && hour.peak / hour.base < 12,
    "rate "+hour.base.toFixed(1)+" peaked at "+hour.peak.toFixed(1)+" (x"+(hour.peak/hour.base).toFixed(2)+")");

// --- with Radio Dispatch: "far more often" ---
s.perks.radio = true;
const radioHour = run(60);
chk("Radio Dispatch: rushes far more frequent (~15-30/hr)",
    radioHour.rushes >= 12 && radioHour.rushes <= 32, radioHour.rushes + " rushes/hr");
chk("Radio Dispatch is a large improvement, not a rounding error",
    radioHour.rushes >= hour.rushes * 2.5,
    hour.rushes + "/hr -> " + radioHour.rushes + "/hr (x" + (radioHour.rushes/hour.rushes).toFixed(1) + ")");

// --- buying Radio mid-wait pulls the queued rush forward ---
delete s.perks.radio;
run(1);                                   // re-queue a long base-gap wait
s.perks.radio = true;
const afterBuy = run(5);                  // within radio's 2-4 min window
chk("buying Radio pulls an already-queued long wait forward", afterBuy.rushes >= 1,
    afterBuy.rushes + " rush(es) in the 5 min after purchase");

console.log("PASS:"); ok.forEach(l=>console.log("  + "+l));
if(bad.length){ console.log("FAIL:"); bad.forEach(l=>console.log("  - "+l)); process.exitCode=1; }
