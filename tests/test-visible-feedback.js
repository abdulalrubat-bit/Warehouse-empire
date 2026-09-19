// Exercise the real button and inspect drawing calls and screenshots, not just pool size.
const fs=require('fs'),path=require('path');
const P=require('./paths.js'),B=require('./browser.js');
const source=fs.readFileSync(P.HTML,'utf8');
const assets=JSON.parse(source.match(/var CANVAS_ASSET_SRC = (\{[^\n]+\});/)[1]);
const out=path.resolve(__dirname,'visual-evidence');fs.mkdirSync(out,{recursive:true});
const ok=[],bad=[];const chk=(n,c,d)=>(c?ok:bad).push(n+(d?' ['+d+']':''));
(async()=>{
 const b=await B.launch();
 const context=await b.newContext({viewport:{width:412,height:915},deviceScaleFactor:2,isMobile:true,hasTouch:true,recordVideo:{dir:out,size:{width:412,height:915}}});
 const p=await context.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 await p.route('**google-analytics.com/**',r=>r.fulfill({status:204,body:''}));
 await p.goto(P.HTML_URL);await p.waitForTimeout(1500);
 await p.evaluate(()=>{
   document.querySelectorAll('.modal-screen').forEach(m=>m.hidden=true);
   window.state.owned={picker:1,trolley:0,forklift:0,reach:0,conveyor:0,sorter:0,crane:0,hub:0};
   window.state.money=40;window.state.lifetime=400;window.render();document.getElementById('qHigh').click();
 });
 await p.evaluate(assets=>{
   const c=document.getElementById('wcanvas').getContext('2d');
   const probes=window.__visibleTest={trucks:0,machinery:0,freight:0,feedback:0,feedbackInView:0,truckPos:[],freightPos:[]};
   const image=c.drawImage.bind(c),stroke=c.strokeRect.bind(c),text=c.fillText.bind(c);
   c.drawImage=function(img,...a){
     if(img.src===assets.truck){probes.trucks++;const m=this.getTransform();probes.truckPos.push([m.e,m.f]);if(probes.truckPos.length>400)probes.truckPos.shift();}
     if(img.src===assets.forklift||img.src===assets.reach)probes.machinery++;
     return image(img,...a);
   };
   c.strokeRect=function(x,y,w,h){
     if(this.strokeStyle.toLowerCase()==='#ffe9b8'){
       probes.freight++;const m=this.getTransform();probes.freightPos.push([m.a*x+m.c*y+m.e,m.b*x+m.d*y+m.f]);if(probes.freightPos.length>300)probes.freightPos.shift();
     }return stroke(x,y,w,h);
   };
   c.fillText=function(t,x,y,...a){
     if(String(t).startsWith('PICKED +')){
       probes.feedback++;const m=this.getTransform(),px=m.a*x+m.c*y+m.e,py=m.b*x+m.d*y+m.f;
       if(px>0&&py>0&&px<this.canvas.width&&py<this.canvas.height)probes.feedbackInView++;
     }return text(t,x,y,...a);
   };
 },assets);
 await p.waitForTimeout(400);
 chk('visiting truck sprites draw without owning a hub',await p.evaluate(()=>window.__visibleTest.trucks>0));
 chk('unbought forklift and reach sprites remain hidden',await p.evaluate(()=>window.__visibleTest.machinery===0));
 await p.screenshot({path:path.join(out,'01-early-trucks.png'),fullPage:true});
 for(const tier of ['qHigh','qMed','qLow']){
   await p.evaluate(t=>{document.getElementById(t).click();const q=window.__visibleTest;q.feedback=0;q.feedbackInView=0;q.freight=0;q.freightPos=[];},tier);
   await p.locator('#pickBtn').tap();await p.waitForTimeout(180);
   chk(tier+' tap draws visible canvas feedback',await p.evaluate(()=>window.__visibleTest.feedbackInView>0));
   await p.screenshot({path:path.join(out,tier+'-tap.png'),fullPage:true});
   if(tier!=='qLow'){
     await p.waitForTimeout(600);
     const count=await p.evaluate(()=>new Set(window.__visibleTest.freightPos.map(p=>p.map(Math.round).join(','))).size);
     chk(tier+' tap freight is actually drawn and moves',count>3,'positions='+count);
   } else chk('low quality retains its zero ambient freight budget',await p.evaluate(()=>window.__freightCap()===0&&window.__freightCount()===0));
   await p.waitForTimeout(1100);
 }
 await p.evaluate(()=>{document.getElementById('qHigh').click();window.__freightFill();window.__visibleTest.feedbackInView=0;});
 await p.locator('#pickBtn').tap();await p.waitForTimeout(180);
 chk('tap feedback still renders when freight is full',await p.evaluate(()=>window.__visibleTest.feedbackInView>0));
 chk('full pool stays within its cap',await p.evaluate(()=>window.__freightCount()<=window.__freightCap()));
 await p.screenshot({path:path.join(out,'05-full-pool-tap.png'),fullPage:true});
 // This also covers an entire initial dock dwell and subsequent departing/arriving traffic.
 const before=await p.evaluate(()=>window.__visibleTest.trucks);await p.waitForTimeout(12000);
 const movement=await p.evaluate(()=>new Set(window.__visibleTest.truckPos.map(p=>p.map(Math.round).join(','))).size);
 chk('carriers continue drawing through their dock cycles',await p.evaluate(n=>window.__visibleTest.trucks>n,before));
 chk('carrier positions change as they arrive and leave',movement>10,'positions='+movement);
 await p.screenshot({path:path.join(out,'06-dock-cycle.png'),fullPage:true});
 // Loaded saved games retain the same visuals after a restart.
 await p.reload();await p.waitForTimeout(1500);
 chk('game reloads with the canvas and pick button',await p.locator('#wcanvas').isVisible()&&await p.locator('#pickBtn').count()===1);
 chk('no runtime errors during taps, tier changes or reload',errors.length===0,errors.join('; '));
 await context.close();await b.close();
 console.log('PASS:');ok.forEach(s=>console.log('  + '+s));
 if(bad.length){console.log('FAIL:');bad.forEach(s=>console.log('  - '+s));}
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({ok,bad,errors},null,2));
 process.exitCode=bad.length?1:0;
})().catch(e=>{console.error(e);process.exitCode=1;});
