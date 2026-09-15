require("./harness.js");
// A save that is BOTH long-idle (offline earnings) and due a daily claim, so both
// modals compete on boot. They share a z-index, so the daily one used to open behind
// the offline one and become unreachable.
const DAY = 24*3600*1000;
global.localStorage.setItem("warehouse-empire-save", JSON.stringify({
  money: 5e5, total: 5e6, lifetime: 5e6, owned: {picker:80, trolley:40, forklift:10},
  lastSeen: Date.now() - 6*3600*1000,     // 6h offline
  lastDailyClaim: Date.now() - 3*DAY,     // daily due
  dailyStreak: 2, pallets: 10
}));
require("./game.js");
const s = global.state;
const ok=[], bad=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));
const $ = (id)=>document.getElementById(id);
const tick = () => new Promise(r=>process.nextTick(r));

(async () => {
for (let i=0;i<10;i++) await tick();

chk("offline modal opens after a long absence", $("modalOffline").hidden === false);
chk("daily modal is queued, not stacked behind the offline modal", $("modalDaily").hidden === true,
    "daily hidden=" + $("modalDaily").hidden);

const palletsBefore = s.pallets;
$("btnClaimOffline").fire("click");
chk("offline modal closes on claim", $("modalOffline").hidden === true);
chk("queued daily modal appears once the offline modal is dismissed", $("modalDaily").hidden === false,
    "daily hidden=" + $("modalDaily").hidden);

$("btnClaimDaily").fire("click");
chk("daily reward is claimable", s.pallets > palletsBefore, palletsBefore+" -> "+s.pallets+" pallets");
chk("daily modal closes after claiming", $("modalDaily").hidden === true);

console.log("PASS:"); ok.forEach(l=>console.log("  + "+l));
if(bad.length){ console.log("FAIL:"); bad.forEach(l=>console.log("  - "+l)); process.exitCode=1; }
})();
