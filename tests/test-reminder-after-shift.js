// The reminder card used to wait for a second launch, so a new player who did not come back
// on their own was never asked -- five players saw it in a month. Finishing the Last Truck
// is the one moment every new player who stays reaches in their first session, and it is
// the moment the card's promise ("your crew keeps working while the app is shut") is true.
//
// So: a fresh install plays the induction through, and the card comes up on the shift's
// end, on the first launch, without having raised Android's system dialog.
require("./harness.js");

let requestCalls = 0;
const prefs = {};
global.Capacitor = { Plugins: {
  Preferences: {
    get:    ({key})       => Promise.resolve({ value: (key in prefs) ? prefs[key] : null }),
    set:    ({key,value}) => { prefs[key]=value; return Promise.resolve(); },
    remove: ({key})       => { delete prefs[key]; return Promise.resolve(); }
  },
  LocalNotifications: {
    checkPermissions:   () => Promise.resolve({ display: "prompt" }),
    requestPermissions: () => { requestCalls++; return Promise.resolve({ display: "granted" }); },
    schedule: () => Promise.resolve(), cancel: () => Promise.resolve()
  },
  App: { addListener: () => {} }
}};

const cvEl = document.getElementById("wcanvas"); cvEl._cw = 400; cvEl._ch = 300;
const sent = [];
global.fetch = function(url, opts){
  try { sent.push(JSON.parse(opts.body)); } catch(e){}
  return Promise.resolve({ status: 204 });
};
require("./game-tele.js");

const s = global.state, LT = global.window.__truck;
const ok=[], bad=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));
const tick = () => new Promise(r=>process.nextTick(r));
const settle = async (hi) => { for (let i=0;i<25;i++){ global.__runTimeouts(0, hi || 0); await tick(); } };
const card = () => document.getElementById("modalNotif");
const events = () => [].concat.apply([], sent.map(b => b.events || []));
const named = n => events().filter(e => e.name === n);

(async () => {
await settle();

chk("a fresh install is in the Last Truck", s.lastTruck && s.lastTruck.status === "active");
chk("and on its first launch", (s.launches || 0) < 2, "launches=" + s.launches);
chk("the card is not up during the shift", card().hidden === true);

for (let i = 0; i < 10; i++){ LT.finish("test"); s.lastTruck.depart = 0; LT.advance(); }
await settle(2000);

chk("the shift ended", s.lastTruck.status === "complete", s.lastTruck.status);
chk("and the reminder card came up on its end, first launch or not", card().hidden === false);
chk("in words about the shift", /crew keeps working/.test(document.getElementById("notifPromptLead").textContent),
    document.getElementById("notifPromptLead").textContent);
chk("without spending Android's one system dialog", requestCalls === 0, requestCalls + " requests");
const shown = named("notification_prompt").filter(e => e.params.prompt_action === "shown");
chk("and reported as shown from the shift", shown.length === 1 && shown[0].params.prompt_trigger === "shift",
    shown.map(e => e.params.prompt_trigger).join(","));

// Once is once: a later launch must not ask again.
global.window.__notif.prompt("launch");
chk("it is not asked a second time", named("notification_prompt").filter(e => e.params.prompt_action === "shown").length === 1);

console.log("PASS:"); ok.forEach(l=>console.log("  + "+l));
if(bad.length){ console.log("FAIL:"); bad.forEach(l=>console.log("  - "+l)); process.exitCode=1; }
})();
