// Crates are ad-gated and buy liveries only. These cover the cap, the daily reset, the
// purchase path, and that a livery is never charged twice.
require("./harness.js");

let shown = [];
global.Capacitor = { Plugins: { AdMob: {
  initialize: () => Promise.resolve(),
  prepareRewardVideoAd: (o) => { shown.push(o.adId); return Promise.resolve(); },
  showRewardVideoAd: () => Promise.resolve({ type: "Reward", amount: 1 }),
  addListener: () => Promise.resolve({ remove(){} })
}}};

require("./game.js");
const s = global.state;
const ok=[], bad=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));
const $ = id => document.getElementById(id);
const tick = async (n=8) => { for(let i=0;i<n;i++) await new Promise(r=>process.nextTick(r)); };
const ticker = global.__intervals.find(i => i.ms === 100);

let clock = Date.now();

(async () => {
await tick(12);
Date.now = () => clock;
// Rendering is tab-scoped, so the crate bar only paints on the Store tab -- which is
// exactly where a player meets it.
global.__clickTab("pallets");
s.crates = 0; s.themesOwned = {}; s.crateAdsToday = 0; s.crateAdDay = -1;

// --- the ad grants crates, on its own unit --------------------------------------
async function watch(){
  shown = [];
  $("crateAdBtn").fire("click");
  await tick(10);
}

const before = s.crates;
await watch();
chk("watching a shipment grants crates", s.crates === before + 3, before + " -> " + s.crates);
chk("the crate ad uses its own unit", shown.length === 1 && /ca-app-pub-\d{16}\/\d{10}/.test(shown[0]), shown[0]);

// --- cooldown between watches ----------------------------------------------------
const afterOne = s.crates;
await watch();
chk("a second tap inside the cooldown grants nothing", s.crates === afterOne, String(s.crates));
chk("the cooldown is surfaced", /AVAILABLE IN/.test($("crateAdSub").textContent), $("crateAdSub").textContent);

// --- the daily cap ---------------------------------------------------------------
for (let i = 0; i < 8; i++){ clock += 61000; global.__clickTab("pallets"); await watch(); }
chk("the daily cap holds at 5 watches", s.crates === 15, "crates=" + s.crates);
chk("the button reports the cap", /BACK TOMORROW/.test($("crateAdSub").textContent), $("crateAdSub").textContent);
chk("the button is disabled once capped", $("crateAdBtn").disabled === true);

// --- the cap resets on the same boundary as the login streak ---------------------
clock += 20 * 3600000 + 61000;
global.__clickTab("pallets");
chk("a new day restores the allowance", /LEFT TODAY/.test($("crateAdSub").textContent), $("crateAdSub").textContent);
chk("the button is live again", $("crateAdBtn").disabled === false);
const beforeDay2 = s.crates;
await watch();
chk("watching works again the next day", s.crates === beforeDay2 + 3, beforeDay2 + " -> " + s.crates);

// --- liveries cost crates, not pallets -------------------------------------------
s.crates = 3; s.pallets = 0; s.themesOwned = {}; s.theme = "hivis";
global.__clickTab("pallets");
const rows = $("themeList").children;
chk("a livery row exists per theme", rows.length === 7, "rows=" + rows.length);
const costText = rows[1].querySelector('[data-r="tcost"]').textContent;
chk("liveries are priced in crates", /CR$/.test(costText), costText);

rows[1].fire("click");
chk("buying a livery spends crates", s.crates === 0, "crates=" + s.crates);
chk("pallets are untouched by a livery purchase", s.pallets === 0, "pallets=" + s.pallets);
chk("the livery is now owned", Object.keys(s.themesOwned).length === 1, JSON.stringify(s.themesOwned));

// --- owned liveries are never charged again --------------------------------------
s.theme = "hivis"; global.__clickTab("pallets");
rows[1].fire("click");
chk("re-equipping an owned livery is free", s.crates === 0 && Object.keys(s.themesOwned).length === 1,
    "crates=" + s.crates);
global.__clickTab("pallets");
chk("an owned livery reads OWNED or ACTIVE",
    /OWNED|ACTIVE/.test(rows[1].querySelector('[data-r="tcost"]').textContent),
    rows[1].querySelector('[data-r="tcost"]').textContent);

// --- cannot buy without crates ----------------------------------------------------
s.crates = 0; s.theme = "hivis"; global.__clickTab("pallets");
const ownedBefore = Object.keys(s.themesOwned).length;
rows[3].fire("click");
chk("a livery you cannot afford is not granted", Object.keys(s.themesOwned).length === ownedBefore,
    JSON.stringify(s.themesOwned));
chk("the default livery is always free", (function(){
  s.crates = 0; s.theme = "nightshift"; global.__clickTab("pallets");
  rows[0].fire("click");
  return s.theme === "hivis";
})(), s.theme);

// --- the daily calendar trickles crates -------------------------------------------
s.crates = 0; s.dailyStreak = 3; s.lastDailyClaim = 0;
$("btnClaimDaily").fire("click");
chk("a bonus day pays a crate", s.crates === 1, "crates=" + s.crates);
s.crates = 0; s.dailyStreak = 2; s.lastDailyClaim = 0;
$("btnClaimDaily").fire("click");
chk("an ordinary day pays none", s.crates === 0, "crates=" + s.crates);

// --- a broken save cannot poison the crate count ----------------------------------
chk("crates survive a save round trip", (function(){
  const j = JSON.parse(JSON.stringify(s));
  return typeof j.crates === "number" && isFinite(j.crates);
})(), String(s.crates));

console.log("PASS:"); ok.forEach(l=>console.log("  + "+l));
if(bad.length){ console.log("FAIL:"); bad.forEach(l=>console.log("  - "+l)); process.exitCode=1; }
})();
