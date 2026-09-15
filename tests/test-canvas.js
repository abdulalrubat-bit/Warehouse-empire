require("./harness.js");
// Give the canvas real dimensions BEFORE the game boots, so sizeCanvas() runs for real.
const CW = 400, CH = 300;
const cvEl = document.getElementById("wcanvas"); cvEl._cw = CW; cvEl._ch = CH;
require("./game.js");

const s = global.state;
const ok=[], bad=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));
const tick = () => new Promise(r=>process.nextTick(r));

(async () => {
// sizeCanvas() runs inside startGame(), which is gated on the async loadGame() promise.
for (let i=0;i<10;i++) await tick();

const P = global.window.__plan;
const PLOTS = P.plots;
// Ask the renderer where a world point lands rather than re-deriving the projection.
// The previous version of this file kept its own copy of the isometric maths, which is
// how it ended up testing a camera the game no longer had.
const screenOf = (wx, wy) => P.toScreen(wx, wy);
const centreOf = (id) => screenOf(PLOTS[id].gx + PLOTS[id].gw/2, PLOTS[id].gy + PLOTS[id].gd/2);

let pid = 1;
// A tap is down-then-up in the same place. It has to be a gesture now, not a single
// event, because the same pointer stream also pans the plan.
function tapAt(p){
  const id = pid++;
  cvEl.fire("pointerdown", { pointerId:id, clientX:p.x, clientY:p.y });
  cvEl.fire("pointerup",   { pointerId:id, clientX:p.x, clientY:p.y });
}
function dragFrom(p, dx, dy){
  const id = pid++;
  cvEl.fire("pointerdown", { pointerId:id, clientX:p.x, clientY:p.y });
  cvEl.fire("pointermove", { pointerId:id, clientX:p.x + dx/2, clientY:p.y + dy/2 });
  cvEl.fire("pointermove", { pointerId:id, clientX:p.x + dx,   clientY:p.y + dy });
  cvEl.fire("pointerup",   { pointerId:id, clientX:p.x + dx,   clientY:p.y + dy });
}

// --- the plan must expose every corporate building as a tap target ---
const CORP_IDS = ["tower","hr","training","marketing","customs","server","depot","solar"];
chk("every corporate building has a plot on the plan",
    CORP_IDS.every(id => PLOTS[id]), Object.keys(PLOTS).join(","));

// --- plot zones must not overlap ---
let overlap = null;
const ids = Object.keys(PLOTS);
for (let i=0;i<ids.length;i++) for (let j=i+1;j<ids.length;j++){
  const a = PLOTS[ids[i]], b = PLOTS[ids[j]];
  if (a.gx < b.gx+b.gw && b.gx < a.gx+a.gw && a.gy < b.gy+b.gd && b.gy < a.gy+a.gd)
    overlap = ids[i]+"/"+ids[j];
}
chk("corp plot hit zones do not overlap", overlap === null,
    overlap ? "overlap: "+overlap : ids.length + " disjoint plots");

// --- plots must not sit under the racking, where they would be untappable ---
const racks = P.zones.racks;
let buried = null;
ids.forEach(id => {
  const a = PLOTS[id];
  if (a.gx < racks.x+racks.w && racks.x < a.gx+a.gw && a.gy < racks.y+racks.h && racks.y < a.gy+a.gd)
    buried = id;
});
chk("no corporate plot sits under the storage aisles", buried === null, buried || "clear");

// --- a tap on an empty plot buys level 1 ---
s.money = 1e20; s.corp = { hr:0, tower:0, solar:0, server:0, customs:0, marketing:0, training:0, depot:0 };
tapAt(centreOf("server"));
chk("tapping an empty plot builds level 1", s.corp.server === 1, "server lvl="+s.corp.server);

// --- ONE gesture must buy exactly ONE level ---
s.money = 1e20;
tapAt(centreOf("server"));
chk("one tap buys exactly one level", s.corp.server === 2, "server lvl="+s.corp.server);

// --- panning across a plot must NOT buy it (new risk: the plan is draggable) ---
s.money = 1e20;
const beforeDrag = s.corp.tower || 0;
dragFrom(centreOf("tower"), 90, 40);
chk("dragging the plan does not build", (s.corp.tower||0) === beforeDrag,
    "tower lvl="+(s.corp.tower||0)+" after a 90px drag");

// --- every plot is reachable at its own centre ---
s.money = 1e20;
let unreachable = [];
CORP_IDS.forEach(id => {
  const was = s.corp[id] || 0;
  tapAt(centreOf(id));
  if ((s.corp[id]||0) !== was + 1) unreachable.push(id);
});
chk("every corporate plot is tappable at its centre", unreachable.length === 0,
    unreachable.length ? "unreachable: "+unreachable.join(",") : CORP_IDS.length + " plots");

// --- open floor must not build anything ---
s.money = 1e20;
const before = JSON.stringify(s.corp);
tapAt(screenOf(racks.x + racks.w/2, racks.y + racks.h/2));
chk("tapping open warehouse floor builds nothing", JSON.stringify(s.corp) === before, before);

// --- cannot build without the cash ---
s.money = 0; s.corp.solar = 0;
tapAt(centreOf("solar"));
chk("cannot build without the cash", (s.corp.solar||0) === 0, "solar lvl="+(s.corp.solar||0));

console.log("PASS:"); ok.forEach(l=>console.log("  + "+l));
if(bad.length){ console.log("FAIL:"); bad.forEach(l=>console.log("  - "+l)); process.exitCode=1; }
})();
