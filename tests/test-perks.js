require("./harness.js");
require("./game.js");
const s = global.state;
// flowEfficiency() is a wall-clock sine, so freeze time to make every sample comparable.
const FROZEN = Date.now(); Date.now = () => FROZEN;
const ok=[], bad=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));

// Large fleet on purpose: fmt() truncates to 1 decimal below $1000, so small values
// quantize the measurement. In the K range fmt keeps 4 significant digits.
s.owned.picker=200; s.owned.trolley=200; s.owned.forklift=150;
s.owned.reach=120; s.owned.conveyor=80; s.perks={};

function num(str){ const m=/^\$?([\d.]+)([KMBT]|Qa|Qi)?$/.exec(str.trim()); if(!m) return NaN;
  return parseFloat(m[1]) * ({undefined:1,K:1e3,M:1e6,B:1e9,T:1e12,Qa:1e15,Qi:1e18}[m[2]]); }
function sample(){
  global.render();
  const net = num(document.getElementById("rate").textContent);
  const wt = document.getElementById("wageTag").innerHTML;
  const wm = /-\$?([\d.]+)([KMBT])?\/s/.exec(wt);
  const wage = wm ? parseFloat(wm[1])*({undefined:1,K:1e3,M:1e6,B:1e9,T:1e12}[wm[2]]) : 0;
  return { net, wage, gross: net+wage, tap: num(document.getElementById("tapval").textContent) };
}

// --- Lean Layout: "All output +10%" ---
const a = sample(); s.perks.lean = true; const b = sample();
chk("Lean Layout: gross output +10% exactly", Math.abs(b.gross/a.gross - 1.10) < 0.005,
    a.gross.toFixed(2)+" -> "+b.gross.toFixed(2)+" (x"+(b.gross/a.gross).toFixed(4)+")");
chk("Lean Layout: wage bill unchanged (gross-side multiplier)", Math.abs(b.wage-a.wage) < 0.01,
    "wages "+a.wage.toFixed(2)+" -> "+b.wage.toFixed(2));
chk("Lean Layout: net rate strictly increases", b.net > a.net, a.net+" -> "+b.net);
delete s.perks.lean;

// --- Padded Gloves: "Tap value +25%" ---
const c = sample(); s.perks.gloves = true; const d = sample();
chk("Padded Gloves: tap value +25% exactly", Math.abs(d.tap/c.tap - 1.25) < 0.005,
    c.tap+" -> "+d.tap+" (x"+(d.tap/c.tap).toFixed(4)+")");
chk("Padded Gloves: output rate untouched", d.net === c.net, c.net+" -> "+d.net);
delete s.perks.gloves;

// --- regression: the two perks that already worked ---
const e = sample(); s.perks.maint = true; const f = sample();
chk("Preventive Maintenance: wage bill cut 20%", Math.abs(f.wage/e.wage - 0.80) < 0.005,
    e.wage.toFixed(2)+" -> "+f.wage.toFixed(2)+" (x"+(f.wage/e.wage).toFixed(4)+")");
delete s.perks.maint;

// --- perks stack independently ---
const g = sample(); s.perks.lean = true; s.perks.gloves = true; const h = sample();
chk("Lean + Gloves stack (tap gets both, via passive term)", h.tap/g.tap > 1.25 && Math.abs(h.gross/g.gross-1.10) < 0.005,
    "tap x"+(h.tap/g.tap).toFixed(4)+", gross x"+(h.gross/g.gross).toFixed(4));

console.log("PASS:"); ok.forEach(l=>console.log("  + "+l));
if(bad.length){ console.log("FAIL:"); bad.forEach(l=>console.log("  - "+l)); process.exitCode=1; }
