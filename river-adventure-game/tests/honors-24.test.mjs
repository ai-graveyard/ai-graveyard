import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import '../model.js';
const {Game,honors,titleInfo}=globalThis.River3D;
const ids=honors.map(h=>h.id),old=ids.slice(0,12);
test('old twelve badge rules and title thresholds remain; 16/20/24 add new titles',()=>{
 assert.equal(honors.length,24);assert.equal(new Set(ids).size,24);
 assert.deepEqual(honors.slice(0,12).map(h=>h.target),[1,100,1,1,1,5,3,1,3,300,3,800]);
 assert.deepEqual([0,2,4,6,8,10,12,16,20,24].map(n=>titleInfo(ids.slice(0,n),0).name),['漂流学徒','浪花新秀','河谷好手','空翻达人','搭子船长','急流高手','河谷大师','远航专家','传奇船长','河流之王']);
 assert.equal(titleInfo(old,0).remaining,4);assert.equal(titleInfo([],6).name,'河谷大师');assert.equal(titleInfo([],6).remaining,16);assert.equal(titleInfo(ids.concat(ids,'c99'),0).count,24);
});
function game(){const g=new Game();g.start();return g;}
test('new thresholds award exactly at their boundary, once; unfinished goals reset',()=>{
 for(const h of honors.slice(12)){
  const g=game();g[h.key]=h.target-1;g.checkHonors();assert(!g.honors.includes(h.id),h.id);
  g[h.key]=h.target;g.checkHonors();assert(g.honors.includes(h.id),h.id);
  g.checkHonors();assert.equal(g.newHonors.filter(id=>id===h.id).length,1);
  const fresh=game();fresh.initHonors(g.honors,0);assert(fresh.honors.includes(h.id));
  assert.equal(fresh[h.key],0,h.key);
 }
});
test('same jump/row cannot multiply new action counters, ground flips do not count as ramp landings',()=>{
 const g=game();g.moveSerial=1;g.lastRewardKey='row-110';g.emit('dodge');g.emit('dodge');assert.equal(g.honorLap.dodges,1);
 g.emit('clear');g.emit('clear');assert.equal(g.clearJumps,1);
 g.flips=3;g.y=0;g.emit('flip');assert.equal(g.rampFlipLandings,0);
 g.flightEvent={id:1};g.emit('flip');g.emit('flip');assert.equal(g.rampFlipLandings,1);
 g.moveSerial++;g.emit('flip');assert.equal(g.rampFlipLandings,2);
 g.y=2;g.moveSerial++;g.emit('flip');assert.equal(g.rampFlipLandings,2);
});
test('only river pickups count as river coins; gold/tow/recovery boosts cannot grant combo badges',()=>{
 const g=game();g.bankReward({id:0,kind:0,side:-1,x:480},'fish',100);assert.equal(g.riverCoins,0);
 g.coins+=500;g.emit('lap-complete',{lap:1,coins:500});assert.equal(g.riverCoins,0);
 g.emit('coin',{});assert.equal(g.riverCoins,1);
 for(const b of ['gold','recover','tow','kick'])g.emit('boost',b);assert.equal(g.comboBoosts,0);
 g.emit('boost','combo');assert.equal(g.comboBoosts,1);
});
test('turtle protection, invulnerability contacts and bad protected landings all break clean-lap challenges',()=>{
 for(const kind of ['turtle','safe-impact','safe-landing','crash']){
  const g=game();if(kind==='turtle'){g.boardBuddy('turtle');g.crash('test');}if(kind==='safe-impact'){g.safe=2;g.emit('impact',{kind:'log'});}if(kind==='safe-landing'){g.safe=2;g.crash('bad landing');}if(kind==='crash')g.crash('test');
  g.finishHonorLap(1,true);g.checkHonors();assert.equal(g.bestCleanLaps,0,kind);assert(!g.honors.includes('c14'),kind);
  g.finishHonorLap(2,true);g.checkHonors();assert(g.honors.includes('c14'),kind);
 }
});
test('expert clean streak starts with journey three, resets at an impact and rejects incomplete or partial journeys',()=>{
 const g=game();g.finishHonorLap(1,true);g.finishHonorLap(2,true);assert.equal(g.bestExpertCleanLaps,0);
 g.finishHonorLap(3,true);assert.equal(g.expertCleanLaps,1);g.emit('impact',{});g.finishHonorLap(4,true);assert.equal(g.expertCleanLaps,0);
 for(const n of [5,6,7])g.finishHonorLap(n,true);g.checkHonors();assert(g.honors.includes('c20'));
 const partial=game();partial.finishHonorLap(3,true);assert.equal(partial.bestExpertCleanLaps,0);
 const failed=game();failed.finishHonorLap(1,false);assert.equal(failed.bestCleanLaps,0);
});
test('allround challenge needs every action in the same journey, a clean finish, and journey three or later',()=>{
 const required={dodges:2,clears:2,flips:1,deliveries:1};
 for(const missing of [...Object.keys(required),'impacts','finish','early']){
  const g=game();g.honorLap={lap:missing==='early'?2:3,impacts:0,...required};
  if(missing in required)g.honorLap[missing]--;
  if(missing==='impacts')g.honorLap.impacts=1;
  g.finishHonorLap(g.honorLap.lap,missing!=='finish');assert.equal(g.allRoundLaps,0,missing);
 }
 const g=game();g.honorLap={lap:3,impacts:0,...required};g.finishHonorLap(3,true);g.checkHonors();assert(g.honors.includes('c24'));
 const split=game();split.honorLap={lap:3,impacts:0,...required,deliveries:0};split.finishHonorLap(3,true);split.honorLap.deliveries=1;split.finishHonorLap(4,true);assert.equal(split.allRoundLaps,0);
});
test('replay practice cannot award any badge, river coin or new skill counter',()=>{
 const g=game();g.practiceReplay=true;for(const h of honors)g[h.key]=h.target;g.checkHonors();assert.deepEqual(g.honors,[]);
 const before=g.riverCoins;g.emit('coin',{});g.emit('clear');assert.equal(g.riverCoins,before);
});
function storage(raw,failRead=false,failWrite=false){
 let serialized=JSON.stringify(raw);
 const win={xhs:{launchOptions:{miniToolEnv:{buildVersion:9510000}},miniTool:{
  getStorage:async()=>{if(failRead)throw Error('read');return {data:serialized};},
  setStorage:async p=>{if(failWrite)throw Error('write');serialized=p.data;}
 }}};
 vm.runInNewContext(fs.readFileSync(new URL('../platform.js',import.meta.url),'utf8'),{window:win,document:{documentElement:{style:{setProperty(){}}}}});
 return {api:win.RiverPlatform,read:()=>JSON.parse(serialized)};
}
test('24 badge save merges, deduplicates and reloads while preserving old title, money and skins',async()=>{
 const c=storage({badges:old,honorFloor:6,totalCoins:150,skin:2,flagSkin:4,runs:8});const d=await c.api.init();
 await Promise.all([c.api.saveHonors(ids.slice(12).concat(['c24','c25','c00'])),c.api.saveHonorTracking('c24')]);
 assert.equal(d.badges.length,24);assert.equal(d.honorFloor,6);assert.equal(d.totalCoins,150);assert.equal(d.skin,2);assert.equal(d.flagSkin,4);assert.equal(d.runs,8);
 const reloaded=storage(c.read());const r=await reloaded.api.init();assert.equal(r.badges.length,24);assert.equal(r.trackedHonor,'c24');assert.equal(await c.api.saveHonorTracking('c25'),false);assert.equal(d.trackedHonor,'c24');
});
test('failed honor storage is honest and failed reads never overwrite native progress',async()=>{
 const c=storage({badges:old},false,true);assert.equal(await c.api.saveHonors(['c24']),false);assert((await c.api.init()).badges.includes('c24'));
 const unreadable=storage({badges:ids},true,false);assert.equal(await unreadable.api.saveHonors(['c01']),false);assert.equal(unreadable.read().badges.length,24);
});
test('all badge backgrounds have a local SVG and CSS; spritesheet v1 is no longer referenced',()=>{
 const css=fs.readFileSync(new URL('../brand.css',import.meta.url),'utf8');assert(!css.includes('badges-v1.webp'));
 for(const id of ids){assert(css.includes('badge-'+id));const art=fs.readFileSync(new URL('../assets/brand/honors-v2/'+id+'.svg',import.meta.url),'utf8');assert(art.includes('viewBox="0 0 64 64"'));assert(!/https?:\/\//.test(art.replace('http://www.w3.org/2000/svg','')));}
});
