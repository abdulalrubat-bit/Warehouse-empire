const P = require("./paths.js");
// Minimal DOM stub: enough to boot the game IIFE headlessly.
class El {
  constructor(tag){ this.tagName=tag||"div"; this._text=""; this._html=""; this.style={}; this.hidden=false;
    this.disabled=false; this.value=""; this.children=[]; this.attrs={}; this.listeners={};
    this.classList={ _s:new Set(),
      add:(c)=>this.classList._s.add(c), remove:(c)=>this.classList._s.delete(c),
      toggle:(c,f)=>{ f===undefined?(this.classList._s.has(c)?this.classList._s.delete(c):this.classList._s.add(c)):(f?this.classList._s.add(c):this.classList._s.delete(c)); },
      contains:(c)=>this.classList._s.has(c) };
    this.parentNode={ replaceChild:()=>{} };
  }
  set textContent(v){ this._text=String(v); }  get textContent(){ return this._text; }
  // Clearing innerHTML has to drop the children too. Without this, a list the game
  // rebuilds (innerHTML="" then re-append) kept growing, so a test could hold rows from
  // an earlier build while the game wrote to the newest ones.
  set innerHTML(v){ this._html=String(v); if (v === "") { this.children.length = 0; this._q = {}; } }
  get innerHTML(){ return this._html; }
  addEventListener(t,fn){ (this.listeners[t]=this.listeners[t]||[]).push(fn); }
  fire(t,ev){ (this.listeners[t]||[]).forEach(fn=>fn.call(this, ev||{})); }
  appendChild(c){ this.children.push(c); if (c && typeof c === "object") c.parentNode = this; return c; }
  // Real reparenting semantics: the game moves the site view between the Floor tab and
  // <body> depending on orientation, and a stub that silently no-ops that would let a
  // broken move pass. Removing from the old parent matters as much as adding to the new.
  insertBefore(node, ref){
    if (node && node.parentNode && node.parentNode.children){
      const i = node.parentNode.children.indexOf(node);
      if (i >= 0) node.parentNode.children.splice(i, 1);
    }
    const at = ref ? this.children.indexOf(ref) : -1;
    if (at >= 0) this.children.splice(at, 0, node); else this.children.push(node);
    if (node && typeof node === "object") node.parentNode = this;
    return node;
  }
  // Real positional semantics, for the same reason insertBefore has them: a stub that
  // no-ops this would let a mis-placed panel pass, and "afterend" on an element with no
  // parent is a real bug worth surfacing rather than swallowing.
  insertAdjacentElement(pos, node){
    const p = this.parentNode;
    if (pos === "beforeend") return this.appendChild(node);
    if (pos === "afterbegin") return this.insertBefore(node, this.firstChild);
    if (!p || !p.children) return node;
    if (pos === "beforebegin") return p.insertBefore(node, this);
    if (pos === "afterend"){
      const i = p.children.indexOf(this);
      return p.insertBefore(node, i >= 0 ? p.children[i + 1] : null);
    }
    return node;
  }
  get firstChild(){ return this.children[0] || null; }
  removeChild(){} remove(){} scrollIntoView(){} focus(){} blur(){}
  cloneNode(){ const c = new El(this.tagName); c.id = this.id; c.parentNode = this.parentNode; return c; }
  // Same selector on the same element must return the same node, or a write by the
  // game and a read by a test land on two different throwaway objects and the
  // assertion passes (or fails) for reasons that have nothing to do with the game.
  querySelector(sel){
    this._q = this._q || {};
    return this._q[sel] || (this._q[sel] = new El());
  }
  querySelectorAll(){ return []; }
  getAttribute(k){ return this.attrs[k]; }
  setAttribute(k,v){ this.attrs[k]=v; }
  getBoundingClientRect(){ return {left:0, top:0, width:0, height:0}; }
  get clientWidth(){ return this._cw || 0; }   // 0 keeps sizeCanvas/frame() inert
  get clientHeight(){ return this._ch || 0; }
  getContext(){
    const counts = global.__ctxCounts =
      { beginPath:0, fill:0, arc:0, fillRect:0, strokeRect:0, stroke:0, fillText:0 };
    return new Proxy({}, { get:(t,k)=>{
      if (k === "canvas") return this;
      // Gradients must return an object with addColorStop, not undefined.
      if (k === "createLinearGradient" || k === "createRadialGradient")
        return (...a)=>({ addColorStop(){} });
      // measureText returns a TextMetrics on every real canvas, so the stub has to as
      // well -- returning undefined made label layout throw rather than fail an assertion.
      if (k === "measureText")
        return (t)=>({ width: String(t == null ? "" : t).length * 6 });
      return (...a)=>{ if (k in counts) counts[k]++; };
    }, set:()=>true });
  }
}
const els = {};
// Root element, so themes can set CSS custom properties on it.
const __rootStyle = { _props:{},
  setProperty(k,v){ this._props[k]=v; },
  getPropertyValue(k){ return this._props[k] || ""; },
  removeProperty(k){ delete this._props[k]; } };
const __docQ = {}, __tabBtns = [], __tabByName = {};
global.document = {
  documentElement: { style: __rootStyle },
  getElementById:(id)=>{
    if (!els[id]){
      const e = new El(); e.id = id;
      // Real replaceChild semantics: the replacement becomes the node that id resolves to.
      e.parentNode = { replaceChild:(nu, old)=>{ nu.id = old.id; els[old.id] = nu; } };
      els[id] = e;
    }
    return els[id];
  },
  createElement:(t)=> new El(t),
  querySelector:(sel)=>{
    __docQ[sel] = __docQ[sel] || new El();
    return __docQ[sel];
  },
  // The tab bar is the one selector the game drives real behaviour from: without it
  // switchTab() never binds and no tab-scoped render ever runs headlessly.
  querySelectorAll:(sel)=> (sel === ".tabs button" ? __tabBtns : []),
  body: new El("body"),
  hidden: false,
  // Recorded rather than dropped, so tests can drive visibilitychange directly.
  addEventListener(t, fn){ (global.__docListeners[t] = global.__docListeners[t] || []).push(fn); }
};
global.__docListeners = {};
global.__fireDoc = (t, ev) => (global.__docListeners[t] || []).forEach(fn => fn.call(document, ev));
// Seed initial `hidden` state from the real markup, so tests cannot pass vacuously
// on elements the page actually ships hidden.
{
  const html = require("fs").readFileSync(
    P.HTML, "utf8");
  const re = /<[a-zA-Z][^>]*>/g; let m, seeded = 0;
  while ((m = re.exec(html))){
    const tag = m[0];
    const id = /\sid="([^"]+)"/.exec(tag);
    if (id && /\shidden(\s|>|=)/.test(tag)){ document.getElementById(id[1]).hidden = true; seeded++; }
  }
  global.__hiddenSeeded = seeded;
}

// Built from the real markup so the data-tab values cannot drift from the page.
{
  const html = require("fs").readFileSync(
    P.HTML, "utf8");
  // The tab bar is a <nav>, and its buttons contain nested markup, so match the buttons
  // directly rather than trying to bound the container.
  const names = [...html.matchAll(/<button[^>]*\sdata-tab="([^"]+)"/g)].map(m => m[1]);
  names.forEach(n => {
    const b = new El("button");
    b.attrs["data-tab"] = n;
    __tabBtns.push(b);
    __tabByName[n] = b;
  });
  global.__tabNames = names;
}
global.__clickTab = (name) => {
  const b = __tabByName[name];
  if (!b) throw new Error("no such tab: " + name + " (have " + Object.keys(__tabByName) + ")");
  b.fire("click");
};

const store = {};
global.localStorage = {
  getItem:(k)=> (k in store ? store[k] : null),
  setItem:(k,v)=>{ store[k]=String(v); },
  removeItem:(k)=>{ delete store[k]; }
};
global.__store = store;
const intervals = [];
global.setInterval = (fn,ms)=>{ intervals.push({fn,ms}); return intervals.length-1; };
global.__intervals = intervals;
global.clearInterval = ()=>{}; global.clearTimeout = ()=>{};
// Deferred work still does not run on its own, but it is kept now so a test can decide
// to run it. The device-capability probe is a setTimeout a minute out; without this it
// would be untestable.
// The handle carries ref/unref because Node's own internals call them on anything
// setTimeout returns, and a bare number crashes the process on the way out rather than
// failing an assertion -- which is a miserable way to be told something is wrong.
const timeouts = [];
const handle = (i) => ({ id: i, unref(){ return this; }, ref(){ return this; } });
global.setTimeout = (fn,ms)=>{ timeouts.push({fn,ms}); return handle(timeouts.length-1); };
global.__timeouts = timeouts;
global.__runTimeouts = (minMs, maxMs)=>{
  const lo = minMs || 0, hi = maxMs === undefined ? Infinity : maxMs;
  const due = timeouts.filter(t => (t.ms||0) >= lo && (t.ms||0) <= hi);
  due.forEach(t => { try { t.fn(); } catch(e){} });
  return due.length;
};
global.requestAnimationFrame = (fn)=>{ global.__frame = fn; return 0; };
global.AudioContext = function(){ throw new Error("no audio"); };  // sfx() swallows this
global.window = global;
// Teardown listeners. Without these a build that cleans up after itself throws where a
// build that leaks does not, which is exactly the wrong way round.
if (!global.removeEventListener) global.removeEventListener = ()=>{};
if (!global.document.removeEventListener) global.document.removeEventListener = ()=>{};

// No test may touch the network. Once the shipping file carried real GA keys, booting the
// game under this harness started posting genuine events to the live property on every
// run -- and Node's own fetch crashed on the stubbed setTimeout on the way out, which is
// the only reason it was noticed. A test suite that can reach the internet is a bug, so
// fetch is a recording stub here and every suite that wants one installs its own.
global.__fetches = [];
global.fetch = function(url, opts){
  global.__fetches.push({ url: url, body: opts && opts.body });
  return Promise.reject(new Error("network disabled in tests"));
};
// Node 22 ships its own read-only `navigator` (userAgent "Node.js/22"), so a plain
// assignment is silently ignored and the game reads the wrong string. defineProperty is
// the only way to put a real Android WebView UA in front of it.
Object.defineProperty(global, "navigator", {
  configurable: true, writable: true,
  value: { userAgent: "Mozilla/5.0 (Linux; Android 13; SM-A125F Build/TP1A.220624.014; wv) " +
                      "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36" }
});
global.innerWidth = 400;
// Window listeners are recorded rather than dropped, so a test can fire a real error
// event and check what the handler does with it.
global.__winListeners = {};
global.addEventListener = (t,fn)=>{ (global.__winListeners[t] = global.__winListeners[t] || []).push(fn); };
global.__fireWin = (t, ev)=>{
  const ls = global.__winListeners[t] || [];
  ls.forEach(fn => { try { fn(ev); } catch(e){} });
  return ls.length;
};
global.location = { reload: ()=>{ global.__reloaded = true; } };
global.devicePixelRatio = 1;
