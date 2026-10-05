// The express clause: a standard job taken on tighter terms for a bigger reward. What
// matters is that it is a real bet -- offered only before the job is under way, priced so
// it is a stretch rather than free, locked once signed, and lost outright if missed.
require("./harness.js");
const cvEl = document.getElementById("wcanvas"); cvEl._cw = 400; cvEl._ch = 300;
require("./game-sim.js");

const s = global.state, X = global.window.__express, S = global.__sim;
const ok=[], bad=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));
const tick = () => new Promise(r=>process.nextTick(r));
const settle = async () => { for (let i=0;i<20;i++) await tick(); };
const $ = id => document.getElementById(id);
// The contract card is drawn by the game tick, not by render().
const ticker = global.__intervals.find(i => i.ms === 100);
const beat = () => ticker.fn();
const btn = () => $("expressBtn");
const ev = { preventDefault(){}, stopPropagation(){} };

const job = (o) => Object.assign({ goal: 9000, prog: 0, mins: 15, deadline: Date.now() + 15 * 60000,
                                   label: "Dispatch $9K of freight", cash: 4000, pallets: 3, rush: false }, o || {});
const fresh = () => {
  s.owned = { picker: 30, trolley: 10 }; s.contractsDone = 3; s.prestiges = 0; s.contractsOffered = 3;
  s.lastTruck = { version: 1, status: "complete", reportSeen: true };
  s.contract = job(); s.money = 0;
};

(async () => {
await settle();

// ---- when it is offered -------------------------------------------------------------
fresh(); beat(); await settle();
chk("a fresh standard job offers express terms", X.offered() && btn().hidden === false);
chk("the button prices the terms before they are signed",
    /HALF THE TIME/.test(btn().innerHTML) && /\+ 5 PAL/.test(btn().innerHTML),
    btn().innerHTML);
chk("and the card shows the time left", /^\d+:\d\d left$/.test($("contractTime").textContent), $("contractTime").textContent);

fresh(); s.contract = job({ rush: true, mins: 2, deadline: Date.now() + 120000 }); beat(); await settle();
chk("a rush is already tight, so it is not offered there", !X.offered() && btn().hidden === true);

fresh(); s.contract = job({ prog: 9000 * 0.5 }); beat(); await settle();
chk("nor on a job half done, where it would be a free bonus", !X.offered() && btn().hidden === true);

fresh(); s.contract = job({ deadline: Date.now() + 15 * 60000 * 0.5 }); beat(); await settle();
chk("nor on one whose clock has mostly run", !X.offered());

fresh(); s.contractsDone = 1; beat(); await settle();
chk("nor to a player still on their first contracts", !X.offered());

fresh(); s.lastTruck = { version: 1, status: "active" }; beat(); await settle();
chk("nor during the opening shift, which has its own express choice", !X.offered());

// ---- signing it ---------------------------------------------------------------------
fresh(); beat(); await settle();
const before = Object.assign({}, s.contract), leftBefore = s.contract.deadline - Date.now();
X.press(ev); await settle();
chk("one press only arms it", !s.contract.express && /Tap again/.test(btn().innerHTML), btn().innerHTML);
X.press(ev); await settle();
const c = s.contract, leftAfter = c.deadline - Date.now();
chk("the second signs it", c.express === true);
chk("halving the time that was left", Math.abs(leftAfter - leftBefore / 2) < 2000,
    Math.round(leftBefore / 1000) + "s -> " + Math.round(leftAfter / 1000) + "s");
chk("for twice the cash and two more pallets", c.cash === before.cash * 2 && c.pallets === before.pallets + 2,
    c.cash + " / " + c.pallets);
chk("and the goal is unchanged", c.goal === before.goal);
chk("it says so on the card", /^EXPRESS/.test($("contractTitle").textContent) && /EXPRESS REWARD/.test($("contractReward").textContent),
    $("contractTitle").textContent + " | " + $("contractReward").textContent);
chk("once signed there is no button to sign it again or take it back", btn().hidden === true);
chk("signing twice does not double it twice", X.take() === false && s.contract.cash === before.cash * 2);

// A standard job is sized at 60% of the window's throughput; on express terms that is due
// in half the time, so the fleet as it stands falls short, and the card says so.
chk("express terms put the fleet behind, so the bottleneck card speaks",
    $("bottleneck").hidden === false && !$("bottleneck").classList.contains("good"),
    $("bottleneckTitle").textContent);

// ---- it survives a restart ------------------------------------------------------------
const blob = JSON.parse(JSON.stringify(s));
chk("the signed terms are written to the save", blob.contract.express === true && blob.contract.cash === before.cash * 2);

// ---- missing it ------------------------------------------------------------------------
s.contract.deadline = Date.now() - 1; beat(); await settle();
chk("missed, the job is gone and a new one is posted", !s.contract.express && s.contract !== c);
chk("and the player is told", /Express clause missed/.test($("toast").innerHTML), $("toast").innerHTML);

// ---- an armed press that is not followed up lapses -------------------------------------
fresh(); beat(); await settle();
X.press(ev);
const realNow = Date.now; Date.now = () => realNow() + 5000;
beat();
chk("an armed button not pressed again lapses", /Take the express clause/.test(btn().innerHTML), btn().innerHTML);
X.press(ev);
chk("so a later single press does not sign", !s.contract.express);
Date.now = realNow;

console.log("PASS:"); ok.forEach(x=>console.log("  + " + x));
if (bad.length){ console.log("FAIL:"); bad.forEach(x=>console.log("  - " + x)); }
console.log(`\n${ok.length} passed, ${bad.length} failed`);
process.exit(bad.length ? 1 : 0);
})();
