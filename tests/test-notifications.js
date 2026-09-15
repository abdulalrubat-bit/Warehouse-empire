require("./harness.js");

// --- fake Capacitor: LocalNotifications + App, plus Preferences so the save path is real ---
const scheduled = [], cancelled = [];
let permResult = "granted", permCalls = 0;
const prefs = {};
let appStateCb = null;

global.Capacitor = { Plugins: {
  Preferences: {
    get:    ({key})       => Promise.resolve({ value: (key in prefs) ? prefs[key] : null }),
    set:    ({key,value}) => { prefs[key]=value; return Promise.resolve(); },
    remove: ({key})       => { delete prefs[key]; return Promise.resolve(); }
  },
  LocalNotifications: {
    requestPermissions: () => { permCalls++; return Promise.resolve({ display: permResult }); },
    schedule: ({notifications}) => { scheduled.push(notifications); return Promise.resolve(); },
    cancel:   ({notifications}) => { cancelled.push(notifications); return Promise.resolve(); }
  },
  App: { addListener: (ev, fn) => { if (ev === "appStateChange") appStateCb = fn; } }
}};

require("./game.js");

const s = global.state;
const ok=[], bad=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));
const $ = (id)=>document.getElementById(id);
const tick = async (n=8) => { for(let i=0;i<n;i++) await new Promise(r=>process.nextTick(r)); };

// The scheduler is time-relative, so freeze the clock and step it deliberately.
let clock = Date.now();
const HOUR = 3600000;

// Everything the scheduler emitted since the last call, flattened by type.
function drain(){
  const byId = {};
  scheduled.splice(0).forEach(batch => batch.forEach(n => { byId[n.id] = n; }));
  return byId;
}
const IDS = { offline:101, daily:102, contract:103, rush:104 };
const delay = n => n.schedule.at.getTime() - clock;

(async () => {
await tick(12);
Date.now = () => clock;

// A player with production running, a daily stipend just claimed, no contract,
// and the rush ad on its usual 3-minute cooldown.
s.owned.picker = 20;
s.lastDailyClaim = clock;
s.contract = null;
s.notifs = {}; s.notifLast = {}; s.notifPerm = true;

// Rows are built by renderOfficeTab during init; find them and read state off the DOM
// rather than reaching into the closure.
const rows = $("notifList").children;
const rowOf = k => rows[["offline","daily","contract","rush"].indexOf(k)];
const isOn = k => rowOf(k).querySelector('[data-r="state"]').textContent === "ON";

// --- backgrounding schedules, foregrounding cancels -------------------------------
document.hidden = true;
global.__fireDoc("visibilitychange");
await tick();
let n = drain();
chk("backgrounding schedules reminders", Object.keys(n).length > 0, Object.keys(n).join(","));
chk("offline cap reminder scheduled", !!n[IDS.offline]);
chk("offline fires at the 8h cap", delay(n[IDS.offline]) === 8 * HOUR, delay(n[IDS.offline]) / HOUR + "h");
chk("daily stipend fires 20h after the last claim", delay(n[IDS.daily]) === 20 * HOUR,
    delay(n[IDS.daily]) / HOUR + "h");
chk("no contract reminder when there is no contract", !n[IDS.contract]);
chk("rush is off by default", !n[IDS.rush]);

cancelled.length = 0;
document.hidden = false;
global.__fireDoc("visibilitychange");
await tick();
chk("foregrounding cancels every id", cancelled.length === 1 && cancelled[0].length === 4,
    JSON.stringify(cancelled[0]));

// --- rate limiting: an app-switch loop must not re-ping ----------------------------
// Nothing fired (the app came back long before 8h), so the record is cleared and the
// same reminders may be scheduled again -- but the delivery times must not creep.
clock += 5000;
document.hidden = true; global.__fireDoc("visibilitychange"); await tick();
n = drain();
chk("a quick app-switch re-arms rather than skipping", !!n[IDS.offline]);
document.hidden = false; global.__fireDoc("visibilitychange"); await tick();

// Now let one actually fire: schedule, then let the clock run past its delivery time
// before coming back.
document.hidden = true; global.__fireDoc("visibilitychange"); await tick(); drain();
clock += 9 * HOUR;
document.hidden = false; global.__fireDoc("visibilitychange"); await tick();
chk("a delivered reminder is remembered", s.notifLast.offline > 0 && s.notifLast.offline <= clock,
    JSON.stringify(s.notifLast));

// Contracts run about 45 minutes, so back-to-back ones would ping all day without a gap.
s.notifLast = {};
s.contract = { goal: 100, prog: 0, mins: 45, deadline: clock + 45 * 60000 };
document.hidden = true; global.__fireDoc("visibilitychange"); await tick(); drain();
clock += 44 * 60000;                              // that warning has now been delivered
document.hidden = false; global.__fireDoc("visibilitychange"); await tick();
chk("a delivered contract warning is remembered", s.notifLast.contract > 0,
    JSON.stringify(s.notifLast));

s.contract = { goal: 100, prog: 0, mins: 45, deadline: clock + 45 * 60000 };
document.hidden = true; global.__fireDoc("visibilitychange"); await tick();
n = drain();
chk("minGap suppresses the very next contract warning", !n[IDS.contract],
    n[IDS.contract] ? "scheduled anyway" : "");
document.hidden = false; global.__fireDoc("visibilitychange"); await tick();

clock += 7 * HOUR;                                // past the 6h gap
s.contract = { goal: 100, prog: 0, mins: 45, deadline: clock + 45 * 60000 };
document.hidden = true; global.__fireDoc("visibilitychange"); await tick();
n = drain();
chk("contract warnings return once the gap has passed", !!n[IDS.contract]);
document.hidden = false; global.__fireDoc("visibilitychange"); await tick();
s.contract = null;

// --- short timers must not become naggy --------------------------------------------
s.notifLast = {};
s.contract = { goal: 100, prog: 0, mins: 3, deadline: clock + 3 * 60000 };
document.hidden = true; global.__fireDoc("visibilitychange"); await tick();
n = drain();
chk("a contract 3 minutes out is not worth a notification", !n[IDS.contract],
    n[IDS.contract] ? delay(n[IDS.contract])/60000 + "min" : "");
document.hidden = false; global.__fireDoc("visibilitychange"); await tick();

s.notifLast = {};
s.contract = { goal: 100, prog: 0, mins: 45, deadline: clock + 45 * 60000 };
document.hidden = true; global.__fireDoc("visibilitychange"); await tick();
n = drain();
chk("a 45 minute contract warns two minutes before expiry", n[IDS.contract] &&
    delay(n[IDS.contract]) === 43 * 60000, n[IDS.contract] ? delay(n[IDS.contract])/60000 + "min" : "none");
document.hidden = false; global.__fireDoc("visibilitychange"); await tick();

// The rush ad cooldown is three minutes; a ping that soon would fire every app-switch,
// so it is pushed out to the point where "you have been away" is actually true.
s.notifLast = {}; s.contract = null;
s.notifs.rush = true;
document.hidden = true; global.__fireDoc("visibilitychange"); await tick();
n = drain();
chk("rush is deferred past its 3 minute cooldown", n[IDS.rush] && delay(n[IDS.rush]) === 4 * HOUR,
    n[IDS.rush] ? delay(n[IDS.rush])/HOUR + "h" : "none");
document.hidden = false; global.__fireDoc("visibilitychange"); await tick();

// --- per-type toggles ---------------------------------------------------------------
s.notifLast = {};
chk("a row per notification type", rows.length === 4, "rows=" + rows.length);
chk("the row reflects the current state", isOn("offline") === true && isOn("rush") === false,
    "offline=" + isOn("offline") + " rush=" + isOn("rush"));

rowOf("offline").fire("click");
chk("clicking a row toggles that type", isOn("offline") === false);

s.notifLast = {};
document.hidden = true; global.__fireDoc("visibilitychange"); await tick();
n = drain();
chk("a disabled type is not scheduled", !n[IDS.offline]);
document.hidden = false; global.__fireDoc("visibilitychange"); await tick();

rowOf("offline").fire("click");                   // back on
chk("toggling back on restores it", isOn("offline") === true);
await tick(6);                                    // let the toggle's own permission call settle
drain();                                          // the toggle itself re-schedules

// --- permission -----------------------------------------------------------------------
s.notifAsked = false; s.notifPerm = null; permCalls = 0; permResult = "denied";
$("notifPermBtn").fire("click");
await tick();
chk("the permission prompt is requested once", permCalls === 1, "calls=" + permCalls);
chk("a denial is remembered", s.notifPerm === false, String(s.notifPerm));

s.notifLast = {};
document.hidden = true; global.__fireDoc("visibilitychange"); await tick();
chk("nothing is scheduled after a denial", drain()[IDS.offline] === undefined);
document.hidden = false; global.__fireDoc("visibilitychange"); await tick();

s.notifAsked = false; permResult = "granted";
$("notifPermBtn").fire("click");
await tick();
chk("granting clears the block", s.notifPerm === true, String(s.notifPerm));

// --- the native App lifecycle drives the same path ------------------------------------
chk("appStateChange is bound", typeof appStateCb === "function");
s.notifLast = {};
appStateCb({ isActive: false });
await tick();
chk("Capacitor background schedules too", !!drain()[IDS.offline]);
cancelled.length = 0;
appStateCb({ isActive: true });
await tick();
chk("Capacitor foreground cancels", cancelled.length === 1);

// --- toggles survive a save/load round trip --------------------------------------------
// The toggle handler saves, so drive the save through the UI too.
rowOf("daily").fire("click");                     // daily -> off
await tick(6);
const saved = JSON.parse(prefs["warehouse-empire-save"]);
chk("toggles are persisted", saved.notifs && saved.notifs.daily === false && saved.notifs.rush === true,
    JSON.stringify(saved.notifs));

console.log("PASS:"); ok.forEach(l=>console.log("  + "+l));
if (bad.length){ console.log("FAIL:"); bad.forEach(l=>console.log("  - "+l)); process.exitCode=1; }
})();
