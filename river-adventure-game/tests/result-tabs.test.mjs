import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {setup} from '../scripts/lib/four-stage-ui-harness.mjs';
const sourceRoot=fileURLToPath(new URL('../',import.meta.url));
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
function end(t,reason='本次漂流结束'){
 const g=t.ctx.River3DApp.game;g.mode='over';g.emit('over',reason);t.tick(16);return g;
}

test('the independent detail dialog preserves the selected tab, ended run and single save',async()=>{
 let saves=0;const t=await setup({sourceRoot,save:async()=>{saves++;return true;}});
 t.click('start');const g=t.ctx.River3DApp.game;g.coins=38;g.score=3680;g.distance=1248;g.stageIndex=2;g.flips=8;g.bestCombo=6;g.rescues=3;
 end(t);await flush();
 assert.equal(t.elements['result-score'].hidden,false);assert.equal(t.elements['result-rewards'].hidden,true);
 assert.equal(t.elements['result-tab-score']['aria-selected'],'true');
 assert.equal(t.elements['result-heading'].hidden,false);assert.equal(t.elements['result-heading-title'].textContent,'这一程，辛苦啦');assert.equal(t.elements['result-record'].hidden,false);
 assert.equal(t.elements['result-highlights'].hidden,false);assert.match(t.elements['result-highlights'].innerHTML,/6<small>连/);assert.match(t.elements['result-highlights'].innerHTML,/3<small>位/);
 assert.equal(t.elements['result-coins'].textContent,'+38');assert.match(t.elements['result-stage'].textContent,/第 3 关止步/);
 const summary=t.elements['run-summary'].textContent,distance=g.distance;
 t.click('result-tab-rewards');assert.equal(t.elements['result-detail-open'].hidden,true);t.click('result-tab-score');t.click('result-detail-open');
 assert.equal(t.elements['result-details'].hidden,false);assert.equal(t.elements.overlay.hidden,true);
 assert.equal(t.elements['result-rewards'].hidden,true);assert.equal(t.elements['result-detail-open']['aria-expanded'],'true');
 assert.equal(t.elements['result-detail-distance'],undefined);assert.equal(t.elements['result-detail-route'],undefined);
 assert.match(t.elements['result-detail-metrics'].innerHTML,/灵巧绕行/);assert.match(t.elements['result-detail-metrics'].innerHTML,/送达鱼篮/);
 assert.doesNotMatch(t.elements['result-detail-metrics'].innerHTML,/最高连击|漂亮空翻|接上搭子/);
 assert.equal(t.elements['result-detail-next'],undefined);assert.equal(t.elements['result-detail-prev'],undefined);
 t.tick(100);await flush();assert.equal(g.distance,distance);assert.equal(t.elements['run-summary'].textContent,summary);
 t.click('result-detail-close');assert.equal(t.elements.overlay.hidden,false);assert.equal(t.elements['result-details'].hidden,true);
 assert.equal(t.elements['result-tab-score']['aria-selected'],'true');assert.equal(t.ctx.document.activeElement,t.elements['result-detail-open']);
 assert.equal(t.ctx.River3DApp.game,g);assert.equal(t.ctx.River3DApp.mode,'over');assert.equal(saves,1);
});

test('the record badge requires a strictly better distance and ordinary results use neutral copy',async()=>{
 const t=await setup({sourceRoot});t.ctx.skinData.best=1248;
 t.click('start');t.ctx.River3DApp.game.distance=1248;end(t);
 assert.equal(t.elements['result-record'].hidden,true);
 assert.equal(t.elements['result-heading-title'].textContent,'这一程，辛苦啦');
 t.click('restart');t.ctx.River3DApp.game.distance=1249;end(t);
 assert.equal(t.elements['result-record'].hidden,false);
 t.click('restart');const g=t.ctx.River3DApp.game;g.distance=1200;g.campaignWon=true;end(t);
 assert.equal(t.elements['result-record'].hidden,true);
 assert.equal(t.elements['result-heading-title'].textContent,'四关闯过啦');
});

test('compact detail keeps the commission total and dismisses without pagination',async()=>{
 const t=await setup({sourceRoot});t.click('start');const g=t.ctx.River3DApp.game;g.distance=150;g.rescues=3;g.flips=0;g.missionFlags=[false,true,false];
 end(t);t.click('result-detail-open');
 assert.equal(t.elements['result-detail-goal-count'].textContent,'1 / 3 完成');
 assert.equal(t.elements['result-detail-missions'],undefined);
 t.event('result-details','click',{target:t.elements['result-detail-content']});assert.equal(t.elements['result-details'].hidden,false);
 t.event('result-details','click',{target:t.elements['result-details']});assert.equal(t.elements['result-details'].hidden,true);
 assert.equal(t.ctx.document.activeElement,t.elements['result-detail-open']);
});

test('keyboard tabs, Escape and restart restore valid focus and clean results state',async()=>{
 const t=await setup({sourceRoot});t.click('start');end(t);
 t.event('result-tab-score','keydown',{key:'ArrowRight'});
 assert.equal(t.elements['result-tab-rewards']['tabindex'],'0');assert.equal(t.elements['result-tab-score']['tabindex'],'-1');
 assert.equal(t.ctx.document.activeElement,t.elements['result-tab-rewards']);
 t.event('result-tab-rewards','keydown',{key:'Home'});t.click('result-detail-open');
 t.listeners.keydown({code:'Escape',preventDefault(){}});
 assert.equal(t.elements['result-details'].hidden,true);assert.equal(t.ctx.document.activeElement,t.elements['result-detail-open']);
 t.event('result-tab-score','keydown',{key:'End'});t.click('restart');
 assert.equal(t.elements['result-tabs'].hidden,true);assert.equal(t.elements['result-extra'].hidden,true);
 t.click('pause');assert.equal(t.elements['result-heading'].hidden,true);assert.equal(t.elements['result-highlights'].hidden,true);assert.equal(t.elements['result-score'].hidden,false);assert.equal(t.elements['overlay-text'].hidden,false);assert.equal(t.elements['run-guide-open'].hidden,false);
 t.click('resume');end(t);assert.equal(t.elements['result-tab-score']['aria-selected'],'true');
});

test('failed save remains visible through both tabs, retries once and does not fake unlocks',async()=>{
 let saves=0,retries=0;const t=await setup({sourceRoot,totalCoins:39,save:async()=>{saves++;return false;}});
 t.ctx.RiverPlatform.retrySave=async()=>{retries++;return true;};
 t.click('start');t.ctx.River3DApp.game.coins=1;end(t);await flush();
 assert.equal(t.elements['result-save-status']['data-state'],'failed');assert.equal(t.elements['result-savebar'].hidden,false);
 assert.equal(t.elements['result-save-retry'].hidden,false);assert.doesNotMatch(t.elements['result-boat-progress'].textContent,/新船已解锁/);
 t.click('result-tab-rewards');assert.equal(t.elements['result-save-retry'].hidden,false);
 t.elements['result-save-retry'].focus();t.click('result-save-retry');
 assert.equal(t.ctx.document.activeElement,t.elements['result-tab-rewards']);
 t.click('result-save-retry');await flush();
 assert.equal(retries,1);assert.equal(saves,1);assert.equal(t.elements['result-save-status']['data-state'],'saved');
 assert.equal(t.elements['result-save-retry'].hidden,true);assert.equal(t.elements['result-boat-unlocks'].textContent,'新船 +1');assert.equal(t.elements['result-boats-open'].hidden,false);assert.match(t.elements['result-boat-progress'].textContent,/还差 60 枚/);
 assert.equal(t.elements['result-tab-rewards']['aria-selected'],'true');
 assert.equal(t.ctx.document.activeElement,t.elements['result-tab-rewards']);
});

test('late save responses cannot overwrite the next run or change the selected tab',async()=>{
 const pending=[],t=await setup({sourceRoot,save:()=>new Promise(resolve=>pending.push(resolve))});
 t.click('start');end(t,'第一局');t.click('restart');end(t,'第二局');t.click('result-tab-rewards');
 pending[0](false);await flush();assert.equal(t.elements['result-save-status']['data-state'],'saving');
 pending[1](true);await flush();assert.equal(t.elements['result-save-status']['data-state'],'saved');
 assert.equal(t.elements['result-tab-rewards']['aria-selected'],'true');assert.match(t.elements['result-stage'].textContent,/第二局/);
});

test('rewards show one contextual destination and hide generic details and ranking',async()=>{
 const t=await setup({sourceRoot,totalCoins:5});t.click('start');const g=t.ctx.River3DApp.game;
 g.coins=108;g.newHonors=['c01','c02'];end(t);await flush();t.click('result-tab-rewards');
 assert.equal(t.elements['result-coins'].textContent,'+108');assert.equal(t.elements['result-boat-unlocks'].textContent,'新船 +2');
 assert.equal(t.elements['result-honors'].textContent,'新徽章 +2');
 assert.equal(t.elements['result-reward-links'].hidden,false);assert.equal(t.elements['result-boats-open'].hidden,false);assert.equal(t.elements['result-honors-open'].hidden,true);assert.equal(t.elements['result-rank-open'].hidden,true);
 assert.equal(t.elements['result-detail-open'].hidden,true);t.click('result-detail-open');assert.equal(t.elements['result-details'].hidden,true);
 t.click('result-boats-open');assert.equal(t.elements['boats-panel'].hidden,false);t.click('boats-close');assert.equal(t.ctx.document.activeElement,t.elements['result-boats-open']);assert.equal(t.elements['result-tab-rewards']['aria-selected'],'true');
 t.click('result-tab-score');assert.equal(t.elements['result-reward-links'].hidden,true);assert.equal(t.elements['result-detail-open'].hidden,false);
});

test('badge-only rewards return focus to the contextual action; empty rewards add no action',async()=>{
 const t=await setup({sourceRoot,totalCoins:0});t.click('start');t.ctx.River3DApp.game.newHonors=['c01'];end(t);await flush();t.click('result-tab-rewards');
 assert.equal(t.elements['result-boats-open'].hidden,true);assert.equal(t.elements['result-honors-open'].hidden,false);t.click('result-honors-open');t.click('honors-close');assert.equal(t.ctx.document.activeElement,t.elements['result-honors-open']);
 t.click('restart');end(t);await flush();t.click('result-tab-rewards');assert.equal(t.elements['result-reward-links'].hidden,true);assert.equal(t.elements['result-honors'].hidden,true);
});

test('failed coin saves retain the previous unlock progress until a successful retry',async()=>{
 const t=await setup({sourceRoot,totalCoins:39,save:async()=>false});t.ctx.RiverPlatform.retrySave=async()=>true;
 t.click('start');t.ctx.River3DApp.game.coins=1;end(t);await flush();t.click('result-tab-rewards');
 assert.equal(t.elements['result-boat-unlocks'].hidden,true);assert.equal(t.elements['result-reward-links'].hidden,true);assert.equal(t.elements['result-boat-track']['aria-valuenow'],'39');assert.match(t.elements['result-boat-progress'].textContent,/还差 1 枚/);
 t.click('result-save-retry');await flush();assert.equal(t.elements['result-boat-unlocks'].hidden,false);assert.equal(t.elements['result-reward-links'].hidden,false);assert.equal(t.elements['result-boat-track']['aria-valuenow'],'40');
});


test('large reward totals keep their digit count available for the compact number layout',async()=>{
 const t=await setup({sourceRoot});t.click('start');t.ctx.River3DApp.game.coins=10000000;end(t);await flush();
 assert.equal(t.elements['result-coins'].textContent,'+10000000');assert.equal(t.elements['result-coins']['data-digits'],8);
});
