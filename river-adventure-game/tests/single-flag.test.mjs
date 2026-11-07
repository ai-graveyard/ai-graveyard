import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import '../model.js';
import '../four-stage.js';
import {setup} from '../scripts/lib/four-stage-ui-harness.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),R=globalThis.River3D;
const fields=['flagSpeed','flagMagnet','flagGuard'],timers={1:[3,0,0],2:[0,8,0],3:[0,0,10],5:[0,0,0]};
function world(){const g=new R.Game(305029);g.start();g.entities=[];g.routeEvents=[];g.flags=[];g.bankSites=[];g.events=[];g.gap=20;return g;}
function pickup(g,skin){g.flags=[{id:1,skin,x:g.distance+1,z:g.z,done:false}];g.checkFlags(g.distance,g.z);}
const tick=(t,n=4)=>{for(let i=0;i<n;i++)t.tick(40);};
test('all sixteen replacement pairs leave exactly the new flag active, including same-kind refresh and gold',()=>{
 for(const old of [1,2,3,5])for(const next of [1,2,3,5]){const g=world();pickup(g,old);const beforeCoins=g.coins,serial=g.flagSerial;g.step(.01);pickup(g,next);assert.deepEqual(fields.map(k=>g[k]),timers[next]);assert.equal(g.flagSkin,next);assert.equal(g.flagSerial,serial+1);assert.equal(g.coins,beforeCoins+(next===5?8:0));}
});
test('speed stops immediately and a replaced shield cannot block the next collision',()=>{
 const g=world();pickup(g,1);assert.equal(g.travelSpeed(),12);pickup(g,2);assert.equal(g.travelSpeed(),8);pickup(g,3);pickup(g,5);g.crash('撞上了礁石');assert(g.stumble>0);assert.equal(g.flagGuard,0);
});
test('replacing magnet disables vertical collection immediately; collected coins remain earned',()=>{
 const g=world();pickup(g,2);g.add('coin',g.distance+1,4,{z:0});g.step(1/120);assert.equal(g.coins,1);pickup(g,3);const c=g.add('coin',g.distance+1,4,{z:0});g.step(1/120);assert(!c.done);assert.equal(g.coins,1);
});
test('ordinary surfing, companions and banked gold survive flag replacement',()=>{
 const g=world();g.goldBoost=2;g.goldCharge=1;g.boardBuddy('otter');g.boardBuddy('turtle');pickup(g,5);pickup(g,1);pickup(g,2);assert.equal(g.coins,8);assert.equal(g.goldBoost,2);assert.equal(g.goldCharge,1);assert(g.has('otter'));assert(g.has('turtle'));assert.deepEqual(fields.map(k=>g[k]),[0,8,0]);
});
test('legacy appearance flags end old powers and invalid flags do not replace a valid one',()=>{
 const g=world();pickup(g,3);pickup(g,4);assert.equal(g.flagSkin,4);assert.equal(g.flagGuard,0);pickup(g,2);const serial=g.flagSerial;g.activateFlag(99);assert.equal(g.flagSkin,2);assert.equal(g.flagMagnet,8);assert.equal(g.flagSerial,serial);
});
test('HUD shows only the current flag and suppresses old gold, magnet notices and the next flag cue',async()=>{
 const t=await setup({sourceRoot:root,flagGuide:true});t.click('start');const g=t.ctx.River3DApp.game;g.entities=[];g.routeEvents=[];g.flags=[];g.bankSites=[];g.gap=20;
 for(const skin of [5,1,2,3]){pickup(g,skin);tick(t);const visible=['speed','magnet','guard'].filter(k=>!t.elements['flag-status-'+k].hidden);assert.deepEqual(visible,skin===5?[]:[R.flagStyle(skin).effect]);if(skin!==5)assert(t.elements['coin-feedback'].hidden);assert(t.elements['flag-cue'].hidden);}
 pickup(g,2);tick(t);g.add('coin',g.distance+1,4,{z:0});tick(t);assert(t.elements['coin-feedback'].hidden);assert.equal(g.coins,9);assert(!t.elements['flag-status-magnet'].hidden);
});
function renderFixture(){const c=vm.createContext({});c.window=c;for(const file of ['model.js','four-stage.js','renderer.js'])vm.runInContext(fs.readFileSync(root+file,'utf8'),c);const g=new c.River3D.Game(305029);g.start();const r=Object.create(c.RiverRenderer.prototype);Object.assign(r,{low:true,reducedMotion:false,particles:[],coinPops:[],impact:0});return {g,r};}
test('replacement synchronously clears all prior flag visuals but retains ordinary coin effects',()=>{
 const {g,r}=renderFixture();g.activateFlag(5);r.burst(g,'flag',0,{skin:5,effect:'gold',serial:g.flagSerial,x:0,z:0});assert(r.flagGold);g.activateFlag(2);r.burst(g,'flag',0,{skin:2,effect:'magnet',serial:g.flagSerial,x:0,z:0});assert.equal(r.flagGold,null);
 r.burst(g,'coin',0,{x:0,y:4,z:0,magnet:true,flagSerial:g.flagSerial});r.burst(g,'coin',0,{x:0,y:1,z:0,magnet:false});r.flagBlock={run:g,born:g.time};assert(r.coinPops.some(p=>p.magnet));g.activateFlag(3);r.burst(g,'flag',0,{skin:3,effect:'guard',serial:g.flagSerial,x:0,z:0});assert.equal(r.flagGold,null);assert.equal(r.flagBlock,null);assert(!r.coinPops.some(p=>p.magnet));assert(r.coinPops.some(p=>!p.magnet));assert(!r.particles.some(p=>p.magnet));
});
test('stale flag or magnetic-coin events cannot revive old visuals after a later replacement',()=>{
 const {g,r}=renderFixture();g.activateFlag(5);const old=g.flagSerial;g.activateFlag(3);r.burst(g,'flag',0,{skin:5,effect:'gold',serial:old});assert.equal(r.flagGold,null);r.burst(g,'coin',0,{magnet:true,flagSerial:old});assert.equal(r.coinPops.length,0);
});

test('a delayed old guard contact cannot create shield fragments on a newly equipped flag',()=>{
 const {g,r}=renderFixture();g.activateFlag(3);g.flagGuard=0;g.activateFlag(1);r.burst(g,'flag-guard',0);assert.equal(r.flagBlock,null);g.activateFlag(3);r.burst(g,'flag-guard',0);assert.equal(r.flagBlock,null);g.flagGuard=0;r.burst(g,'flag-guard',0);assert(r.flagBlock);
});

test('deferred teaching follows the currently equipped flag after another replacement',async()=>{
 const t=await setup({sourceRoot:root,flagLessons:[]});t.click('start');const g=t.ctx.River3DApp.game;g.entities=[];g.routeEvents=[];g.flags=[];g.bankSites=[];g.gap=20;g.add('rock',g.distance+5,0,{z:0});pickup(g,5);tick(t,1);assert.equal(t.ctx.River3DApp.mode,'play');pickup(g,3);g.entities=[];tick(t);assert.equal(t.ctx.River3DApp.mode,'flag-intro');assert.match(t.elements['flag-intro-title'].textContent,/挡撞/);assert.equal(g.flagMagnet,0);assert.equal(g.flagSpeed,0);assert(g.flagGuard>0);
});
