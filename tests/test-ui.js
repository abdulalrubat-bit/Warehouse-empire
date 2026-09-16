const P = require("./paths.js");
require("./harness.js");
require("./game.js");
const s = global.state;
const ok=[], bad=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));
const $ = (id)=>document.getElementById(id);
const tick = () => new Promise(r=>process.nextTick(r));

(async () => {
for (let i=0;i<8;i++) await tick();

// --- RENAME COMPANY (button previously had no handler at all) ---
chk("companyName populated from state on boot", $("companyName").textContent === s.company,
    JSON.stringify($("companyName").textContent));
$("renameBtn").fire("click");
chk("rename modal opens, prefilled", $("modalRename").hidden === false && $("renameInput").value === s.company);
$("renameInput").value = "  Dockside Freight Co  ";
$("btnConfirmRename").fire("click");
chk("rename trims and applies", s.company === "Dockside Freight Co", JSON.stringify(s.company));
chk("rename updates the label", $("companyName").textContent === "Dockside Freight Co");
chk("rename modal closes", $("modalRename").hidden === true);

$("renameBtn").fire("click"); $("renameInput").value = "   ";
$("btnConfirmRename").fire("click");
chk("blank rename rejected, name unchanged", s.company === "Dockside Freight Co" && $("modalRename").hidden === false);
$("btnCancelRename").fire("click");

$("renameBtn").fire("click"); $("renameInput").value = "x".repeat(60);
$("btnConfirmRename").fire("click");
chk("rename capped at 28 chars", s.company.length === 28, "len="+s.company.length);

$("renameBtn").fire("click"); $("renameInput").value = '<img src=x onerror=alert(1)>';
$("btnConfirmRename").fire("click");
chk("rename does not inject markup into the label",
    $("companyName").innerHTML === "" && $("companyName").textContent.indexOf("<img") === 0,
    "textContent set, innerHTML empty");
chk("rename toast escapes markup", $("toast").innerHTML.indexOf("&lt;img") !== -1,
    $("toast").innerHTML.slice(0,60));

// --- SFX MUTE (button previously had no handler; state.muted never written) ---
s.muted = false; global.render();
$("muteBtn").fire("click");
chk("mute toggles state.muted", s.muted === true);
chk("mute button label reflects state", $("muteBtn").textContent === "SFX OFF", $("muteBtn").textContent);
$("muteBtn").fire("click");
chk("unmute toggles back", s.muted === false && $("muteBtn").textContent === "SFX ON");

// --- NETWORK PANEL (markup existed but stayed hidden forever) ---
s.network = []; global.render();
chk("network panel hidden with no retired sites", $("netBar").hidden === true);
s.network = [{id:"general", peak: 500}, {id:"cold", peak: 900}];
s.rep = 40; global.render();
chk("network panel shows once sites are retired", $("netBar").hidden === false);
chk("network panel reports the site count", $("netSummary").innerHTML.indexOf("2 retired sites") === 0,
    $("netSummary").innerHTML.slice(0,40));
s.network = [{id:"general", peak: 500}]; global.render();
chk("network panel singularises one site", $("netSummary").innerHTML.indexOf("1 retired site") === 0,
    $("netSummary").innerHTML.slice(0,30));

// --- SCALE STRIP (never updated; denominators were hardcoded and wrong) ---
s.owned = {picker:5, trolley:2, forklift:1}; s.lifetime = 3e6; global.render();
chk("scale strip counts distinct equipment types", $("scGen").innerHTML === "3<i>/8</i>", $("scGen").innerHTML);
// Read the ladder length out of the source rather than hardcoding it: this assertion
// exists because the denominator was once /10 against a 6-entry table, and pinning a
// second literal here would just recreate that.
const __html = require("fs").readFileSync(P.HTML, "utf8");
const __ranks = __html.match(/var RANKS = \[([\s\S]*?)\];/)[1].match(/\{name:/g).length;
chk("scale strip rank denominator matches RANKS (was /10)",
    new RegExp("/" + __ranks + "</i>$").test($("scRank").innerHTML),
    $("scRank").innerHTML + " vs RANKS.length=" + __ranks);
chk("scale strip rank tracks lifetime", $("scRank").innerHTML.indexOf("3<i>") === 0, $("scRank").innerHTML);
// Read the count out of the source rather than pinning a number. The opening gained a
// fifth step (the Pallet Trolley) and this assertion failed for no reason but its own
// hardcoding -- the strip was right the whole time.
const __objs = __html.match(/var OBJECTIVES = \[([\s\S]*?)\n  \];/)[1].match(/\{ title:/g).length;
chk("scale strip task denominator matches OBJECTIVES (was /9)",
    new RegExp("/" + __objs + "</i>$").test($("scTask").innerHTML),
    $("scTask").innerHTML + " vs OBJECTIVES.length=" + __objs);

// --- BOOST TAG (never populated) ---
global.render();
chk("boost tag empty when nothing is active", $("boostTag").innerHTML === "", JSON.stringify($("boostTag").innerHTML));

// ---- the build is stated in the app ------------------------------------------------
// A device that had simply not taken an update looked exactly like a broken release,
// because nothing in the UI said which build was running.
{
  const bl = $("buildLine");
  chk("the Office tab states which build is running", !!bl && /BUILD /.test(bl.textContent),
      bl ? bl.textContent : "no #buildLine");
  chk("and it is the version the build stamped in, not a hardcoded string",
      !!bl && bl.textContent.indexOf(String(__html.match(/var APP_VERSION = "([^"]*)"/)[1]).toUpperCase()) >= 0,
      bl ? bl.textContent : "-");
}

console.log("PASS:"); ok.forEach(l=>console.log("  + "+l));
if(bad.length){ console.log("FAIL:"); bad.forEach(l=>console.log("  - "+l)); process.exitCode=1; }
})();
