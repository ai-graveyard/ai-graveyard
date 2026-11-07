import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import '../model.js';
import '../four-stage.js';
import {setup} from '../scripts/lib/four-stage-ui-harness.mjs';
const R=globalThis.River3D,sourceRoot=fileURLToPath(new URL('../',import.meta.url));
const flush=async()=>{for(let i=0;i<28;i++)await Promise.resolve();};
function endless(seed=31029){const g=new R.Game(seed);g.startEndless();return g;}
function clear(t){
 t.click('start');const g=t.ctx.River3DApp.game;
 Object.assign(g,{stageIndex:3,stageStartedAt:120,time:179.99,lapsCompleted:3,gap:50,entities:[],routeEvents:[]});
 g.honorLap.lap=4;t.tick(20);t.tick(20);assert.equal(t.ctx.River3DApp.mode,'victory');t.click('ending-skip');t.click('mvp-finish');return g;
}
function platform(raw={},rejectWrite=false){
 const writes=[];let failed=rejectWrite;
 const root={setTimeout,clearTimeout,xhs:{launchOptions:{miniToolEnv:{buildVersion:9510000}},miniTool:{
  getStorage:async()=>({data:JSON.stringify(raw)}),setStorage:async p=>{if(failed)throw Error('disk full');writes.push(JSON.parse(p.data));},getWindowInfo:async()=>({})
 }}};
 const ctx=vm.createContext({window:root,globalThis:root,document:{documentElement:{style:{setProperty(){}}}}});
 for(const f of ['model.js','four-stage.js','platform.js'])vm.runInContext(fs.readFileSync(sourceRoot+f,'utf8'),ctx);
 return {api:root.RiverPlatform,writes,recover:()=>failed=false,R:root.River3D};
}

test('endless starts from fourth-stage pace with fresh scores and keeps accelerating past the campaign end',()=>{
 const g=endless();assert.equal(g.flowSpeed(),36);assert.equal(g.speed,36);assert.equal(g.predatorSpeed(),37.8);assert.equal(g.distance,0);assert.equal(g.coins,0);
 g.predatorSpeed=()=>0;g.safe=1000;
 for(let i=0;i<240*120;i++){g.step(1/120);g.drain();}
 assert.equal(g.mode,'play');assert(g.flowSpeed()>64.79);assert(g.distance>12000);assert.equal(g.campaignWon,false);assert.equal(g.lapsCompleted,0);assert.equal(g.stageHistory.length,0);
 assert(!g.honors.includes('c19'));assert(g.endlessRouteSerial>3);
 const b=g.flowSpeed();g.stumble=1;g.recoveryGrace=false;assert.equal(g.travelSpeed(),b-4);g.stumble=0;g.goldBoost=2;assert.equal(g.travelSpeed(),b+4);
 g.escape=2;g.paddleDrive=100;assert.equal(g.travelSpeed(),b+8);delete g.predatorSpeed;assert(Math.abs(g.predatorSpeed()-b-1.8)<1e-8);
});
test('endless retains genuine chase failure and never becomes a won campaign',()=>{
 const g=endless();g.gap=.001;g.step(.05);assert.equal(g.mode,'over');assert.equal(g.campaignWon,false);assert(g.drain().some(e=>e.type==='over'));
 const frozen=JSON.stringify(g);g.step(10);assert.equal(JSON.stringify(g),frozen);
});
test('paused endless freezes acceleration, distance, boosts and companion clocks',()=>{
 const g=endless();g.boardBuddy('otter');g.goldBoost=2;g.mode='pause';const state=JSON.stringify(g),speed=g.flowSpeed();g.advance(1);g.accumulator=0;
 assert.equal(JSON.stringify(g),state);assert.equal(g.flowSpeed(),speed);
});
test('rolling endless route is deterministic, gives unique encounter IDs and bounds retained entities',()=>{
 const a=endless(42),b=endless(42),seen=new Set();let maxEntities=0,maxEvents=0;
 // Controlled progress isolates generation/lifetime from player survival.
 for(let i=0;i<1200;i++){
  for(const g of [a,b]){g.time=i;g.distance=36*i+.06*i*i;g.generate();g.generateFlags();g.generateBanks();g.drain();}
  assert.equal(JSON.stringify(a.entities),JSON.stringify(b.entities));
  for(const e of a.routeAudit)seen.add(e.x);
  maxEntities=Math.max(maxEntities,a.entities.length);maxEvents=Math.max(maxEvents,a.routeEvents.length);
  assert(a.routeAudit.length<=120);assert(a.routeRampEnds.length<8);assert(a.bankSites.length<8);assert(a.flags.length<8);
 }
 assert(a.endlessRouteSerial>15);assert(seen.size>700);assert(maxEntities<220);assert(maxEvents<100);
 assert.deepEqual(a.stageHistory,[]);assert.equal(a.lapsCompleted,0);
});
test('scaled endless plans keep every pickup and every coin outside obstacle and landing envelopes',()=>{
 for(const pace of [43.2,72,144,600])for(const seed of [1,42,31029]){
  const route=R.campaign.timeline(3,seed,pace),cap=pace+8,pickups=route.filter(e=>['gold','buddy','flag'].includes(e.kind));
  const points=e=>e.kind==='gold'?Array.from({length:5},(_,c)=>e.x+(c-4)*e.coinStep):[e.x];
  for(let i=0;i<pickups.length;i++)for(let j=i+1;j<pickups.length;j++)for(const x of points(pickups[i]))for(const y of points(pickups[j]))assert(Math.abs(x-y)>=15-1e-8);
  for(const e of pickups)for(const x of points(e))for(const r of route){
   const dx=x-r.x;
   if(r.kind==='row'&&Math.abs(dx)<Math.max(6,cap*.5))for(const z of [-3.7,0,3.7])if(z!==r.safe)assert(Math.abs(e.z-z)>=((r.row%2?2.8+(r.row%4===1?.72:0):2.35)+.15)-1e-8);
   if(r.kind==='ramp')assert(dx<=-12||dx>=cap*2.6);
   if(r.kind==='throw')assert(Math.abs(dx)>=cap*.8);
  }
 }
});
test('only a genuine formal four-stage completion unlocks and reloading preserves it',async()=>{
 const p=platform(),d=await p.api.init();assert.equal(d.endlessUnlocked,false);
 for(const run of [{campaignWon:false,lapsCompleted:3},{campaignWon:true,lapsCompleted:4,practiceReplay:true},{campaignWon:false,lapsCompleted:0,endless:true}]){await p.api.save({...run,distance:20,coins:1});assert.equal(d.endlessUnlocked,false);}
 await p.api.save({campaignWon:true,lapsCompleted:4,distance:4000,coins:70});assert.equal(d.endlessUnlocked,true);
 const q=platform(p.writes.at(-1));assert.equal((await q.api.init()).endlessUnlocked,true);
 await q.api.resetTutorial();assert.equal((await q.api.init()).endlessUnlocked,true);
});
test('existing campaign c19 unlocks, but legacy pre-campaign badges and big distance alone do not',async()=>{
 const version=R.balance.version;
 assert.equal((await platform({balanceVersion:version,badges:['c19']}).api.init()).endlessUnlocked,true);
 assert.equal((await platform({balanceVersion:'old-endless',badges:['c19']}).api.init()).endlessUnlocked,false);
 assert.equal((await platform({balanceVersion:version,best:100000,badges:['c13']}).api.init()).endlessUnlocked,false);
});
test('save retry retains unlock and credits the normal win exactly once',async()=>{
 const p=platform({},true),g={campaignWon:true,lapsCompleted:4,coins:50,distance:4000};
 assert.equal(await p.api.save(g),false);assert.equal(p.writes.length,0);p.recover();assert.equal(await p.api.retrySave(g),true);
 assert.equal(p.writes[0].endlessUnlocked,true);assert.equal(p.writes[0].runs,1);assert.equal(p.writes[0].totalCoins,50);
 assert.equal(await p.api.save(g),true);assert.equal(p.writes.length,1);
});
test('long endless scores preserve exact large local totals and existing assets',async()=>{
 const p=platform({balanceVersion:R.balance.version,endlessUnlocked:true,totalCoins:230,badges:['c01'],skin:3});
 await p.api.save({endless:true,campaignWon:false,distance:100000123.9,coins:10000001,score:2000000001});
 const d=p.writes[0];assert.equal(d.best,100000123);assert.equal(d.bestCoins,10000001);assert.equal(d.totalCoins,10000231);assert.equal(d.bestScore,2000000001);assert.equal(d.skin,3);assert.deepEqual(d.badges,['c01']);
 const reload=await platform(d).api.init();assert.equal(reload.best,100000123);assert.equal(reload.bestCoins,10000001);
});
test('homepage shows a clickable lock with the four-stage requirement and unlocked players can choose either mode',async()=>{
 const t=await setup({sourceRoot});assert.equal(t.elements['endless-start'].hidden,false);assert.equal(t.elements['endless-start'].disabled,false);assert.equal(t.elements['endless-lock'].hidden,false);assert.equal(t.elements['endless-start']['data-locked'],'true');assert.equal(t.elements['rule-endless'].hidden,true);
 const before=t.ctx.River3DApp.game;t.click('endless-start');assert.equal(t.ctx.River3DApp.mode,'intro');assert.equal(t.ctx.River3DApp.game,before);assert(!t.ctx.skinData.endlessUnlocked);assert.equal(t.elements['endless-lock-panel'].hidden,false);assert.equal(t.elements['endless-start-note'].hidden,true);assert.equal(t.elements['endless-start']['aria-expanded'],'true');assert.equal(t.ctx.document.activeElement,t.elements['endless-lock-close']);assert.equal(t.elements['endless-lock-note'],undefined);t.click('endless-lock-close');assert.equal(t.elements['endless-lock-panel'].hidden,true);assert.equal(t.ctx.document.activeElement,t.elements['endless-start']);assert.equal(t.ctx.River3DApp.game,before);
 const u=await setup({sourceRoot,endlessUnlocked:true});assert.equal(u.elements['endless-start'].hidden,false);assert.equal(u.elements['endless-lock'].hidden,true);assert.equal(u.elements['endless-start']['data-locked'],'false');assert.equal(u.elements['rule-endless'].hidden,false);
 u.click('endless-start');assert.equal(u.ctx.River3DApp.game.endless,true);assert.equal(u.ctx.River3DApp.mode,'play');assert.match(u.elements.zone.textContent,/无尽/);assert.doesNotMatch(u.elements.zone.textContent,/4关/);
 u.click('pause');u.click('home');u.click('discard-confirm');u.click('start');assert(!u.ctx.River3DApp.game.endless);
});
test('campaign clear prominently invites endless after saving; returning home keeps the new entry',async()=>{
 let saves=0;const t=await setup({sourceRoot,save:async()=>{saves++;return true;}});clear(t);await flush();
 assert.equal(t.elements['endless-invite'].hidden,false);assert.equal(t.elements['endless-challenge'].disabled,false);assert.equal(saves,1);
 assert.equal(t.ctx.document.activeElement,t.elements['endless-challenge']);t.click('home');assert.equal(t.ctx.River3DApp.mode,'intro');assert.equal(t.elements['endless-start'].hidden,false);assert.equal(t.elements['endless-lock'].hidden,true);assert.equal(t.elements['endless-lock-panel'].hidden,true);
 t.click('endless-start');assert.equal(t.ctx.River3DApp.game.endless,true);assert.equal(t.ctx.River3DApp.game.coins,0);assert.equal(t.ctx.River3DApp.game.distance,0);
});
test('direct post-clear challenge starts fresh and retry keeps endless, while failed save offers retry',async()=>{
 const t=await setup({sourceRoot});clear(t);await flush();t.click('endless-challenge');const g=t.ctx.River3DApp.game;assert.equal(g.endless,true);assert.equal(g.distance,0);
 g.coins=300;g.time=300;g.emit('over','测试结束');t.tick(20);t.tick(20);if(t.ctx.River3DApp.mode==='defeat')t.click('defeat-skip');
 assert.match(t.elements['result-stage'].textContent,/无尽模式/);assert.doesNotMatch(t.elements['run-summary'].textContent,/完成 4|第 4/);assert.equal(t.elements['endless-invite'].hidden,true);
 t.click('restart');assert.equal(t.ctx.River3DApp.game.endless,true);assert.equal(t.ctx.River3DApp.game.coins,0);
 const f=await setup({sourceRoot,save:async()=>false});f.ctx.RiverPlatform.retrySave=async()=>true;clear(f);await flush();assert.equal(f.elements['endless-challenge'].disabled,true);
 f.click('endless-challenge');assert.equal(f.ctx.River3DApp.mode,'over');f.click('result-save-retry');await flush();assert.equal(f.elements['endless-challenge'].disabled,false);f.click('endless-challenge');assert.equal(f.ctx.River3DApp.game.endless,true);
});

test('endless scenery omits the finale gate, landing and wide ending camera, in both qualities',()=>{
 const gl=new Proxy({getShaderParameter:()=>true,getProgramParameter:()=>true},{get:(o,k)=>k in o?o[k]:()=>({})});
 const root={River3D:R,devicePixelRatio:1};
 for(const file of ['renderer.js','ending.js'])vm.runInNewContext(fs.readFileSync(sourceRoot+file,'utf8'),{window:root});
 const r=new root.RiverRenderer({getContext:()=>gl,getBoundingClientRect:()=>({width:390,height:844})}),g=endless();
 let gates=0;r.finaleGate=()=>gates++;
 g.time=600;g.distance=43200;g.gap=50;g.entities=[];g.generate();
 const frozen=JSON.stringify(g),buffer=r.buffer;
 for(const low of [false,true])for(const reduced of [false,true]){
  r.low=low;r.reducedMotion=reduced;r.camera=null;r.render(g,g.time,false,1/60);
  assert.equal(r.endingLandingOffset(g),null);assert.equal(gates,0);assert.equal(r.buffer,buffer);assert(r.count<buffer.length);assert(r.camera[0]>-25);assert.equal(JSON.stringify(g),frozen);
 }
 const campaign=new R.Game(31029);campaign.start();campaign.zone();campaign.stageIndex=3;campaign.time=59;
 r.journeyFinish(campaign,59);assert.equal(gates,1);assert(r.endingLandingOffset(campaign)>18);
 R.setRenderGame(null);
});

test('legacy badge normalization cannot promote an explicitly locked migrated save on the next reload',async()=>{
 const p=platform({balanceVersion:'old-endless',badges:['c19']});await p.api.init();await p.api.setPreference('sound',false);
 assert.equal(p.writes[0].endlessUnlocked,false);assert.equal((await platform(p.writes[0]).api.init()).endlessUnlocked,false);
});


test('fractional normal scores keep compact layout while long endless totals use the larger layout',async()=>{
 const t=await setup({sourceRoot});t.click('start');const g=t.ctx.River3DApp.game;g.score=1234.567891;g.emit('over','测试结束');t.tick(20);t.tick(20);
 assert.equal(t.elements['result-score']['data-long'],'false');
 const u=await setup({sourceRoot,endlessUnlocked:true});u.click('endless-start');const h=u.ctx.River3DApp.game;h.score=100000001.1;h.emit('over','测试结束');u.tick(20);u.tick(20);
 assert.equal(u.elements['result-score']['data-long'],'true');
});


test('locked-mode dialog traps focus, dismisses with Escape or backdrop and never changes progress',async()=>{
 const t=await setup({sourceRoot});const g=t.ctx.River3DApp.game,state=JSON.stringify(g);
 t.click('endless-start');assert.equal(t.elements['dialog-backdrop'].hidden,false);
 for(const shiftKey of [false,true]){let prevented=false;t.elements.start.focus();t.listeners.keydown({code:'Tab',shiftKey,preventDefault(){prevented=true;}});assert(prevented);assert.equal(t.ctx.document.activeElement,t.elements['endless-lock-close']);}
 t.listeners.keydown({code:'Escape',preventDefault(){}});assert.equal(t.elements['endless-lock-panel'].hidden,true);assert.equal(t.elements['dialog-backdrop'].hidden,true);assert.equal(t.elements['endless-start']['aria-expanded'],'false');assert.equal(t.ctx.document.activeElement,t.elements['endless-start']);
 t.click('endless-start');t.event('endless-lock-panel','click',{target:t.elements['endless-lock-message']});assert.equal(t.elements['endless-lock-panel'].hidden,false);t.event('endless-lock-panel','click',{target:t.elements['endless-lock-panel']});assert.equal(t.elements['endless-lock-panel'].hidden,true);
 assert.equal(JSON.stringify(g),state);assert(!t.ctx.skinData.endlessUnlocked);assert.equal(t.ctx.River3DApp.mode,'intro');
});
