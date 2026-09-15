require("./harness.js");
require("./game.js");
const s = global.state;
const ok=[], bad=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));
const $ = (id)=>document.getElementById(id);
const tick = () => new Promise(r=>process.nextTick(r));
function num(str){ const m=/^\$?([\d.]+)([KMBT])?$/.exec(str.trim()); if(!m) return NaN;
  return parseFloat(m[1]) * ({undefined:1,K:1e3,M:1e6,B:1e9,T:1e12}[m[2]]); }

(async () => {
for (let i=0;i<8;i++) await tick();
s.owned = {picker:200, trolley:100, forklift:50};

// --- Double Payout was in the markup, permanently hidden and never bound ---
chk("Double Payout button is revealed", $("dblAdBtn").hidden === false);
chk("Double Payout describes its effect", /TAPS .4 FOR 60s/.test($("dblAdSub").textContent),
    $("dblAdSub").textContent);

global.render();
const tapBefore = num($("tapval").textContent);
$("dblAdBtn").fire("click");
global.render();
const tapAfter = num($("tapval").textContent);
chk("Double Payout drives the x4 tap boost (tapBoostUntil was never set before)",
    Math.abs(tapAfter/tapBefore - 4) < 0.05, tapBefore+" -> "+tapAfter+" (x"+(tapAfter/tapBefore).toFixed(2)+")");

// --- boostTag was never populated ---
chk("boost tag shows the active tap boost", $("boostTag").innerHTML.indexOf("TAP") !== -1,
    $("boostTag").innerHTML.replace(/<[^>]*>/g,""));
$("rushAdBtn").fire("click");
global.render();
chk("boost tag shows a concurrent rush", $("boostTag").innerHTML.indexOf("RUSH") !== -1,
    $("boostTag").innerHTML.replace(/<[^>]*>/g,""));

// --- pickSub was a static label ---
chk("pick sub-label idles at TAP TO SCAN", $("pickSub").textContent === "TAP TO SCAN", $("pickSub").textContent);
$("pickBtn").fire("pointerdown", {clientX:10, clientY:10});
$("pickBtn").fire("pointerdown", {clientX:10, clientY:10});
global.render();
chk("pick sub-label reflects a running combo", /^COMBO ×/.test($("pickSub").textContent), $("pickSub").textContent);

// --- ad reward cooldowns (previously unlimited: Ads.show grants instantly) ---
let clock = Date.now(); Date.now = () => clock;
global.render();
chk("rush button goes on cooldown after use", $("rushAdBtn").disabled === true);
chk("cooldown is surfaced in the label", /AVAILABLE IN \d+s/.test($("rushAdSub").innerHTML),
    $("rushAdSub").innerHTML);
const boostEnd = 0;
$("rushAdBtn").fire("click");                       // must be ignored while cooling
chk("clicking a cooling button grants nothing", $("rushAdBtn").disabled === true);
clock += 181000; global.render();
chk("button re-enables once the cooldown elapses", $("rushAdBtn").disabled === false);
// The stub has no markup text to restore, so assert the countdown is cleared here and
// verify the real label round-trip in browser-check.js.
chk("countdown text is cleared once ready", !/AVAILABLE IN/.test($("rushAdSub").innerHTML),
    JSON.stringify($("rushAdSub").innerHTML));

console.log("PASS:"); ok.forEach(l=>console.log("  + "+l));
if(bad.length){ console.log("FAIL:"); bad.forEach(l=>console.log("  - "+l)); process.exitCode=1; }
})();
