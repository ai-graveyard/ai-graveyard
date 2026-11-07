import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../ranking.js',import.meta.url),'utf8');
function setup(overrides={},data={best:5432,bestCoins:73},version=9510){
 const calls=[],delays=[];let now=0;
 const api={getRankList:async({board})=>({data:Array.from({length:100},(_,i)=>({rank:i+1,score:board===1?12-i/1000:200-i,nickname:i?'船长'+i:null}))}),getMyRank:async()=>({status:'NO_SCORE',rank:null,score:null}),submitScore:async x=>({score:x.score}),...overrides};
 for(const k of Object.keys(api)){const f=api[k];api[k]=x=>{calls.push({name:k,...x});return f(x);};}
 const root={xhs:{miniTool:api},setTimeout:(f,ms)=>{if(ms!==6000){delays.push(ms);queueMicrotask(f);}return 1;},clearTimeout(){}};
 const clock=class extends Date{static now(){return now;}};
 vm.runInNewContext(source,{window:root,Date:clock});
 const platform={init:async()=>data,getClientVersion:()=>version};
 return {service:root.RiverRanking.create(platform),calls,delays,advance:()=>now+=30001};
}
test('uses two independent all-time boards, keeps at most 100, converts km back to integer meters and caches 30s',async()=>{
 const t=setup();const a=await t.service.load('distance');assert.equal(a.rows.length,100);assert.equal(a.rows[0].value,12000);assert.equal(a.rows[0].nickname,'漂流船长');assert.equal(t.calls[0].board,1);assert.equal(t.calls[1].board,1);
 await t.service.load('distance');assert.equal(t.calls.length,2);await t.service.load('coins');assert.equal(t.calls[2].board,2);assert.equal(t.calls[2].period,'all');assert(!('limit'in t.calls[2]));assert(t.calls.every(c=>c.board===1||c.board===2));
 t.advance();await t.service.load('distance');assert.equal(t.calls.length,6);
});
test('each run submits absolute independent personal bests once, never lifetime coins',async()=>{
 const t=setup({}, {best:1234567,bestCoins:44,totalCoins:99999});const run={};await Promise.all([t.service.submit(run),t.service.submit(run)]);
 const writes=t.calls.filter(c=>c.name==='submitScore');assert.equal(writes.length,2);assert.equal(writes[0].score,1234.567);assert.equal(writes[1].score,44);
});
test('a stronger cloud result is never overwritten and no cloud-storage APIs are needed',async()=>{
 const t=setup({getMyRank:async({board})=>({status:'EXACT',rank:120,score:999})});assert.equal((await t.service.submit({})).state,'submitted');assert.equal(t.calls.filter(c=>c.name==='submitScore').length,0);
});
test('unknown writes are not retried; the other board still submits and a later run reconciles',async()=>{
 let first=true;const t=setup({submitScore:async x=>{if(x.board===1&&first){first=false;throw {errCode:2004};}return {score:x.score};}});
 assert.equal((await t.service.submit({})).state,'pending');assert.equal(t.calls.filter(c=>c.name==='submitScore').length,2);
 assert.equal((await t.service.submit({})).state,'submitted');assert.equal(t.calls.filter(c=>c.name==='submitScore').length,4);
});
test('500+ and nonparticipation accept null score, malformed exact scores fail without suppressing list',async()=>{
 for(const status of ['OVER_LIMIT','NO_SCORE','NOT_PARTICIPATING']){const t=setup({getMyRank:async()=>({status,rank:null,score:null})});assert.equal((await t.service.load('distance')).mine.status,status);}
 for(const score of [null,'5',NaN,-1]){const t=setup({getMyRank:async()=>({status:'EXACT',rank:1,score})});const result=await t.service.load('distance');assert(result.mineError);assert.equal(result.rows.length,100);}
});
test('building-cache failures back off finitely and never turn into an empty leaderboard',async()=>{
 const t=setup({getRankList:async()=>{throw {errCode:2002};}});const result=await t.service.load('distance');assert(result.listError);assert.equal(result.rows,undefined);assert.deepEqual(t.delays,[500,1000,2000,4000]);
});
test('authorization denial and unsupported client use personal records without repeated API calls',async()=>{
 const t=setup({getRankList:async()=>{throw {errCode:1005};}});assert((await t.service.load('distance')).local);const n=t.calls.length;assert((await t.service.load('coins')).local);assert.equal(t.calls.length,n);
 const old=setup({},undefined,9500);assert((await old.service.load('distance')).local);assert.equal(old.calls.length,0);
});
test('tutorial replays never submit and over-range coins never clamp to a fake record',async()=>{
 const t=setup();assert.equal((await t.service.submit({practiceReplay:true})).state,'practice');assert.equal(t.calls.length,0);
 const huge=setup({}, {best:1500000,bestCoins:1000001});assert.equal((await huge.service.submit({})).boards.coins,'range');assert.equal(huge.calls.filter(c=>c.name==='submitScore').length,1);
});
test('a stale in-flight read cannot repopulate the cache after a score write',async()=>{
 let release;const t=setup({getRankList:()=>new Promise(r=>release=r)});const old=t.service.load('distance');for(let i=0;i<8;i++)await Promise.resolve();await t.service.submit({});release({data:[]});await old;
 const fresh=t.service.load('distance');for(let i=0;i<8;i++)await Promise.resolve();assert.equal(t.calls.filter(c=>c.name==='getRankList'&&c.board===1).length,2);release({data:[]});await fresh;
});

test('both failed and won four-stage runs submit to the existing boards after real save',async()=>{
 for(const won of [false,true]){
  const writes=[],stored=[];
  const root={setTimeout,clearTimeout,xhs:{launchOptions:{miniToolEnv:{buildVersion:9510000}},miniTool:{
   getStorage:async()=>({data:null}),setStorage:async p=>stored.push(JSON.parse(p.data)),
   getRankList:async()=>({data:[]}),getMyRank:async()=>({status:'NO_SCORE'}),
   submitScore:async p=>{writes.push(p);return {score:p.score};}
  }}};
  const ctx=vm.createContext({window:root,globalThis:root,document:{documentElement:{style:{setProperty(){}}}}});
  for(const file of ['model.js','four-stage.js','platform.js','ranking.js'])vm.runInContext(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),ctx);
  const g=new root.River3D.Game(31029);g.start();g.campaignWon=won;g.mode=won?'won':'over';g.distance=1432.8;g.coins=57;
  assert.equal(await root.RiverPlatform.save(g),true);
  const service=root.RiverRanking.create(root.RiverPlatform),result=await service.submit(g);
  assert.equal(result.state,'submitted');assert.equal(writes.length,2);
  assert.equal(writes[0].board,1);assert.equal(writes[0].score,1.432);
  assert.equal(writes[1].board,2);assert.equal(writes[1].score,57);
  assert.equal(stored[0].best,1432);assert.equal(stored[0].runs,1);
  await service.submit(g);assert.equal(writes.length,2);
  const practice=new root.River3D.Game(31029);practice.practiceReplay=true;
  assert.equal((await service.submit(practice)).state,'practice');assert.equal(writes.length,2);
 }
});
