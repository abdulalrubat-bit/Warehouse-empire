// The Last Truck induction is the whole opening now, and it shipped reporting nothing: no
// way to see how many new players start it, which beat they leave on, or whether anyone
// finishes. This drives it end to end through the configured telemetry path and checks the
// funnel that comes out -- one truck_start, one truck_beat per beat as it closes, one
// truck_end -- and that a fresh install's automatic start is not lost to the launch race.
require("./harness.js");
const cvEl = document.getElementById("wcanvas"); cvEl._cw = 400; cvEl._ch = 300;

const sent = [];
global.fetch = function(url, opts){
  try { sent.push(JSON.parse(opts.body)); } catch(e){}
  return Promise.resolve({ status: 204 });
};
require("./game-tele.js");

const s = global.state;
const LT = global.window.__truck;
const ok=[], bad=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));
const tick = () => new Promise(r=>process.nextTick(r));
const settle = async () => { for (let i=0;i<25;i++){ global.__runTimeouts(0, 0); await tick(); } };
const events = () => sent.reduce((a,b)=>a.concat((b && b.events) || []), []);
const named  = (n) => events().filter(e => e.name === n);

(async () => {
await settle();

// ---- a fresh install starts the induction on its own, and that start is reported ----
chk("the induction started on a fresh install", s.lastTruck && s.lastTruck.status === "active",
    s.lastTruck ? s.lastTruck.status : "none");
const st = named("truck_start");
chk("its start is reported once, despite landing before telemetry settled", st.length === 1,
    st.length + " truck_start");
chk("and says it started by itself", st[0] && st[0].params.truck_source === "auto",
    st[0] && st[0].params.truck_source);

// ---- play it: finish the odd beats, miss the even ones, make both choices ----
for (let i = 0; i < 10; i++){
  const h = s.lastTruck;
  h.elapsed = 12 + i;                                 // time on the beat, as reported
  if (i === 3) h.choice = "express";                  // the load choice
  if (i === 8) h.client = "steady";                   // the customer choice
  if (i % 2 === 0) LT.finish("done in test");
  h.depart = 0;
  LT.advance();
}
await settle();

const beats = named("truck_beat");
chk("every beat reports as it closes", beats.length === 10, beats.length + " truck_beat");
chk("in order, numbered 1 to 10",
    beats.map(e => e.params.truck_beat).join(",") === "1,2,3,4,5,6,7,8,9,10",
    beats.map(e => e.params.truck_beat).join(","));
chk("each names its beat", beats.every(e => typeof e.params.truck_beat_id === "string" && e.params.truck_beat_id),
    beats.map(e => e.params.truck_beat_id).join(","));
chk("finished beats read done and missed ones read missed",
    beats.every((e, i) => e.params.truck_result === (i % 2 === 0 ? "done" : "missed")),
    beats.map(e => e.params.truck_result).join(","));
chk("the time spent on each beat rides along", beats[4] && beats[4].params.truck_secs === 16,
    beats[4] && beats[4].params.truck_secs);
chk("the load choice is reported on its beat", beats[3] && beats[3].params.truck_choice === "express",
    beats[3] && beats[3].params.truck_choice);
chk("the customer choice is reported on its beat", beats[8] && beats[8].params.truck_choice === "steady",
    beats[8] && beats[8].params.truck_choice);
chk("a beat with no choice says none rather than leaving a blank",
    beats[0] && beats[0].params.truck_choice === "none", beats[0] && beats[0].params.truck_choice);

const end = named("truck_end");
chk("finishing reports one truck_end", end.length === 1, end.length + " truck_end");
chk("as complete, with the beats actually completed",
    end[0] && end[0].params.truck_result === "complete" && end[0].params.truck_completed === 5,
    end[0] && JSON.stringify(end[0].params));
chk("the induction is over", s.lastTruck.status === "complete", s.lastTruck.status);

// ---- the other way out: selling up mid-induction ends it as skipped ----
const before = named("truck_end").length;
s.lastTruck = Object.assign({}, s.lastTruck, { status:"active", index:4, completed:2, totalSeconds:200,
                                              done:false, basePrestiges:s.prestiges });
s.prestiges++;
LT.tick(0.1);
await settle();
const skipped = named("truck_end").slice(before);
chk("leaving by a sale is reported", skipped.length === 1, skipped.length + " new truck_end");
chk("as skipped, on the beat it was left on",
    skipped[0] && skipped[0].params.truck_result === "skipped" && skipped[0].params.truck_beat === 5,
    skipped[0] && JSON.stringify(skipped[0].params));
LT.tick(0.1); await settle();
chk("and only once", named("truck_end").length === before + 1, named("truck_end").length - before + " after a second tick");

// ---- nothing sent is a name GA4 would drop ----
const names = ["truck_start","truck_beat","truck_end"];
const keys = new Set();
events().filter(e => names.includes(e.name)).forEach(e => Object.keys(e.params).forEach(k => keys.add(k)));
const own = [...keys].filter(k => !["session_id","engagement_time_msec","app_version","device","android"].includes(k));
chk("every parameter of its own carries the event's prefix", own.every(k => k.startsWith("truck_")), own.join(","));

console.log("PASS:"); ok.forEach(l=>console.log("  + "+l));
if(bad.length){ console.log("FAIL:"); bad.forEach(l=>console.log("  - "+l)); process.exitCode=1; }
})();
