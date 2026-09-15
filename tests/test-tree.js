const P = require("./paths.js");
// The Directorship and the Network. The single most important thing here is the first
// section: REP is what your multiplier is built on, so if spending it could lower your
// income the whole tree would be a trap and every existing save would quietly lose power.
require("./harness.js");
require("./game-sim.js");
const S = global.__sim;
const fs = require("fs");
const s = global.state;
const ok=[], bad=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));
const $ = id => document.getElementById(id);
// The Office panels are only rebuilt while that tab is the one on screen.
// A player only ever reaches the Office having completed a contract, so the fixture
// says so. Without it the gate added in this release bounces the tab back to Floor.
const office = () => { s.contractsDone = Math.max(1, s.contractsDone || 0);
                       global.__clickTab("office"); };
// The button's innerHTML is the string set when it was built; the price is written to a
// child node afterwards, so read that node rather than the parent's markup.
const priceOf = id => node(id).querySelector('[data-r="cost"]').textContent;
const HTML = fs.readFileSync(P.HTML,"utf8");
const has = (el, c) => String(el.className).split(/\s+/).indexOf(c) >= 0 || el.classList.contains(c);

// Read the table out of the source, so a retune moves one set of numbers, not two.
const TREE = (() => {
  const body = HTML.match(/var TREE = \[([\s\S]*?)\n  \];/)[1];
  return body.split("\n").map(l => l.trim()).filter(l => l.startsWith("{ br:")).map(l => ({
    br:    l.match(/br:"(\w+)"/)[1],
    id:    l.match(/id:"(\w+)"/)[1],
    name:  l.match(/name:"([^"]+)"/)[1],
    cost:  Number(l.match(/cost:(\d+)/)[1]),
    sales: l.match(/sales:(\d+)/) ? Number(l.match(/sales:(\d+)/)[1]) : 0,
    req:   l.match(/req:"(\w+)"/) ? l.match(/req:"(\w+)"/)[1] : undefined,
    dir:   /dir:true/.test(l)
  }));
})();

const reset = () => {
  s.lifetime = 0; s.money = 0; s.total = 0; s.rep = 0; s.repSpent = 0; s.prestiges = 0;
  s.tree = {}; s.network = []; s.perks = {}; s.upgrades = {}; s.ach = {}; s.themesOwned = {};
  s.corp = {hr:0,customs:0,marketing:0,tower:0,training:0,solar:0,depot:0,server:0};
  s.owned = {picker:80, trolley:40, forklift:20}; s.site = "general"; s.sku = "fmcg";
  s.incidentsCleared = 0; s.priorityDone = 0;
};
// fmt() writes "1.06K", not "1060". Stripping non-digits turns that into 1.06 and every
// ratio taken across a magnitude boundary comes out a thousand times too small.
const FMT_UNITS = ["K","M","B","T","Qa","Qi","Sx","Sp","Oc","No","Dc",
                   "UDc","DDc","TDc","QaDc","QiDc","SxDc","SpDc","OcDc","NoDc","Vg"];
const num = el => {
  const m = String(el.textContent).replace(/[^0-9.A-Za-z]/g, "").match(/^([0-9.]+)([A-Za-z]*)$/);
  if (!m) return NaN;
  const i = FMT_UNITS.indexOf(m[2]);
  return Number(m[1]) * (i < 0 ? 1 : Math.pow(1000, i + 1));
};
const rate = () => { global.render(); return num($("rate")); };
const tap  = () => { global.render(); return num($("tapval")); };
const node = id => $("treeList").children.find(b => new RegExp(TREE.find(n=>n.id===id).name).test(b.innerHTML));

// ------------------------------------------------ REP must never become a trap --------
{
  reset();
  const realNow = Date.now, frozen = realNow();
  Date.now = () => frozen;                       // the flow swing rides the wall clock

  chk("the tree has four branches", new Set(TREE.map(n=>n.br)).size === 4,
      [...new Set(TREE.map(n=>n.br))].join(","));
  chk("each ends in a Directorship", TREE.filter(n=>n.dir).length === 4,
      TREE.filter(n=>n.dir).map(n=>n.name).join(", "));

  s.rep = 5000;
  const before = rate();
  s.repSpent = 4000;
  chk("spending REP does not lower your rate", rate() === before,
      before + " -> " + rate());
  chk("because the multiplier reads total earned, not what is left",
      /function prestigeMult\(\)\{[^}]*state\.rep[^}]*\}/.test(HTML) &&
      !/function prestigeMult\(\)\{[^}]*repSpent/.test(HTML));
  chk("available REP is what is left", global.state.rep - global.state.repSpent === 1000);
  s.repSpent = 0;
  Date.now = realNow;
}

// -------------------------------------------------------- buying, and being stopped ---
{
  reset();
  s.rep = 100000; office();
  const first = TREE.find(n => !n.req);
  const second = TREE.find(n => n.req === first.id);

  node(second.id).fire("click");
  chk("a node behind an unowned prerequisite cannot be bought", !s.tree[second.id]);
  chk("and says what it needs", /Needs/.test($("toast").innerHTML), $("toast").innerHTML);

  node(first.id).fire("click");
  chk("the first node in a branch buys", !!s.tree[first.id]);
  chk("and is charged for", s.repSpent === first.cost, s.repSpent + " spent");
  node(second.id).fire("click");
  chk("which unlocks the one behind it", !!s.tree[second.id], s.repSpent + " spent");

  s.rep = first.cost;  s.repSpent = first.cost; s.tree = {}; s.tree[first.id] = true;
  office();
  node(second.id).fire("click");
  chk("a node you cannot afford is refused", !s.tree[second.id]);
  chk("and says the price", /REP/.test($("toast").innerHTML), $("toast").innerHTML);
}

// ------------------------------------------------------------ the Directorships ------
{
  reset();
  s.rep = 500000; office();
  const dirs = TREE.filter(n => n.dir);
  // Own everything ordinary so only the Directorship rule is under test.
  TREE.filter(n => !n.dir).forEach(n => { s.tree[n.id] = true; });
  s.repSpent = TREE.filter(n => !n.dir).reduce((a,n)=>a+n.cost, 0);
  s.prestiges = 0; office();

  chk("a Directorship short on sales says so, not LOCKED",
      /SALES/.test(priceOf(dirs[0].id)), priceOf(dirs[0].id));
  node(dirs[0].id).fire("click");
  chk("a Directorship is gated on sales, not just price", !s.tree[dirs[0].id]);
  chk("and says how many are needed", /sales/.test($("toast").innerHTML), $("toast").innerHTML);

  s.prestiges = 10; office();
  node(dirs[0].id).fire("click");
  chk("it opens once the sales are there", !!s.tree[dirs[0].id], dirs[0].name);
  const spentAfterFirst = s.repSpent;

  node(dirs[1].id).fire("click");
  chk("taking another swaps rather than stacking",
      !!s.tree[dirs[1].id] && !s.tree[dirs[0].id],
      Object.keys(s.tree).filter(k => dirs.some(d=>d.id===k)).join(","));
  chk("and the one you dropped is refunded in full", s.repSpent === spentAfterFirst,
      spentAfterFirst + " -> " + s.repSpent);
  chk("the swap is explained", /reshuffle/i.test($("toast").innerHTML), $("toast").innerHTML);
  chk("exactly one is ever held",
      TREE.filter(n => n.dir && s.tree[n.id]).length === 1);

  // The label has to name the wall you are actually against: one behind an unfinished
  // branch read "10 SALES" to a player who already had fourteen.
  s.tree = {}; s.repSpent = 0; s.prestiges = 50; office();
  chk("a Directorship behind an unfinished branch reads LOCKED, not a sales count",
      priceOf(dirs[0].id) === "LOCKED", priceOf(dirs[0].id));
}

// -------------------------------------------------------------- what the nodes do ----
{
  const realNow = Date.now, frozen = realNow();
  Date.now = () => frozen;
  // No rep: networkRate has a floor of rep * 2.5, and any meaningful rep swamps the
  // thing under test. These set nodes directly, so none is needed.
  const withNodes = (ids, fn) => { reset(); s.rep = 0; global.render(); const a = fn();
    ids.forEach(i => s.tree[i] = true); global.invalidateUpMult ? global.invalidateUpMult() : null;
    global.render(); return [a, fn()]; };

  let [a, b] = withNodes(["bulk"], rate);
  chk("Bulk Handling lifts output at least its 12%", b/a > 1.12 && b/a < 1.20, "x" + (b/a).toFixed(3));
  [a, b] = withNodes(["bulk","deep","shift","magnate"], rate);
  // The panel shows output net of wages, and the tree does not touch the wage bill, so
  // the figure on screen rises by more than the 3.44x the nodes multiply gross by.
  const gross = 1.12 * 1.18 * 1.30 * 2;
  chk("the throughput branch compounds past its 3.4x on gross",
      b/a > gross && b/a < gross * 1.4, "x" + (b/a).toFixed(2) + " net for x" + gross.toFixed(2) + " gross");
  [a, b] = withNodes(["scan"], tap);
  chk("Auto-Scan lifts hand picks 50%", Math.abs(b/a - 1.5) < 0.02, "x" + (b/a).toFixed(3));

  Date.now = realNow;

  reset(); s.rep = 1e9;
  chk("Continuous Ops adds twelve hours of offline",
      /\+ \(hasNode\("contops"\) \? 12 : 0\)/.test(HTML));
  chk("Lean Capital slows fleet inflation",
      /hasNode\("lean"\) \? 0\.01 : 0/.test(HTML));
  chk("Broker Desk lifts contract pay",
      /hasNode\("broker"\) \? 1\.25 : 1/.test(HTML));
  chk("Market Read stretches good markets",
      /hasNode\("read"\) \? 1\.5 : 1/.test(HTML));
  chk("Preferred Client lifts priority loads and adds a crate",
      /hasNode\("pref"\) \? 1\.6 : 1/.test(HTML) && /hasNode\("pref"\) \? 1 : 0/.test(HTML));
  chk("Combo Memory doubles the combo window",
      /hasNode\("memory"\) \? 2 : 1/.test(HTML));
  chk("Yard Automation doubles incident pay",
      /hasNode\("yard"\) \? 2 : 1/.test(HTML));
  chk("Executive Team strengthens managers",
      /if \(hasNode\("exec"\)\) bonus \*= 1\.5;/.test(HTML));
  chk("Property Mogul cuts corporate prices",
      /if \(hasNode\("mogul"\)\) return Math\.ceil\(corpCostBase\(cb, lvl\) \/ 3\);/.test(HTML));
  chk("Flow Control halves the manifest changeover",
      /hasNode\("flow"\) \? CHANGEOVER_MS \/ 2 : CHANGEOVER_MS/.test(HTML));
  chk("Working Float is measured before the fleet is cleared",
      /var floatCash = hasNode\("float"\)[\s\S]{0,200}state\.money = floatCash/.test(HTML));
  chk("Full Automation picks through the same path a finger does",
      /if \(hasNode\("singular"\)\)[\s\S]{0,140}doPick\(\)/.test(HTML));
}

// ------------------------------------------------------------------ the Network ------
{
  reset();
  const mk = (id, peak, inv) => ({ id: id, peak: peak, suburb: "T" + Math.random(), inv: inv || 0 });
  s.network = [mk("general", 1e5), mk("general", 1e5), mk("cold", 1e5)];
  office();
  const rows = () => $("netList").children;
  chk("every retired site gets a row", rows().length === 3, rows().length + " rows");
  chk("named by suburb, with the type beneath",
      /<b>T0\./.test(rows()[0].innerHTML) && /Distribution Centre|Cold Store/.test(rows()[0].innerHTML),
      rows()[0].innerHTML.slice(0, 90));

  // Set bonuses.
  const sum = () => { const c = S.netTypeCounts();
    return s.network.reduce((a,e)=>a + S.netSiteRate(e, c), 0); };
  s.network = [mk("general", 1e5), mk("general", 1e5)];
  const rate2 = sum();
  s.network.push(mk("general", 1e5));
  const rate3 = sum();
  chk("three of a kind pays a set bonus", rate3 > rate2 * 1.5 * 1.05,
      "2 sites " + Math.round(rate2) + "/s -> 3 sites " + Math.round(rate3) + "/s");
  chk("and six pays a bigger one", /n >= 6 \? 1\.25 : \(n >= 3 \? 1\.10 : 1\)/.test(HTML));

  // Investing.
  reset();
  s.network = [mk("general", 1e5)];
  s.money = 1e12; office();
  const before = S.netSiteRate(s.network[0], S.netTypeCounts());
  rows()[0].querySelector("button").fire("click");
  const after = S.netSiteRate(s.network[0], S.netTypeCounts());
  chk("investing raises that site's output", s.network[0].inv === 1 && after > before,
      Math.round(before) + "/s -> " + Math.round(after) + "/s");
  chk("and costs cash", s.money < 1e12, "spent " + Math.round(1e12 - s.money));
  chk("it caps out", /NET_INVEST_MAX = 5/.test(HTML));
  s.money = 0; office();
  const invWas = s.network[0].inv;
  rows()[0].querySelector("button").fire("click");
  chk("and is refused with no cash", s.network[0].inv === invWas);

  // The cap, and what lifts it.
  chk("the Network is capped as a share of the site you are running",
      /var cap = hasNode\("tycoon"\) \? Infinity : activeRate\(\) \* 0\.40;/.test(HTML));
  chk("Logistics Tycoon doubles retired sites as well as uncapping them",
      /hasNode\("tycoon"\) \? 2 : 1/.test(HTML));
  chk("Wide Network raises how many you can hold",
      /function netCap\(\)\{ return hasNode\("wide"\) \? 40 : NETWORK_CAP; \}/.test(HTML));
}

// -------------------------------------------------------------- saves ----------------
{
  reset();
  s.rep = 900; s.repSpent = 250; s.tree = { bulk:true, broker:true };
  s.network = [{ id:"cold", peak: 5e4, suburb:"Altona", inv:2 }];
  const back = JSON.parse(JSON.stringify(s));
  chk("the tree and the spend persist",
      back.repSpent === 250 && back.tree.bulk && back.tree.broker, JSON.stringify(back.tree));
  chk("so do a site's name and its tier",
      back.network[0].suburb === "Altona" && back.network[0].inv === 2);
  chk("a save claiming more spent than earned is repaired, not trusted",
      /if \(state\.repSpent > state\.rep\) state\.repSpent = state\.rep;/.test(HTML));
  chk("a retired site from before this update is given a name and a tier",
      /if \(typeof e\.suburb !== "string" \|\| !e\.suburb\) e\.suburb = netName\(e\.id\);/.test(HTML) &&
      /e\.inv = \(isFinite\(inv\) && inv >= 0\) \? Math\.min\(NET_INVEST_MAX, inv\) : 0;/.test(HTML));
  chk("and one whose site type no longer exists is not left dangling",
      /if \(!NET_SUFFIX\[e\.id\]\) e\.id = "general";/.test(HTML));
}

ok.forEach(x=>console.log("  + " + x));
bad.forEach(x=>console.log("  - " + x));
console.log(`\n${ok.length} passed, ${bad.length} failed`);
process.exit(bad.length ? 1 : 0);
