import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import '../model.js';
import '../four-stage.js';
import {setup} from '../scripts/lib/four-stage-ui-harness.mjs';
const R=globalThis.River3D,root=fileURLToPath(new URL('../',import.meta.url));
// Clock/route fixtures isolate chase pressure; normal pursuit has its own tests.
function empty(){const g=new R.Game(31029);g.start();g.predatorSpeed=()=>0;g.routeEvents=[];g.entities=[];return g;}
function seconds(g,n){for(let i=0;i<Math.round(n*120);i++)g.step(1/120);}
test('entry loads timed campaign before the UI and retains exactly 24 honor IDs',()=>{
 const h=fs.readFileSync(root+'index.html','utf8');assert(h.indexOf('./model.js')<h.indexOf('./four-stage.js'));assert(h.indexOf('./four-stage.js')<h.indexOf('./game.js'));
 assert.deepEqual(R.campaign.speeds,[8,12,20,36]);assert.deepEqual(R.campaign.durations,[30,40,50,60]);assert.equal(new Set(R.honors.map(h=>h.id)).size,24);
 assert.deepEqual(R.campaign.crocs,[9,12.4,21.1,37.8]);
});
test('active clocks advance at 30/70/120/180 seconds and victory emits once with no stage five',()=>{
 const g=empty(),laps=[];for(let i=0;i<21600;i++){g.routeEvents=[];g.entities=[];g.step(1/120);for(const e of g.drain())if(e.type==='lap-complete'||e.type==='victory')laps.push({type:e.type,time:g.time,lap:g.lapsCompleted});}
 assert.equal(g.mode,'won');assert.equal(g.time,180);assert.equal(g.stageIndex,3);assert.equal(g.lapsCompleted,4);assert.equal(g.stageHistory.length,4);
 assert.deepEqual(laps.filter(e=>e.type==='lap-complete').map(e=>e.time),[30,70,120,180]);assert.equal(laps.filter(e=>e.type==='victory').length,1);
 const before=JSON.stringify(g);seconds(g,10);assert.equal(JSON.stringify(g),before);
});
test('surf changes distance and gap below the cap without shortening the first 30 seconds',()=>{
 const a=empty(),b=empty();a.gap=b.gap=1;a.goldCharge=1;assert(a.useSurf());seconds(a,1);seconds(b,1);assert(a.gap>b.gap+3.9);seconds(a,29);seconds(b,29);assert.equal(a.time,30);assert.equal(b.time,30);assert(a.distance>b.distance+7.9);assert.equal(a.gap,20);assert.equal(b.gap,20);assert.equal(a.stageIndex,1);
});
test('paused and inactive models consume no timer, abilities, distance or rescue time',()=>{
 const g=empty();g.goldCharge=1;g.useSurf();g.mode='pause';const before=JSON.stringify(g);g.advance(10);assert.equal(g.time,0);assert.equal(g.goldBoost,2);assert.equal(g.distance,0);g.accumulator=0;assert.equal(JSON.stringify(g),before);
});
test('finish does not reset chase buffer and a capsized finish fails instead of winning',()=>{
 const g=empty();g.predatorSpeed=()=>8.2;seconds(g,29.9);const gap=g.gap;seconds(g,.1);assert(g.gap<gap);assert(Math.abs(g.gap-14)<1e-7);
 const b=empty();b.stageIndex=3;b.stageStartedAt=0;b.time=59.99;b.stumble=2;b.recoveryGrace=false;b.step(.02);assert.equal(b.mode,'over');assert.equal(b.campaignWon,false);
});
test('per-stage speed caps and collision losses are relative to the accepted base speeds',()=>{
 const g=empty();for(let i=0;i<4;i++){g.stageIndex=i;g.goldBoost=2;g.escape=1;g.paddleDrive=20;assert.equal(g.travelSpeed(),R.campaign.caps[i]);g.stumble=1;g.recoveryGrace=false;assert.equal(g.travelSpeed(),[4,8,16,32][i]);g.recoveryGrace=true;assert.equal(g.travelSpeed(),[7,9,17,33][i]);g.stumble=0;}
});
test('campaign buddy durations refresh at pickup and do not clamp when crossing stages',()=>{
 const g=empty();for(let i=0;i<4;i++){g.stageIndex=i;for(const role of ['otter','duck','turtle']){g.boardBuddy(role);assert.equal(g.buddyRemaining(role),R.campaign.buddyDurations[role][i]);}}
 g.stageIndex=0;assert.equal(g.buddyRemaining('turtle'),24);
});
test('route opportunity counts satisfy revised honors without spawning duplicates',()=>{
 for(let i=0;i<4;i++){const list=R.campaign.timeline(i,31029);assert.equal(list.filter(e=>e.kind==='row').length,[4,10,20,50][i]);assert.equal(list.filter(e=>e.kind==='ramp').length,i===0?0:2);assert.equal(list.filter(e=>e.kind==='gold').length,[4,6,8,10][i]);assert.equal(list.filter(e=>e.kind==='bank'&&e.bankKind===1).length,i===0?0:1);assert.equal(list.filter(e=>e.kind==='buddy').length,i===0?1:3);assert.equal(list.filter(e=>e.kind==='throw').length,i<2?0:i===2?3:7);}
 const g=empty();g.routeEvents=R.campaign.timeline(0,g.seed);for(let i=0;i<10;i++)g.generate();assert.equal(new Set(g.entities.map(e=>[e.kind,e.x,e.z,e.role].join(':'))).size,g.entities.length);
});
test('stage-three logs sway during play and airborne shore stones travel into their target lane',()=>{
 const g=empty();g.stageIndex=2;g.stageStartedAt=0;g.stageStartDistance=0;g.stageHistory=[];g.routeEvents=[];g.routeSpawned=[];g.routeRampEnds=[];g.routeAudit=[];g.gap=1000;
 const log={kind:'log',x:1000,y:0,z:0,prevZ:0,baseZ:0,sway:true,swayAmplitude:.72,swayPhase:1,swayRate:2.45,done:false};
 const stone={kind:'rock',x:1000,y:.8,z:-10.3,prevZ:-10.3,projectile:true,launchZ:-10.3,targetZ:0,throwAt:0,flightSeconds:1.05,done:false};g.entities=[log,stone];g.step(.05);
 assert.notEqual(log.z,0);assert(stone.z>-10.3&&stone.z<0);assert(stone.y>.8);
});
test('four revised honors award at their real counters, and previous awards remain owned',()=>{
 const g=empty(),targets={c19:4,c20:2,c21:6,c22:3};for(const id of Object.keys(targets)){const h=R.honors.find(h=>h.id===id);assert.equal(h.target,targets[id]);g[h.key]=h.target-1;g.checkHonors();assert(!g.honors.includes(id));g[h.key]++;g.checkHonors();assert(g.honors.includes(id));}
 const other=new R.Game();other.initHonors(g.honors,0);assert(g.honors.every(id=>other.honors.includes(id)));
});
test('expert clean streak requires stage three and four, impacts invalidate it',()=>{
 const g=empty();g.honorLap.lap=3;g.finishHonorLap(3,true);g.checkHonors();assert(!g.honors.includes('c20'));g.finishHonorLap(4,true);g.checkHonors();assert(g.honors.includes('c20'));
 const b=empty();b.honorLap.lap=3;b.emit('impact',{});b.finishHonorLap(3,true);b.finishHonorLap(4,true);b.checkHonors();assert(!b.honors.includes('c20'));
});
test('practice cannot advance the campaign, award honors or consume formal stage time',()=>{
 const g=empty();g.practiceReplay=true;g.time=179.9;g.honorFloor=0;g.lapsCompleted=4;g.checkHonors();g.step(.05);assert.equal(g.stageIndex,0);assert(!g.campaignWon);assert.equal(g.honors.length,0);
});
test('bank contact window stays at least 1.1 seconds at each stage cap',()=>{
 const g=empty();for(let i=0;i<4;i++){g.stageIndex=i;g.routeEvents=R.campaign.timeline(i,g.seed).filter(e=>e.kind==='bank');g.routeSpawned=[];g.time=R.campaign.durations[i]-1;g.generate();for(const bank of g.bankSites)assert(bank.halfWindow*2/R.campaign.caps[i]>=1.1-1e-9);g.bankSites=[];}
});
test('MVP animation precedes exactly one save, supports skip and then normal results',async()=>{
 let saves=0;const t=await setup({sourceRoot:root,save:async()=>{saves++;return true;},flagGuide:true});t.click('start');const g=t.ctx.River3DApp.game;
 g.stageIndex=3;g.stageStartedAt=g.time-59.99;g.routeEvents=[];g.entities=[];g.gap=100;g.lapsCompleted=3;g.honorLap.lap=4;
 t.tick(20);t.tick(20);assert.equal(t.ctx.River3DApp.mode,'victory');assert.equal(t.elements.mvp.hidden,true);assert.equal(t.elements['shore-ending'].hidden,false);assert.equal(saves,0);t.click('ending-skip');assert.equal(t.elements.mvp.hidden,false);t.click('mvp-finish');await Promise.resolve();assert.equal(t.ctx.River3DApp.mode,'over');assert.equal(saves,1);t.click('mvp-finish');assert.equal(saves,1);
});
test('new season archives distance/coin records while preserving currency, badges and cosmetics',async()=>{
 const raw={balanceVersion:'river-balance-v1-20261104',best:9999,bestCoins:70,bestScore:999,totalCoins:230,skin:3,badges:['c19'],settings:{sound:false}},win={River3D:R,xhs:{launchOptions:{miniToolEnv:{buildVersion:9510000}},miniTool:{getStorage:async()=>({data:JSON.stringify(raw)})}}};
 vm.runInNewContext(fs.readFileSync(root+'platform.js','utf8'),{window:win,document:{documentElement:{style:{setProperty(){}}}}});const data=await win.RiverPlatform.init();assert.equal(data.best,0);assert.equal(data.bestCoins,0);assert.equal(data.legacyRecords.best,9999);assert.equal(data.totalCoins,230);assert.equal(data.skin,3);assert.deepEqual(Array.from(data.badges),['c19']);
});

test('shore ending freezes campaign and saves once only after departure and MVP',async()=>{
 let saves=0;const t=await setup({sourceRoot:root,save:async()=>{saves++;return true;},flagGuide:true});t.click('start');const g=t.ctx.River3DApp.game;
 g.stageIndex=3;g.stageStartedAt=g.time-59.99;g.routeEvents=[];g.entities=[];g.gap=100;g.lapsCompleted=3;g.honorLap.lap=4;t.tick(20);t.tick(20);
 const frozen={time:g.time,distance:g.distance,coins:g.coins};t.click('mvp-finish');assert.equal(saves,0);
 for(let i=0;i<Math.floor((t.ctx.River3D.ending.duration-.8)/.05);i++)t.tick(50);assert.equal(t.ctx.River3DApp.mode,'victory');assert.equal(t.elements.mvp.hidden,true);assert.equal(saves,0);
 assert.deepEqual({time:g.time,distance:g.distance,coins:g.coins},frozen);
 for(let i=0;i<22;i++)t.tick(50);assert.equal(t.elements.mvp.hidden,false);assert.equal(t.elements['shore-ending'].hidden,true);assert.equal(saves,0);
 for(let i=0;i<100;i++)t.tick(50);await Promise.resolve();assert.equal(t.ctx.River3DApp.mode,'over');assert.equal(saves,1);
 assert.match(t.elements['overlay-kicker'].textContent,/四关通关/);
 assert.match(t.elements['run-summary'].textContent,/完成 4 \/ 4 关/);
 assert.match(t.elements['result-advice'].textContent,/四关挑战完成/);
 assert.doesNotMatch(t.elements['result-advice'].textContent,/扶正|下次试试/);
 assert.equal(t.elements['restart'].textContent,'再闯四关');
 t.click('mvp-finish');assert.equal(saves,1);
});
