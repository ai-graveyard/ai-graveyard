import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {setup} from '../scripts/lib/four-stage-ui-harness.mjs';

const sourceRoot=fileURLToPath(new URL('../',import.meta.url));
const flush=async()=>{for(let i=0;i<16;i++)await Promise.resolve();};

test('claimed home entry opens the boat picker, updates the equipped preview and returns home',async()=>{
 const t=await setup({sourceRoot,followOwned:true,skin:4,totalCoins:100});
 let followCalls=0;t.ctx.RiverPlatform.getFollowSkinState=async()=>{followCalls++;throw Error('should not query');};
 assert.equal(t.elements['skin-entry-name'].textContent,'切换船只');
 assert.equal(t.elements.skin['aria-controls'],'boats-panel');
 t.click('skin');
 assert.equal(t.elements['boats-panel'].hidden,false);assert.equal(t.elements['skin-panel'].hidden,true);
 assert.equal(t.elements['settings-panel'].hidden,true);assert.equal(t.elements['boats-close'].textContent,'返回首页');
 assert.equal(t.elements.skin['aria-expanded'],'true');assert.equal(t.elements['boat-3'].disabled,true);
 t.click('boat-2');await flush();
 assert.equal(t.ctx.River3DApp.game.skin,2);
 assert.equal(t.elements['skin-entry-tag'].textContent,'当前：薄荷河湾');
 assert.equal(t.elements['skin-entry-preview'].src,t.elements['boats-preview'].src);
 assert.match(t.elements['skin-entry-preview'].src,/boat-2\.png$/);
 t.listeners.keydown({code:'Escape',preventDefault(){}});
 assert.equal(t.elements['boats-panel'].hidden,true);assert.equal(t.elements['settings-panel'].hidden,true);
 assert.equal(t.elements.skin['aria-expanded'],'false');assert.equal(t.ctx.document.activeElement,t.elements.skin);
 assert.equal(t.ctx.River3DApp.mode,'intro');assert.equal(followCalls,0);
 t.click('skin');t.click('boat-4');await flush();t.click('boats-close');t.click('start');
 assert.equal(t.ctx.River3DApp.game.skin,4);
});

test('unclaimed home entry keeps the follow flow and becomes a picker after a saved claim',async()=>{
 const t=await setup({sourceRoot,followState:{available:true,status:1},claimFollowSkin:async()=>({ok:true,saved:true,data:{skin:4,followSkinOwned:true,totalCoins:0,settings:{}}})});
 assert.equal(t.elements['skin-entry-action'].textContent,'领取');assert.equal(t.elements.skin['aria-controls'],'skin-panel');
 t.click('skin');await flush();
 assert.equal(t.elements['skin-panel'].hidden,false);assert.equal(t.elements['boats-panel'].hidden,true);
 t.click('skin-claim');await flush();assert.equal(t.elements['skin-entry-name'].textContent,'切换船只');
 t.listeners.keydown({code:'Escape',preventDefault(){}});t.click('skin');
 assert.equal(t.elements['boats-panel'].hidden,false);assert.equal(t.elements['boat-4']['aria-pressed'],'true');
});

test('failed claim save keeps a reachable retry before enabling home boat switching',async()=>{
 let calls=0;const t=await setup({sourceRoot,followState:{available:true,status:1},claimFollowSkin:async()=>({ok:true,saved:++calls>1,data:{skin:4,followSkinOwned:true,settings:{}}})});
 t.click('skin');await flush();t.click('skin-claim');await flush();
 assert.equal(t.elements['skin-entry-name'].textContent,'重试保存');
 t.listeners.keydown({code:'Escape',preventDefault(){}});t.click('skin');await flush();
 assert.equal(t.elements['skin-panel'].hidden,false);assert.equal(t.elements['boats-panel'].hidden,true);
 assert.equal(t.elements['skin-claim'].textContent,'重试保存');
 t.click('skin-claim');await flush();assert.equal(t.elements['skin-entry-name'].textContent,'切换船只');
});

test('picker close destination follows the latest entry, including settings after a home visit',async()=>{
 const t=await setup({sourceRoot,followOwned:true,skin:4});
 t.click('skin');t.click('boats-close');t.click('settings-open');t.click('boats-open');
 assert.equal(t.elements['boats-close'].textContent,'返回设置');t.click('boats-close');
 assert.equal(t.elements['settings-panel'].hidden,false);assert.equal(t.ctx.document.activeElement,t.elements['boats-open']);
});

test('unsaved home boat selection keeps the existing retry when reopened',async()=>{
 const t=await setup({sourceRoot,followOwned:true,skin:4,skinSave:false});
 t.click('skin');t.click('boat-0');await flush();
 assert.equal(t.ctx.River3DApp.game.skin,0);assert.equal(t.elements['skin-entry-tag'].textContent,'当前：原木出发');
 assert.equal(t.elements['boat-state-0'].textContent,'重试保存');t.click('boats-close');t.click('skin');
 assert.match(t.elements['boats-status'].textContent,/重试保存/);assert.equal(t.elements['boat-0'].disabled,false);
});
