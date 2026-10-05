const P = require("./paths.js");
// Save protection: a previous generation kept in its own slot, restored when the main save
// will not read or has gone missing; a reset that really resets; and a save code that moves
// a business between phones and refuses one that was damaged on the way. Driven in a real
// browser, because what matters is what is in storage across an actual reload.
const B = require("./browser.js");
const FILE = P.HTML;
const ok=[], bad=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));
const KEY = "warehouse-empire-save", BKEY = KEY + "-backup";

const BIZ = (money) => JSON.stringify({ launches: 5, money, lifetime: money * 3, total: money * 3,
  contractsDone: 6, reviewAsked: true, notifAsked: true, lastDailyClaim: Date.now() - 60000, dailyStreak: 2,
  owned: { picker: 20, trolley: 8 }, lastTruck: { version: 1, status: "complete", reportSeen: true } });

async function boot(b, seed){
  const ctx = await b.newContext({ viewport:{ width:412, height:915 } });
  await ctx.route(/google-analytics/, r => r.fulfill({ status: 204, body: "" }));
  // Seeded before the game's own script runs, and only on the first load: seeding after a
  // load let the fresh game autosave over the seed as the page unloaded.
  await ctx.addInitScript(sd => {
    try { if (sessionStorage.getItem("__seeded")) return; sessionStorage.setItem("__seeded", "1");
          localStorage.clear(); for (const k in sd) localStorage.setItem(k, sd[k]); } catch(e){}
  }, seed);
  const p = await ctx.newPage();
  p.on("pageerror", e => bad.push("PAGEERROR: " + e.message));
  await p.goto("file://" + FILE); await p.waitForTimeout(1800);
  await p.evaluate(() => document.querySelectorAll(".modal-screen").forEach(m => { if (m.id !== "modalSave") m.hidden = true; }));
  return { ctx, p };
}
const ls = (p, k) => p.evaluate(k => localStorage.getItem(k), k);
const money = p => p.evaluate(() => Math.round(window.state.money));

(async () => {
  const b = await B.launch();

  // ---- a save that loads is copied to the backup slot ----
  { const { ctx, p } = await boot(b, { [KEY]: BIZ(12345) });
    const backup = await ls(p, BKEY);
    chk("a save that loads is backed up at launch", !!backup && JSON.parse(backup).money === 12345,
        backup ? "money=" + JSON.parse(backup).money : "no backup");
    await ctx.close(); }

  // ---- a save that will not read is answered from the backup ----
  { const { ctx, p } = await boot(b, { [KEY]: '{"money": 99, "lifetime": ', [BKEY]: BIZ(54321) });
    chk("an unreadable save restores the backup instead of a fresh site", await money(p) >= 54321, "$" + await money(p));
    chk("and the damaged save is parked, not lost", (await ls(p, KEY + "-corrupt") || "").startsWith('{"money": 99'));
    await p.waitForTimeout(800);
    chk("and the player is told", /backup/.test(await p.evaluate(() => document.getElementById("toast").textContent)));
    await ctx.close(); }

  // ---- so is one that has gone missing ----
  { const { ctx, p } = await boot(b, { [BKEY]: BIZ(777) });
    chk("a missing save with a backup restores the backup", await money(p) >= 777, "$" + await money(p));
    await ctx.close(); }

  // ---- a reset really resets ----
  { const { ctx, p } = await boot(b, { [KEY]: BIZ(5000) });
    await p.evaluate(() => { document.getElementById("modalReset").hidden = false; document.getElementById("wipeInput").value = "WIPE"; });
    await Promise.all([p.waitForEvent("load"), p.evaluate(() => document.getElementById("btnConfirmWipe").click())]);
    await p.waitForTimeout(1800);
    chk("a reset removes the backup as well as the save", !(await ls(p, BKEY)) || JSON.parse(await ls(p, BKEY)).money < 5000,
        "backup=" + ((await ls(p, BKEY)) || "none").slice(0, 40));
    chk("so the business does not come back", await money(p) < 5000, "$" + await money(p));
    await ctx.close(); }

  // ---- save codes ----
  { const { ctx, p } = await boot(b, { [KEY]: BIZ(4242) });
    const r = await p.evaluate(() => {
      const C = window.__saveCode, code = C.exportCode();
      const flip = code.slice(0, 20) + (code[20] === "A" ? "B" : "A") + code.slice(21);
      return { prefix: code.slice(0, 4), round: C.readCode(code).ok,
               spaced: C.readCode(code.replace(/(.{30})/g, "$1\n ")).ok,
               cut: C.readCode(code.slice(0, code.length - 12)).ok,
               flipped: C.readCode(flip).ok, junk: C.readCode("hello").ok, money: JSON.parse(C.readCode(code).json || "{}").money };
    });
    chk("an exported code reads back as the same business", r.prefix === "WE1." && r.round && Math.round(r.money) >= 4242, JSON.stringify(r));
    chk("line breaks from a messaging app do not break it", r.spaced);
    chk("a code cut short is refused", r.cut === false);
    chk("a code with a changed character is refused", r.flipped === false);
    chk("text that is not a code is refused", r.junk === false);

    // Import through the UI: a code from another phone replaces this business after two presses.
    const other = await p.evaluate(src => {
      const json = src, h = (s => { let x = 0x811c9dc5; for (let i = 0; i < s.length; i++){ x ^= s.charCodeAt(i); x = Math.imul(x, 0x01000193) >>> 0; } return ("0000000" + x.toString(16)).slice(-8); })(json);
      return "WE1." + btoa(unescape(encodeURIComponent(json))) + "." + h;
    }, BIZ(888888));
    await p.evaluate(() => document.getElementById("importSaveBtn").click());
    await p.fill("#saveCodeBox", other);
    await p.click("#btnSaveAction");
    chk("the first press only warns", await money(p) < 888888 &&
        /replaces your current business/i.test(await p.evaluate(() => document.getElementById("saveModalMsg").textContent)));
    await Promise.all([p.waitForEvent("load"), p.click("#btnSaveAction")]);
    await p.waitForTimeout(1800);
    chk("the second imports it", await money(p) >= 888888, "$" + await money(p));
    chk("and the business it replaced is kept aside", JSON.parse((await ls(p, KEY + "-preimport")) || "{}").money >= 4242);
    await ctx.close(); }

  await b.close();
  console.log("PASS:"); ok.forEach(l=>console.log("  + "+l));
  if(bad.length){ console.log("FAIL:"); bad.forEach(l=>console.log("  - "+l)); process.exitCode=1; }
})();
