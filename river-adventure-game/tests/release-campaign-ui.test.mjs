import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {setup} from '../scripts/lib/four-stage-ui-harness.mjs';
const sourceRoot=fileURLToPath(new URL('../',import.meta.url));

test('fourth-stage HUD shows the finish and both late stages expose active wind cues',async()=>{
 const t=await setup({sourceRoot,flagGuide:true});t.click('start');
 const g=t.ctx.River3DApp.game;g.advance=()=>{};g.stageIndex=3;g.currentForce=0;
 for(let i=0;i<3;i++)t.tick(50);
 assert.match(t.elements['river-next'].textContent,/抵达终点/);
 assert.doesNotMatch(t.elements['river-next'].textContent,/开启下一程/);
 for(const [stage,direction,arrow] of [[2,1,'→'],[3,-1,'←']]){
  g.stageIndex=stage;g.currentForce=direction;g.windTime=.5;
  for(let i=0;i<3;i++)t.tick(50);
  assert.match(t.elements['river-next'].textContent,new RegExp(arrow+' 每2秒推一列 · 1.5秒'));
 }
});

test('honor retries distinguish the next stage, the final stage and an ended run',async()=>{
 const t=await setup({sourceRoot,flagGuide:true});t.click('start');
 const g=t.ctx.River3DApp.game;
 g.stageIndex=2;g.honorLap.lap=3;g.emit('impact',{});
 for(const id of ['c14','c24'])assert.match(g.honorDetail(id),/下关再试/);
 assert.match(g.honorDetail('c20'),/下局再试/);
 g.stageIndex=3;g.honorLap.lap=4;
 for(const id of ['c14','c20','c24']){
  assert.match(g.honorDetail(id),/下局再试/);
  assert.doesNotMatch(g.honorDetail(id),/下关|第5关/);
 }
 g.honorLap.impacts=0;g.expertCleanLaps=0;
 assert.match(g.honorDetail('c20'),/本局已中断/);
 g.campaignWon=true;g.honorLap.lap=5;
 for(const id of ['c14','c20','c24'])assert.match(g.honorDetail(id),/本局已结束/);
});

async function leaderboard(campaign,mine){
 const elements={},node=()=>({hidden:true,textContent:'',children:[],events:{},classList:{add(){},remove(){}},setAttribute(){},focus(){},addEventListener(k,f){this.events[k]=f;},appendChild(){}});
 const doc={getElementById(id){return elements[id]||(elements[id]=node());},body:node(),createDocumentFragment:node};
 const win={document:doc,River3D:{campaign},RiverRanking:{boards:{distance:{key:'best',unit:'米'},coins:{key:'bestCoins',unit:'枚'}},create:()=>({available:()=>true,load:async()=>({rows:[],mine})})}};
 const ctx={window:win,RiverRanking:win.RiverRanking};vm.createContext(ctx);
 vm.runInContext(fs.readFileSync(sourceRoot+'leaderboard.js','utf8'),ctx);
 win.RiverLeaderboard.create({platform:{init:async()=>({best:500,bestCoins:20})}});
 elements['rank-open'].events.click();
 for(let i=0;i<8;i++)await Promise.resolve();
 return elements;
}
test('campaign boards invite formal submissions and show pending records truthfully',async()=>{
 for(const status of ['NO_SCORE','NOT_PARTICIPATING']){
  const e=await leaderboard(true,{status});
  assert.match(e['rank-rule'].textContent,/单局最远距离.*保留历史成绩/);
  assert.match(e['rank-status'].textContent,/还没有上榜成绩/);
  assert.match(e['rank-mine'].textContent,/完成一局即可参与/);
  assert.doesNotMatch(e['rank-rule'].textContent,/仅记个人|旧版历史榜/);
 }
 const e=await leaderboard(true,{status:'EXACT',rank:2,value:100});
 assert.match(e['rank-mine'].textContent,/我的排名 #2/);
 assert.match(e['rank-local'].textContent,/待同步/);
 const higher=await leaderboard(true,{status:'EXACT',rank:1,value:900});
 assert.doesNotMatch(higher['rank-local'].textContent,/待同步/);
 const legacy=await leaderboard(false,{status:'EXACT',rank:2,value:100});
 assert.match(legacy['rank-local'].textContent,/待同步/);
});
