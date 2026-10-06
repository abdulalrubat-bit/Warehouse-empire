// The department strip and field guides brought over from the autonomous prototype. The
// strip is a grouping of the fleet, so what matters is that it adds up -- every tier in
// exactly one department, the shares summing to the whole -- and that it says something
// useful about a department with nothing in it.
require("./harness.js");
const cvEl = document.getElementById("wcanvas"); cvEl._cw = 400; cvEl._ch = 300;
require("./game-sim.js");

const s = global.state, D = global.window.__depts, S = global.__sim;
const ok=[], bad=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));
const tick = () => new Promise(r=>process.nextTick(r));
const settle = async () => { for (let i=0;i<20;i++) await tick(); };
const $ = id => document.getElementById(id);

(async () => {
await settle();
s.lastTruck = { version: 1, status: "complete", reportSeen: true };

// ---- every tier belongs to exactly one department ---------------------------------------
const placed = D.DEPTS.reduce((a, d) => a.concat(d.gens), []);
chk("every fleet tier is in a department", S.GENS.every(g => placed.includes(g.id)),
    S.GENS.filter(g => !placed.includes(g.id)).map(g => g.id).join(","));
chk("and in only one", placed.length === new Set(placed).size && placed.length === S.GENS.length);
chk("numbered 1 to 4 in the order freight moves", D.DEPTS.map(d => d.n + d.name).join(",") === "1Receiving,2Storage,3Packing,4Dispatch");

// ---- the numbers add up -------------------------------------------------------------------
s.owned = { picker: 40, trolley: 20, forklift: 12, reach: 6, conveyor: 2 };
const st = D.stats();
chk("units are counted per department", st.map(x => x.units).join(",") === "60,18,2,0", st.map(x => x.units).join(","));
const shares = st.reduce((a, x) => a + x.share, 0);
chk("the shares make up the whole", Math.abs(shares - 1) < 1e-9, shares);
const rates = st.reduce((a, x) => a + x.rate, 0);
chk("and the rates add up to the site's rate", Math.abs(rates - S.totalRate()) < 1e-6 * Math.max(1, S.totalRate()),
    rates + " vs " + S.totalRate());

// ---- the strip --------------------------------------------------------------------------------
D.render(); await settle();
const html = $("deptStrip").innerHTML;
chk("the strip shows all four", (html.match(/class="dept/g) || []).length === 4);
chk("an empty department says so rather than showing a zero rate", /Not staffed/.test(html) && !/\$0\/s/.test(html), html.slice(-260));
chk("the department earning most is marked", (html.match(/ top"/g) || []).length === 1);
s.lastTruck = { version: 1, status: "active" }; D.render(); await settle();
chk("the strip waits while the opening shift is running", $("deptStrip").hidden === true);
s.lastTruck = { version: 1, status: "complete", reportSeen: true };

// ---- field guides -----------------------------------------------------------------------------
for (const key of ["floor", "equip", "upgrades", "pallets", "office"]){
  $("modalHelp").hidden = true;
  D.help(key);
  chk("the " + key + " guide opens with a title and three points",
      $("modalHelp").hidden === false && $("helpTitle").textContent.length > 0 && ($("helpItems").innerHTML.match(/help-item/g) || []).length === 3);
}

console.log("PASS:"); ok.forEach(x=>console.log("  + " + x));
if (bad.length){ console.log("FAIL:"); bad.forEach(x=>console.log("  - " + x)); }
console.log(`\n${ok.length} passed, ${bad.length} failed`);
process.exit(bad.length ? 1 : 0);
})();
