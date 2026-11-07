import test from 'node:test';
import assert from 'node:assert/strict';
import '../model.js';
import '../four-stage.js';
import {setup} from '../scripts/lib/four-stage-ui-harness.mjs';
const R=globalThis.River3D,sourceRoot=new URL('../',import.meta.url).pathname;
function quiet(stage=0){const g=new R.Game(305029);g.start();g.stageIndex=stage;g.stageStartedAt=0;g.entities=[];g.routeEvents=[];g.flags=[];g.bankSites=[];g.drain();return g;}
function seconds(g,t){for(let i=0;i<Math.round(t*120);i++)g.step(1/120);}

test('jump practice requires a manual jump followed by a stable landing',()=>{
 const g=quiet(),pace=new R.LessonPace();assert(pace.begin('jump',g,500));pace.active.optional=true;pace.release(g);
 g.changeLane(1);seconds(g,.5);for(const e of g.drain())assert.equal(pace.observe(e.type,e.data,g),null);
 assert(pace.active);assert.equal(pace.observe('land',null,g),null);
 assert.equal(pace.observe('ramp',null,g),null);assert.equal(pace.observe('flip',1,g),null);assert.equal(pace.active.started,false,'passive waves cannot fulfill the manual jump lesson');
 g.press();g.release();let completed;
 for(let i=0;i<240&&!completed;i++){g.step(1/120);for(const e of g.drain()){const result=pace.observe(e.type,e.data,g);if(result)completed=result;}}
 assert.equal(completed.result,'practised');assert.equal(g.y,0);assert.equal(g.stumble,0);assert.equal(pace.active,null);
});

test('normal jump hint promises the exact manual-takeoff and stable-landing condition',async()=>{
 const t=await setup({sourceRoot,gestureGuide:true,flagGuide:true,lessonGuides:[]});t.click('start');const g=t.ctx.River3DApp.game;
 g.entities=[];g.routeEvents=[];g.bankSites=[];g.add('log',g.distance+g.speed*2.8,0,{z:0});
 for(let i=0;i<8;i++)t.tick(1000/60);
 assert.equal(t.ctx.River3DApp.lessonPace.active.id,'jump');
 assert.match(t.elements['practice-cue'].textContent,/轻点起跳.*落水.*完成/);assert.doesNotMatch(t.elements['practice-cue'].textContent,/换道|绕开/);
 g.changeLane(1);for(let i=0;i<32;i++)t.tick(1000/60);assert.equal(t.ctx.River3DApp.lessonPace.active.id,'jump');
 g.press();g.release();for(let i=0;i<110;i++)t.tick(1000/60);
 assert(t.ctx.River3DApp.lessonPace.history.some(h=>h.id==='jump'&&h.result==='practised'));
 assert(t.ctx.skinData.lessonGuides.includes('jump'));
});

test('diagram practice uses the same promise and preserves ordinary lane controls',async()=>{
 const t=await setup({sourceRoot,flagGuide:true});t.click('settings-open');t.click('practice');t.click('replay-jump');
 assert.match(t.elements['coach-text'].textContent,/点一下.*稳稳落水.*完成/);
 assert.doesNotMatch(t.elements['coach-text'].textContent,/换道绕开/);
 assert.equal(t.elements['coach-visual-note'].textContent,'轻点起跳 → 不用按住 → 稳稳落水。');
});

test('only the first two supported first-stage capsizes reduce loss and extend real recovery thrust',()=>{
 const g=quiet();
 for(let attempt=1;attempt<=3;attempt++){
  g.safe=0;g.goldBoost=0;g.recoverBoost=0;g.gap=20;
  const before=g.distance;g.crash('撞击');assert.equal(g.gap,20,'support must not gift chase distance');
  assert.equal(g.recoverySupportUsed,Math.min(attempt,2));assert.equal(g.travelSpeed(),attempt<=2?7:4);
  seconds(g,.5);assert(Math.abs(g.distance-before-(attempt<=2?7:4)*.5)<1e-8);
  assert(Math.abs(g.gap-(20+((attempt<=2?7:4)-9)*.5))<1e-8);
  assert.equal(g.recover(),false,'support does not bypass the minimum recovery time');
  g.press();g.release();seconds(g,2/15);g.press();g.release();seconds(g,2/15);g.press();g.release();seconds(g,1/30);
  assert.equal(g.stumble,0);assert(Math.abs(g.recoverBoost-(attempt<=2?2:.9))<.01);
  const remaining=g.recoverBoost;assert.equal(g.recover(),false);assert.equal(g.recoverBoost,remaining,'repeated recovery cannot refill the boost');
  seconds(g,.2);assert(Math.abs(g.recoverBoost-remaining+.2)<1e-8);
 }
});

test('practice and stages two through four retain the previous recovery speed and boost',()=>{
 for(const stage of [0,1,2,3])for(const practice of [false,true]){
  if(stage===0&&!practice)continue;
  const g=quiet(stage);g.practiceReplay=practice;g.gap=50;g.crash('撞击');
  assert.equal(g.travelSpeed(),R.campaign.speeds[stage]-3);
  seconds(g,.8);assert(g.recover());assert.equal(g.recoverBoost,.9);assert.equal(g.safe,1.5);
 }
 const endless=new R.Game(305029);endless.startEndless();endless.routeEvents=[];endless.entities=[];endless.gap=50;endless.crash('撞击');
 assert(Math.abs(endless.travelSpeed()-(endless.flowSpeed()-3))<1e-8);seconds(endless,.8);assert(endless.recover());assert.equal(endless.recoverBoost,.9);
});
