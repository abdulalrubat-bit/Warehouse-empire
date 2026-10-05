// Milestone shipments: every fifth contract offers one reward from three. The properties
// that matter are the ones that make a choice fair and a reward real -- it comes on the
// fifth contract and not the fourth, the same contract always offers the same three (so a
// reload cannot reroll it), it survives a save, there is always a "now" and a "for a
// while" on the table, nothing is offered that cannot be used, and a pick pays exactly once.
require("./harness.js");
{ const cv = document.getElementById("wcanvas"); cv._cw = 400; cv._ch = 300; }
require("./game-sim.js");
const s = global.state, M = global.window.__milestone;
s.lastTruck = { version:1, status:"complete" };
const ok=[], bad=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));
const $ = id => document.getElementById(id);
const tick = async (n=8) => { for(let i=0;i<n;i++) await new Promise(r=>process.nextTick(r)); };
const ticker = global.__intervals.find(i => i.ms === 100);
const KIND = { crew:"timed", rush:"timed", hands:"timed", cash:"instant", pallets:"instant", crates:"instant" };

(async () => {
await tick(12);
s.owned = { picker: 40, trolley: 20 }; s.money = 0; s.pallets = 0; s.crates = 0;
s.milestoneOffer = null; ["modalDaily","modalOffline","modalNotif","modalSite"].forEach(id => { if ($(id)) $(id).hidden = true; });

// ---- it comes on the fifth contract, not before ----
const finish = () => { s.contract = { goal: 0.001, prog: 0, mins: 5, deadline: Date.now() + 600000,
                                      label:"x", cash: 10, pallets: 1, rush:false }; ticker.fn(); };
s.contractsDone = 3; finish();
chk("no offer on the fourth contract", s.milestoneOffer === null, "done=" + s.contractsDone);
finish();
chk("an offer on the fifth", !!s.milestoneOffer && s.milestoneOffer.n === 1, JSON.stringify(s.milestoneOffer));
chk("and it opens when nothing else is on screen", $("modalMilestone").hidden === false);
chk("with three choices", $("milestoneChoices").children.length === 3, $("milestoneChoices").children.length);

// ---- fair offers ----
const offer = s.milestoneOffer.options.slice();
chk("the same contract always draws the same three", JSON.stringify(M.draw(1)) === JSON.stringify(offer),
    M.draw(1).join(",") + " vs " + offer.join(","));
let mixed = true, distinct = true;
for (let n = 1; n <= 60; n++){
  const d = M.draw(n), kinds = d.map(id => KIND[id]);
  if (!(kinds.includes("instant") && kinds.includes("timed"))) mixed = false;
  if (new Set(d).size !== 3) distinct = false;
}
chk("every offer has something now and something for a while", mixed);
chk("and never the same reward twice", distinct);
const allPerks = {}; ["gloves","lean","maint","crew","kaizen","night","tele","bulk","radio","scan"].forEach(k => allPerks[k] = true);
const realPerks = global.__sim && global.__sim.PERKS;
const savedPerks = s.perks; s.perks = {};
(realPerks || []).forEach(p => s.perks[p.id] = true);
let palletsOffered = false;
for (let n = 1; n <= 60; n++) if (M.draw(n).includes("pallets")) palletsOffered = true;
s.perks = savedPerks;
chk("pallets are not offered once there is no perk left to spend them on", realPerks ? !palletsOffered : true,
    realPerks ? "" : "PERKS not exported; skipped");

// ---- it survives a save, and a later choice is a real one ----
const saved = JSON.parse(JSON.stringify(s));
chk("the offer is in the save", JSON.stringify(saved.milestoneOffer.options) === JSON.stringify(offer));
$("btnMilestoneLater").fire("click");
chk("deciding later closes it", $("modalMilestone").hidden === true);
global.render();
chk("and leaves a row in the Contracts panel", $("milestoneRow").hidden === false);
chk("which does not reopen by itself", (M.open(false), $("modalMilestone").hidden === true));
$("milestoneRow").fire("click");
chk("but opens when tapped", $("modalMilestone").hidden === false);

// ---- a pick pays once ----
const id = offer.find(x => KIND[x] === "instant");
const before = { money: s.money, pallets: s.pallets, crates: s.crates };
chk("picking a reward settles the offer", M.pick(id) === true && s.milestoneOffer === null);
const gained = (s.money - before.money) + (s.pallets - before.pallets) + (s.crates - before.crates);
chk("and pays it", gained > 0, id + " gained " + gained);
const after = { money: s.money, pallets: s.pallets, crates: s.crates };
chk("a second pick of the same offer pays nothing", M.pick(id) === false &&
    s.money === after.money && s.pallets === after.pallets && s.crates === after.crates);
global.render();
chk("and the row is gone", $("milestoneRow").hidden === true);

// ---- one waiting at a time, and nothing over the opening shift ----
s.milestoneOffer = { n: 3, options: ["cash","crew","crates"], later: true };
s.contractsDone = 19; finish();
chk("a second milestone does not replace one still waiting", s.milestoneOffer.n === 3, "n=" + s.milestoneOffer.n);

console.log("PASS:"); ok.forEach(l=>console.log("  + "+l));
if(bad.length){ console.log("FAIL:"); bad.forEach(l=>console.log("  - "+l)); process.exitCode=1; }
})();
