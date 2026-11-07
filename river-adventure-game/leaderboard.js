(function(root){
'use strict';
root.RiverLeaderboard={create:function(options){
 var doc=root.document,$=function(id){return doc.getElementById(id);},panel=$('leaderboard-panel'),scroll=$('rank-scroll'),list=$('rank-list'),service=RiverRanking.create(options.platform);
 var active='distance',sequence=0,origin=null,states={distance:{rows:[],visible:20,top:0},coins:{rows:[],visible:20,top:0}};
 function unit(n){return n.toLocaleString()+' '+RiverRanking.boards[active].unit;}
 function entries(local){['rank-open','result-rank-open'].forEach(function(id){$(id).textContent=local?'个人纪录':'排行榜';});}
 function personal(data){var n=data[RiverRanking.boards[active].key]||0;return '本地最好 '+unit(n);}
 function renderMore(){
  var s=states[active],end=Math.min(s.visible,s.rows.length),fragment=doc.createDocumentFragment();
  for(var i=list.children.length;i<end;i++){
   var entry=s.rows[i],row=doc.createElement('li'),position=doc.createElement('b'),name=doc.createElement('span'),score=doc.createElement('strong');
   row.className='rank-row'+(entry.rank<=3?' rank-podium rank-place-'+entry.rank:'')+(s.mine&&s.mine.status==='EXACT'&&s.mine.rank===entry.rank&&s.mine.value===entry.value?' is-mine':'');
   position.className='rank-position';position.textContent=String(entry.rank);name.className='rank-name';name.textContent=entry.nickname;score.textContent=unit(entry.value);
   row.appendChild(position);row.appendChild(name);row.appendChild(score);fragment.appendChild(row);
  }
  list.appendChild(fragment);$('rank-more').hidden=end>=s.rows.length;
  $('rank-end').textContent=s.rows.length&&end>=s.rows.length?'已展示全部排名 · 共 '+s.rows.length+' 名':'';
 }
 function more(){var s=states[active];if(s.visible>=s.rows.length)return;s.visible=Math.min(100,s.visible+20);renderMore();}
 async function load(){
  var token=++sequence,board=active,s=states[board];$('rank-refresh').disabled=true;
  $('rank-distance').setAttribute('aria-pressed',String(board==='distance'));$('rank-coins').setAttribute('aria-pressed',String(board==='coins'));
  $('rank-rule').textContent=board==='distance'?'单局最远距离 · 前100名 · 保留历史成绩':'单局最多金币 · 前100名 · 保留历史成绩';
  $('rank-status').textContent='正在加载榜单…';$('rank-mine').textContent='正在查询我的排名…';$('rank-local').textContent='';
  list.textContent='';$('rank-more').hidden=true;$('rank-end').textContent='';scroll.scrollTop=0;scroll.setAttribute('aria-busy','true');
  try{
   var data=await options.platform.init(),result=await service.load(board);
   if(token!==sequence||panel.hidden)return;
   entries(result.local);$('rank-kicker').textContent=result.local?'河谷船长 · 个人纪录':'河谷船长 · TOP 100';$('rank-title').textContent=result.local?'个人漂流纪录':'漂流排行榜';$('rank-local').textContent=personal(data);if(data.legacyRecords){var legacy=data.legacyRecords[board==='distance'?'best':'bestCoins'];if(legacy)$('rank-local').textContent+=' · 旧版纪录 '+unit(legacy);}
   if(result.local){s.rows=[];$('rank-status').textContent='当前环境暂不支持公开排行，个人纪录已保留。';$('rank-mine').textContent='完成正式漂流，挑战自己的纪录';return;}
   s.rows=result.rows||[];s.mine=result.mine;renderMore();scroll.scrollTop=s.top;
   $('rank-status').textContent=result.listError?(result.listError.errCode===2002?'榜单仍在生成，请稍后重试。':'榜单加载失败，请重试。'):s.rows.length?'历史总榜 · 前 '+s.rows.length+' 名':'还没有上榜成绩，来争第一位！';
   var mine=result.mine;
   $('rank-mine').textContent=!mine?'本人排名查询失败，请重试':mine.status==='EXACT'?'我的排名 #'+mine.rank+' · '+unit(mine.value):mine.status==='OVER_LIMIT'?'我的排名 500+ · 暂未进入前100名':'暂无上榜成绩 · 完成一局即可参与';
   if(mine&&mine.status==='EXACT'&&mine.value<(data[RiverRanking.boards[board].key]||0))$('rank-local').textContent+=' · 待同步';
  }catch(e){if(token===sequence&&!panel.hidden){$('rank-status').textContent='暂时无法加载，请重试。';$('rank-mine').textContent='本人排名暂未查到';}}
  finally{if(token===sequence){$('rank-refresh').disabled=false;scroll.setAttribute('aria-busy','false');}}
 }
 function choose(board){if(active===board)return;states[active].top=scroll.scrollTop;active=board;load();}
 function open(button){
  if(options.canOpen&&!options.canOpen())return;
  origin=button;active='distance';states.distance.top=states.coins.top=0;states.distance.visible=states.coins.visible=20;
  panel.hidden=false;if(options.opened)options.opened();doc.body.classList.add('rank-open');$('rank-close').focus();load();
 }
 function close(){if(panel.hidden)return;states[active].top=scroll.scrollTop;++sequence;panel.hidden=true;doc.body.classList.remove('rank-open');if(options.closed)options.closed();if(origin)origin.focus();}
 ['rank-open','result-rank-open'].forEach(function(id){$(id).addEventListener('click',function(){open($(id));});});
 $('rank-distance').addEventListener('click',function(){choose('distance');});$('rank-coins').addEventListener('click',function(){choose('coins');});
 $('rank-close').addEventListener('click',close);$('rank-refresh').addEventListener('click',load);$('rank-more').addEventListener('click',more);
 scroll.addEventListener('scroll',function(){if(scroll.scrollTop+scroll.clientHeight>=scroll.scrollHeight-120)more();});
 panel.addEventListener('click',function(e){if(e.target===panel)close();});
 function submit(g){return service.submit(g).then(function(r){entries(r.state==='local');if(!panel.hidden)load();return r;});}
 options.platform.init().then(function(){entries(!service.available());});
 return {close:close,submit:submit};
}};
})(window);
