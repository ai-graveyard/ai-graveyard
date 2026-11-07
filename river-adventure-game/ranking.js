(function(root){
'use strict';
// Only scores are submitted. Nicknames stay in memory and come from the platform.
var boards={distance:{id:1,key:'best',scale:1000,unit:'米'},coins:{id:2,key:'bestCoins',scale:1,unit:'枚'}};
function value(v){return typeof v==='number'&&Number.isFinite(v)&&v>=0&&Math.floor(v)===v;}
root.RiverRanking={boards:boards,create:function(platform){
 var api=root.xhs&&root.xhs.miniTool,cache={},inflight={},epochs={distance:0,coins:0},denied=false,runs=new WeakMap(),queue=Promise.resolve();
 function available(){return !denied&&platform.getClientVersion&&platform.getClientVersion()>=9510&&api&&['submitScore','getRankList','getMyRank'].every(function(k){return typeof api[k]==='function';});}
 function call(name,args){return new Promise(function(resolve,reject){
  var timer=root.setTimeout(function(){reject({timeout:true});},6000);
  Promise.resolve().then(function(){return api[name](args);}).then(function(r){root.clearTimeout(timer);resolve(r);},function(e){root.clearTimeout(timer);if(e&&[1005,10003].indexOf(e.errCode)!==-1)denied=true;reject(e);});
 });}
 async function read(name,args){
  for(var attempt=0;;attempt++)try{return await call(name,args);}catch(e){
   var waits=e&&e.errCode===2002?[500,1000,2000,4000]:e&&[2008,2999].indexOf(e.errCode)!==-1?[1000]:[];
   if(attempt>=waits.length)throw e;
   await new Promise(function(resolve){root.setTimeout(resolve,waits[attempt]);});
  }
 }
 function decode(score,board){var n=score*boards[board].scale;if(typeof score!=='number'||!Number.isFinite(n)||n<0||score>1000000||Math.abs(n-Math.round(n))>.00001)throw Error('invalid score');return Math.round(n);}
 function mine(raw,board){
  if(!raw||['EXACT','OVER_LIMIT','NO_SCORE','NOT_PARTICIPATING'].indexOf(raw.status)===-1)throw Error('invalid my rank');
  if(raw.status==='EXACT'){
   if(!Number.isInteger(raw.rank)||raw.rank<1||raw.rank>500)throw Error('invalid rank');
   return {status:raw.status,rank:raw.rank,value:decode(raw.score,board)};
  }
  return {status:raw.status};
 }
 function rows(raw,board){
  if(!raw||!Array.isArray(raw.data))throw Error('invalid list');var seen={};
  return raw.data.slice(0,100).map(function(row){
   if(!row||!Number.isInteger(row.rank)||row.rank<1||row.rank>100||seen[row.rank]||row.nickname!=null&&typeof row.nickname!=='string')throw Error('invalid row');
   seen[row.rank]=true;return {rank:row.rank,value:decode(row.score,board),nickname:(row.nickname||'漂流船长').slice(0,80)};
  }).sort(function(a,b){return a.rank-b.rank;});
 }
 function reflect(p){return p.then(function(data){return {data:data};},function(error){return {error:error};});}
 async function load(board){
  await platform.init();if(!boards[board])throw Error('invalid board');
  if(!available())return {local:true};
  if(cache[board]&&Date.now()-cache[board].at<30000)return cache[board].data;
  var epoch=epochs[board];if(inflight[board]&&inflight[board].epoch===epoch)return inflight[board].task;
  var args={board:boards[board].id,period:'all'};
  var task=Promise.all([reflect(read('getRankList',args).then(function(r){return rows(r,board);})),reflect(read('getMyRank',args).then(function(r){return mine(r,board);}))]).then(function(result){
   if(!available())return {local:true};
   var data={rows:result[0].data,listError:result[0].error,mine:result[1].data,mineError:result[1].error};
   if(!data.listError&&!data.mineError&&epoch===epochs[board])cache[board]={at:Date.now(),data:data};return data;
  });
  inflight[board]={epoch:epoch,task:task};try{return await task;}finally{if(inflight[board]&&inflight[board].task===task)delete inflight[board];}
 }
 async function sync(g){
  var data=await platform.init();if(g.practiceReplay)return {state:'practice'};
  // Continue the existing distance/coin boards for formal campaign runs too.
  // The platform retains each player's historical best across rule changes.
  if(!available())return {state:'local'};
  var result={state:'submitted',boards:{}};
  // Each board is independent: a failed distance write must not suppress coins.
  for(var i=0;i<2;i++){
   if(!available()){result.state='local';break;}
   var board=i===0?'distance':'coins',config=boards[board],best=data[config.key]||0;
   if(!value(best)||best/config.scale>1000000){result.boards[board]='range';result.state='pending';continue;}
   try{
    var current=mine(await read('getMyRank',{board:config.id,period:'all'}),board);
    if(current.status==='EXACT'&&current.value>=best){result.boards[board]='confirmed';continue;}
    // OVER_LIMIT has no score: submit the absolute local best, never an increment.
    epochs[board]++;delete cache[board];
    var response=await call('submitScore',{board:config.id,score:best/config.scale});
    if(!response||decode(response.score,board)<best)throw Error('unconfirmed write');
    result.boards[board]='submitted';epochs[board]++;delete cache[board];
   }catch(e){result.boards[board]='pending';result.state=available()?'pending':'local';}
  }
  return result;
 }
 function submit(g){
  if(runs.has(g))return runs.get(g);
  var task=queue.then(function(){return sync(g);});queue=task.catch(function(){});runs.set(g,task);return task;
 }
 return {load:load,submit:submit,available:available};
}};
})(window);
