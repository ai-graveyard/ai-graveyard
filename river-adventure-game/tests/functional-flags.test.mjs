import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import '../model.js';
import '../four-stage.js';
import {setup} from '../scripts/lib/four-stage-ui-harness.mjs';
const R=globalThis.River3D,root=fileURLToPath(new URL('../',import.meta.url));
function world(){const g=new R.Game(305029);g.start();g.predatorSpeed=()=>0;g.routeEvents=[];g.entities=[];g.flags=[];g.bankSites=[];g.events=[];return g;}
function tick(g,seconds){for(let i=0;i<Math.round(seconds*120);i++)g.step(1/120);}
function pickup(g,skin){const f={id:10,x:g.distance+1,z:g.z,skin,done:false};g.flags.push(f);g.checkFlags(g.distance,g.z);return f;}
test('functional pickups award once; equipping a saved appearance grants no ability and preserves function',()=>{
 const g=world();g.initFlagSkin(5);assert.equal(g.coins,0);assert.equal(g.flagSpeed,0);assert.equal(g.flagGuard,0);
 const f=pickup(g,5);assert.equal(g.coins,8);assert.equal(g.flagCoins,8);assert.equal(g.flagPickups,1);g.checkFlags(0,0);assert.equal(g.coins,8);assert(f.done);
 const h=world();h.flags=[{skin:1,done:false}];h.initFlagSkin(1);assert.equal(h.flags[0].skin,1);assert.equal(h.flagSpeed,0);
});
test('speed takes maximum burst, queues earned surfing, respects caps, refreshes and clears on capsize',()=>{
 const g=world();pickup(g,1);assert.equal(g.travelSpeed(),12);g.escape=1;assert.equal(g.burstExtra(),5);g.escape=0;
 g.reserveSurf('gold');assert.equal(g.goldCharge,1);assert.equal(g.goldBoost,0);tick(g,2);assert.equal(g.goldCharge,1);pickup(g,1);assert.equal(g.flagSpeed,3);
 tick(g,3.02);assert(g.goldBoost>1.9);assert.equal(g.goldCharge,0);
 for(let n=0;n<4;n++){g.stageIndex=n;g.flagSpeed=3;g.paddleDrive=20;assert.equal(g.travelSpeed(),R.campaign.caps[n]);}
 g.crew=[];g.safe=0;g.crash('撞上了礁石');assert.equal(g.flagSpeed,0);assert(g.stumble>0);
});
test('magnet sweeps lanes and nearby airborne coins without future pickups or five-coin surfing; direct collection retains skill reward',()=>{
 const g=world();pickup(g,2);
 for(let i=0;i<5;i++)g.add('coin',g.distance+1,.99,{z:3.7});
 g.add('coin',g.distance+1,4,{z:-3.7});g.add('coin',g.distance+50,1,{z:-3.7});g.add('buddy',g.distance+1,0,{z:-3.7,role:'duck'});
 g.step(1/120);assert.equal(g.coins,6);assert.equal(g.coinChain,0);assert.equal(g.goldCharge,0);assert.equal(g.goldBoost,0);assert.equal(g.rescues,0);assert.equal(g.entities.filter(e=>!e.done&&e.kind==='coin').length,1);
 g.entities=[];for(let i=0;i<5;i++)g.add('coin',g.distance+1,1,{z:g.z});g.step(1/120);assert.equal(g.coinChain,5);assert(g.goldBoost>0);assert.equal(g.coins,11);
});
test('expired magnet and capsized boats do not collect other lanes',()=>{
 const g=world();g.flagMagnet=.001;g.add('coin',1,1,{z:3.7});g.step(1/120);assert.equal(g.coins,0);
 g.flagMagnet=8;g.stumble=2;g.add('coin',g.distance+1,1,{z:-3.7});g.step(1/120);assert.equal(g.coins,0);
});
test('guard consumes one obstacle hit before turtle, records collision, and grants only a short contact grace',()=>{
 const g=world();g.boardBuddy('turtle');pickup(g,3);g.crash('撞上了岸边飞石');assert.equal(g.flagGuard,0);assert(g.has('turtle'));assert.equal(g.hits,1);assert(g.honorLap.impacts>0);assert.equal(g.stumble,0);assert(g.safe<=.18);assert(g.drain().some(e=>e.type==='shield'&&e.data==='flag'));
 tick(g,.2);g.crash('撞上了浮木');assert(!g.has('turtle'));assert.equal(g.hits,2);
});
test('guard cannot erase landing failures, expired protection or a caught boat',()=>{
 const g=world();pickup(g,3);g.crash('落水前记得松手扶正');assert(g.stumble>0);
 const h=world();h.flagGuard=.001;h.step(1/120);h.crash('撞上了礁石');assert(h.stumble>0);
 const b=world();pickup(b,3);b.gap=0;b.step(.01);assert.equal(b.mode,'over');
});
test('replacing flags ends old timers, same flag refreshes, pause freezes and fresh runs have no powers',()=>{
 const g=world();pickup(g,1);pickup(g,2);assert.equal(g.flagSpeed,0);assert.equal(g.flagMagnet,8);pickup(g,3);tick(g,1);assert.equal(g.flagSpeed,0);assert.equal(g.flagMagnet,0);assert(g.flagGuard>8.9);pickup(g,3);assert.equal(g.flagGuard,10);
 g.mode='pause';const state=JSON.stringify(g);g.step(.05);assert.equal(JSON.stringify(g),state);
 g.mode='play';g.time=29.99;g.flagGuard=4;g.step(.02);assert.equal(g.stageIndex,1);assert.equal(g.flagSpeed,0);assert.equal(g.flagMagnet,0);assert(g.flagGuard>3.98);
 const fresh=world();fresh.initFlagSkin(g.flagSkin);assert.equal(fresh.flagSpeed+fresh.flagMagnet+fresh.flagGuard,0);
});
test('two flags per stage follow progressive introduction; weighted finale includes all four and favours escape tools',()=>{
 const counts={speed:0,gold:0,magnet:0,guard:0};
 for(let seed=0;seed<40;seed++)for(let n=0;n<4;n++){
  const route=R.campaign.timeline(n,seed),flags=route.filter(e=>e.kind==='flag');assert.equal(flags.length,2);assert(flags[1].x-flags[0].x>=15);
  if(n<3)assert.deepEqual(flags.map(f=>f.flagKind),[['speed','gold'],['magnet','speed'],['guard','magnet']][n]);
  for(const f of flags){assert.equal(R.flagStyle(f.skin).effect,f.flagKind);
   if(f.flagKind==='magnet')assert(route.some(e=>e.kind==='gold'&&e.x-f.x>15&&e.x-f.x<R.campaign.speeds[n]*7));
   if(f.flagKind==='speed')for(const row of route.filter(e=>e.kind==='row'))if(row.x>f.x&&row.x-f.x<R.campaign.caps[n]*.9)assert.equal(row.safe,f.z);
   if(n===3)counts[f.flagKind]++;
  }
 }
 assert(Object.values(counts).every(c=>c>0));assert(counts.speed+counts.guard>counts.gold+counts.magnet);
});
test('HUD and gold feedback remain honest across pause and failed appearance save',async()=>{
 const t=await setup({sourceRoot:root,flagGuide:true,flagSave:false});t.click('start');const g=t.ctx.River3DApp.game;g.routeEvents=[];g.entities=[];g.flags=[];g.bankSites=[];g.gap=20;
 pickup(g,5);pickup(g,1);pickup(g,2);pickup(g,3);for(let i=0;i<4;i++)t.tick(50);assert.equal(g.coins,8);assert(t.elements['coin-feedback'].hidden);assert.equal(t.elements['flag-status'].hidden,false);assert(t.elements['flag-status-speed'].hidden);assert(t.elements['flag-status-magnet'].hidden);assert(!t.elements['flag-status-guard'].hidden);assert.match(t.elements['flag-status-guard'].textContent,/护航/);
 await Promise.resolve();await Promise.resolve();assert.match(t.elements['mode-note'].textContent,/暂未保存/);
 t.click('pause');const before=[g.time,g.flagSpeed,g.flagMagnet,g.flagGuard];t.tick(500);assert.deepEqual([g.time,g.flagSpeed,g.flagMagnet,g.flagGuard],before);assert(t.elements['flag-status'].hidden);
});

// The late-stage throw windows can move pickups. Keep the original early
// routes and the original late-stage rows, ramps and shore sites pinned.
const originalRouteHashes=[[1,["332bf8b3c0e82670e8f18d41a3bd3f9e4c7fd08260b33cc2d0105276a49fc135","c7ed2693dd82d3545157cb81d1e1ea4850368ed032bd3e9237fa7dda39a9f122","b1acc69e98f7b5e182eec4c26a46fd77478049dc3dc218f93fb87bd49d465c3a","f63408519121b73d03696a756bf1c43fda55f88d62eede00de06d956ad361326"]],[137,["6eb9ffee08979175f2764669b5d7f6e843951efb8756082b3d474f658a3f8a5d","e98efa210cf0157510712763a5f4ef484b316fbfc7dc5a07f52a50d00f979327","b1acc69e98f7b5e182eec4c26a46fd77478049dc3dc218f93fb87bd49d465c3a","f63408519121b73d03696a756bf1c43fda55f88d62eede00de06d956ad361326"]],[305029,["332bf8b3c0e82670e8f18d41a3bd3f9e4c7fd08260b33cc2d0105276a49fc135","c7ed2693dd82d3545157cb81d1e1ea4850368ed032bd3e9237fa7dda39a9f122","b1acc69e98f7b5e182eec4c26a46fd77478049dc3dc218f93fb87bd49d465c3a","f63408519121b73d03696a756bf1c43fda55f88d62eede00de06d956ad361326"]],[4294967295,["867b1ebbe092be73a7595f568dbbc8bba694996af10229374a696c312eafe281","0001b6eb39825221a9851ced2688504ec3bde3b5535bf55960c79df91ac769ee","b1acc69e98f7b5e182eec4c26a46fd77478049dc3dc218f93fb87bd49d465c3a","f63408519121b73d03696a756bf1c43fda55f88d62eede00de06d956ad361326"]]];
test('early non-flag routes and late fixed obstacles, waves and shores retain their original geometry',()=>{
 for(const [seed,hashes] of originalRouteHashes)for(let n=0;n<4;n++){
  const route=R.campaign.timeline(n,seed).filter(e=>n<2?e.kind!=='flag':['row','ramp','bank'].includes(e.kind));
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(route)).digest('hex'),hashes[n]);
 }
});

test('inactive or already-caught boats cannot gain a flag reward',()=>{
 for(const mode of ['ready','pause','over','won']){const g=world();g.mode=mode;g.flags=[{x:1,z:0,skin:5,done:false}];g.checkFlags(0,0);g.activateFlag(5);assert.equal(g.coins,0);assert.equal(g.flags[0].done,false);}
 const g=world();g.gap=0;pickup(g,5);assert.equal(g.coins,0);
});
test('flag practice powers and coins stay in the practice model and never save appearance or formal rewards',async()=>{
 const t=await setup({sourceRoot:root,flagGuide:true,flagSkin:6,totalCoins:100});t.click('start');const original=t.ctx.River3DApp.game;original.coins=11;
 t.click('pause');t.click('run-guide-open');t.click('guide-replay');t.click('replay-flag');t.click('skip-coach');const practice=t.ctx.River3DApp.game;assert(practice.practiceReplay);
 pickup(practice,1);pickup(practice,5);for(let i=0;i<4;i++)t.tick(50);assert.equal(practice.flagSpeed,0);assert.equal(practice.flagMagnet,0);assert.equal(practice.flagGuard,0);assert.equal(practice.coins,8);assert.equal(original.coins,11);assert.equal(t.ctx.skinData.totalCoins,100);assert.equal(t.ctx.skinData.flagSkin,6);assert.equal(t.ctx.flagSaves,undefined);
});
