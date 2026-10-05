// Company knowledge and licences, from the autonomous prototype. Knowledge is bought and
// lifts output (not payroll) at every site; licences are earned by deliveries and each adds
// a permanent 2% and pallets. Both belong to the company, so both survive a sale -- and
// neither may be bought cheaply in the trough after one.
require("./harness.js");
const cvEl = document.getElementById("wcanvas"); cvEl._cw = 400; cvEl._ch = 300;
require("./game-sim.js");

const s = global.state, K = global.window.__company, S = global.__sim;
const ok=[], bad=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));
const tick = () => new Promise(r=>process.nextTick(r));
const settle = async () => { for (let i=0;i<20;i++) await tick(); };
const $ = id => document.getElementById(id);
const ticker = global.__intervals.find(i => i.ms === 100);

(async () => {
await settle();
s.lastTruck = { version: 1, status: "complete", reportSeen: true };
s.owned = { picker: 40, trolley: 20 }; s.contractsDone = 3; s.network = []; s.licences = {}; s.kindDone = {}; s.expressDone = 0;
s.knowledge = 0; s.lifetime = 1e6;

// ---- knowledge ------------------------------------------------------------------------------
const g0 = S.grossRate(), w0 = S.wageBill(), cost = K.knowledgeCost();
chk("a level is priced on lifetime earnings", cost === Math.ceil(1e6 * 0.02), cost);
s.money = cost - 1;
chk("it cannot be bought without the money", K.codify() === false && s.knowledge === 0);
s.money = cost;
chk("bought, it costs what the button says", K.codify() === true && s.money === 0 && s.knowledge === 1);
chk("every site runs 8% faster", Math.abs(S.grossRate() / g0 - 1.08) < 1e-9, (S.grossRate() / g0).toFixed(4));
chk("and payroll does not follow", Math.abs(S.wageBill() - w0) < 1e-9);
chk("the next level costs more", K.knowledgeCost() > cost);
const before = K.knowledgeCost(); s.money = 0; s.lifetime = 1e6;    // the money a sale takes away
chk("and a sale's empty till does not make it cheaper", K.knowledgeCost() === before);
s.money = 1e30; for (let i = 0; i < 20; i++) K.codify();
chk("it stops at twelve levels", s.knowledge === 12 && Math.abs(K.knowledgeMult() - 1.96) < 1e-9, s.knowledge);
s.knowledge = "lots";
chk("a damaged value is read as no knowledge, not NaN", K.knowledgeMult() === 1 && isFinite(S.grossRate()));
s.knowledge = 0;

// ---- licences: earned by delivering ----------------------------------------------------------
s.contractsDone = 9; s.pallets = 0;
const g1 = S.grossRate();
s.contract = { goal: 10, prog: 10, mins: 15, deadline: Date.now() + 600000, label: "x", cash: 1, pallets: 3, rush: false };
ticker.fn(); await settle();
chk("the tenth contract earns the local operator licence", !!s.licences.local, JSON.stringify(s.licences));
chk("with its pallets", s.pallets === 3 + 5, s.pallets);
chk("and 2% output for good", Math.abs(S.grossRate() / g1 - 1.02) < 0.001, (S.grossRate() / g1).toFixed(4));
chk("written to the journal", /Local operator licence earned/.test(s.journal[0].text), s.journal[0].text);
const palletsAfter = s.pallets;
K.checkLicences();
chk("a licence is earned once", s.pallets === palletsAfter);

// Specialist and express deliveries are counted by kind.
for (let i = 0; i < 5; i++){
  s.contract = { goal: 10, prog: 10, mins: 15, deadline: Date.now() + 600000, label: "x", cash: 1, pallets: 3, rush: false, kind: "reefer", express: i < 2 };
  ticker.fn(); await settle();
}
chk("five refrigerated jobs earn medical accreditation", !!s.licences.medical && s.kindDone.reefer === 5, JSON.stringify(s.kindDone));
chk("express deliveries are counted towards their own licence", s.expressDone === 2 && !s.licences.express, s.expressDone);
s.network = [{ id: "cold" }, { id: "hazmat" }, { id: "port" }]; K.checkLicences();
chk("holding three Network sites earns the regional licence", !!s.licences.regional);

// ---- they belong to the company ----------------------------------------------------------------
const blob = JSON.parse(JSON.stringify(s));
chk("knowledge and licences are written to the save", blob.licences.local && blob.licences.medical && "knowledge" in blob);

// ---- the Office ------------------------------------------------------------------------------------
K.renderLicences(); K.renderKnowledge(); await settle();
chk("the Office lists all six licences", (($("licenceList").innerHTML.match(/class="lrow/g)) || []).length === 6);
chk("and the knowledge button states its price and gain", /DOCUMENT A PROCEDURE .* \+8%/.test($("codifyBtn").textContent), $("codifyBtn").textContent);
s.licences = "x";
let threw = null; try { K.renderLicences(); S.grossRate(); } catch(e){ threw = e.message; }
chk("a damaged licence record is replaced, not fatal", threw === null && typeof s.licences === "object", threw);

console.log("PASS:"); ok.forEach(x=>console.log("  + " + x));
if (bad.length){ console.log("FAIL:"); bad.forEach(x=>console.log("  - " + x)); }
console.log(`\n${ok.length} passed, ${bad.length} failed`);
process.exit(bad.length ? 1 : 0);
})();
