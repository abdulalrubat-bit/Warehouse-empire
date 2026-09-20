const fs=require('fs'),path=require('path'),P=require('./paths.js'),B=require("./browser.js");
const out=path.resolve(__dirname,'visual-evidence');fs.mkdirSync(out,{recursive:true});
const source=fs.readFileSync(P.HTML,'utf8').replace('window.__tele = Tele;',`window.__tele = Tele;
window.__events={tick:tickFloorEvents,cell:rushCell,activeTrial:automationTrialActive,
snapshot:function(){return {mega:megaShipment,rush:rushOrder,bursts:eventBursts.length,anim:animT,freeze:saleFreezeUntil};},
drum:function(){return CANVAS_ASSETS.drum;}};`);
const ok=[],bad=[],chk=(n,c)=>{(c?ok:bad).push(n);};
(async()=>{
 const browser=await B.launch(),context=await browser.newContext({viewport:{width:412,height:915},isMobile:true,hasTouch:true});
 const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route(P.HTML_URL,r=>r.fulfill({contentType:'text/html',body:source}));
 await p.route('**google-analytics.com/**',r=>r.fulfill({status:204,body:''}));
 await p.goto(P.HTML_URL);await p.waitForTimeout(1200);
 await p.evaluate(()=>{
   document.querySelectorAll('.modal-screen').forEach(e=>e.hidden=true);
   Object.keys(state.owned).forEach(k=>state.owned[k]=0);
   state.automationTrialUsed=1;state.crisisNextAt=1e9;state.shipment_counter=49;state.money=0;state.total=0;
   document.getElementById('qLow').click();window.render();
 });
 await p.locator('#pickBtn').tap();
 chk('50th processed item queues rather than duplicates a mega',await p.evaluate(()=>state.shipment_counter===50&&!__events.snapshot().mega));
 await p.locator('#pickBtn').tap();await p.waitForTimeout(100);
 chk('next item becomes a mega even on low graphics',await p.evaluate(()=>state.shipment_counter===0&&!!__events.snapshot().mega));
 chk('uploaded drum green background is transparent',await p.evaluate(()=>__events.drum().getContext('2d').getImageData(0,0,1,1).data[3]===0));
 await p.screenshot({path:path.join(out,'11-mega-shipment.png'),fullPage:true});
 const collect=await p.evaluate(()=>{const m=__events.snapshot().mega,r=document.getElementById('wcanvas').getBoundingClientRect();return {x:r.x+m.x,y:r.y+m.y,cash:state.money,reward:m.reward};});
 await p.touchscreen.tap(collect.x,collect.y);
 chk('mega pays its bounded reward exactly once and emits 20 texts',await p.evaluate(v=>!__events.snapshot().mega&&__events.snapshot().bursts===20&&Math.abs(state.money-v.cash-v.reward)<.001&&v.reward<=500,collect));
 await p.touchscreen.tap(collect.x,collect.y);
 chk('repeat tap cannot collect the mega twice',await p.evaluate(v=>Math.abs(state.money-v.cash-v.reward)<.001,collect));
 await p.evaluate(()=>{document.getElementById('canvasOverview').click();state.crisisNextAt=0;__events.tick(.1);});
 await p.waitForTimeout(150);
 const before=await p.evaluate(()=>__events.snapshot().anim);await p.waitForTimeout(250);
 chk('crisis pauses standard movement',await p.evaluate(v=>__events.snapshot().anim===v,before));
 await p.screenshot({path:path.join(out,'12-rush-crisis.png'),fullPage:true});
 const initialRep=await p.evaluate(()=>state.rep);
 for(let i=0;i<10;i++){
   const c=await p.evaluate(i=>{const c=__events.cell(i),r=document.getElementById('wcanvas').getBoundingClientRect();return {x:r.x+c.x,y:r.y+c.y};},i);
   await p.touchscreen.tap(c.x,c.y);
 }
 chk('ten distinct item taps win first-clear 3 REP',await p.evaluate(v=>!__events.snapshot().rush&&state.rep===v+3,initialRep));
 await p.evaluate(()=>{state.crisisNextAt=0;__events.tick(.1);__events.tick(16);});
 chk('timed-out rush restores the loop without a REP penalty',await p.evaluate(v=>!__events.snapshot().rush&&state.rep===v+3,initialRep));
 await p.waitForTimeout(150);
 chk('movement resumes after the crisis',await p.evaluate(v=>__events.snapshot().anim>v,before));
 await p.evaluate(()=>{state.crisisNextAt=1e9;state.eventPlaySeconds=240;state.automationTrialUsed=0;state.shipment_counter=0;__events.tick(.1);});
 chk('four-minute automation offer appears',await p.locator('#automationTrialModal').isVisible());
 await p.locator('#startAutomationTrial').click();
 const taps=await p.evaluate(()=>state.taps);await p.waitForTimeout(1100);
 chk('trial performs automatic picks',await p.evaluate(t=>__events.activeTrial()&&state.taps>=t+2,taps));
 await p.evaluate(()=>{state.automationTrialUntil=Date.now()-1;__events.tick(.1);});
 chk('expired trial resets and shows the real unlock link',await p.evaluate(()=>!__events.activeTrial()&&state.automationTrialUntil===0&&!!document.getElementById('automationUnlock')));
 await p.locator('#automationUnlock').click();
 chk('unlock link opens the existing progression tree',await p.locator('#treeList').isVisible());
 await p.evaluate(()=>{state.lifetime=20000;state.total=20000;state.money=20000;state.rep=0;state.prestiges=0;window.render();});
 await p.locator('#sellBtn').click();await p.locator('#sellBtn').click();
 chk('first sale creates celebration and a 100ms freeze',await p.evaluate(()=>!!document.getElementById('firstSaleCelebration')&&__events.snapshot().freeze>Date.now()&&__events.snapshot().freeze-Date.now()<=100));
 await p.waitForTimeout(200);await p.screenshot({path:path.join(out,'13-first-sale-burst.png'),fullPage:true});
 await p.waitForTimeout(1600);
 chk('sale completes once and particles clean themselves up',await p.evaluate(()=>state.prestiges===1&&!document.getElementById('firstSaleCelebration')&&!document.getElementById('modalSite').hidden));
 chk('no event runtime errors',errors.length===0);
 fs.writeFileSync(path.join(out,'event-results.json'),JSON.stringify({ok,bad,errors},null,2));
 console.log('PASS:');ok.forEach(n=>console.log('  + '+n));if(bad.length){console.log('FAIL:');bad.forEach(n=>console.log('  - '+n));}
 await context.close();await browser.close();process.exitCode=bad.length?1:0;
})().catch(e=>{console.error(e);process.exit(1);});
