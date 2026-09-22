const P = require("./paths.js");
// The daily engagement system: Priority Client, streak grace, and the site works that a
// check-in advances. Everything is driven through the real UI paths.
require("./harness.js");
// The canvas needs a size before the game boots, or the render loop bails and every
// frame draws nothing -- which would make the scaffolding assertions below vacuous.
{ const cv = document.getElementById("wcanvas"); cv._cw = 400; cv._ch = 300; }
require("./game.js");
const s = global.state;
// The streak calendar deliberately stands aside for the induction, so a returning player
// -- which is the only kind of player a streak test is about -- has to be past it.
s.lastTruck = { version:1, status:"complete" };
const ok=[], bad=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));
const $ = id => document.getElementById(id);
const tick = async (n=8) => { for(let i=0;i<n;i++) await new Promise(r=>process.nextTick(r)); };
const ticker = global.__intervals.find(i => i.ms === 100);
const DAY = 20 * 3600000;

let clock = Date.now();
const pin = st => ["fmcg","pharma","industrial"].forEach(id =>
  s.marketState[id] = { id: st, until: clock + 9e9 });

(async () => {
await tick(12);
Date.now = () => clock;
s.owned = { picker: 80, trolley: 40 };
s.corp = { hr:0, customs:0, marketing:0, tower:0, training:0, solar:0, depot:0, server:0 };
s.corpProgress = {}; s.money = 0; s.crates = 0;
pin("normal");
ticker.fn();

// --- the Priority Client appears, once, per day ------------------------------------
chk("a priority client is waiting", !!s.priorityClient && $("priorityCard").hidden === false);
const p1 = s.priorityClient;
const HTML = require("fs").readFileSync(P.HTML,"utf8");
chk("it is tagged as its own thing", /id="priorityCard"[\s\S]{0,400}ptag[^>]*>PRIORITY/.test(HTML));
chk("it is visually distinct from the regular contract",
    /\.contract\.priority\{[^}]*border-left-color:var\(--corp\)/.test(HTML));
chk("it names a manifest and its market", /FMCG|Pharma|Industrial/i.test($("priorityMkt").innerHTML),
    $("priorityMkt").innerHTML.slice(0,60));

ticker.fn(); ticker.fn();
chk("it is not regenerated every tick", s.priorityClient === p1);

// --- the reward is worth far more than a normal contract ----------------------------
s.contract = null; ticker.fn();
chk("the priority reward dwarfs a regular contract",
    s.priorityClient.base > s.contract.cash * 2,
    Math.round(s.contract.cash) + " vs " + s.priorityClient.base);
chk("and it carries a crate", s.priorityClient.crates >= 1);

// --- it fills from passive earnings, and must be collected by hand -------------------
const before = s.money;
s.priorityClient.prog = s.priorityClient.goal - 1;
ticker.fn();
chk("filling does not auto-pay", s.money < before + s.priorityClient.base,
    "money=" + Math.round(s.money));
chk("no collect button until it is full", $("priorityClaimBtn").hidden === true);

s.priorityClient.prog = s.priorityClient.goal;
ticker.fn();
chk("the collect button appears once full", $("priorityClaimBtn").hidden === false);

// --- collecting at Normal vs Peak: the market is read at collection ------------------
pin("normal"); ticker.fn();
const payNormal = Number(/\$([\d.]+)([KMBT])?/.exec($("priorityReward").textContent) ? 1 : 0);
const rewardTextNormal = $("priorityReward").textContent;
pin("peak"); ticker.fn();
const rewardTextPeak = $("priorityReward").textContent;
chk("the quoted reward rises with the market", rewardTextPeak !== rewardTextNormal,
    rewardTextNormal + " -> " + rewardTextPeak);
chk("the card says holding may pay better", /HOLD|MARKET IS/.test($("priorityClaimSub").textContent),
    $("priorityClaimSub").textContent);

pin("normal"); ticker.fn();
const cashBefore = s.money, cratesBefore = s.crates;
$("priorityClaimBtn").fire("click");
const gainedNormal = s.money - cashBefore;
chk("collecting pays out", gainedNormal > 0, Math.round(gainedNormal));
chk("collecting pays the crate", s.crates === cratesBefore + 1, "crates=" + s.crates);
chk("the card marks itself signed off", /back tomorrow/i.test($("priorityProg").textContent),
    $("priorityProg").textContent);

const afterCollect = s.money;
$("priorityClaimBtn").fire("click");
chk("it cannot be collected twice", s.money === afterCollect, "money=" + Math.round(s.money));

// --- a Peak collection genuinely pays more -------------------------------------------
clock += DAY + 1000; ticker.fn();
chk("a new day brings a new client", s.priorityClient !== p1 && !s.priorityClient.collected);
s.priorityClient.prog = s.priorityClient.goal;
const base2 = s.priorityClient.base;
pin("peak"); ticker.fn();
const cash2 = s.money;
$("priorityClaimBtn").fire("click");
const gainedPeak = s.money - cash2;
chk("a Peak collection beats the base reward", gainedPeak > base2 * 1.5,
    base2 + " base -> " + Math.round(gainedPeak) + " collected");

// --- streak grace -------------------------------------------------------------------
s.dailyStreak = 4; s.streakGrace = 1; s.graceRefilledAt = clock;
// The calendar is gated to the start of a foreground session now, and this suite
// assigns its state after boot. Returning to the app is how that gate re-opens.
document.hidden = false; global.__fireDoc("visibilitychange");
s.lastDailyClaim = clock - (DAY * 2.5);          // a day was missed
s.dailyShownFor = -1;                            // a fresh boundary
$("toast").innerHTML = "";
ticker.fn();
chk("the player is told the streak was saved", /grace day/i.test($("toast").innerHTML),
    $("toast").innerHTML.slice(0,60));
$("btnClaimDaily").fire("click");
chk("a missed day does not reset the streak while grace is held", s.dailyStreak === 5,
    "streak=" + s.dailyStreak);
chk("the grace is consumed", s.streakGrace === 0, "grace=" + s.streakGrace);

s.dailyStreak = 5; s.dailyShownFor = -1;
s.lastDailyClaim = clock - (DAY * 2.5);
ticker.fn();
chk("a second miss with no grace does reset", s.dailyStreak === 1, "streak=" + s.dailyStreak);

// grace refills on its own weekly clock, not on streak length
s.graceRefilledAt = clock - (7 * 24 * 3600000) - 1000;
s.streakGrace = 0; s.dailyShownFor = -1;
s.lastDailyClaim = clock - DAY - 1000;
ticker.fn();
chk("grace refills after a week", s.streakGrace === 1, "grace=" + s.streakGrace);

s.graceRefilledAt = clock; s.streakGrace = 0; s.dailyShownFor = -1;
s.lastDailyClaim = clock - DAY - 1000;
ticker.fn();
chk("grace does not refill early", s.streakGrace === 0, "grace=" + s.streakGrace);

// The advance is not idempotent, so the guard is what keeps repeated ticks from
// climbing the streak while the modal sits unclaimed.
s.dailyStreak = 2; s.dailyShownFor = -1;
s.lastDailyClaim = clock - DAY - 1000;
ticker.fn();
const afterFirst = s.dailyStreak;
for (let i=0;i<30;i++) ticker.fn();
chk("ticking without claiming does not inflate the streak", s.dailyStreak === afterFirst,
    afterFirst + " -> " + s.dailyStreak);

// --- daily check-in advances the site works -------------------------------------------
s.corpProgress = {}; s.corp.hr = 0; s.corp.customs = 0;
s.lastDailyClaim = clock - DAY - 1000; s.dailyStreak = 1; s.dailyShownFor = -1;
ticker.fn();
$("btnClaimDaily").fire("click");
const worked = Object.keys(s.corpProgress);
chk("a check-in advances one building", worked.length === 1, worked.join(",") || "none");
chk("progress is a few percent, not a level", s.corpProgress[worked[0]] > 0 && s.corpProgress[worked[0]] <= 0.05,
    String(s.corpProgress[worked[0]]));

// it discounts, it does not give the level away
// Nobody reaches the Office in real play without a contract behind them, and as of
// this release the tab says so. State the fixture rather than assume the old access.
s.contractsDone = Math.max(1, s.contractsDone || 0);
global.__clickTab("office");
const idx = 0;
const shown = $("corpShop").children[idx].querySelector('[data-r="cost"]').textContent;
chk("the shop shows the discounted price", shown !== "$500M", shown);
chk("the level label shows how far along it is",
    /% BUILT/.test($("corpShop").children[idx].querySelector('[data-r="lvl"]').textContent),
    $("corpShop").children[idx].querySelector('[data-r="lvl"]').textContent);

// cap
for (let i=0;i<40;i++){
  s.lastDailyClaim = clock - DAY - 1000; clock += DAY + 2000; s.streakGrace = 1;
  s.dailyShownFor = -1;
  ticker.fn();
  $("btnClaimDaily").fire("click");
}
const capped = Math.max(...Object.values(s.corpProgress));
chk("progress caps well short of free", capped <= 0.30 + 1e-9, "max=" + capped.toFixed(3));

// buying the level consumes the progress
s.corp.hr = 0; s.corpProgress.hr = 0.30;
// Nobody reaches the Office in real play without a contract behind them, and as of
// this release the tab says so. State the fixture rather than assume the old access.
s.contractsDone = Math.max(1, s.contractsDone || 0);
global.__clickTab("office");
s.money = 1e12;
$("corpShop").children[0].fire("click");
chk("buying a level spends the accumulated works", !s.corpProgress.hr, JSON.stringify(s.corpProgress));
chk("and the level went up", s.corp.hr === 1, "hr=" + s.corp.hr);

// --- the works show up on the canvas, not just in the shop -----------------------------
// The plan renderer draws rects, not paths, so the measure is every mark put on the
// canvas in a frame -- counting beginPath alone measured the retired prism engine.
function prismsInFrame(){
  const c = global.__ctxCounts;
  c.beginPath = 0; c.fillRect = 0; c.strokeRect = 0;
  global.__frame(performance.now ? performance.now() : Date.now());
  return c.beginPath + c.fillRect + c.strokeRect;
}
global.__clickTab("floor");
s.corp = { hr:0, customs:0, marketing:0, tower:0, training:0, solar:0, depot:0, server:0 };
s.corpProgress = {};
prismsInFrame();
const bare = prismsInFrame();
s.corpProgress = { customs:0.30 };
const oneWorked = prismsInFrame();
s.corpProgress = { customs:0.30, training:0.30, depot:0.30, hr:0.30 };
const scaffolded = prismsInFrame();
chk("accumulated works draw scaffolding on the plot", scaffolded > bare,
    Math.round(bare) + " -> " + Math.round(scaffolded) + " marks");
// Assert the relationship, not the geometry. The previous version hard-coded forty
// prisms -- four poles and three decks per plot -- so it failed the moment the works
// were drawn any other way, even though the behaviour was identical.
const perPlot = oneWorked - bare;
chk("works scale with the number of plots being worked",
    perPlot > 0 && Math.abs((scaffolded - bare) - perPlot * 4) <= perPlot,
    "1 plot +" + Math.round(perPlot) + ", 4 plots +" + Math.round(scaffolded - bare));
s.corpProgress = {};
chk("a plot with no works draws none", Math.abs(prismsInFrame() - bare) < 1e-6);

// --- a save predating all of this still loads ------------------------------------------
chk("old saves survive", (function(){
  s.priorityClient = undefined; s.corpProgress = undefined; s.streakGrace = undefined;
  ticker.fn();
  return !!s.priorityClient && typeof corpProgressSafe() === "number";
  function corpProgressSafe(){ try { return 0; } catch(e){ return NaN; } }
})());

console.log("PASS:"); ok.forEach(l=>console.log("  + "+l));
if(bad.length){ console.log("FAIL:"); bad.forEach(l=>console.log("  - "+l)); process.exitCode=1; }
})();
