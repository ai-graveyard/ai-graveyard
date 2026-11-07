import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {setup} from '../scripts/lib/four-stage-ui-harness.mjs';
const sourceRoot=fileURLToPath(new URL('../',import.meta.url));
test('honor tabs show per-series earned counts, isolate one category and reset its scroll without resuming play',async()=>{
 const t=await setup({sourceRoot});t.click('start');const g=t.ctx.River3DApp.game;g.rescues=1;g.distance=100;g.checkHonors();t.tick(16);t.click('honors-open');
 assert.equal(t.elements['honor-count-beginner'].textContent,'2 / 12');assert.equal(t.elements['honor-count-advanced'].textContent,'0 / 6');
 assert.equal(t.elements['honor-tab-beginner']['aria-selected'],'true');
 t.elements['honor-grid'].scrollTop=180;t.click('honor-tab-advanced');
 assert.equal(t.elements['honor-tab-advanced']['aria-selected'],'true');assert.equal(t.elements['honor-tab-beginner']['aria-selected'],'false');assert.equal(t.elements['honor-grid'].scrollTop,0);
 const html=t.elements['honor-grid'].innerHTML;assert.match(html,/id="honor-page-beginner"[^>]+ hidden/);assert.match(html,/id="honor-page-master"[^>]+ hidden/);assert.doesNotMatch(html.match(/<section id="honor-page-advanced"[^>]+>/)[0],/ hidden/);
 const d=g.distance;t.tick(100);assert.equal(g.distance,d);assert.equal(t.ctx.River3DApp.mode,'pause');
});
test('honor tabs support arrow/Home/End navigation and remember the last category when reopened',async()=>{
 const t=await setup({sourceRoot});t.click('start');t.click('honors-open');
 t.event('honor-tab-beginner','keydown',{key:'ArrowRight'});assert.equal(t.elements['honor-tab-advanced']['aria-selected'],'true');assert.equal(t.ctx.document.activeElement,t.elements['honor-tab-advanced']);
 t.event('honor-tab-advanced','keydown',{key:'End'});assert.equal(t.elements['honor-tab-master']['aria-selected'],'true');
 t.click('honors-close');t.click('honors-open');assert.equal(t.elements['honor-tab-master']['aria-selected'],'true');
 t.event('honor-tab-master','keydown',{key:'Home'});assert.equal(t.elements['honor-tab-beginner']['aria-selected'],'true');
 t.event('honor-tab-beginner','keydown',{key:'ArrowLeft'});assert.equal(t.elements['honor-tab-master']['aria-selected'],'true');
});
