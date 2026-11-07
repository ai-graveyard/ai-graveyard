import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {setup} from '../scripts/lib/four-stage-ui-harness.mjs';

const sourceRoot=fileURLToPath(new URL('../',import.meta.url));
const guideKeys=['tutorial','gestureGuide','flagGuide','flagLessons','goldSwipeGuides','lessonGuides','buddyGuides','tutorialCourse','tutorialSteps'];
const fresh={tutorial:false,gestureGuide:false,flagGuide:false,flagLessons:[],goldSwipeGuides:0,lessonGuides:[],buddyGuides:[],tutorialCourse:false,tutorialSteps:[]};
const fixture={balanceVersion:'river-four-stage-obstacle-hard-20261105',tutorial:true,tutorialCourse:false,tutorialSteps:[],gestureGuide:true,flagGuide:true,flagLessons:['speed','gold'],goldSwipeGuides:3,lessonGuides:['jump','flip','wind','fish','camp','tow'],buddyGuides:['otter','duck','turtle'],best:4321,bestCoins:75,bestScore:6789,runs:9,totalCoins:300,rank:3,skin:4,followSkinOwned:true,flagSkin:5,badges:['c01','c13'],honorFloor:3,trackedHonor:'c13',settings:{sound:false,reduced:true,haptics:false,low:true},legacyRecords:{best:123,bestCoins:9,bestScore:456}};
const plain=v=>JSON.parse(JSON.stringify(v));
const guides=d=>Object.fromEntries(guideKeys.map(k=>[k,plain(d[k])]));
const progress=d=>Object.fromEntries(Object.entries(plain(d)).filter(([k])=>!guideKeys.includes(k)));

function platform(raw=fixture,native=true,fail=false){
 let stored=JSON.stringify(raw),writes=0;
 const write=text=>{writes++;if(fail)throw Error('storage failed');stored=text;};
 const ctx={Promise,WeakMap,console,River3D:{balance:{version:fixture.balanceVersion}},document:{documentElement:{style:{setProperty(){}}}},localStorage:{getItem:()=>stored,setItem:(_,v)=>write(v)}};
 ctx.window=ctx;
 if(native)ctx.xhs={launchOptions:{miniToolEnv:{buildVersion:9460000}},miniTool:{getStorage:async()=>({data:stored}),setStorage:async p=>write(p.data)}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(sourceRoot+'platform.js','utf8'),ctx);
 return {api:ctx.RiverPlatform,saved:()=>JSON.parse(stored),writes:()=>writes};
}
const flush=async()=>{for(let i=0;i<14;i++)await Promise.resolve();};

test('confirmed reset survives reload in native and fallback storage and preserves progress',async()=>{
 for(const native of [true,false]){
  const p=platform(fixture,native),data=await p.api.init(),before=progress(data);
  assert.equal(await p.api.resetTutorial(),true);assert.deepEqual(guides(data),fresh);assert.deepEqual(progress(data),before);
  const reloaded=platform(p.saved(),native),d=await reloaded.api.init();
  assert.deepEqual(guides(d),fresh);assert.deepEqual(progress(d),before);
  await reloaded.api.completeGestureGuide();await reloaded.api.completeLesson('jump');await reloaded.api.completeBuddyGuide('otter');
  assert.equal(reloaded.saved().gestureGuide,true);assert.deepEqual(reloaded.saved().lessonGuides,['jump']);assert.deepEqual(reloaded.saved().buddyGuides,['otter']);
 }
});

test('failed persistence keeps the old learning record and all progress',async()=>{
 const p=platform(fixture,true,true),d=await p.api.init(),before=plain(d);
 assert.equal(await p.api.resetTutorial(),false);assert.deepEqual(plain(d),before);assert.deepEqual(p.saved(),fixture);
});

test('opening and cancelling confirmation does not reset records or discard the paused game',async()=>{
 const t=await setup({sourceRoot,flagGuide:true,totalCoins:300});let calls=0;t.ctx.RiverPlatform.resetTutorial=async()=>{calls++;return true;};
 t.click('start');const g=t.ctx.River3DApp.game;for(let i=0;i<20;i++)t.tick(40);
 t.click('settings-open');t.click('reset-teaching');
 assert.equal(calls,0);assert.equal(t.elements['reset-teaching-confirm'].hidden,false);assert.equal(t.elements['settings-content'].hidden,true);
 assert.match(t.elements['reset-teaching-text'].textContent,/当前未结算的冒险会结束/);
 t.click('reset-teaching-cancel');assert.equal(calls,0);assert.equal(t.elements['settings-content'].hidden,false);assert.equal(t.elements['settings-panel'].hidden,false);assert.equal(t.ctx.River3DApp.game,g);assert.equal(t.ctx.skinData.gestureGuide,true);
 t.click('settings-close');assert.equal(t.ctx.River3DApp.mode,'play');
});

test('confirming resets once and returns directly home without launching a curriculum',async()=>{
 const t=await setup({sourceRoot,flagGuide:true,totalCoins:300});let calls=0,gameSaves=0;
 t.ctx.RiverPlatform.resetTutorial=async()=>{calls++;return true;};t.ctx.RiverPlatform.save=async()=>{gameSaves++;return true;};
 t.click('start');for(let i=0;i<20;i++)t.tick(40);t.ctx.River3DApp.game.coins=5;
 t.click('settings-open');t.click('reset-teaching');assert.equal(calls,0);
 t.click('reset-teaching-yes');t.click('reset-teaching-yes');assert.equal(t.elements['reset-teaching-yes'].disabled,true);await flush();
 assert.equal(calls,1);assert.equal(gameSaves,0);assert.equal(t.ctx.River3DApp.mode,'intro');assert.equal(t.elements.intro.hidden,false);assert.equal(t.elements['settings-panel'].hidden,true);assert.equal(t.elements.coach.hidden,true);assert.equal(t.ctx.skinData.totalCoins,300);assert.deepEqual(guides(t.ctx.skinData),fresh);
 t.click('start');assert.equal(t.ctx.River3DApp.game.practiceReplay,undefined);assert.equal(t.elements.coach.hidden,true);
 for(let i=0;i<85;i++)t.tick(40);assert.equal(t.ctx.River3DApp.lessonPace.active.id,'steer');assert.equal(t.elements.coach.hidden,true);
});

test('a failed reset stays on confirmation and allows cancellation or retry',async()=>{
 for(const throws of [false,true]){
  const t=await setup({sourceRoot,flagGuide:true});t.ctx.RiverPlatform.resetTutorial=async()=>{if(throws)throw Error('write failed');return false;};
  t.click('settings-open');t.click('reset-teaching');t.click('reset-teaching-yes');await flush();
  assert.equal(t.elements['reset-teaching-confirm'].hidden,false);assert.equal(t.elements['reset-teaching-yes'].disabled,false);assert.equal(t.elements['reset-teaching-cancel'].disabled,false);assert.equal(t.ctx.skinData.gestureGuide,true);assert.match(t.elements['reset-teaching-status'].textContent,/未能/);
  t.click('reset-teaching-cancel');assert.equal(t.elements['settings-panel'].hidden,false);
 }
});

test('old curriculum flags never auto-launch a course and individual diagrams remain available',async()=>{
 const p=platform({...fixture,tutorialCourse:true,tutorialSteps:['steer','jump']});const d=await p.api.init();assert.equal(d.tutorialCourse,false);assert.deepEqual(plain(d.tutorialSteps),[]);
 const t=await setup({sourceRoot,flagGuide:true,tutorialCourse:true,tutorialSteps:['steer','jump']});t.click('start');assert.equal(t.elements.coach.hidden,true);assert.equal(t.ctx.River3DApp.game.practiceReplay,undefined);
 t.click('pause');t.click('run-guide-open');t.click('guide-replay');t.click('replay-jump');assert.equal(t.elements.coach.hidden,false);assert.equal(t.elements['coach-title'].textContent,'先练轻点起跳、落稳');
});
