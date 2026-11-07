import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {setup} from '../scripts/lib/four-stage-ui-harness.mjs';
const sourceRoot=fileURLToPath(new URL('../',import.meta.url));
test('flying stones use river markers without adding a footer warning, including near contact',async()=>{
 const t=await setup({sourceRoot,flagGuide:true});t.click('start');const g=t.ctx.River3DApp.game;g.stageIndex=2;g.stageStartedAt=0;g.time=0;g.entities=[];g.routeEvents=[];g.gap=100;
 const stone=g.add('rock',g.distance+150,.8,{projectile:true,z:0,prevZ:0,launchZ:0,targetZ:0,throwAt:12,flightSeconds:1.05});
 for(const distance of [150,15]){stone.x=g.distance+distance;for(let i=0;i<3;i++)t.tick(100);assert.equal(t.elements.approach.hidden,true);assert.notEqual(t.elements.approach.className,'stone-warning');}
 assert.equal(t.elements['stone-landing-lanes'],undefined);
});
