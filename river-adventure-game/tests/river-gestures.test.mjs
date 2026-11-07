import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {setup} from '../scripts/lib/four-stage-ui-harness.mjs';
const sourceRoot=fileURLToPath(new URL('../',import.meta.url));
async function ui(){const t=await setup({sourceRoot,flagGuide:true});t.click('start');const g=t.ctx.River3DApp.game;g.routeEvents=[];g.entities=[];g.gap=100;return t;}
function drag(t,dx,dy,type='pointerup'){
 t.event('scene','pointerdown',{pointerId:1,clientX:180,clientY:350,currentTarget:t.elements.scene});
 t.event('scene',type,{pointerId:1,clientX:180+dx,clientY:350+dy});
}
test('vertical swipes neither release pending surfing nor jump or change lanes',async()=>{
 for(const dy of [-70,70]){const t=await ui(),g=t.ctx.River3DApp.game;g.goldCharge=1;g.escape=1;drag(t,0,dy);assert.equal(g.goldCharge,1);assert.equal(g.goldBoost,0);assert.equal(g.y,0);assert.equal(g.targetZ,0);assert.equal(g.held,false);}
});
test('horizontal swipes still change one lane; tapping still jumps',async()=>{
 const t=await ui(),g=t.ctx.River3DApp.game;drag(t,-80,0);assert.equal(g.targetZ,-3.7);assert.equal(g.y,0);drag(t,0,0);assert(g.y>0);assert.equal(g.held,false);
});
test('cancelled swipes never create a tap or acceleration',async()=>{
 const t=await ui(),g=t.ctx.River3DApp.game;drag(t,0,-70,'pointercancel');assert.equal(g.y,0);assert.equal(g.goldBoost,0);assert.equal(g.targetZ,0);
});
test('automatic surfing resumes after pause without replaying old swipe teaching records',async()=>{
 const t=await ui(),g=t.ctx.River3DApp.game;let writes=0;t.ctx.skinData.goldSwipeGuides=0;t.ctx.RiverPlatform.recordGoldSwipeGuide=async()=>{writes++;return true;};
 t.click('pause');g.goldCharge=1;g.surfChargeSource='gold';for(let i=0;i<5;i++)t.tick(50);assert.equal(g.goldCharge,1);assert.equal(g.goldBoost,0);
 t.click('resume');t.tick(50);t.tick(50);assert.equal(g.goldCharge,0);assert(g.goldBoost>0);assert.equal(writes,0);assert.equal(t.elements['gold-swipe-guide'],undefined);
});
