require("./harness.js");
const prefs = {};
const prepared = [];
prefs["warehouse-empire-save"] = JSON.stringify({
  money:5e5, total:5e6, lifetime:5e6, owned:{picker:80, trolley:40, forklift:10},
  lastSeen: Date.now() - 6*3600*1000,          // 6h offline -> the Claim Double path
  lastDailyClaim: Date.now(), dailyStreak: 1
});
let mode = "reward";
global.Capacitor = { Plugins: {
  Preferences: {
    get:({key})=>Promise.resolve({value:(key in prefs)?prefs[key]:null}),
    set:({key,value})=>{ prefs[key]=value; return Promise.resolve(); },
    remove:({key})=>{ delete prefs[key]; return Promise.resolve(); }
  },
  AdMob: {
    initialize: ()=>Promise.resolve(),
    prepareRewardVideoAd: (o)=>{ prepared.push(o.adId);
      return mode==="fail" ? Promise.reject(new Error("no fill")) : Promise.resolve(); },
    showRewardVideoAd: ()=>Promise.resolve(mode==="reward" ? {type:"Boost",amount:1} : null)
  }
}};
require("./game.js");

const s = global.state;
const ok=[], bad=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));
const $ = (id)=>document.getElementById(id);
const tick = async (n=8) => { for(let i=0;i<n;i++) await new Promise(r=>process.nextTick(r)); };

(async () => {
await tick(12);
chk("offline modal opened after 6h away", $("modalOffline").hidden === false);

const before = s.money;
$("btnDoubleOffline").fire("click");
await tick();
chk("Claim Double -> its own unit",
    prepared[0] === "ca-app-pub-5195464450607116/3193699573", prepared[0]);
chk("reward doubles the offline earnings", s.money > before, "+" + Math.round(s.money-before));
chk("modal closes after claiming", $("modalOffline").hidden === true);
console.log("PASS:"); ok.forEach(l=>console.log("  + "+l));
if(bad.length){ console.log("FAIL:"); bad.forEach(l=>console.log("  - "+l)); process.exitCode=1; }
})();
