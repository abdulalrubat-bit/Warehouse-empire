// The 100ms ticker is the one function in the game that must never throw. It banks income,
// advances the contract and calls render(), it runs inside setInterval with no catch, and
// a throw does not stop the interval -- it just skips the rest of every tick, forever.
//
// This suite exists because that happened. `autoPickCarry` was used and never declared,
// three statements ahead of the line that banks income, behind `hasNode("singular")`.
// Buying Full Automation -- 6000 REP and ten sales, so only the most invested players ever
// saw it -- stopped a save earning, stopped its contracts and stopped it rendering, on that
// tick and on every launch afterwards. Nothing in the suite owned a tree node while the
// ticker ran, so nothing caught it.
//
// The general assertion is therefore the important one: the ticker survives a tick with
// EVERY tree node owned. The named cases below only exist so a failure says which node.
require("./harness.js");
require("./game-sim.js");
const S = global.__sim;
const s = global.state;
const ok=[], bad=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));

// The ticker is the only 100ms interval the game installs.
const ticks = global.__intervals.filter(i => i.ms === 100);
chk("the game installs exactly one 100ms ticker", ticks.length === 1, ticks.length + " found");
const tick = ticks.length ? ticks[0].fn : function(){};

// A site that earns, so "did it bank anything" is a real question.
function seed(tree){
  s.owned = { picker:40, trolley:20, forklift:10, reach:4, conveyor:2, sorter:1, crane:0, hub:0 };
  s.money = 0; s.total = 0; s.lifetime = 5e6; s.taps = 0;
  s.rep = 0; s.prestiges = 0; s.network = [];
  s.tree = tree || {};
  S.invalidateUpMult();
}
// setInterval fires on wall-clock time, and the ticker derives dt from Date.now().
const realNow = Date.now;
let clock = realNow();
Date.now = () => clock;
function run(ms){
  const n = Math.round(ms / 100);
  for (let i = 0; i < n; i++){ clock += 100; tick(); }
}
function threw(fn){ try { fn(); return null; } catch(e){ return e.message; } }

// ---- every node, at once -------------------------------------------------------------
{ const all = {};
  S.TREE.forEach(n => { all[n.id] = true; });
  seed(all);
  clock += 100;                       // absorb the gap since the last Date.now the game saw
  const err = threw(() => run(1000));
  chk("the ticker survives a tick with every tree node owned", err === null, err || "clean");
  chk("and still banks income with every node owned", s.money > 0, "$" + s.money);
}

// ---- each node on its own, so a failure names it --------------------------------------
{ const broken = [];
  S.TREE.forEach(node => {
    const t = {}; t[node.id] = true;
    seed(t);
    clock += 100;
    const err = threw(() => run(300));
    if (err) broken.push(node.id + ": " + err);
    else if (!(s.money > 0)) broken.push(node.id + ": banked nothing");
  });
  chk("no single tree node breaks the ticker", broken.length === 0,
      broken.length ? broken.join(" | ") : S.TREE.length + " nodes clean");
}

// ---- Full Automation does what it says -------------------------------------------------
// Not just "does not throw": the node's whole promise is two picks a second, and a fix that
// declared the variable but left it unused would pass a throw-only test.
{ seed({ singular: true });
  clock += 100;
  run(3000);
  chk("Full Automation picks twice a second", s.taps >= 5 && s.taps <= 7, s.taps + " picks in 3s");
}
{ seed({});
  clock += 100;
  run(3000);
  chk("and nothing picks itself without it", s.taps === 0, s.taps + " picks");
}

Date.now = realNow;
console.log("PASS:"); ok.forEach(x=>console.log("  + " + x));
if (bad.length){ console.log("FAIL:"); bad.forEach(x=>console.log("  - " + x)); }
console.log(`\n${ok.length} passed, ${bad.length} failed`);
process.exit(bad.length ? 1 : 0);
