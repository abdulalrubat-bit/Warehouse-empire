require("./harness.js");

// Mock @capacitor-community/admob.
const calls = { init:[], prepare:[], show:0 };
let mode = "reward";            // reward | dismissed | nofill | prepareFail
global.Capacitor = { Plugins: {
  Preferences: { get:()=>Promise.resolve({value:null}), set:()=>Promise.resolve(), remove:()=>Promise.resolve() },
  AdMob: {
    initialize: (o)=>{ calls.init.push(o); return Promise.resolve(); },
    prepareRewardVideoAd: (o)=>{ calls.prepare.push(o);
      return mode==="prepareFail" ? Promise.reject(new Error("no fill")) : Promise.resolve(); },
    showRewardVideoAd: ()=>{ calls.show++;
      if (mode==="nofill")    return Promise.reject(new Error("no ad loaded"));
      if (mode==="dismissed") return Promise.resolve(null);
      return Promise.resolve({ type:"Boost", amount:1 }); }
  }
}};
require("./game.js");

const s = global.state;
const ok=[], bad=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));
const $ = (id)=>document.getElementById(id);
const tick = async (n=6) => { for(let i=0;i<n;i++) await new Promise(r=>process.nextTick(r)); };

(async () => {
await tick(10);

chk("AdMob initialized on boot", calls.init.length === 1, JSON.stringify(calls.init[0]));
chk("initializeForTesting reflects AD_TESTING", calls.init[0].initializeForTesting === false);

let clock = Date.now(); Date.now = () => clock;

// ---- happy path: reward earned ----
mode = "reward"; calls.prepare.length = 0; calls.show = 0;
$("rushAdBtn").fire("click"); await tick();
chk("Overtime Shift requests the real ad unit",
    calls.prepare[0] && calls.prepare[0].adId === "ca-app-pub-5195464450607116/7630718166",
    calls.prepare[0] && calls.prepare[0].adId);
chk("ad is shown after prepare resolves", calls.show === 1);
chk("reward granted: rush boost is live", $("boostTag").innerHTML.indexOf("RUSH") !== -1 ||
    (global.render(), $("boostTag").innerHTML.indexOf("RUSH") !== -1));
global.render();
chk("cooldown starts only after a successful reward", $("rushAdBtn").disabled === true);

// ---- dismissed early: no reward, no cooldown burned ----
clock += 200000; global.render();
mode = "dismissed"; calls.prepare.length = 0;
const boostBefore = $("boostTag").innerHTML;
$("rushAdBtn").fire("click"); await tick();
global.render();
chk("closing the ad early grants nothing", $("rushAdBtn").disabled === false,
    "button still available");
chk("early close is explained to the player", /no reward/i.test($("toast").innerHTML), $("toast").innerHTML);

// ---- no fill: reward withheld (airplane-mode farming would otherwise be free) ----
mode = "prepareFail"; calls.prepare.length = 0;
$("rushAdBtn").fire("click"); await tick();
global.render();
chk("a failed ad does NOT grant the reward", $("rushAdBtn").disabled === false);
chk("failure is explained to the player", /No ad available/i.test($("toast").innerHTML), $("toast").innerHTML);

// ---- every placement now has a real unit, so reroll goes through AdMob too ----
// (The no-plugin fallback is exercised by every other suite, which boots without AdMob.)
mode = "reward"; calls.prepare.length = 0;
s.pallets = 0; s.contract = null;
$("rerollBtn").fire("click"); await tick();
chk("Reroll goes through AdMob on its own unit",
    calls.prepare[0] && calls.prepare[0].adId === "ca-app-pub-5195464450607116/9540605756",
    calls.prepare[0] && calls.prepare[0].adId);
chk("Reroll still delivers its reward", s.contract && s.contract.prog > 0,
    s.contract ? "contract progress " + Math.round(s.contract.prog) : "no contract");

// ---- concurrent taps must not stack ad requests ----
clock += 200000; global.render();
mode = "reward"; calls.prepare.length = 0;
let resolveShow; 
global.Capacitor.Plugins.AdMob.showRewardVideoAd = () => new Promise(r=>{ resolveShow = ()=>r({type:"Boost"}); });
$("rushAdBtn").fire("click"); await tick(2);
$("rushAdBtn").fire("click"); await tick(2);
chk("a second tap while an ad is in flight is ignored", calls.prepare.length === 1,
    calls.prepare.length + " prepare calls");
resolveShow(); await tick();

console.log("PASS:"); ok.forEach(l=>console.log("  + "+l));
if(bad.length){ console.log("FAIL:"); bad.forEach(l=>console.log("  - "+l)); process.exitCode=1; }
})();
