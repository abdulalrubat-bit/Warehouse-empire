// The operations journal, from the autonomous prototype: what the business did, newest
// first, kept with the save. It has to record the things a returning player wants to know,
// stay bounded, and never let a hand-edited save break the Office.
require("./harness.js");
const cvEl = document.getElementById("wcanvas"); cvEl._cw = 400; cvEl._ch = 300;
require("./game-sim.js");

const s = global.state, J = global.window.__journal;
const ok=[], bad=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));
const tick = () => new Promise(r=>process.nextTick(r));
const settle = async () => { for (let i=0;i<20;i++) await tick(); };
const $ = id => document.getElementById(id);
const ticker = global.__intervals.find(i => i.ms === 100);

(async () => {
await settle();
s.lastTruck = { version: 1, status: "complete", reportSeen: true };
s.owned = { picker: 30, trolley: 10 }; s.contractsDone = 3; s.journal = [];

// ---- a delivered contract is recorded -------------------------------------------------------
s.contract = { goal: 10, prog: 9.99, mins: 15, deadline: Date.now() + 600000, label: "x", cash: 1234, pallets: 3, rush: false };
ticker.fn(); await settle();
chk("a delivered contract is written to the journal", /Contract delivered: \+\$1\.23K and 3 pallets/.test((s.journal[0] || {}).text || ""),
    (s.journal[0] || {}).text);
chk("marked as a contract", s.journal[0] && s.journal[0].kind === "contract");

// ---- a missed express job is recorded too ----------------------------------------------------
s.contract = { goal: 1e12, prog: 1e11, mins: 15, deadline: Date.now() - 1, label: "x", cash: 1, pallets: 3, rush: false, express: true };
ticker.fn(); await settle();
chk("a missed express job is written down with how far it got", /Express job missed at 10%/.test(s.journal[0].text), s.journal[0].text);

// ---- newest first, and bounded ----------------------------------------------------------------
for (let i = 0; i < 50; i++) J.jot("entry " + i, "info");
chk("the newest entry is first", s.journal[0].text === "entry 49");
chk("the journal keeps the last thirty", s.journal.length === 30, s.journal.length);
chk("and survives a save", JSON.parse(JSON.stringify(s)).journal.length === 30);

// ---- the Office shows it, and a damaged save cannot break it ----------------------------------
J.render(); await settle();
chk("the Office lists recent entries", (($("journalList").innerHTML.match(/class="jrow/g)) || []).length === 12);
s.journal = [null, "text", 7, { text: "<img src=x onerror=alert(1)>", kind: "x\" onclick=\"y", at: "soon" }, { text: "fine", kind: "crew", at: Date.now() }];
let threw = null; try { J.render(); } catch(e){ threw = e.message; }
const html = $("journalList").innerHTML;
chk("entries that are not records are skipped, not fatal", threw === null && (html.match(/class="jrow/g) || []).length === 2, threw || html.slice(0, 120));
// The entry text may still read "onerror=" -- what matters is that none of it can open a tag.
const spans = (html.match(/<span>([\s\S]*?)<\/span>/g) || []).map(t => t.slice(6, -7));
chk("and nothing from the save is rendered as markup", spans.length === 2 && spans.every(t => !/[<>"]/.test(t)) && !/<img/.test(html), spans.join(" | "));
s.journal = "nonsense";
threw = null; try { J.render(); J.jot("after", "info"); } catch(e){ threw = e.message; }
chk("a journal that is not a list is replaced, not fatal", threw === null && Array.isArray(s.journal) && s.journal[0].text === "after", threw);

console.log("PASS:"); ok.forEach(x=>console.log("  + " + x));
if (bad.length){ console.log("FAIL:"); bad.forEach(x=>console.log("  - " + x)); }
console.log(`\n${ok.length} passed, ${bad.length} failed`);
process.exit(bad.length ? 1 : 0);
})();
