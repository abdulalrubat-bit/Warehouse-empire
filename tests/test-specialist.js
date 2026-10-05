// Specialist work: jobs that only go to an operator who can handle them. Each kind has to
// be earned by something the business has actually done, must not appear before it is,
// must pay for the trouble, and must be visible as a goal while it is still locked.
require("./harness.js");
const cvEl = document.getElementById("wcanvas"); cvEl._cw = 400; cvEl._ch = 300;
require("./game-sim.js");

const s = global.state, J = global.window.__jobs;
const ok=[], bad=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));
const tick = () => new Promise(r=>process.nextTick(r));
const settle = async () => { for (let i=0;i<20;i++) await tick(); };
const $ = id => document.getElementById(id);
const ids = () => J.qualified().map(k => k.id).sort().join(",");

const fresh = () => {
  s.owned = { picker: 30, trolley: 10, forklift: 4 }; s.contractsDone = 5; s.contractsOffered = 0;
  s.site = "general"; s.network = []; s.prestiges = 0; s.specialistOffered = 0;
  s.lastTruck = { version: 1, status: "complete", reportSeen: true };
};
// Offer twelve jobs in a row and say what each one was: R rush, . standard, or the kind.
const run = () => { const out = []; for (let i = 0; i < 12; i++){ const c = J.newContract(); out.push(c.rush ? "R" : c.kind ? c.kind[0] : "."); } return out.join(""); };

(async () => {
await settle();

// ---- nothing is offered before it is earned ----------------------------------------------
fresh();
chk("a general site with a small fleet qualifies for no specialist work", ids() === "", ids());
chk("so every job it is offered is a standard one or a rush", !/[ord]/.test(run()));

// ---- each kind is unlocked by what it says ------------------------------------------------
fresh(); s.owned.reach = 4;
chk("four Reach Trucks are not yet enough for oversized loads", ids() === "");
s.owned.reach = 5;
chk("five are", ids() === "oversize", ids());
fresh(); s.owned.crane = 1;
chk("and so is one Automated Crane", ids() === "oversize", ids());

fresh(); s.site = "cold";
chk("running a Cold Storage site qualifies for refrigerated freight", ids() === "reefer", ids());
fresh(); s.network = [{ id: "cold", peak: 1e6, suburb: "Dandenong", inv: 0 }];
chk("and so does holding one in the Network after selling it", ids() === "reefer", ids());
fresh(); s.network = [{ id: "hazmat", peak: 1e6, suburb: "Altona", inv: 0 }];
chk("a Dangerous Goods site in the Network qualifies for DG work", ids() === "dg", ids());

// ---- cadence --------------------------------------------------------------------------------
fresh(); s.owned.reach = 5;
const one = run();
// Jobs 2, 5, 8 and 11 are specialist slots and 4, 8 and 12 are rushes; a rush keeps its slot.
chk("every third job is specialist work, and a rush keeps its slot", one === ".o.Ro..R..oR", one);
fresh(); s.owned.reach = 5; s.site = "cold"; s.network = [{ id: "hazmat", peak: 1e6, suburb: "Altona", inv: 0 }];
const all = run();
chk("a business qualified for several kinds is offered each in turn", all.replace(/[.R]/g, "") === "ord", all);
fresh(); s.owned.reach = 5; s.contractsDone = 1;
chk("a player still on their first jobs is not offered it", !/o/.test(run()));

// ---- it pays ----------------------------------------------------------------------------------
fresh(); s.owned.reach = 5;
s.contractsOffered = 0; const plain = J.newContract();       // offered #1: standard
s.contractsOffered = 1; const spec = J.newContract();        // offered #2: specialist
chk("the second job of three is the specialist one", !plain.kind && spec.kind === "oversize",
    JSON.stringify([plain.kind, spec.kind]));
chk("it pays the kind's premium over the same job", Math.abs(spec.cash / plain.cash - 1.4) < 0.01,
    (spec.cash / plain.cash).toFixed(3));
chk("and more pallets", spec.pallets === plain.pallets + 2, plain.pallets + " -> " + spec.pallets);
chk("with the same goal", spec.goal === plain.goal);
chk("and says what it is", /^OVERSIZE · /.test(spec.label), spec.label);

// ---- the card and the Office -------------------------------------------------------------------
s.contract = spec;
const ticker = global.__intervals.find(i => i.ms === 100); ticker.fn(); await settle();
chk("the contract card calls it specialist work", /SPECIALIST REWARD/.test($("contractReward").textContent),
    $("contractReward").textContent);

fresh(); s.owned.reach = 5; global.render(); await settle();
J.renderOffice(); await settle();     // the Office draws only while it is the open tab
const office = $("specialistList").innerHTML;
chk("the Office lists every kind", J.kinds.every(k => office.indexOf(k.name) >= 0), office.slice(0, 120));
chk("marks the unlocked one with what it pays", /specrow on[^]*Oversized loads[^]*\+40% cash/.test(office));
chk("and says what each locked one needs", /Run a Cold Storage site/.test(office) && /Run a Dangerous Goods site/.test(office));

console.log("PASS:"); ok.forEach(x=>console.log("  + " + x));
if (bad.length){ console.log("FAIL:"); bad.forEach(x=>console.log("  - " + x)); }
console.log(`\n${ok.length} passed, ${bad.length} failed`);
process.exit(bad.length ? 1 : 0);
})();
