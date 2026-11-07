import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
function picker(selectSkin) {
 const elements = {};
 const document = {getElementById(id) {
  return elements[id] || (elements[id] = {hidden:false, disabled:false, textContent:'', attrs:{}, events:{},
   setAttribute(k,v){this.attrs[k]=v;}, addEventListener(k,fn){this.events[k]=fn;}, focus(){}, scrollTop:0});
 }};
 const context = {document, Promise}; context.window=context;
 vm.createContext(context); vm.runInContext(fs.readFileSync(new URL('boats.js',root),'utf8'),context);
 const api = context.RiverBoats.create({platform:{selectSkin}});
 return {api,elements,click(id){elements[id].events.click({});}};
}
const flush = async()=>{for(let i=0;i<8;i++)await Promise.resolve();};

test('each equipped boat shows a distinct bundled model image',()=>{
 const t=picker(),images=new Set();
 for(let skin=0;skin<5;skin++) {
  t.api.sync({skin,totalCoins:300,followSkinOwned:true});
  const image=t.elements['boats-preview'].attrs.src;
  const bytes=fs.readFileSync(new URL(image,root));
  assert.equal(bytes.subarray(1,4).toString(),'PNG'); images.add(image);
  assert.equal(t.elements['boats-current'].textContent,['原木出发','珊瑚假日','薄荷河湾','星夜船长','缤纷乐园'][skin]);
 }
 assert.equal(images.size,5);
});

test('the picker and settings entry use the exact same preview for each boat',()=>{
 const html=fs.readFileSync(new URL('index.html',root),'utf8'),t=picker();
 for(let skin=0;skin<5;skin++) {
  t.api.sync({skin,totalCoins:300,followSkinOwned:true});
  const row=html.match(new RegExp('<button id="boat-'+skin+'"[\\s\\S]*?</button>'))[0];
  const src=row.match(/<img[^>]+src="([^"]+)"/)[1];
  assert.equal(src,t.elements['boats-preview'].attrs.src);
  assert.doesNotMatch(row,/<i[ >]/);
 }
});

test('selecting a boat updates its preview and returning keeps that image',async()=>{
 const t=picker(async skin=>({ok:true,saved:true,data:{skin,totalCoins:300,followSkinOwned:true}}));
 t.api.sync({skin:0,totalCoins:300,followSkinOwned:true});
 t.click('boat-2'); await flush(); t.api.close();
 assert.match(t.elements['boats-preview'].attrs.src,/boat-2\.png$/);
 assert.equal(t.elements['boats-current'].textContent,'薄荷河湾');
 assert.equal(t.elements['settings-panel'].hidden,false);
 assert.equal(t.elements['boat-2'].attrs['aria-pressed'],'true');
});

test('an unsaved equipped boat still shows its actual preview and can retry',async()=>{
 const t=picker(async skin=>({ok:true,saved:false,data:{skin,totalCoins:300,followSkinOwned:true}}));
 t.api.sync({skin:0,totalCoins:300,followSkinOwned:true});
 t.click('boat-4'); await flush();
 assert.match(t.elements['boats-preview'].attrs.src,/boat-4\.png$/);
 assert.equal(t.elements['boats-current'].textContent,'缤纷乐园');
 assert.equal(t.elements['boat-4'].disabled,false);
 assert.match(t.elements['boat-state-4'].textContent,/重试/);
});

test('a rejected selection preserves the equipped boat preview',async()=>{
 const t=picker(async()=>{throw Error('save unavailable');});
 t.api.sync({skin:1,totalCoins:300,followSkinOwned:true});
 t.click('boat-3'); await flush();
 assert.match(t.elements['boats-preview'].attrs.src,/boat-1\.png$/);
 assert.equal(t.elements['boats-current'].textContent,'珊瑚假日');
 assert.equal(t.elements['boat-1'].attrs['aria-pressed'],'true');
});
