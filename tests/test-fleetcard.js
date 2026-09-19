// The Fleet card. Its job is to answer one question -- is this purchase worth the money --
// and it did not carry the number that answers it.
//
// A Sorting Robot you do not own reads "$0/s" in the largest type on the card, next to a
// price of $1.34M. That is true and useless: it describes the past, and the player is being
// asked about the future. The card now leads with what the button in front of them would
// actually add, and "$0/s" is dropped where it would say nothing.
require("./harness.js");
const cvEl = document.getElementById("wcanvas"); cvEl._cw = 400; cvEl._ch = 300;
require("./game-sim.js");
const S = global.__sim;
const s = global.state;
const ok=[], bad=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));
const tick = async (n=12) => { for(let i=0;i<n;i++) await new Promise(r=>process.nextTick(r)); };

const card = id => document.getElementById("gens").children[S.GENS.findIndex(g => g.id === id)];
const part = (id, r) => card(id).querySelector('[data-r="' + r + '"]');
// The stub keeps innerHTML as a string, so a row written as markup reads back there.
const gainOf = id => String(part(id, "gain").innerHTML || part(id, "gain").textContent || "").replace(/<[^>]*>/g, "");

(async () => {
await tick();

// A site with a real fleet, so the owned and unowned cases are both on screen at once.
s.owned = { picker:200, trolley:120, forklift:60, reach:20, conveyor:7, sorter:0, crane:0, hub:0 };
s.money = 1e12; s.total = 1e12; s.lifetime = 5e10; s.upgrades = {}; s.perks = {}; s.tree = {};
s.corp = { hr:0, customs:0, marketing:0, tower:0, training:0, solar:0, depot:0, server:0 };
S.invalidateUpMult();
global.__clickTab("equip");
await tick();

// ---- the number the decision needs ---------------------------------------------------
const sorterGain = gainOf("sorter");
chk("an unowned generator says what buying one would add",
    /\+\$[\d.]+[A-Za-z]*\/s/.test(sorterGain) && !/\+\$0\/s/.test(sorterGain), sorterGain);
chk("and drops the $0/s line that was saying nothing",
    part("sorter", "prodrow").hidden === true, "hidden=" + part("sorter","prodrow").hidden);
chk("an owned generator still leads with what it earns now",
    part("conveyor", "prodrow").hidden === false && part("conveyor","prod").textContent !== "$0",
    part("conveyor","prod").textContent + "/s");
chk("and carries the gain as well", /\+\$/.test(gainOf("conveyor")), gainOf("conveyor"));

// ---- and it has to be true --------------------------------------------------------------
// The claim is testable against the thing it predicts, so test it there rather than trusting
// the formula: buy, and see whether the site's rate moved by what the card promised.
function checkPromise(id, qty){
  const g = S.GENS.filter(x => x.id === id)[0];
  const before = S.grossRate() - S.wageBill();
  const promised = S.marginalRate(g, qty);
  s.owned[id] = (s.owned[id] || 0) + qty;
  S.invalidateUpMult();
  const after = S.grossRate() - S.wageBill();
  const actual = after - before;
  s.owned[id] -= qty; S.invalidateUpMult();
  return { promised, actual, off: Math.abs(promised - actual) / Math.max(1, actual) };
}
for (const [id, qty] of [["sorter",1], ["conveyor",1], ["conveyor",10], ["forklift",25]]){
  const r = checkPromise(id, qty);
  chk(`the promised gain is what actually happens (${id} ×${qty})`, r.off < 0.001,
      `promised ${r.promised.toFixed(2)}, got ${r.actual.toFixed(2)}`);
}

// ---- the milestone steps ------------------------------------------------------------------
// multFor() doubles at 25, 50 and 100, so a flat qty x rate would misprice exactly the
// purchases a player is most likely to be weighing up.
{ const g = S.GENS.filter(x => x.id === "sorter")[0];
  s.owned.sorter = 24; S.invalidateUpMult();
  const atMilestone = S.marginalRate(g, 1);
  s.owned.sorter = 10; S.invalidateUpMult();
  const ordinary = S.marginalRate(g, 1);
  s.owned.sorter = 0; S.invalidateUpMult();
  chk("the unit that crosses a milestone is priced higher than an ordinary one",
      atMilestone > ordinary * 2, atMilestone.toFixed(1) + " vs " + ordinary.toFixed(1));
}

// ---- it follows the quantity selector --------------------------------------------------------
{ const one = gainOf("sorter");
  const btn = document.getElementById("q10");
  if (btn){ btn.fire("click"); await tick(); }
  const ten = gainOf("sorter");
  chk("the gain follows the quantity selector", btn && one !== ten && /×10/.test(ten),
      one + "  ->  " + ten);
}

console.log("PASS:"); ok.forEach(x=>console.log("  + " + x));
if (bad.length){ console.log("FAIL:"); bad.forEach(x=>console.log("  - " + x)); }
console.log(`\n${ok.length} passed, ${bad.length} failed`);
process.exit(bad.length ? 1 : 0);
})();
