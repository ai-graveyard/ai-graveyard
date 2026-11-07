import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {setup} from '../scripts/lib/four-stage-ui-harness.mjs';

const sourceRoot=fileURLToPath(new URL('../',import.meta.url));
async function flagLesson(){
 const t=await setup({sourceRoot,flagGuide:true});
 t.click('guide-open');t.click('guide-replay');t.click('replay-flag');
 const content=t.elements['coach-content'],start=t.elements['skip-coach'];
 t.elements.coach.querySelectorAll=()=>[content,start];
 assert.equal(t.elements.coach['aria-modal'],'true');
 return {t,content,start};
}
function key(t,code,shiftKey=false){
 let prevented=false;
 t.listeners.keydown({code,shiftKey,repeat:false,preventDefault(){prevented=true;}});
 return prevented;
}

test('flag teaching keeps Tab and Shift+Tab inside its modal, including stray focus',async()=>{
 const {t,content,start}=await flagLesson();
 assert.equal(t.ctx.document.activeElement,start);
 assert.equal(key(t,'Tab'),true);assert.equal(t.ctx.document.activeElement,content);
 assert.equal(key(t,'Tab',true),true);assert.equal(t.ctx.document.activeElement,start);
 t.elements['practice-exit'].focus();
 assert.equal(key(t,'Tab'),true);assert.equal(t.ctx.document.activeElement,content);
});

test('modal reading blocks steering, then starting the lesson restores river controls',async()=>{
 const {t}=await flagLesson(),g=t.ctx.River3DApp.game;
 const lane=g.targetZ;
 key(t,'ArrowLeft');assert.equal(g.targetZ,lane);
 t.click('skip-coach');assert.equal(t.elements.coach.hidden,true);
 key(t,'ArrowLeft');assert.notEqual(g.targetZ,lane);
});

test('Escape exits the optional flag lesson and returns to the guide',async()=>{
 const {t}=await flagLesson();
 assert.equal(key(t,'Escape'),true);
 assert.equal(t.elements.coach.hidden,true);
 assert.equal(t.elements['practice-exit'].hidden,true);
 assert.equal(t.elements['guide-panel'].hidden,false);
 assert.equal(t.ctx.River3DApp.mode,'intro');
});
