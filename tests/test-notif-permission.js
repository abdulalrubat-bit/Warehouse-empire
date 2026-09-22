// Android will not deliver a notification it was never given permission for, and the
// request was only ever reachable from a button inside the Office settings panel. One
// player in twenty-three had ever answered it. For an idle game that is the half of the
// loop that calls people back, and it was off -- silently, because the plugin resolves
// happily whether or not anything will ever be displayed.
//
// So two things are under test here: that the game finds out what the OS actually permits
// without prompting anyone, and that it asks at a moment worth spending the one system
// dialog Android gives you on.
require("./harness.js");

let permDisplay = "prompt";        // what Android says when asked to check
let requestCalls = 0;              // how many times the SYSTEM dialog was raised
const scheduled = [];
const prefs = {};
global.Capacitor = { Plugins: {
  Preferences: {
    get:    ({key})       => Promise.resolve({ value: (key in prefs) ? prefs[key] : null }),
    set:    ({key,value}) => { prefs[key]=value; return Promise.resolve(); },
    remove: ({key})       => { delete prefs[key]; return Promise.resolve(); }
  },
  LocalNotifications: {
    checkPermissions:   () => Promise.resolve({ display: permDisplay }),
    requestPermissions: () => { requestCalls++; permDisplay = "granted";
                                return Promise.resolve({ display: permDisplay }); },
    schedule: ({notifications}) => { scheduled.push(notifications); return Promise.resolve(); },
    cancel:   () => Promise.resolve()
  },
  App: { addListener: () => {} }
}};

// A player who has opened the game once already. The prompt is deliberately not shown on a
// first launch, so a save has to exist for the real boot path to reach it.
// lastTruck complete: the permission card deliberately stands aside for the induction, so a
// fixture still inside it would be asserting against a guard rather than against the card.
prefs["warehouse-empire-save"] = JSON.stringify({ launches: 1, taps: 40, money: 500, lifetime: 900,
                                                  lastTruck: {version:1, status:"complete"} });

const cvEl = document.getElementById("wcanvas"); cvEl._cw = 400; cvEl._ch = 300;
const sent = [];
global.fetch = function(url, opts){
  try { sent.push(JSON.parse(opts.body)); } catch(e){}
  return Promise.resolve({ status: 204 });
};
require("./game-tele.js");

const s = global.state;
const N = global.window.__notif;
const ok=[], bad=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));
const tick = () => new Promise(r=>process.nextTick(r));
const settle = async () => { for (let i=0;i<25;i++){ global.__runTimeouts(0,0); await tick(); } };
const card  = () => document.getElementById("modalNotif");
const events = () => [].concat.apply([], sent.map(b => b.events || []));
const named = n => events().filter(e => e.name === n);

(async () => {
await settle();

// ---- the save key the game actually uses ---------------------------------------------
// If this fixture's key were wrong the save would simply be ignored, launches would be 1,
// and every assertion below would pass for the wrong reason.
chk("the seeded save was the one the game read", (s.launches || 0) === 2,
    "launches=" + s.launches);

// ---- what the OS permits, without asking anybody ---------------------------------------
chk("launching checks the real permission state", named("notification_state").length === 1,
    named("notification_state").length + " notification_state");
chk("and reports what Android said",
    (named("notification_state")[0] || {params:{}}).params.perm_state === "prompt",
    JSON.stringify((named("notification_state")[0] || {}).params));
chk("checking does not raise the system dialog", requestCalls === 0, requestCalls + " requests");
// The bug this replaces: null was read as "has not refused", so every reminder was
// scheduled into a void. Never-asked must stay distinguishable from refused.
chk("never having been asked is not recorded as a refusal", s.notifPerm === null,
    String(s.notifPerm));

// ---- and the card is up on the second launch -------------------------------------------
// ...but behind the streak calendar, which opens on the same launch and owns the screen.
// Deferring to it is correct; never coming back would mean the card never appears at all,
// because every launch that qualifies for one qualifies for the other.
chk("the streak calendar has the screen first", card().hidden === true &&
    document.getElementById("modalDaily").hidden === false,
    "card=" + card().hidden + " daily=" + document.getElementById("modalDaily").hidden);
document.getElementById("btnClaimDaily").fire("click");
await settle();
chk("the second launch asks, in the game's own words first", card().hidden === false,
    "hidden=" + card().hidden);
chk("the card says which trigger raised it",
    (named("notification_prompt")[0] || {params:{}}).params.prompt_trigger === "launch",
    JSON.stringify((named("notification_prompt")[0] || {}).params));
chk("the card quotes a real storage cap", /^\d+h$/.test(document.getElementById("notifPromptCap").textContent),
    document.getElementById("notifPromptCap").textContent);

// ---- accepting raises the dialog; declining does not ------------------------------------
document.getElementById("btnNotifYes").fire("click");
await settle();
chk("accepting raises the system dialog exactly once", requestCalls === 1, requestCalls + " requests");
chk("and the card closes", card().hidden === true, "hidden=" + card().hidden);
chk("a granted permission is recorded", s.notifPerm === true, String(s.notifPerm));
chk("and the grant is reported", named("notification_permission").length === 1,
    named("notification_permission").length + " events");

// ---- asked once, never again -------------------------------------------------------------
N.prompt("launch"); await settle();
chk("a settled permission is never asked for again", card().hidden === true, "hidden=" + card().hidden);

// ---- the first launch is left alone --------------------------------------------------------
// Android gives one system dialog and a refusal cannot be undone from inside the app, so
// spending it on somebody who has been in the game for four seconds is the worst use of it.
const reset = (launches) => { s.notifPrompted = false; s.notifAsked = false; s.notifPerm = null;
                              s.launches = launches; card().hidden = true; requestCalls = 0; };
reset(1);
N.prompt("launch"); await settle();
chk("a first-launch player is not asked", card().hidden === true, "hidden=" + card().hidden);
chk("and nothing is spent, so the next launch can still ask", s.notifPrompted === false,
    "prompted=" + s.notifPrompted);

// ---- unless they have just been shown what it is for ----------------------------------------
reset(1);
N.prompt("offline"); await settle();
chk("collecting a shift's offline takings asks on the spot", card().hidden === false,
    "hidden=" + card().hidden);
chk("and says so", named("notification_prompt").some(e => e.params.prompt_trigger === "offline"),
    named("notification_prompt").map(e=>e.params.prompt_trigger).join(","));
chk("the copy changes to match", /while the app was shut/.test(document.getElementById("notifPromptLead").textContent),
    document.getElementById("notifPromptLead").textContent);

// ---- never stranded under another modal ------------------------------------------------------
// Modals share a z-index. One opened underneath another is invisible and unreachable, and
// worse, would have burned the single chance to ask.
for (const other of ["modalOffline", "modalDaily"]){
  reset(4);
  document.getElementById(other).hidden = false;
  N.prompt("launch"); await settle();
  chk("nothing is asked over the " + other.replace("modal","").toLowerCase() + " modal",
      card().hidden === true && s.notifPrompted === false,
      "card hidden=" + card().hidden + " prompted=" + s.notifPrompted);
  document.getElementById(other).hidden = true;
}
// ...and once that modal is gone, the chance is still there.
N.prompt("launch"); await settle();
chk("the chance survives to the next attempt", card().hidden === false, "hidden=" + card().hidden);

// ---- declining is remembered without refusing -------------------------------------------------
document.getElementById("btnNotifNo").fire("click");
await settle();
chk("declining closes the card", card().hidden === true, "hidden=" + card().hidden);
chk("declining does not raise the system dialog", requestCalls === 0, requestCalls + " requests");
chk("and is not recorded as an OS refusal", s.notifPerm === null, String(s.notifPerm));
chk("the decline is reported", named("notification_prompt").some(e => e.params.prompt_action === "dismiss"),
    named("notification_prompt").map(e=>e.params.prompt_action).join(","));

// ---- a real refusal is respected ----------------------------------------------------------------
reset(4); s.notifPerm = false;
N.prompt("launch"); await settle();
chk("a player who said no to Android is not asked again", card().hidden === true, "hidden=" + card().hidden);

console.log("PASS:"); ok.forEach(x=>console.log("  + " + x));
if (bad.length){ console.log("FAIL:"); bad.forEach(x=>console.log("  - " + x)); }
console.log(`\n${ok.length} passed, ${bad.length} failed`);
process.exit(bad.length ? 1 : 0);
})();
