// A save that parses but is nonsense used to poison every later sum into NaN and paint
// the whole UI with it. These are the shapes a real broken save takes.
require("./harness.js");

const KEY = "warehouse-empire-save";
const POISON = process.env.POISON || "{}";
global.localStorage.setItem(KEY, POISON);

require("./game.js");
const s = global.state;
const ok=[], bad=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));
const $ = id => document.getElementById(id);
const tick = () => new Promise(r=>process.nextTick(r));

(async () => {
for (let i=0;i<12;i++) await tick();

const nums = ["money","total","lifetime","rep","taps","pallets","prestiges","contractsDone"];
nums.forEach(k => chk("state." + k + " is a usable number",
  typeof s[k] === "number" && isFinite(s[k]) && s[k] >= 0, k + "=" + s[k]));

Object.keys(s.owned).forEach(k => chk("owned." + k + " is a count",
  typeof s.owned[k] === "number" && isFinite(s.owned[k]) && s.owned[k] >= 0, k + "=" + s.owned[k]));

["hr","tower","solar","server"].forEach(k => chk("corp." + k + " is a level",
  typeof s.corp[k] === "number" && isFinite(s.corp[k]) && s.corp[k] >= 0, k + "=" + s.corp[k]));

// Run the game for a bit and make sure nothing reaches the screen as NaN.
const ticker = global.__intervals.find(i=>i.ms===100);
for (let i=0;i<20;i++) ticker.fn();
const screen = ["money","rateLine","palletCount"].map(id => { try { return $(id).textContent + " " + $(id).innerHTML; } catch(e){ return ""; } }).join(" ");
chk("nothing renders as NaN", !/NaN|undefined/.test(screen), screen.slice(0,120));

console.log("PASS:"); ok.forEach(l=>console.log("  + "+l));
if(bad.length){ console.log("FAIL:"); bad.forEach(l=>console.log("  - "+l)); process.exitCode=1; }
})();
