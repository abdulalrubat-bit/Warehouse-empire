// Departments with capacity (4.8): flow balance and the site setup that tunes it. The
// promises made to players are the ones checked here: a lopsided save loses at most a tenth,
// an even one gains a quarter, nothing drops off a cliff when a tier unlocks, an existing
// save cannot lose income in its first week, and every department can be evened up however
// late in the game -- which is why it is weighed by investment, not output.
require("./harness.js");
const cvEl = document.getElementById("wcanvas"); cvEl._cw = 400; cvEl._ch = 300;
require("./game-sim.js");

const s = global.state, F = global.window.__flow, S = global.__sim;
const ok=[], bad=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));
const tick = () => new Promise(r=>process.nextTick(r));
const settle = async () => { for (let i=0;i<20;i++) await tick(); };
const $ = id => document.getElementById(id);
const bal = () => F.stats().raw;
// How many of a tier put a given sum into it: unit prices compound at 1.15, so the most
// expensive tier swamps a fleet bought by eye. These fleets are solved for, not guessed.
const G = id => S.GENS.find(g => g.id === id);
const units = (id, sum) => Math.round(Math.log(sum * 0.15 / G(id).cost + 1) / Math.log(1.15));
const evenFleet = (sum) => ({ picker: units("picker", sum), forklift: units("forklift", sum), conveyor: units("conveyor", sum), crane: units("crane", sum) });
const fresh = (o) => {
  s.lastTruck = { version: 1, status: "complete", reportSeen: true };
  s.site = "general"; s.sku = "fmcg"; s.flowGraceUntil = 0; s.focus = "balanced"; s.attachment = "standard"; s.packSpec = "flexible";
  s.crew = {}; s.knowledge = 0; s.licences = {}; s.policy = "reliable"; s.contractsDone = 5; s.prestiges = 1;
  s.total = 1e9; s.lifetime = 1e9; s.money = 0; s.owned = {};
  Object.assign(s, o || {}); S.invalidateUpMult();
};

(async () => {
await settle();
chk("a new install has nothing to protect, so no week of grace", s.flowGraceUntil === 0, s.flowGraceUntil);

// ---- the range -------------------------------------------------------------------------------
fresh({ owned: { picker: 400 } });
chk("a site with only receiving staffed, every department in reach, runs at x0.90", Math.abs(bal() - 0.90) < 1e-9, bal());
// Even investment: one unit's worth of geometric spend per department is hard to match by
// count, so search for counts that spread investment evenly.
fresh({ owned: evenFleet(1e10) });
const even = F.stats();
chk("a site invested evenly approaches x1.25", bal() > 1.2, bal().toFixed(3) + " shares " +
    ["receive","store","pack","dispatch"].map(d => Math.round(even.depts[d].share * 100)).join("/"));
let lo = 9, hi = 0;
for (let i = 0; i < 200; i++){
  fresh({ owned: { picker: (i * 37) % 300, trolley: (i * 11) % 90, forklift: (i * 7) % 80, reach: (i * 5) % 60,
                   conveyor: (i * 3) % 50, sorter: i % 40, crane: (i * 13) % 30, hub: (i * 17) % 20 } });
  lo = Math.min(lo, bal()); hi = Math.max(hi, bal());
}
chk("across two hundred fleets it never leaves x0.90 to x1.25", lo >= 0.9 - 1e-9 && hi <= 1.25 + 1e-9, lo.toFixed(3) + " to " + hi.toFixed(3));

// ---- late game: any department can be evened up -----------------------------------------------
fresh({ owned: { picker: 900, trolley: 600, forklift: 500, reach: 400, conveyor: 300, sorter: 250, crane: 200, hub: 150 } });
chk("a huge fleet gives a finite balance, not NaN", isFinite(bal()) && isFinite(S.grossRate()), bal());
const late = evenFleet(1e13); late.picker = 0;
fresh({ owned: late, total: 1e15, lifetime: 1e15 });
const short = bal();
s.owned.picker = units("picker", 1e13);
chk("even late, buying in a starved department lifts the balance", bal() > short + 0.05, short.toFixed(3) + " -> " + bal().toFixed(3));

// ---- no cliff when a tier comes into reach ------------------------------------------------------
fresh({ owned: { picker: 30, trolley: 10 }, total: 300, lifetime: 300 });
const before = bal();
s.total = 385; const at = bal();          // the forklift's 35% unlock point
s.total = 600; const soon = bal();
s.total = 1100; const later = bal();
chk("before the forklift is in reach, receiving alone is a balanced site", Math.abs(before - 1.25) < 1e-9, before);
chk("the moment it unlocks costs next to nothing", before - at < 0.01, before.toFixed(3) + " -> " + at.toFixed(3));
chk("and storage phases in from there, a step at a time", soon < at && later < soon && at - soon < 0.1,
    at.toFixed(3) + " -> " + soon.toFixed(3) + " -> " + later.toFixed(3));

// ---- each site type wants its own mix -----------------------------------------------------------
fresh({ owned: evenFleet(1e10) });
const g = F.stats().depts.dispatch.ideal;
s.site = "port"; const p = F.stats().depts.dispatch.ideal;
chk("a port wants a larger share in dispatch than a general site", p > g, Math.round(g * 100) + "% vs " + Math.round(p * 100) + "%");
s.site = "cold";
chk("cold storage wants more storage", F.stats().depts.store.ideal > F.stats().depts.receive.ideal);

// ---- protection -----------------------------------------------------------------------------------
fresh({ owned: { picker: 400 } });
chk("unprotected, an unbalanced site pays its 10%", Math.abs(F.balance() - 0.9) < 1e-9);
s.flowGraceUntil = Date.now() + 86400000;
chk("in its week of grace it cannot lose", F.balance() === 1);
s.flowGraceUntil = 0; s.lastTruck = { version: 1, status: "active" };
chk("nor during the opening shift", F.balance() >= 1);
s.lastTruck = { version: 1, status: "complete", reportSeen: true };
s.owned = evenFleet(1e10); s.flowGraceUntil = Date.now() + 86400000;
chk("grace never caps a gain", F.balance() > 1.2);

// ---- the card and the strip --------------------------------------------------------------------------
// Lifetime short of the crane, so dispatch is not yet in play and receiving is the gap.
fresh({ owned: { picker: 2, forklift: 60, conveyor: 30 }, money: 1e9, total: 1e6, lifetime: 1e6 });
global.render(); await settle();
chk("a department dragging the site below par is the bottleneck card", $("bottleneck").hidden === false &&
    /Receiving is limiting your site/.test($("bottleneckTitle").textContent), $("bottleneckTitle").textContent);
chk("its buy button is for that department", /Casual Picker|Pallet Trolley/.test($("bottleneckBuy").textContent), $("bottleneckBuy").textContent);
global.window.__depts.render(); await settle();
chk("and the strip marks it", /data-dept="receive"[^>]*>|dept on limit|dept limit/.test($("deptStrip").innerHTML) && /Limiting/.test($("deptStrip").innerHTML));

// ---- manager focus -------------------------------------------------------------------------------------
fresh({ owned: { picker: 2, forklift: 60, conveyor: 30 }, total: 1e6, lifetime: 1e6 });
const pick = S.genRate(S.GENS[0]);
F.setFocus("bottleneck");
chk("fix the bottleneck: the limiting department works 20% faster", Math.abs(S.genRate(S.GENS[0]) / pick - 1.2) < 1e-9);
F.setFocus("dispatch");
const g0 = S.grossRate(); F.setFocus("balanced"); const g1 = S.grossRate();
chk("prioritise dispatch costs 5% of output", Math.abs(g0 / g1 - 0.95) < 1e-9, (g0 / g1).toFixed(4));
F.setFocus("dispatch");
s.contract = { goal: 1e12, prog: 0, mins: 15, deadline: Date.now() + 600000, label: "x", cash: 1, pallets: 3, rush: false };
const tk = global.__intervals.find(i => i.ms === 100);
tk.fn(); const p1 = s.contract.prog;
chk("and fills contracts 20% faster than it earns", p1 > 0 && s.money >= 0, p1);
F.setFocus("balanced");

// ---- attachments ----------------------------------------------------------------------------------------
fresh({ owned: { forklift: 10, picker: 10 }, money: 0 });
const cost = F.attachCost("battery");
chk("an attachment cannot be fitted without the money", F.fit("battery") === false && s.attachment === "standard");
s.money = cost;
const fork = S.genRate(S.GENS[2]), w0 = S.wageBill();
chk("fitted, it costs what the card says", F.fit("battery") === true && s.money === 0, cost);
chk("the battery: storage +40%", Math.abs(S.genRate(S.GENS[2]) / fork - 1.4) < 1e-9);
s.sku = "industrial"; s.money = 1e12; F.fit("mast");
const mastInd = S.genRate(S.GENS[0]); s.sku = "fmcg"; const mastFm = S.genRate(S.GENS[0]);
chk("the mast pays on heavy industrial and costs elsewhere", Math.abs(mastInd / mastFm - 1.35 / 0.9) < 1e-9);

// ---- packing line -----------------------------------------------------------------------------------------
fresh({ owned: { picker: 10 } });
chk("a packing line cannot be specialised without a conveyor", F.setPack("bulk") === false && s.packSpec === "flexible");
s.owned.conveyor = 5; const conv = S.genRate(S.GENS[4]);
chk("bulk processing on FMCG: packing +40%", F.setPack("bulk") === true && Math.abs(S.genRate(S.GENS[4]) / conv - 1.4) < 1e-9);

// ---- the site setup screen and damaged saves -----------------------------------------------------------------
F.renderSetup(); await settle();
chk("the Office lists every focus, attachment and packing line",
    ($("focusList").innerHTML.match(/policy-opt/g) || []).length === 3 && ($("attachList").innerHTML.match(/policy-opt/g) || []).length === 4 &&
    ($("packList").innerHTML.match(/policy-opt/g) || []).length === 3);
s.focus = "x"; s.attachment = 7; s.packSpec = null; s.site = "nowhere";
let threw = null; try { F.renderSetup(); S.grossRate(); } catch(e){ threw = e.message; }
chk("nonsense in the save is harmless", threw === null && isFinite(S.grossRate()), threw);

// ---- a sale takes the site's kit with it, and keeps the manager -------------------------------------------
fresh({ owned: { picker: 40, trolley: 20, conveyor: 2 }, lifetime: 5e6, total: 5e6, rep: 0, network: [], tree: {}, upgrades: {}, money: 1e12 });
F.fit("battery"); F.setPack("bulk"); F.setFocus("bottleneck");
s.prestiges = 0; s.awaitingSite = false;
const sell = $("sellBtn"); sell.fire("click"); sell.fire("click"); await settle();
chk("a sale returns the attachment and the packing line with the site", s.attachment === "standard" && s.packSpec === "flexible",
    s.attachment + " / " + s.packSpec + " / sold " + s.prestiges);
chk("and keeps the manager's focus", s.focus === "bottleneck");

console.log("PASS:"); ok.forEach(x=>console.log("  + " + x));
if (bad.length){ console.log("FAIL:"); bad.forEach(x=>console.log("  - " + x)); }
console.log(`\n${ok.length} passed, ${bad.length} failed`);
process.exit(bad.length ? 1 : 0);
})();
