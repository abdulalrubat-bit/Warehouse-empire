require("./harness.js");

// --- fake Capacitor Preferences, so the game takes the native storage branch ---
const prefs = {}, removeCalls = [], setCalls = [];
global.Capacitor = { Plugins: { Preferences: {
  get:    ({key})       => Promise.resolve({ value: (key in prefs) ? prefs[key] : null }),
  set:    ({key,value}) => { prefs[key]=value; setCalls.push(key); return Promise.resolve(); },
  remove: ({key})       => { delete prefs[key]; removeCalls.push(key); return Promise.resolve(); }
}}};

const KEY = "warehouse-empire-save";
prefs[KEY] = JSON.stringify({ money: 999999, lifetime: 5e6, rep: 12, prestiges: 3,
                              pallets: 40, taps: 800, lastSeen: Date.now(), owned:{picker:30} });
// (legacy localStorage copy is seeded after load, below)

require("./game.js");

const ok=[], bad=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));
const tick = () => new Promise(r=>process.nextTick(r));

(async () => {
  for (let i=0;i<6;i++) await tick();          // let loadGame() settle + bind listeners

  chk("save loaded from Capacitor Preferences", global.state.rep === 12 && global.state.prestiges === 3,
      "rep="+global.state.rep+" prestiges="+global.state.prestiges);
  chk("storage shim exposes remove()", typeof window.storage.remove === "function");

  global.localStorage.setItem(KEY, JSON.stringify({money:1}));  // stale copy lingering at wipe time

  // wrong confirmation text must not wipe
  document.getElementById("wipeInput").value = "nope";
  document.getElementById("btnConfirmWipe").fire("click");
  for (let i=0;i<4;i++) await tick();
  chk("typing the wrong word does not wipe", (KEY in prefs) && !global.__reloaded);

  // correct confirmation
  document.getElementById("wipeInput").value = "WIPE";
  document.getElementById("btnConfirmWipe").fire("click");
  for (let i=0;i<6;i++) await tick();

  chk("HARD RESET removes the save from Preferences", !(KEY in prefs),
      "prefs keys now: "+JSON.stringify(Object.keys(prefs)));
  chk("Preferences.remove() was actually called", removeCalls.includes(KEY));
  chk("stale legacy localStorage copy cleared too", global.localStorage.getItem(KEY) === null);
  chk("page reload triggered", global.__reloaded === true);

  // The wipe->reload gap: autosave must not resurrect the save.
  setCalls.length = 0;
  const autosave = global.__intervals.find(i => i.ms === 10000);
  const ticker   = global.__intervals.find(i => i.ms === 100);
  autosave.fn(); ticker.fn(); autosave.fn();
  for (let i=0;i<4;i++) await tick();
  chk("autosave after wipe does not rewrite the save", !(KEY in prefs) && setCalls.length === 0,
      "set() calls after wipe: "+setCalls.length);

  console.log("PASS:"); ok.forEach(l=>console.log("  + "+l));
  if(bad.length){ console.log("FAIL:"); bad.forEach(l=>console.log("  - "+l)); process.exitCode=1; }
})();
