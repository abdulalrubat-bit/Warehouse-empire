// The configured path: what runs on a player's phone once the two constants are filled
// in. game-tele.js is the shipping extract with test keys substituted by extract.sh, so
// this exercises the same code, not a copy of it.
require("./harness.js");
const cvEl = document.getElementById("wcanvas"); cvEl._cw = 400; cvEl._ch = 300;

// Capture every request instead of making one. A rejected promise is also how the
// offline case is driven further down.
const sent = [];
let failNext = false;
global.fetch = function(url, opts){
  if (failNext) return Promise.reject(new Error("offline"));
  let body = null;
  try { body = JSON.parse(opts.body); } catch(e){}
  sent.push({ url: url, body: body });
  return Promise.resolve({ status: 204 });
};
// The harness puts a real Android WebView user agent in place of Node's own.

// frame() brackets its render work with two performance.now() calls and hands the
// difference to noteFrameTime. Stepping the clock 40ms per call makes every frame in
// this harness cost a measured 40ms, which is what a struggling phone looks like.
let pnow = 0;
global.performance = { now: () => (pnow += 40) };

require("./game-tele.js");

const s = global.state;
const T = global.window.__tele;
const ok=[], bad=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));
const tick = () => new Promise(r=>process.nextTick(r));
// Flushes are deferred to a zero-delay timer now so that events logged in the same
// turn travel in one request. The harness records timers rather than running them,
// so settling has to drain them -- bounded to 0ms, or this would also fire the
// sixty-second quality probe on every settle.
const settle = async () => {
  for (let i=0;i<25;i++){ global.__runTimeouts(0, 0); await tick(); }
};

const events = () => sent.reduce((a,r)=>a.concat((r.body && r.body.events) || []), []);
const named  = (n) => events().filter(e => e.name === n);
let clock = 1000;
const frames = (n) => { for (let i=0;i<n;i++){ clock += 16; global.__frame(clock); } };

(async () => {
await settle();

// ---- it comes up, and says who, and on what ------------------------------------------
chk("telemetry reports itself configured", T.enabled() === true);
chk("a first launch is announced as an install", named("install_first").length === 1,
    named("install_first").length + " install_first");
chk("and as a session", named("session_begin").length === 1,
    named("session_begin").length + " session_begin");

const first = named("install_first")[0] || { params:{} };
chk("the device model is read out of the user agent",
    first.params.device === "SM-A125F", "device=" + first.params.device);
chk("so is the Android version", first.params.android === "13",
    "android=" + first.params.android);

// GA4 counts a session as engaged only if these two ride along. Without them the reports
// come back with user counts and nothing else -- a silent, total failure of the exercise.
const missing = events().filter(e => !e.params || e.params.session_id === undefined ||
                                     e.params.engagement_time_msec === undefined);
chk("every event carries session_id and engagement_time_msec", missing.length === 0,
    missing.length ? "missing on: " + missing.map(e=>e.name).join(",")
                   : events().length + " events checked");

chk("the request goes to the measurement endpoint with both keys",
    /measurement_id=G-TESTONLY01/.test(sent[0].url) && /api_secret=test-secret/.test(sent[0].url),
    sent[0].url.replace(/^https:\/\/[^?]*/, ""));

// GA4 reported 23 install_first against 4 session_begin on the first day live. That is
// structurally impossible -- install_first is only ever logged immediately before a
// session_begin -- and the cause was log() flushing inline: the install left in its own
// request and the session had to wait for it to resolve, so anything that killed the app
// in between landed one and lost the other. They must travel together.
const bootReq = sent.filter(r => (r.body.events||[]).some(e => e.name === "install_first"));
chk("the install and the session it belongs to go out in one request",
    bootReq.length === 1 &&
    bootReq[0].body.events.some(e => e.name === "session_begin"),
    bootReq.length + " request(s) carried install_first, containing: " +
    (bootReq[0] ? bootReq[0].body.events.map(e=>e.name).join("+") : "-"));
chk("an install is never reported without its session",
    named("install_first").length <= named("session_begin").length,
    named("install_first").length + " install vs " + named("session_begin").length + " session");

// A flat engagement_time_msec made every session read as a third of a second long, which
// put Average engagement time at 00:00:00 and stopped GA4 counting any session as engaged.
const engaged = events().map(e => e.params.engagement_time_msec);
chk("engagement time is measured, not a constant",
    engaged.length > 1 && new Set(engaged).size > 1,
    "values: " + engaged.slice(0, 6).join(", "));
chk("and is never absurd", engaged.every(v => v >= 1 && v <= 60000),
    "min=" + Math.min.apply(null, engaged) + " max=" + Math.max.apply(null, engaged));

// Every event has to name the build it came from and the phone it ran on. Without the
// version, one release's numbers cannot be told from the next one's and no change can be
// measured against what preceded it. Without the device on the funnel events, there is no
// way to exclude a phone -- and at two or three installs a day, the developer's own
// testing is a large share of every figure in the report.
const allEvents = events();
const missingVer = allEvents.filter(e => !e.params.app_version);
chk("every event names the build it came from", missingVer.length === 0,
    missingVer.length ? "missing on: " + missingVer.map(e=>e.name).join(",")
                      : allEvents.length + " events, version=" + allEvents[0].params.app_version);
const missingDev = allEvents.filter(e => !e.params.device || !e.params.android);
chk("and the phone it ran on", missingDev.length === 0,
    missingDev.length ? "missing on: " + missingDev.map(e=>e.name).join(",")
                      : allEvents[0].params.device + " / Android " + allEvents[0].params.android);

const cid = T.__state().cid;
chk("a client id was minted and kept", !!cid && cid.length > 8, "cid=" + cid);
chk("the client id is stored, so the next launch is the same player",
    global.__store["we-tele-cid"] === cid, "stored=" + global.__store["we-tele-cid"]);

// ---- the opening funnel ----------------------------------------------------------------
// The first render only takes a baseline. A returning player on step 2 must not report
// steps 1 and 2 again every time they open the app, or the funnel counts launches.
sent.length = 0;
global.render();
await settle();
chk("a render on unchanged progress reports nothing", events().length === 0,
    events().length + " events");

s.taps = 20;                                   // objective 1: pick ten orders
global.render(); await settle();
chk("finishing the first objective reports step 1",
    named("objective_done").map(e=>e.params.step).join(",") === "1",
    "steps=" + named("objective_done").map(e=>e.params.step).join(","));

global.render(); global.render(); await settle();
chk("and it is not reported again on every later render",
    named("objective_done").length === 1, named("objective_done").length + " objective_done");

// Objectives 2, 3 and 4 at once. The opening gained a Pallet Trolley step between the
// first hire and the first contract, and leaving it unmet correctly stalls the funnel at
// 2 -- which is the behaviour under test, so the fixture has to clear the whole run.
s.owned.picker = 1; s.owned.trolley = 1; s.contractsDone = 1;
global.render(); await settle();
chk("three objectives cleared at once report as three steps, in order",
    named("objective_done").map(e=>e.params.step).join(",") === "1,2,3,4",
    "steps=" + named("objective_done").map(e=>e.params.step).join(","));

s.prestiges = 1;                               // objective 5, after which the card retires
global.render(); await settle();
chk("clearing the last objective still reports, though the card goes away",
    named("objective_done").map(e=>e.params.step).join(",") === "1,2,3,4,5",
    "steps=" + named("objective_done").map(e=>e.params.step).join(","));

// ---- the device-capability probe ---------------------------------------------------------
frames(120);                                   // enough to fill two sample windows
sent.length = 0;
global.__runTimeouts(60000);
await settle();
const q = named("quality_settled")[0];
chk("the settled quality tier is reported a minute in", !!q,
    q ? JSON.stringify(q.params) : "no quality_settled");
chk("against the device it settled on", !!q && q.params.device === "SM-A125F",
    q ? "device=" + q.params.device : "-");   // now inherited from the base params
chk("carrying the measured frame time, not a guess",
    !!q && q.params.avg_ms >= 39 && q.params.avg_ms <= 41,
    q ? "avg_ms=" + q.params.avg_ms : "-");
chk("a phone that cannot hold the frame is reported on a lower tier",
    !!q && q.params.tier !== "high", q ? "tier=" + q.params.tier : "-");

// noteFrameTime used to return before sampling when the tier was pinned, so a pinned
// device reported no timing at all -- and the owner most likely pinned it because it
// was slow, which makes those exactly the devices worth hearing from.
document.getElementById("qLow").fire("click");
frames(120);
sent.length = 0;
global.__runTimeouts(60000);
await settle();
const q2 = named("quality_settled").slice(-1)[0];
chk("a pinned tier still measures and reports its frame time",
    !!q2 && q2.params.avg_ms >= 39 && q2.params.auto === 0,
    q2 ? "avg_ms=" + q2.params.avg_ms + " auto=" + q2.params.auto : "-");
document.getElementById("qAuto").fire("click");

// ---- errors, which is what this was built for ---------------------------------------------
sent.length = 0;
const delivered = global.__fireWin("error",
  { message:"x is not a function", filename:"index.html", lineno:42 });
await settle();
chk("a thrown error reaches telemetry through the window handler",
    delivered > 0 && named("js_error").length === 1,
    delivered + " handler(s), " + named("js_error").length + " js_error");
const err = named("js_error")[0] || { params:{} };
chk("the error carries its message and where it came from",
    /x is not a function/.test(err.params.message) && /:42/.test(err.params.source),
    err.params.message + " @ " + err.params.source);

// The failure this exists to catch is an exception inside the render loop, thrown sixty
// times a second. Uncapped, the diagnostic would be a worse bug than the fault it found.
sent.length = 0;
for (let i=0;i<600;i++)
  global.__fireWin("error", { message:"x is not a function", filename:"index.html", lineno:42 });
await settle();
chk("the same error repeated six hundred times is reported once",
    named("js_error").length === 0, named("js_error").length + " further js_error");

sent.length = 0;
for (let i=0;i<40;i++)
  global.__fireWin("error", { message:"distinct failure " + i, filename:"a.js", lineno:i });
await settle();
chk("distinct errors are capped per session too", named("js_error").length <= 5,
    named("js_error").length + " sent, cap 5");

// ---- offline, which is where an idle game gets played --------------------------------------
sent.length = 0;
failNext = true;
T.log("probe_a", {}); T.log("probe_b", {});
await settle();
chk("a failed send loses nothing", T.__state().queue.length >= 2,
    "queued=" + T.__state().queue.length);
chk("and the queue is written to storage for the next launch",
    /probe_a/.test(global.__store["we-tele-queue"] || ""),
    (global.__store["we-tele-queue"] || "").slice(0, 40));

// A phone in a tunnel fails every send. Each event must not fire its own doomed request
// the moment it is logged, or a long trip costs hundreds of them.
chk("a failure starts a quiet period rather than retrying at once",
    T.__state().retryAfter > Date.now(),
    "quiet for " + Math.round((T.__state().retryAfter - Date.now())/1000) + "s");

failNext = false;
sent.length = 0;
T.log("probe_c", {}); T.flush();
await settle();
chk("and nothing is sent during it", sent.length === 0, sent.length + " requests");

// Wind the clock past the quiet period the way the flush interval eventually would.
const realNow = Date.now;
let skew = 0;
Date.now = () => realNow() + skew;
skew = 61000;
T.flush();
await settle();
chk("the queue drains once the quiet period is up and the network is back",
    named("probe_a").length === 1 && named("probe_b").length === 1 &&
    named("probe_c").length === 1 && T.__state().queue.length === 0,
    "queue=" + T.__state().queue.length);

// A phone offline for a week must not grow an unbounded array inside a game that runs
// for hours at a stretch.
failNext = true;
sent.length = 0;
for (let i=0;i<500;i++){ T.log("flood", { i: i }); skew += 1; }
await settle();
chk("the queue is capped rather than growing without limit",
    T.__state().queue.length <= 60, "queued=" + T.__state().queue.length);
chk("and five hundred events offline do not cost five hundred requests",
    sent.length <= 2, sent.length + " requests attempted");
// Clear the quiet period the only way the module allows: wait it out and succeed once.
failNext = false;
skew += 120000;
T.flush();
await settle();
chk("a successful send ends the quiet period",
    T.__state().retryAfter === 0 && T.__state().queue.length === 0,
    "retryAfter=" + T.__state().retryAfter + " queue=" + T.__state().queue.length);
Date.now = realNow;

// ---- a session ends once, however many ways the platform says so ---------------------------
sent.length = 0;
document.hidden = true;
global.__fireDoc("visibilitychange");          // the game listens on document
T.endSession(); T.endSession();                // appStateChange and pagehide call it too
await settle();
chk("a session is measured once though three handlers end it",
    named("session_length").length === 1,
    named("session_length").length + " session_length");
const sl = named("session_length")[0] || { params:{} };
chk("the length is bucketed, not raw seconds",
    typeof sl.params.bucket === "string" && !!sl.params.bucket,
    "bucket=" + sl.params.bucket + " seconds=" + sl.params.seconds);

sent.length = 0;
document.hidden = false;
T.resume(); await settle();
chk("coming back from the background opens a new session",
    named("session_begin").length === 1, named("session_begin").length + " session_begin");
T.resume(); await settle();
chk("and resuming twice does not open two", named("session_begin").length === 1,
    named("session_begin").length + " session_begin");

// ---- and none of it may ever be the reason a player leaves ----------------------------------
// A telemetry module that can throw is worse than no telemetry module at all.
const realFetch = global.fetch;
global.fetch = function(){ throw new Error("fetch itself is broken"); };
let threw = null;
try {
  T.log("after_break", {}); T.flush(); T.error("boom", "x"); T.endSession(); T.resume();
} catch(e){ threw = e.message; }
await settle();
chk("a fetch that throws outright does not throw out of telemetry", threw === null,
    threw || "clean");

global.fetch = undefined;
threw = null;
try { T.log("no_fetch", {}); T.flush(); } catch(e){ threw = e.message; }
chk("neither does having no fetch at all", threw === null, threw || "clean");
global.fetch = realFetch;

threw = null;
try { frames(3); global.render(); } catch(e){ threw = e.message; }
chk("the game still runs after telemetry has failed every way it can",
    threw === null, threw || "clean");

console.log("PASS:"); ok.forEach(l=>console.log("  + "+l));
if(bad.length){ console.log("FAIL:"); bad.forEach(l=>console.log("  - "+l)); process.exitCode=1; }
})();
