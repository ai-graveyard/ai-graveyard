import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const code=fs.readFileSync(new URL('../platform.js',import.meta.url),'utf8');
function platform(raw={},readFail=false){let saved,writes=0;const win={xhs:{launchOptions:{miniToolEnv:{buildVersion:9510000}},miniTool:{getStorage:async()=>{if(readFail)throw Error('locked');return {data:JSON.stringify(raw)};},setStorage:async p=>{saved=JSON.parse(p.data);writes++;}}}};vm.runInNewContext(code,{window:win,document:{documentElement:{style:{setProperty(){}}}}});return {api:win.RiverPlatform,saved:()=>saved,writes:()=>writes};}
test('guide count persists monotonically across reload alongside preferences and progress',async()=>{
 const p=platform({goldSwipeGuides:1,totalCoins:77,runs:4});const d=await p.api.init();assert.equal(d.goldSwipeGuides,1);await Promise.all([p.api.recordGoldSwipeGuide(2),p.api.setPreference('sound',false)]);await p.api.recordGoldSwipeGuide(1);assert.equal(p.saved().goldSwipeGuides,2);assert.equal(p.saved().totalCoins,77);assert.equal(p.saved().runs,4);assert.equal(p.saved().settings.sound,false);const reloaded=platform(p.saved());assert.equal((await reloaded.api.init()).goldSwipeGuides,2);
});
test('missing or invalid saved count is bounded and invalid updates never write',async()=>{
 for(const [raw,want] of [[{},0],[{goldSwipeGuides:-3},0],[{goldSwipeGuides:80},3],[{goldSwipeGuides:'bad'},0]])assert.equal((await platform(raw).api.init()).goldSwipeGuides,want);
 const p=platform();for(const count of [0,-1,4,1.5,'2',NaN])assert.equal(await p.api.recordGoldSwipeGuide(count),false);assert.equal(p.writes(),0);
});
test('unavailable storage keeps the count in memory without overwriting unread progress',async()=>{
 const p=platform({},true);const d=await p.api.init();assert.equal(await p.api.recordGoldSwipeGuide(1),false);assert.equal(d.goldSwipeGuides,1);assert.equal(p.writes(),0);
});
