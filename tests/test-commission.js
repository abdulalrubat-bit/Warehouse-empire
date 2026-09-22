// Selling up is the largest decision in the game, and the choice that follows it sets the
// cost, output, tap value, wage bill and contract payout of everything bought afterwards.
//
// It used to be a card inside the Floor tab, among the readout, the site plan, the contract,
// the objective and the bottleneck. Nothing blocked play while it sat there, and state.site
// still pointed at the site just sold -- so a player could rebuild an entire fleet on the
// old profile and then have chooseSite() swap that profile underneath it. Worse, the pending
// choice lived only in the panel's hidden attribute, so selling and then closing the app
// lost the prompt for good and left the site type wrong indefinitely.
require("./harness.js");

const prefs = {};
global.Capacitor = { Plugins: {
  Preferences: {
    get:    ({key})       => Promise.resolve({ value: (key in prefs) ? prefs[key] : null }),
    set:    ({key,value}) => { prefs[key]=value; return Promise.resolve(); },
    remove: ({key})       => { delete prefs[key]; return Promise.resolve(); }
  },
  App: { addListener: () => {} }
}};
// A player who sold a site and then closed the app before choosing. Before the fix there was
// nothing in a save to represent this state at all.
prefs["warehouse-empire-save"] = JSON.stringify({
  awaitingSite: true, site: "general", lifetime: 5e6, rep: 0, taps: 40, contractsDone: 3,
  prestiges: 1,    // they have sold a business; that is how they came to owe a choice
  // The induction holds back the calendar, the picker handover and the notification card so
  // that nothing lands on a player in their first ten minutes. A save that owes a site
  // choice is long past that, and has to say so or the guards fire and the test is
  // measuring an onboarding it never meant to start.
  lastTruck: {version:1, status:"complete"}
});

const cvEl = document.getElementById("wcanvas"); cvEl._cw = 400; cvEl._ch = 300;
require("./game-sim.js");
const S = global.__sim, s = global.state;
const ok=[], bad=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));
const tick = async (n=20) => { for(let i=0;i<n;i++) await new Promise(r=>process.nextTick(r)); };
const $ = id => document.getElementById(id);
const siteModal = () => $("modalSite");

(async () => {
await tick();

// ---- it survives being closed --------------------------------------------------------
chk("a save that owes a choice still owes it after a relaunch", s.awaitingSite === true,
    "awaitingSite=" + s.awaitingSite);
chk("and the picker is on screen at launch", siteModal().hidden === false,
    "hidden=" + siteModal().hidden);

// ---- there is no way past it except choosing --------------------------------------------
// Every other modal in the game offers a way out. This one must not: a dismissed picker is
// the bug it replaces.
const box = siteModal().querySelector(".modal-box");
const outs = (box.innerHTML || "").match(/id="btn[A-Za-z]*"/g) || [];
chk("the picker offers no dismiss, only sites", outs.length === 0, outs.join(",") || "none");
chk("and it lists the sites to choose from", $("siteList").children.length === S.SITES.length,
    $("siteList").children.length + " of " + S.SITES.length);

// ---- the objective card agrees with the state, not with the screen -------------------------
global.render(); await tick();
chk("the objective card asks for the commission", /Commission your next site/i.test($("objTitle").textContent),
    $("objTitle").textContent);

// ---- choosing settles it -------------------------------------------------------------------
$("siteList").children[1].fire("click");        // Cold Storage: req 0, so always open
await tick();
chk("choosing a site closes the picker", siteModal().hidden === true, "hidden=" + siteModal().hidden);
chk("and the debt is cleared", s.awaitingSite === false, "awaitingSite=" + s.awaitingSite);
chk("and the site actually changed", s.site === S.SITES[1].id, s.site);

// ---- a locked site is not a way out ----------------------------------------------------------
{ s.awaitingSite = true; s.lifetime = 0; s.site = "general";
  global.__sim.invalidateUpMult();
  const locked = S.SITES.filter(x => !S.siteUnlocked(x))[0];
  if (locked){
    const idx = S.SITES.indexOf(locked);
    $("modalSite").hidden = false;
    $("siteList").children[idx].fire("click");
    await tick();
    chk("tapping a locked site does not settle the choice",
        s.awaitingSite === true && s.site === "general" && siteModal().hidden === false,
        "awaiting=" + s.awaitingSite + " site=" + s.site + " hidden=" + siteModal().hidden);
  } else {
    chk("tapping a locked site does not settle the choice", true, "no locked site at this lifetime");
  }
  $("modalSite").hidden = true; s.awaitingSite = false;
}

// ---- selling raises it, and the debt is recorded ------------------------------------------------
s.owned = { picker: 40, trolley: 20 }; s.lifetime = 5e6; s.rep = 0; s.money = 0;
s.network = []; s.tree = {}; s.upgrades = {}; s.prestiges = 0; s.site = "general";
S.invalidateUpMult();
const sell = $("sellBtn");
sell.fire("click"); sell.fire("click");          // arm, then confirm
await tick();
chk("selling up raises the picker", siteModal().hidden === false, "hidden=" + siteModal().hidden);
chk("and records the debt in the save, not just on screen", s.awaitingSite === true,
    "awaitingSite=" + s.awaitingSite);
// The retired site has to be in the Network before any of this, or selling lost it.
chk("the site just sold is in the Network", (s.network || []).length === 1,
    (s.network || []).length + " retired");

// ---- the calendar waits its turn -----------------------------------------------------------------
// Modals share a z-index. The calendar opening over an unanswered picker would strand the
// decision behind it, which is how the original bug felt from the player's side.
// checkDailyLoginPopup runs off the 100ms ticker, so drive it there rather than reaching in.
const ticker = global.__intervals.filter(i => i.ms === 100)[0].fn;
// Selling freezes the ticker for 100ms so the sale can settle before the site restarts.
// Harmless in play; in a test every line lands inside that window, so the tick this
// assertion depends on would return before reaching the daily check. Step past it.
const realNow = Date.now; Date.now = () => realNow() + 500;
s.dailyShownFor = -1; s.lastDailyClaim = 0; s.dailyStreak = 0;
$("modalDaily").hidden = true;
ticker(); await tick();
chk("the calendar defers to an unanswered picker", $("modalDaily").hidden === true,
    "daily hidden=" + $("modalDaily").hidden);

$("siteList").children[0].fire("click");
await tick();
chk("the picker closes on choosing", siteModal().hidden === true, "hidden=" + siteModal().hidden);
chk("and the calendar it was holding back comes through", $("modalDaily").hidden === false,
    "daily hidden=" + $("modalDaily").hidden);
Date.now = realNow;

console.log("PASS:"); ok.forEach(x=>console.log("  + " + x));
if (bad.length){ console.log("FAIL:"); bad.forEach(x=>console.log("  - " + x)); }
console.log(`\n${ok.length} passed, ${bad.length} failed`);
process.exit(bad.length ? 1 : 0);
})();
