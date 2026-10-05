// Named crew, from the autonomous prototype. A specialist is hired once, assigned to a
// department and trained; what matters is that the bonus lands on that department's fleet
// and nowhere else, at the size the card says, that it costs what it says, and that the
// crew stays through a sale.
require("./harness.js");
const cvEl = document.getElementById("wcanvas"); cvEl._cw = 400; cvEl._ch = 300;
require("./game-sim.js");

const s = global.state, C = global.window.__crew, D = global.window.__depts, S = global.__sim;
const ok=[], bad=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));
const tick = () => new Promise(r=>process.nextTick(r));
const settle = async () => { for (let i=0;i<20;i++) await tick(); };
const $ = id => document.getElementById(id);
const gen = id => S.GENS.find(g => g.id === id);

(async () => {
await settle();
s.lastTruck = { version: 1, status: "complete", reportSeen: true };
s.contractsDone = 3; s.crew = {};
s.owned = { picker: 40, trolley: 20, forklift: 10, reach: 4 };

// ---- the crew's departments are the strip's departments ----------------------------------
const strip = {}; D.DEPTS.forEach(d => d.gens.forEach(g => strip[g] = d.id));
chk("the crew and the department strip agree on which tier is where",
    S.GENS.every(g => C.GEN_DEPT[g.id] === strip[g.id]));

// ---- nobody is on the books at the start ---------------------------------------------------
chk("a save starts with no crew bonus anywhere", S.GENS.every(g => C.mult(g.id) === 1));

// ---- hiring ----------------------------------------------------------------------------------
s.money = 100;
chk("a hire the player cannot afford does not happen", C.hire("mick") === false && !s.crew.mick.hired);
s.money = 10000;
const forkBefore = S.genRate(gen("forklift")), pickBefore = S.genRate(gen("picker"));
chk("Big Mick is hired for what the card says", C.hire("mick") === true && s.money === 9500, "$" + s.money);
chk("and starts in his own trade", s.crew.mick.dept === "store");
chk("which makes Storage a quarter faster",
    Math.abs(S.genRate(gen("forklift")) / forkBefore - 1.25) < 1e-9, (S.genRate(gen("forklift")) / forkBefore).toFixed(3));
chk("and leaves every other department alone", S.genRate(gen("picker")) === pickBefore);
chk("hiring twice does nothing", C.hire("mick") === false && s.money === 9500);

// ---- assignment ----------------------------------------------------------------------------
C.assign("mick", "receive");
chk("moved out of his trade he is worth an eighth", Math.abs(C.mult("picker") - 1.12) < 1e-9 && C.mult("forklift") === 1,
    C.mult("picker") + " / " + C.mult("forklift"));
chk("an unknown department is refused", C.assign("mick", "canteen") === false && s.crew.mick.dept === "receive");
C.assign("mick", "store");

// ---- training --------------------------------------------------------------------------------
const cost = C.trainCost("mick");
s.money = cost;
chk("training costs what the button says and adds a tenth", C.train("mick") === true && s.money === 0 &&
    Math.abs(C.mult("forklift") - 1.35) < 1e-9, C.mult("forklift"));
chk("and each level costs more than the last", C.trainCost("mick") > cost);
s.money = 1e15; for (let i = 0; i < 10; i++) C.train("mick");
chk("qualification stops at five", s.crew.mick.level === 5 && Math.abs(C.mult("forklift") - 1.75) < 1e-9, s.crew.mick.level);

// ---- two specialists on one department stack -----------------------------------------------
C.hire("shazza"); C.assign("shazza", "store");
chk("two specialists on one department both count", Math.abs(C.mult("forklift") - 1.75 * 1.12) < 1e-9, C.mult("forklift"));

// ---- a damaged save is repaired, not fatal ------------------------------------------------------
s.crew = { mick: { hired: true, dept: "nowhere", level: "lots" }, shazza: "x" };
C.render();
chk("a crew record with nonsense in it is read safely", S.GENS.every(g => isFinite(C.mult(g.id))) && s.crew.mick.level === 0 && s.crew.mick.dept === null,
    JSON.stringify(s.crew.mick));

// ---- the Fleet tab -----------------------------------------------------------------------------
s.crew = {}; s.money = 1000; C.render(); await settle();
chk("the crew section lists all three", (($("crewList").innerHTML.match(/crew-card/g)) || []).length === 3);
s.contractsDone = 0; s.prestiges = 0; C.render();
chk("and stays out of the way until the first contract is done", $("crewWrap").hidden === true);

console.log("PASS:"); ok.forEach(x=>console.log("  + " + x));
if (bad.length){ console.log("FAIL:"); bad.forEach(x=>console.log("  - " + x)); }
console.log(`\n${ok.length} passed, ${bad.length} failed`);
process.exit(bad.length ? 1 : 0);
})();
