import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import '../model.js';
import {setup as uiSetup} from '../scripts/lib/four-stage-ui-harness.mjs';
const R=globalThis.River3D;
function quiet(g){g.gap=200;g.entities=[];g.bankSites=[];g.routeEvents=[];g.next=g.goldNext=g.supplyNext=g.bankNext=g.flagNext=1e9;}
function world(){const g=new R.Game(137);g.start();quiet(g);g.drain();return g;}
function earn(g,source){if(source==='gold'){for(let i=0;i<5;i++)g.add('coin',g.distance,1);g.step(.001);}else for(let i=0;i<3;i++)g.reward('dodge',35,'row-'+g.combo+'-'+i);}
function step(g,seconds){for(let i=0;i<Math.round(seconds*1000);i++)g.step(.001);}
test('both real reward paths immediately start the same surf, without input or a gap threshold',()=>{
 assert.equal(R.balance.surf,R.balance.gold);
 for(const source of ['gold','combo'])for(const gap of [100,10.01,10,9.99,1]){
  const g=world();g.gap=gap;earn(g,source);
  assert.equal(g.goldCharge,0);assert.equal(g.surfChargeSource,'');assert.equal(g.goldBoost,R.balance.surf.seconds);assert.equal(g.burstExtra(),R.balance.surf.extra);assert.equal(g.speedReason(),'冲浪');
  assert.equal(g.drain().filter(e=>e.type==='boost'&&e.data===source).length,1);
 }
});
test('automatic activation grants no distance or gap and repeats neither the event nor duration',()=>{
 const g=world(),before=[g.distance,g.gap,g.y,g.targetZ];earn(g,'combo');assert.deepEqual([g.distance,g.gap,g.y,g.targetZ],before);
 g.drain();step(g,.5);assert(Math.abs(g.goldBoost-(R.balance.surf.seconds-.5))<1e-8);assert.equal(g.drain().filter(e=>e.type==='boost').length,0);
 step(g,1.51);assert.equal(g.goldBoost,0);
});
test('mixed rewards keep just one pending charge without replacing its source or extending the active surf',()=>{
 for(const first of ['gold','combo']){
  const g=world();earn(g,first);step(g,.25);const remaining=g.goldBoost;
  const second=first==='gold'?'combo':'gold';earn(g,second);const after=g.goldBoost;
  assert(after<=remaining);assert.equal(g.goldCharge,1);assert.equal(g.surfChargeSource,second);
  assert.equal(g.reserveSurf(first),false);assert.equal(g.surfChargeSource,second);assert.equal(g.goldBoost,after);
  g.drain();step(g,after+.002);assert.equal(g.goldCharge,0);assert(g.goldBoost>R.balance.surf.seconds-.01);
  assert.deepEqual(g.drain().filter(e=>e.type==='boost').map(e=>e.data),[second]);
 }
});
test('a stronger kick or equal tow waits out before the pending surf starts automatically',()=>{
 for(const field of ['escape','boost','goldBoost','tow']){
  const g=world();if(field==='tow'){g.z=g.targetZ=3.7;g.tow={remaining:.5,side:1};}else g[field]=.5;
  earn(g,'combo');assert.equal(g.goldCharge,1);g.drain();step(g,.25);assert.equal(g.goldCharge,1);assert.equal(g.drain().filter(e=>e.type==='boost').length,0);
  step(g,.26);assert.equal(g.goldCharge,0);assert(g.goldBoost>R.balance.surf.seconds-.02);assert.equal(g.drain().filter(e=>e.type==='boost').length,1);
 }
});
test('pause and practice do not consume pending surfing; a real crash clears it',()=>{
 const g=world();g.escape=1;earn(g,'combo');g.mode='pause';const state=JSON.stringify(g);g.step(.05);assert.equal(JSON.stringify(g),state);
 g.mode='play';g.crash('test');assert.equal(g.goldCharge,0);assert.equal(g.goldBoost,0);assert.equal(g.surfChargeSource,'');assert.equal(g.comboBoosts,0);
 const p=world();p.practiceReplay=true;earn(p,'combo');assert.equal(p.goldCharge,0);assert.equal(p.goldBoost,0);assert.equal(p.comboBoosts,0);
});
test('combo honors count actual automatic starts, while pending charges and coin surfs do not count',()=>{
 const g=world();g.escape=1;earn(g,'combo');assert.equal(g.comboBoosts,0);step(g,1.01);assert.equal(g.comboBoosts,1);step(g,.5);assert.equal(g.comboBoosts,1);
 const h=world();earn(h,'gold');assert.equal(h.comboBoosts,0);
});
test('automatic coin and combo surfs show one effect and the bottom status without a swipe guide',async()=>{
 for(const source of ['gold','combo']){
  const t=await uiSetup({sourceRoot:fileURLToPath(new URL('../',import.meta.url)),flagGuide:true});t.click('start');const g=t.ctx.River3DApp.game;quiet(g);g.initHonors(t.ctx.River3D.honors.map(h=>h.id),0);
  earn(g,source);t.tick(50);t.tick(50);
  assert.equal(t.elements['gold-swipe-guide'],undefined);assert.equal(g.goldCharge,0);assert(g.goldBoost>0);
  assert.equal(t.ctx.renderer.bursts.filter(x=>x==='boost').length,1);assert.match(t.elements['combo-next'].textContent,/正在冲浪/);assert.match(t.elements['rule-gold-summary'].textContent,/自动触发/);
  t.tick(50);assert.equal(t.ctx.renderer.bursts.filter(x=>x==='boost').length,1);
 }
});
