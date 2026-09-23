// The site has to answer to what you bought, and the phone has to answer to what you set.
require("./harness.js");
const cvEl = document.getElementById("wcanvas"); cvEl._cw = 400; cvEl._ch = 300;
require("./game.js");

const s = global.state;
const ok=[], bad=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));
const tick = () => new Promise(r=>process.nextTick(r));

// Every mark the renderer puts on the canvas in one frame.
// One clock. The renderer derives dt from the timestamp it is handed, so a probe that
// calls __frame on performance.now() while the caller advances its own counter feeds it
// alternating jumps forward and back, and nothing animates.
let clock = 1000;
function marks(stepMs){
  const c = global.__ctxCounts;
  c.beginPath = 0; c.fillRect = 0; c.strokeRect = 0;
  clock += (stepMs === undefined ? 16 : stepMs);
  global.__frame(clock);
  return c.beginPath + c.fillRect + c.strokeRect;
}

(async () => {
for (let i=0;i<10;i++) await tick();
global.__clickTab("floor");

// ---- every generator has to show up on the site --------------------------------------
// Four of the eight were invisible: buying a picker, a sorting robot, a crane or a hub
// changed nothing you could see. Pickers and the crane had been drawn by the previous
// renderer, so the port lost them.
const GENS = ["picker","trolley","forklift","reach","conveyor","sorter","crane","hub"];
const bare = { picker:0, trolley:0, forklift:0, reach:0, conveyor:0, sorter:0, crane:0, hub:0 };
s.corp = { hr:0, customs:0, marketing:0, tower:0, training:0, solar:0, depot:0, server:0 };
s.corpProgress = {}; s.network = [];
s.owned = Object.assign({}, bare);
marks();
const floor = marks();

const invisible = [];
GENS.forEach(id => {
  s.owned = Object.assign({}, bare);
  s.owned[id] = 400;                      // plenty of them, so the count cannot be the reason
  marks();
  if (marks() <= floor) invisible.push(id);
});
chk("every generator you can buy puts something on the site",
    invisible.length === 0,
    invisible.length ? "invisible: " + invisible.join(",") : GENS.length + " of " + GENS.length);

// ---- the four sites have to be four places -------------------------------------------
// They differed only in their multipliers: you chose one at every prestige and the yard
// was identical. A site is a specialisation, so the storage has to be the thing that
// changes -- racking, chilled chambers, bunded cells, container stacks.
const SITES = ["general","cold","hazmat","port"];
s.owned = { picker:300, trolley:200, forklift:150, reach:100, conveyor:60, sorter:30, crane:12, hub:5 };
const shape = {};
SITES.forEach(id => { s.site = id; marks(); shape[id] = marks(); });
const same = [];
for (let i = 0; i < SITES.length; i++)
  for (let j = i+1; j < SITES.length; j++)
    if (shape[SITES[i]] === shape[SITES[j]]) same.push(SITES[i] + "/" + SITES[j]);
chk("every site draws a different yard", same.length === 0,
    same.length ? "identical: " + same.join(", ")
                : SITES.map(id => id + "=" + shape[id]).join("  "));

// Plant must travel the lanes this site actually has, not the racking pitch it may not.
chk("a container terminal is not drawn as pallet racking",
    Math.abs(shape.port - shape.general) > 40,
    "general=" + shape.general + " port=" + shape.port);
s.site = "general";

// ---- docks run a cycle rather than a coin flip ---------------------------------------
s.owned = { picker:300, trolley:200, forklift:150, reach:100, conveyor:60, sorter:30, crane:12, hub:5 };
const seen = new Set();
for (let i = 0; i < 240; i++) seen.add(marks(200));   // ~48s of sim
// A band, not a floor. Arrivals are random, so the count swings between roughly 17 and
// 38 across runs and the old threshold of 20 sat inside that spread -- it passed most
// times and failed the rest, which is worse than no test.
//
// The band is also the better assertion. A static apron gives 1 or 2 distinct frames;
// an apron re-rolled every frame, which is the bug this replaced, gives nearly 240. What
// is being claimed is that trucks arrive, sit at the dock for a while and leave, so the
// answer has to be well above a handful and nowhere near one-per-frame.
chk("the dock apron changes as trucks come and go, and is not re-rolled every frame",
    seen.size > 8 && seen.size < 200,
    seen.size + " distinct frames over 240 samples (want 9-199)");

// ---- vibration is its own setting ----------------------------------------------------
chk("vibration is on by default", s.haptics !== false, "haptics=" + s.haptics);

const buzz = document.getElementById("hapticBtn");
chk("the Office has a vibration control", !!buzz, buzz ? buzz.textContent : "missing");
buzz.fire("click");
chk("turning it off sets the flag", s.haptics === false, "haptics=" + s.haptics);
chk("and the button says so", /OFF/.test(buzz.textContent), buzz.textContent);
buzz.fire("click");
chk("turning it back on sets the flag", s.haptics === true, "haptics=" + s.haptics);

// The whole point: sound and vibration must not be the same switch. Muting used to
// return early out of sfx() before the haptic ever fired, so SFX OFF silenced both.
// sfx() is module-scoped, so drive it the way a player does -- by picking an order.
let buzzed = 0;
const realCap = global.window.Capacitor;
global.window.Capacitor = { Plugins: { Haptics: { impact(){ buzzed++; } } } };

s.muted = true; s.haptics = true;
document.getElementById("pickBtn").fire("pointerdown", { clientX: 10, clientY: 10 });
chk("muting the sound does not mute the vibration", buzzed > 0, "impacts=" + buzzed);

const afterMuted = buzzed;
s.haptics = false;
document.getElementById("pickBtn").fire("pointerdown", { clientX: 10, clientY: 10 });
chk("turning vibration off actually stops it", buzzed === afterMuted, "impacts=" + buzzed);

global.window.Capacitor = realCap;
s.muted = false; s.haptics = true;

// ---- and it survives a save ----------------------------------------------------------
s.haptics = false;
document.getElementById("hapticBtn").fire("click");   // on
document.getElementById("hapticBtn").fire("click");   // off again, and saved
// saveGame queues the snapshot and lets a microtask write it, so storage has to be
// given a turn before it is read. The old synchronous write is what these lines
// assumed; the queued one is the better design and the test moves to meet it.
await tick();
const raw = JSON.parse(global.localStorage.getItem("warehouse-empire-save") || "{}");
chk("the setting is written to the save", raw.haptics === false, "saved haptics=" + raw.haptics);

console.log("PASS:"); ok.forEach(l=>console.log("  + "+l));
if(bad.length){ console.log("FAIL:"); bad.forEach(l=>console.log("  - "+l)); process.exitCode=1; }
})();
