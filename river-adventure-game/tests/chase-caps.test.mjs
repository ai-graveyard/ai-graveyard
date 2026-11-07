import test from 'node:test';
import assert from 'node:assert/strict';
import '../model.js';
import '../four-stage.js';
import {setup} from '../scripts/lib/four-stage-ui-harness.mjs';
const R=globalThis.River3D,root=new URL('../',import.meta.url).pathname;
function game(stage=0){
 const g=new R.Game(31029);g.start();g.stageIndex=stage;g.stageStartedAt=0;
 g.routeEvents=[];g.entities=[];g.bankSites=[];return g;
}
function steps(g,seconds){for(let i=0;i<Math.round(seconds*120);i++)g.step(1/120);}

test('every thrust source obeys the 20/30/40/50m cap in the collision physics',()=>{
 assert.deepEqual(R.campaign.gapCaps,[20,30,40,50]);
 for(let stage=0;stage<4;stage++)for(const thrust of ['gold','combo','otter','kick','tow','recover']){
  const g=game(stage),cap=R.campaign.gapCaps[stage];g.gap=cap-.001;
  if(thrust==='gold'||thrust==='combo'){assert(g.reserveSurf(thrust));}
  if(thrust==='otter')g.boardBuddy('otter');
  if(thrust==='kick'){g.boardBuddy('duck');assert(g.kickBuddy('duck'));}
  if(thrust==='tow')g.tow={remaining:1.5,side:1};
  if(thrust==='tow')g.z=g.targetZ=3.7;
  if(thrust==='recover'){g.crash('fixture');steps(g,.8);assert(g.recover());g.gap=cap-.001;}
  let peak=g.gap;
  for(let tick=0;tick<120;tick++){g.step(1/120);assert(g.gap<=cap);peak=Math.max(peak,g.gap);}
  if(stage===3&&thrust==='otter'){
   assert(peak<cap,'otter alone cannot cancel the harder fourth-stage pursuit');
   assert(g.gap<cap-.1,'the crocodile should still close over the stroke');
  }else assert.equal(peak,cap,`${stage+1}/${thrust} should reach the cap`);
 }
});

test('boost overflow is discarded and a later collision immediately consumes the real buffer',()=>{
 for(let stage=0;stage<4;stage++){
  const g=game(stage),cap=g.gapLimit();g.gap=cap;g.reserveSurf('gold');steps(g,1.5);assert.equal(g.gap,cap);
  g.crash('撞上礁石');assert(g.stumble>0);
  const expected=cap+(g.travelSpeed()-g.predatorSpeed())*.5;steps(g,.5);
  assert(Math.abs(g.gap-expected)<1e-8);assert(g.gap>0);
  g.recover();steps(g,.5);assert(g.gap<cap,'discarded boost distance must not reappear');
 }
});

test('each transition preserves the earned distance rather than filling the new cap',()=>{
 for(let stage=0;stage<3;stage++)for(const gap of [5,R.campaign.gapCaps[stage]]){
  const g=game(stage);g.gap=gap;g.time=R.campaign.durations[stage]-.005;
  g.step(.01);assert.equal(g.stageIndex,stage+1);
  const expected=gap+(R.campaign.speeds[stage]-R.campaign.crocs[stage])*.005;
  assert(Math.abs(g.gap-expected)<1e-8);assert.equal(g.gapLimit(),R.campaign.gapCaps[stage+1]);
 }
});

test('cap does not prevent capture, leak through fixed steps, or change practice safety',()=>{
 const caught=game();caught.gap=.001;caught.step(.05);assert.equal(caught.mode,'over');assert.equal(caught.gap,0);
 const slow=game(),fast=game();slow.reserveSurf('gold');fast.reserveSurf('gold');
 for(let i=0;i<120;i++)slow.advance(1/120);for(let i=0;i<15;i++)fast.advance(1/15);
 assert.equal(slow.gap,20);assert.equal(fast.gap,20);assert(Math.abs(slow.distance-fast.distance)<1e-8);
 const practice=game();practice.practiceReplay=true;practice.gap=80;practice.step(.05);
 assert.equal(practice.gapLimit(),null);assert(practice.gap>79);
});

test('stage two collisions retain forward travel while losing chase buffer, with practice and turtle protection retained',()=>{
 for(const grace of [false,true]){
  const g=game(1);g.gap=30;g.crash('撞击');g.recoveryGrace=grace;
  assert.equal(g.gap,30,'collision must not teleport the crocodile');
  steps(g,.5);assert.equal(g.travelSpeed(),grace?9:8);
  assert(Math.abs(g.gap-(30+((grace?9:8)-12.4)*.5))<1e-8);
  assert(Math.abs(g.distance-(grace?9:8)*.5)<1e-8);
 }
 const shield=game(1);shield.boardBuddy('duck');shield.crash('撞击');assert.equal(shield.travelSpeed(),8);
 const turtle=game(1);turtle.boardBuddy('turtle');turtle.crash('撞击');assert.equal(turtle.travelSpeed(),12);assert(!turtle.has('turtle'));
 const practice=game(1);practice.practiceReplay=true;practice.stumble=1;practice.recoveryGrace=false;assert.equal(practice.travelSpeed(),8);
});

test('HUD uses the current stage cap and full state, retaining absolute danger thresholds',async()=>{
 const t=await setup({sourceRoot:root,flagGuide:true});t.click('start');const g=t.ctx.River3DApp.game;
 assert.match(t.elements['rule-chase-detail'].textContent,/20、30、40、50米/);
 assert.doesNotMatch(t.elements['rule-chase-detail'].textContent,/没有固定上限/);
 for(let stage=0;stage<4;stage++){
  g.stageIndex=stage;g.stageStartedAt=g.time;g.routeEvents=[];g.entities=[];g.gap=g.gapLimit();g.reserveSurf('gold');
  for(let i=0;i<12;i++)t.tick(20);
  assert.equal(t.elements['chase-label'].textContent,'距离已拉满');
  assert.equal(t.elements['gap-fill'].style.width,'100%');
  assert.match(t.elements.chase['aria-label'],new RegExp('本关上限 '+g.gapLimit()+' 米'));
  g.gap=g.gapLimit()/2;for(let i=0;i<12;i++)t.tick(20);
  const width=parseFloat(t.elements['gap-fill'].style.width);assert(width>45&&width<65);
  g.gap=5;for(let i=0;i<12;i++)t.tick(20);assert.equal(t.elements['chase-label'].textContent,'要被咬了！');
 }
});

test('moving capsize shows a finite HUD and can recover through the normal hold action',async()=>{
 const t=await setup({sourceRoot:root,flagGuide:true});t.click('start');const g=t.ctx.River3DApp.game;
 g.stageIndex=1;g.stageStartedAt=g.time;g.routeEvents=[];g.entities=[];g.gap=30;g.recoverySupportUsed=2;g.add('rock',g.distance+20,0,{z:0});g.crash('撞击');
 for(let i=0;i<12;i++)t.tick(20);
 assert.equal(g.speed,8);assert.match(t.elements['action-label'].textContent,/扶正/);
 assert.equal(t.elements.speed.textContent,'8');assert(Number.isFinite(parseFloat(t.elements['approach-fill'].style.width)));
 g.press();for(let i=0;i<70;i++)t.tick(20);g.release();
 assert.equal(g.stumble,0);assert.equal(g.mode,'play');assert(g.speed>0);assert(g.gap>0);
});
