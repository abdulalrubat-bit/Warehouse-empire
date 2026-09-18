// A new save has to be a working idle game before the player buys anything.
//
// It was not. A fresh site earned $0.00/sec until the first purchase, which meant offline
// earnings were zero, the offline reminder never scheduled -- it is gated on
// totalRate() > 0 -- and a player who put the phone down in the first fifteen seconds had
// nothing waiting and nothing calling them back. In four weeks of field data, twelve
// players tapped ten times and two ever bought anything, so for ten of them every hook
// this game has sat behind a door they never opened.
//
// Nothing in the suite covered it, because every fixture hands itself a fleet.
require("./harness.js");

// A real enough Capacitor to let the notification path run, so the reminder assertion below
// tests the scheduler rather than a stand-in for it.
const scheduled = [];
const prefs = {};
global.Capacitor = { Plugins: {
  Preferences: {
    get:    ({key})       => Promise.resolve({ value: (key in prefs) ? prefs[key] : null }),
    set:    ({key,value}) => { prefs[key]=value; return Promise.resolve(); },
    remove: ({key})       => { delete prefs[key]; return Promise.resolve(); }
  },
  LocalNotifications: {
    requestPermissions: () => Promise.resolve({ display: "granted" }),
    schedule: ({notifications}) => { scheduled.push(notifications); return Promise.resolve(); },
    cancel:   () => Promise.resolve()
  },
  App: { addListener: () => {} }
}};

const cvEl = document.getElementById("wcanvas"); cvEl._cw = 400; cvEl._ch = 300;
require("./game-sim.js");
const S = global.__sim, s = global.state;
const ok=[], bad=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));
const tick = async (n=20) => { for(let i=0;i<n;i++) await new Promise(r=>process.nextTick(r)); };

(async () => {
await tick();

// The state as the game itself starts it, before any fixture here touches it. Every other
// assertion in this file is about this object, not about one this file built.
const START = JSON.parse(JSON.stringify(s.owned));

// ---- the site comes with a worker ----------------------------------------------------
chk("a new site opens with a picker already on", (START.picker||0) >= 1, JSON.stringify(START));
chk("and with nothing else", Object.keys(START).filter(k => k !== "picker" && START[k] > 0).length === 0,
    JSON.stringify(START));

// ---- which means it earns ------------------------------------------------------------
const rate = S.totalRate();
chk("a new save earns without the player buying anything", rate > 0, "$" + rate.toFixed(2) + "/s");

// The whole point is what is waiting when they come back, so the figure has to be worth
// opening the app for -- not merely non-zero.
const offline = rate * S.OFFLINE_CAP_HOURS * 3600;
const trolley = S.costOf(S.GENS[1], 1);
chk("a full offline stretch covers the next thing they are asked to buy",
    offline >= trolley, "$" + offline.toFixed(0) + " over " + S.OFFLINE_CAP_HOURS + "h vs $" + trolley);

// ---- but it is not treated as the player having started --------------------------------
// The gates that hold back the boost row, the streak calendar and the bottleneck card all
// read "owns any plant" as "this player has begun". Granting a picker made all three true
// on the first frame, and the streak calendar opened over a brand-new player's first tap --
// trading one piece of first-session friction for a worse one. They ask about bought plant
// now, and this is the assertion that says so.
global.render(); await tick();
chk("the granted picker is not mistaken for the player having started",
    document.getElementById("adRow").hidden === true &&
    document.getElementById("modalDaily").hidden === true,
    "adRow hidden=" + document.getElementById("adRow").hidden +
    " daily hidden=" + document.getElementById("modalDaily").hidden);

// ---- and it can call them back -------------------------------------------------------
// scheduleNotifications() gates the offline reminder on totalRate() > 0. With a dead site
// it never scheduled at all, so the one player most in need of a nudge got none.
document.hidden = true;
global.__fireDoc("visibilitychange");
await tick();
const all = [].concat.apply([], scheduled);
chk("backgrounding a brand-new save schedules the offline reminder",
    all.some(n => n && n.id === 101), all.length + " scheduled");
document.hidden = false; global.__fireDoc("visibilitychange"); await tick();

// ---- the teaching purchase is still there --------------------------------------------
// Granting the first picker must not skip the step that teaches buying. Objective 2 moved
// to the second picker rather than being deleted.
s.owned = JSON.parse(JSON.stringify(START));
s.taps = 20; s.contractsDone = 0; s.prestiges = 0; s.lifetime = 0;
global.render(); await tick();
const objTitle = () => document.getElementById("objTitle").textContent;
const objHint  = () => document.getElementById("objHint").innerHTML;
const tag      = () => document.getElementById("objective").querySelector(".otag").textContent;

chk("ten taps in, the open objective is the second picker", /second hand/i.test(objTitle()),
    objTitle());
chk("and it is task 2 of 5", tag() === "TASK 2/5", tag());
// A hint that quotes a price the Fleet tab does not charge is worse than no hint. The cost
// moves with the site's multiplier, so it is read rather than written into the string.
chk("the hint quotes what the second picker actually costs",
    objHint().indexOf("$" + S.costOf(S.GENS[0], 1)) >= 0,
    "wants $" + S.costOf(S.GENS[0],1) + " -- " + objHint());

s.owned.picker = 2; global.render(); await tick();
chk("buying it clears the objective", !/second hand/i.test(objTitle()), objTitle());

// ---- every site after the first, too --------------------------------------------------
// Selling up clears the fleet. Without the same grant, site two would be as dead as site
// one used to be -- and that lands on the players who have already stayed.
s.owned = { picker: 40, trolley: 20 }; s.lifetime = 5e6; s.rep = 0; s.money = 0;
s.network = []; s.tree = {}; s.upgrades = {}; S.invalidateUpMult();
const sell = document.getElementById("sellBtn");
sell.fire("click"); sell.fire("click");            // arm, then confirm
await tick();
chk("selling up retires the fleet", (s.owned.trolley||0) === 0, JSON.stringify(s.owned));
chk("but the new site still comes with a picker", (s.owned.picker||0) >= 1, JSON.stringify(s.owned));
chk("so site two earns from its first second too", S.totalRate() > 0, "$" + S.totalRate().toFixed(2) + "/s");

console.log("PASS:"); ok.forEach(x=>console.log("  + " + x));
if (bad.length){ console.log("FAIL:"); bad.forEach(x=>console.log("  - " + x)); }
console.log(`\n${ok.length} passed, ${bad.length} failed`);
process.exit(bad.length ? 1 : 0);
})();
