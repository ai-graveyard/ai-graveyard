import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {setup} from '../scripts/lib/four-stage-ui-harness.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const tick=(t,n=4)=>{for(let i=0;i<n;i++)t.tick(40);};
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
function quiet(g){g.entities=[];g.routeEvents=[];g.flags=[];g.bankSites=[];g.gap=20;}
function offer(g,skin,lead=20){g.flags=[{id:77,skin,x:g.distance+lead,z:0,done:false}];}
const snapshot=g=>[g.time,g.distance,g.gap,g.coins,g.score,g.flagSpeed,g.flagMagnet,g.flagGuard,g.targetZ,g.y];
test('old appearance learning does not skip the first functional flag lesson; reading freezes all gameplay and clears input',async()=>{
 const t=await setup({sourceRoot:root,flagGuide:true,flagLessons:[]});t.click('start');const g=t.ctx.River3DApp.game;quiet(g);offer(g,1);g.activateFlag(3);g.press();
 tick(t);assert.equal(t.ctx.River3DApp.mode,'flag-intro');assert.equal(t.elements['flag-intro'].hidden,false);assert.match(t.elements['flag-intro-title'].textContent,/加速/);assert.equal(g.held,false);
 const s=snapshot(g);tick(t,100);assert.deepEqual(snapshot(g),s);
 t.listeners.keydown({code:'ArrowRight',preventDefault(){}});t.listeners.keydown({code:'Space',preventDefault(){}});assert.deepEqual(snapshot(g),s);assert.equal(g.held,false);
 t.click('flag-intro-next');assert.equal(t.ctx.River3DApp.mode,'play');assert.equal(t.ctx.document.activeElement,t.elements.action);assert.equal(g.held,false);tick(t);assert(g.time>s[0]);await flush();assert.deepEqual(t.ctx.flagLessonSaves,['speed']);
});
test('each function teaches once per session, including when persistence fails',async()=>{
 const t=await setup({sourceRoot:root,flagLessons:[],flagLessonSave:false});t.click('start');const g=t.ctx.River3DApp.game;quiet(g);
 for(const [skin,copy] of [[1,'加速'],[5,'金币'],[2,'吸金币'],[3,'挡撞']]){
  offer(g,skin);tick(t);assert.equal(t.ctx.River3DApp.mode,'flag-intro');assert.match(t.elements['flag-intro-title'].textContent,new RegExp(copy));t.click('flag-intro-next');await flush();offer(g,skin);tick(t);assert.equal(t.ctx.River3DApp.mode,'play');
 }
 assert.deepEqual(Array.from(t.ctx.flagLessonSaves),['speed','gold','magnet','guard']);assert.match(t.elements['mode-note'].textContent,/暂未保存/);
});
test('known functions never interrupt play and first lessons wait through danger and airborne states',async()=>{
 const t=await setup({sourceRoot:root,flagLessons:['speed']});t.click('start');const g=t.ctx.River3DApp.game;quiet(g);offer(g,1);tick(t);assert.equal(t.ctx.River3DApp.mode,'play');
 offer(g,5);g.add('rock',g.distance+4,0,{z:0});tick(t,1);assert.equal(t.ctx.River3DApp.mode,'play');g.entities=[];g.y=2;g.vy=2;tick(t);assert.equal(t.ctx.River3DApp.mode,'play');g.y=0;g.vy=0;tick(t);assert.equal(t.ctx.River3DApp.mode,'flag-intro');
});
test('a collected flag queues its lesson if the pre-pickup window was missed',async()=>{
 const t=await setup({sourceRoot:root,flagLessons:[]});t.click('start');const g=t.ctx.River3DApp.game;quiet(g);offer(g,5,1);tick(t);
 assert.equal(g.coins,8);assert.equal(t.ctx.River3DApp.mode,'flag-intro');assert.match(t.elements['flag-intro-next'].textContent,/继续漂流/);const s=snapshot(g);tick(t,60);assert.deepEqual(snapshot(g),s);assert.equal(g.coins,8);
});
test('learning card traps focus, Escape confirms and preserves an active optional practice',async()=>{
 const t=await setup({sourceRoot:root,flagLessons:[]});t.click('start');const g=t.ctx.River3DApp.game;quiet(g);const p=t.ctx.River3DApp.lessonPace;p.begin('jump',g,g.distance+100);p.active.optional=true;p.release(g);const active=p.active;offer(g,1);tick(t);
 assert.equal(t.ctx.River3DApp.mode,'flag-intro');assert.equal(p.active,active);t.listeners.keydown({code:'Tab',preventDefault(){}});assert.equal(t.ctx.document.activeElement,t.elements['flag-intro-content']);t.listeners.keydown({code:'Tab',shiftKey:true,preventDefault(){}});assert.equal(t.ctx.document.activeElement,t.elements['flag-intro-next']);t.listeners.keydown({code:'Escape',preventDefault(){}});assert.equal(t.ctx.River3DApp.mode,'play');assert.equal(p.active,active);
});
test('backgrounding the card does not confirm or resume it; practice replay never consumes formal flag knowledge',async()=>{
 const t=await setup({sourceRoot:root,flagLessons:[]});t.click('start');const g=t.ctx.River3DApp.game;quiet(g);offer(g,1);tick(t);const s=snapshot(g);t.ctx.document.hidden=true;t.listeners['doc:visibilitychange']();tick(t,30);assert.deepEqual(snapshot(g),s);assert.equal(t.ctx.flagLessonSaves,undefined);t.ctx.document.hidden=false;t.listeners['doc:visibilitychange']();tick(t);assert.equal(t.ctx.River3DApp.mode,'flag-intro');
 const p=await setup({sourceRoot:root,flagLessons:[]});p.click('start');p.click('pause');p.click('run-guide-open');p.click('guide-replay');p.click('replay-flag');p.click('skip-coach');const practice=p.ctx.River3DApp.game;offer(practice,1);tick(p);assert.equal(p.ctx.River3DApp.mode,'play');assert.equal(p.elements['flag-intro'].hidden,true);assert.equal(p.ctx.flagLessonSaves,undefined);
});
function platform(raw,fail=false){let stored=JSON.stringify(raw);const c={Promise,WeakMap,River3D:{balance:{version:'river-four-stage-obstacle-hard-20261105'}},document:{documentElement:{style:{setProperty(){}}}},xhs:{launchOptions:{miniToolEnv:{buildVersion:9460000}},miniTool:{getStorage:async()=>({data:stored}),setStorage:async p=>{if(fail)throw Error('storage failed');stored=p.data;}}}};c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync(root+'platform.js','utf8'),c);return {api:c.RiverPlatform,stored:()=>JSON.parse(stored)};}
test('functional knowledge validates IDs, persists/reloads independently and reset retains old assets',async()=>{
 const raw={balanceVersion:'river-four-stage-obstacle-hard-20261105',flagGuide:true,flagSkin:6,totalCoins:300,skin:3,badges:['c01'],flagLessons:['speed','bogus','speed']};const p=platform(raw),d=await p.api.init();assert.deepEqual(Array.from(d.flagLessons),['speed']);assert.equal(await p.api.completeFlagLesson('bogus'),false);
 for(const id of ['speed','gold','magnet','guard'])assert.equal(await p.api.completeFlagLesson(id),true);assert.deepEqual(Array.from((await platform(p.stored()).api.init()).flagLessons),['speed','gold','magnet','guard']);assert.equal(await p.api.resetTutorial(),true);assert.deepEqual(p.stored().flagLessons,[]);assert.equal(d.flagSkin,6);assert.equal(d.totalCoins,300);assert.equal(d.skin,3);assert.deepEqual(Array.from(d.badges),['c01']);
});
test('old saves require new flag lessons and failed writes do not silently become durable knowledge',async()=>{
 const raw={flagGuide:true,flagSkin:5,totalCoins:100};const p=platform(raw,true),d=await p.api.init();assert.equal(d.flagLessons.length,0);assert.equal(await p.api.completeFlagLesson('speed'),false);assert.equal(p.stored().flagLessons,undefined);assert.equal((await platform(p.stored()).api.init()).flagLessons.length,0);
});

function renderFixture(skin=3){const c=vm.createContext({});c.window=c;for(const file of ['model.js','four-stage.js','renderer.js'])vm.runInContext(fs.readFileSync(root+file,'utf8'),c);const g=new c.River3D.Game(31029);g.start();g.time=5;g.activateFlag(skin);const r=Object.create(c.RiverRenderer.prototype),draws=[];Object.assign(r,{low:false,reducedMotion:false,flagGold:null,flagBlock:null,farDetail:false});for(const name of ['loop','tube','quad','tri','box','coin','coinSpark'])r[name]=(...args)=>draws.push([name,...args]);return {g,r,draws};}
test('each flag geometry reads simulation state without advancing rewards; fixed-clock poses freeze and low quality keeps symbols',()=>{
 for(const skin of [1,2,3]){const {g,r,draws}=renderFixture(skin),before=JSON.stringify(g);r.flagPowerEffects(g);const first=JSON.stringify(draws);assert(draws.length>0);draws.length=0;r.flagPowerEffects(g);assert.equal(JSON.stringify(draws),first);assert.equal(JSON.stringify(g),before);const high=draws.length;draws.length=0;r.low=true;r.flagPowerEffects(g);assert(draws.length<high);assert(draws.length>0);assert.equal(JSON.stringify(g),before);}
});
test('gold celebration shows exactly eight coins, consumes no real coins and cannot leak into another run',()=>{
 const {g,r,draws}=renderFixture(5);r.flagGold={run:g,born:g.time-.36};g.coins=8;r.flagPowerEffects(g);assert.equal(draws.filter(d=>d[0]==='coin').length,8);assert.equal(g.coins,8);draws.length=0;r.flagGold.run={};r.flagPowerEffects(g);assert.equal(r.flagGold,null);assert.equal(draws.filter(d=>d[0]==='coin').length,0);
});
test('guard fragments expire in model time and reduced motion retains each single flag symbol',()=>{
 const {g,r,draws}=renderFixture(3);r.flagBlock={run:g,born:g.time,z:g.z};r.flagPowerEffects(g);const first=JSON.stringify(draws);draws.length=0;r.flagPowerEffects(g);assert.equal(JSON.stringify(draws),first);g.time+=.61;r.flagPowerEffects(g);assert.equal(r.flagBlock,null);
 for(const skin of [2,3]){const f=renderFixture(skin);f.r.reducedMotion=true;f.r.flagPowerEffects(f.g);assert(f.draws.some(d=>d[0]==='tube'));assert.equal(f.g.flagMagnet,skin===2?8:0);assert.equal(f.g.flagGuard,skin===3?10:0);}
});
test('an unsafe pickup retains its deferred lesson when the player enters and leaves a separate practice',async()=>{
 const t=await setup({sourceRoot:root,flagLessons:[]});t.click('start');const original=t.ctx.River3DApp.game;quiet(original);offer(original,5,1);original.add('rock',original.distance+5,0,{z:0});tick(t,1);assert.equal(original.coins,8);assert.equal(t.ctx.River3DApp.mode,'play');
 t.click('pause');t.click('run-guide-open');t.click('guide-replay');t.click('replay-flag');t.click('practice-exit');t.click('guide-close');t.click('guide-close');original.entities=[];original.flags=[];t.click('resume');tick(t);assert.equal(t.ctx.River3DApp.game,original);assert.equal(t.ctx.River3DApp.mode,'flag-intro');assert.match(t.elements['flag-intro-title'].textContent,/金币/);assert.equal(original.coins,8);
});
