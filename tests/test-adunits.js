const P = require("./paths.js");
require("./harness.js");
const fs = require("fs");

const prepared = [];
let mode = "reward";
global.Capacitor = { Plugins: {
  Preferences: { get:()=>Promise.resolve({value:null}), set:()=>Promise.resolve(), remove:()=>Promise.resolve() },
  AdMob: {
    initialize: ()=>Promise.resolve(),
    prepareRewardVideoAd: (o)=>{ prepared.push(o.adId); return Promise.resolve(); },
    showRewardVideoAd: ()=>Promise.resolve(mode==="reward" ? {type:"Boost",amount:1} : null)
  }
}};
require("./game.js");

const s = global.state;
const ok=[], bad=[], skipped=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));
const $ = (id)=>document.getElementById(id);
const tick = async (n=8) => { for(let i=0;i<n;i++) await new Promise(r=>process.nextTick(r)); };

const HTML = fs.readFileSync(P.HTML,"utf8");
const UNITS = {};
HTML.match(/var AD_UNITS = \{[\s\S]*?\};/)[0]
  .split("\n").slice(1,-1)
  .forEach(l=>{ const m=/(\w+):\s*"([^"]*)"/.exec(l); if(m) UNITS[m[1]]=m[2]; });

(async () => {
await tick(10);

// ---- config integrity ----
const PLACEHOLDER = /^ca-app-pub-0+\//;
const keys = Object.keys(UNITS);
chk("all six placements have an ad unit", keys.length === 6 && keys.every(k=>UNITS[k]),
    keys.join(", "));
chk("every id is well formed", keys.every(k=>/^ca-app-pub-\d{16}\/\d{10}$/.test(UNITS[k])));
const ids = keys.map(k=>UNITS[k]);
chk("no id is reused across placements", new Set(ids).size === 6,
    new Set(ids).size + " distinct of " + ids.length);
// app-ads.txt lives in the Pages repo, so this one assertion needs both checkouts. It
// reports as skipped rather than passing silently when only this repo is present --
// a cross-repo check that quietly disappears is worse than one that says it is missing.
if (P.hasAppAds()){
  const pub = fs.readFileSync(P.APP_ADS,"utf8").match(/pub-(\d+)/)[1];
  chk("all ids belong to the publisher in app-ads.txt",
      keys.every(k=>UNITS[k].indexOf("ca-app-pub-"+pub+"/")===0), "pub-"+pub);
} else {
  skipped.push("all ids belong to the publisher in app-ads.txt (app-ads.txt not checked out; set WE_APP_ADS)");
}

// Every unit is now real. This is the assertion the placeholder check was standing in
// for -- a placeholder parses as a valid id and fails silently at runtime, so the
// placement would look wired and earn nothing.
chk("no placement is left on a placeholder id",
    keys.every(k => !PLACEHOLDER.test(UNITS[k])),
    keys.filter(k => PLACEHOLDER.test(UNITS[k])).join(", ") || "none");
chk("the release workflow still refuses to ship a placeholder",
    /ca-app-pub-0\+\//.test(fs.readFileSync(
      P.WORKFLOW,"utf8")));

// ---- each placement must request ITS OWN unit ----
let clock = Date.now(); Date.now = () => clock;
async function fire(btnId, resetFn){
  prepared.length = 0;
  if (resetFn) resetFn();
  clock += 400000;                       // clear any cooldown
  global.render();
  $(btnId).fire("click");
  await tick();
  return prepared[0];
}

s.owned = {picker:100, trolley:50};
chk("Overtime Shift -> its own unit", await fire("rushAdBtn") === UNITS.rush, UNITS.rush);
chk("Double Payout -> its own unit",
    await fire("dblAdBtn", ()=>{ global.state.__x=0; }) === UNITS.tap, UNITS.tap);
chk("Reroll contract -> its own unit",
    await fire("rerollBtn", ()=>{ s.contract = null; }) === UNITS.reroll, UNITS.reroll);
chk("Call in a favour -> its own unit",
    await fire("repAdBtn", ()=>{ s.lifetime = 5e9; s.rep = 0; }) === UNITS.favour, UNITS.favour);
global.__clickTab("pallets");
chk("Crate Shipment -> its own unit",
    await fire("crateAdBtn", ()=>{ s.crateAdsToday = 0; s.crateAdDay = -1; }) === UNITS.crate, UNITS.crate);

console.log("PASS:"); ok.forEach(l=>console.log("  + "+l));
if(skipped.length){ console.log("SKIPPED:"); skipped.forEach(l=>console.log("  ~ "+l)); }
if(bad.length){ console.log("FAIL:"); bad.forEach(l=>console.log("  - "+l)); process.exitCode=1; }
})();
