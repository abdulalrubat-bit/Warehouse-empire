const P = require("./paths.js");
// The unconfigured path. game-off.js is the shipping extract with both constants forced
// empty, which is how the file leaves this repository and how it stays for anyone who
// forks it or builds it before setting up a property. That build has to be
// indistinguishable from one with no telemetry in it at all: no request, no stored key,
// no queue, no listener that does anything.
require("./harness.js");
const cvEl = document.getElementById("wcanvas"); cvEl._cw = 400; cvEl._ch = 300;

let fetches = 0;
global.fetch = function(){ fetches++; return Promise.resolve({ status: 204 }); };

require("./game-off.js");                   // the extract with both constants forced empty

const s = global.state;
const T = global.window.__tele;
const ok=[], bad=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));
const tick = () => new Promise(r=>process.nextTick(r));
const settle = async () => { for (let i=0;i<25;i++) await tick(); };

(async () => {
await settle();

chk("an unconfigured build reports telemetry off", T.enabled() === false,
    "enabled=" + T.enabled());

// And the half that matters more: the committed file must carry NO keys. They are
// injected by the release workflow from repository secrets, because this repository is
// public and a secret committed to one is in its history permanently -- removing it from
// the tip does not remove it. Read the real HTML, not an extract: this is a claim about
// what is on disk and about to be pushed.
const SHIPPED = require("fs").readFileSync(
  P.HTML, "utf8");
const mid = (/var GA_MEASUREMENT_ID = "([^"]*)";/.exec(SHIPPED) || [])[1];
const sec = (/var GA_API_SECRET = "([^"]*)";/.exec(SHIPPED) || [])[1];
chk("the committed file declares both constants", mid !== undefined && sec !== undefined,
    "found " + [mid !== undefined && "id", sec !== undefined && "secret"].filter(Boolean).join("+"));
chk("the committed file carries no measurement id", mid === "", "id=" + JSON.stringify(mid));
chk("the committed file carries no api secret", sec === "",
    sec === "" ? "empty" : sec.length + " chars");   // the value itself is never printed
chk("nothing was sent on launch", fetches === 0, fetches + " requests");

// Drive everything that logs, hard, and then check the app is exactly where it was.
s.taps = 20; s.owned.picker = 1; s.contractsDone = 1; s.prestiges = 1;
global.render();
let clock = 1000;
for (let i=0;i<200;i++){ clock += 16; global.__frame(clock); }
global.__runTimeouts(0);
global.__fireWin("error", { message:"boom", filename:"index.html", lineno:1 });
global.__fireWin("unhandledrejection", { reason: new Error("nope") });
document.hidden = true; global.__fireDoc("visibilitychange");
T.log("anything", { a:1 }); T.error("x","y"); T.flush(); T.endSession(); T.resume();
await settle();

chk("still nothing sent after every event source has fired", fetches === 0,
    fetches + " requests");
chk("no client id was minted", !T.__state().cid, "cid=" + T.__state().cid);
chk("nothing was queued", T.__state().queue.length === 0,
    "queued=" + T.__state().queue.length);

// The storage keys matter on their own account: writing them would mean the app was
// keeping an identifier for a player it never reports on, which is worse than useless.
const keys = Object.keys(global.__store).filter(k => /tele/.test(k));
chk("no telemetry key was written to storage", keys.length === 0,
    keys.length ? keys.join(",") : "clean");

// The interval is armed inside start(), which returns early when unconfigured. A timer
// firing every thirty seconds forever in a build that can never send anything would be
// a small permanent waste of a battery this game is already accused of draining.
const intervals = (global.__intervals || []).filter(i => i.ms === 30000);
chk("no flush timer was armed", intervals.length === 0,
    intervals.length + " 30s intervals");

// And the point of all of it: the game is untouched.
let threw = null;
try { global.render(); for (let i=0;i<20;i++){ clock += 16; global.__frame(clock); } }
catch(e){ threw = e.message; }
chk("the game runs exactly as before", threw === null, threw || "clean");
chk("progress still reached the last objective", s.prestiges === 1 && s.taps === 20);

console.log("PASS:"); ok.forEach(l=>console.log("  + "+l));
if(bad.length){ console.log("FAIL:"); bad.forEach(l=>console.log("  - "+l)); process.exitCode=1; }
})();
