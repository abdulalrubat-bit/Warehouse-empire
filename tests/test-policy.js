// Operating policy, from the autonomous prototype. It only works as a decision if no option
// is simply best: High throughput has to lose while payroll is heavy and win once it is
// light, and Premium has to pay on contracts while costing output. And a policy must not be
// a way to inflate a contract already on the board.
require("./harness.js");
const cvEl = document.getElementById("wcanvas"); cvEl._cw = 400; cvEl._ch = 300;
require("./game-sim.js");

const s = global.state, D = global.window.__depts, S = global.__sim;
const ok=[], bad=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));
const tick = () => new Promise(r=>process.nextTick(r));
const settle = async () => { for (let i=0;i<20;i++) await tick(); };
const $ = id => document.getElementById(id);
const net = () => S.grossRate() - S.wageBill();
const corp0 = { hr:0, customs:0, marketing:0, tower:0, training:0, solar:0, depot:0, server:0 };

(async () => {
await settle();
s.lastTruck = { version: 1, status: "complete", reportSeen: true };

// ---- a new save runs Reliable, and an unknown value is read as Reliable --------------------
chk("a new save runs reliable service", s.policy === "reliable", s.policy);
s.owned = { picker: 40, trolley: 20 }; s.corp = Object.assign({}, corp0); s.perks = {};
const base = net();
s.policy = "nonsense";
chk("a policy the game does not know is read as reliable", Math.abs(net() - base) < 1e-9);
s.policy = "reliable";

// ---- High throughput is a trade, decided by payroll -----------------------------------------
// Heavy payroll: a fleet of hand pickers, no HR.
s.owned = { picker: 60 }; s.corp = Object.assign({}, corp0); s.perks = {};
const heavyShare = S.wageBill() / S.grossRate();
chk("with payroll a large share of gross, high throughput loses money",
    D.policyNet("throughput") < D.policyNet("reliable"),
    "payroll " + Math.round(heavyShare * 100) + "%: " + D.policyNet("throughput").toFixed(2) + " vs " + D.policyNet("reliable").toFixed(2));
// Light payroll: a heavy-plant fleet with HR maxed.
s.owned = { conveyor: 20, sorter: 10 }; s.corp = Object.assign({}, corp0, { hr: 10 }); s.perks = { maint: true };
const lightShare = S.wageBill() / S.grossRate();
chk("with payroll a small share, it pays",
    D.policyNet("throughput") > D.policyNet("reliable"),
    "payroll " + Math.round(lightShare * 100) + "%: " + D.policyNet("throughput").toFixed(0) + " vs " + D.policyNet("reliable").toFixed(0));

// ---- Premium costs output and pays on contracts ----------------------------------------------
chk("premium service runs slower", D.policyNet("premium") < D.policyNet("reliable"));
s.contractsDone = 3; s.contractsOffered = 0; s.specialistOffered = 0;
s.policy = "reliable"; const plain = global.window.__jobs.newContract();
s.contractsOffered = 0; s.specialistOffered = 0;
s.policy = "premium"; const prem = global.window.__jobs.newContract();
// Contracts are sized on the site's rate, so a slower site is asked for less; what Premium
// promises is half as much again for each load delivered.
const perLoad = (prem.cash / prem.goal) / (plain.cash / plain.goal);
chk("and a contract posted under it pays half as much again per load", Math.abs(perLoad - 1.5) < 0.02, perLoad.toFixed(3));
chk("which is still more cash per contract, not less", prem.cash > plain.cash, (prem.cash / plain.cash).toFixed(3));

// ---- switching does not reprice a job already on the board ----------------------------------
s.policy = "reliable"; s.contract = global.window.__jobs.newContract(); const posted = s.contract.cash;
D.setPolicy("premium"); await settle();
chk("switching to premium does not raise a contract already posted", s.contract.cash === posted);
chk("switching is recorded", s.policy === "premium");

// ---- the Office card and the Floor tag --------------------------------------------------------
global.window.__depts.renderPolicy(); await settle();
chk("the Floor shows the policy in force", $("policyTag").textContent === "Premium service", $("policyTag").textContent);
D.setPolicy("reliable");
chk("and survives a save", JSON.parse(JSON.stringify(s)).policy === "reliable");

console.log("PASS:"); ok.forEach(x=>console.log("  + " + x));
if (bad.length){ console.log("FAIL:"); bad.forEach(x=>console.log("  - " + x)); }
console.log(`\n${ok.length} passed, ${bad.length} failed`);
process.exit(bad.length ? 1 : 0);
})();
