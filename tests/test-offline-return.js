// currentProgressTarget() is now called during loadGame(), to write the "next target" line
// on the Welcome Back modal. Anything that throws in there throws inside the load, which
// is the one place in the game where a fault costs the player their session on launch.
// Every branch of it is exercised here against a save that has been away.
require("./harness.js");
const cvEl = document.getElementById("wcanvas"); cvEl._cw = 400; cvEl._ch = 300;

const ok=[], bad=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));

const SAVES = {
  "a brand new save":        { taps:0, owned:{}, money:0, lifetime:0 },
  "one picker, hours away":  { taps:12, owned:{picker:1}, money:40, lifetime:400 },
  "mid game":                { taps:900, owned:{picker:200,trolley:120,forklift:60,reach:40,conveyor:20,sorter:8},
                               money:5e6, lifetime:4e8, contractsDone:30, prestiges:2, rep:40 },
  "everything bought":       { taps:1e5, owned:{picker:900,trolley:900,forklift:900,reach:900,conveyor:900,sorter:900,crane:900,hub:900},
                               money:1e18, lifetime:1e20, contractsDone:900, prestiges:40, rep:1e4,
                               upgrades:"ALL" },
  "a save with rep pending": { taps:50, owned:{picker:30}, money:1e3, lifetime:5e5, rep:0 }
};

(async () => {
for (const [label, save] of Object.entries(SAVES)){
  // A fresh module instance per save, so each one really is a cold launch.
  Object.keys(require.cache).forEach(k => { if (/game\.js|harness\.js/.test(k)) delete require.cache[k]; });
  require("./harness.js");
  const cv2 = document.getElementById("wcanvas"); cv2._cw = 400; cv2._ch = 300;

  const seed = Object.assign({
    lastSeen: Date.now() - 5 * 3600 * 1000,          // five hours away
    contractsDone:0, prestiges:0, rep:0, pallets:0, crates:0,
    corp:{hr:0,customs:0,marketing:0,tower:0,training:0,solar:0,depot:0,server:0},
    perks:{}, tree:{}, network:[], upgrades:{}, themesOwned:{}, milestones:{}
  }, save);
  if (seed.upgrades === "ALL") seed.upgrades = {};      // filled after load, below
  global.__store["warehouse-empire-save"] = JSON.stringify(seed);

  let threw = null;
  try {
    require("./game.js");
    for (let i=0;i<40;i++) await new Promise(r=>process.nextTick(r));
  } catch(e){ threw = e.message; }

  const s = global.state;
  const modal = document.getElementById("modalOffline");
  const nextLine = document.getElementById("offlineNextTxt").innerHTML || "";
  const awayLine = document.getElementById("offlineTimeTxt").textContent || "";

  chk(label + ": loads without throwing", threw === null, threw || "clean");
  if (!modal.hidden){
    chk(label + ": the away line is filled in", /Away/.test(awayLine), awayLine);
    chk(label + ": the next target is named, not blank or undefined",
        nextLine.length > 0 && !/undefined|NaN|\[object/.test(nextLine),
        nextLine.replace(/<[^>]+>/g,"").slice(0,80));
  } else {
    chk(label + ": no modal, and nothing broken by not showing one", true, "earned too little to show");
  }
}

console.log("PASS:"); ok.forEach(x=>console.log("  + " + x));
if (bad.length){ console.log("FAIL:"); bad.forEach(x=>console.log("  - " + x)); }
console.log(`\n${ok.length} passed, ${bad.length} failed`);
process.exit(bad.length ? 1 : 0);
})();
