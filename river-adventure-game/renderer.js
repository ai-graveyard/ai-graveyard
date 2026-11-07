(function(root){
'use strict';
// Keep the complete boat narrower than one 3.7 m lane, with room for both paddles.
var RAFT_SCALE=.9,RAFT_RATIO=RAFT_SCALE/1.45;
// Bring both shores inward equally while keeping all three steering lanes.
var BANK_INSET=.55,WATER_HALF_WIDTH=7.5-BANK_INSET,PADDLE_EDGE=7.1-BANK_INSET;
var PALETTES=[
 {sky:'#dcebdc',water:'#64bcad',deep:'#3e9f99',grass:'#99b77d',bank:'#d9cc9c',tree:'#527f60',leaf:'#78a070',rock:'#8b9d91'},
 {sky:'#f0c39e',water:'#55a9ab',deep:'#327d8b',grass:'#c08354',bank:'#dfae72',tree:'#93634a',leaf:'#c5925c',rock:'#b8704e'},
 {sky:'#bed2d6',water:'#4d969a',deep:'#326e7a',grass:'#7c9690',bank:'#afbbb0',tree:'#466e68',leaf:'#74968a',rock:'#778d8d'},
 {sky:'#b0d4ea',water:'#69b4b0',deep:'#3c8f9b',grass:'#a0b57e',bank:'#e0c898',tree:'#6c8b73',leaf:'#95ab87',rock:'#98a79d'}
];
function sceneryAt(x){return root.River3D.journey(Math.max(0,x)).id;}

var colors={};function rgb(hex){if(typeof hex!=='string')return hex;if(colors[hex])return colors[hex];var n=parseInt(hex.slice(1),16);return colors[hex]=[(n>>16)/255,((n>>8)&255)/255,(n&255)/255];}
// Palette changes belong to the river, not the camera's current stage.
function smooth(a,b,x){var u=Math.max(0,Math.min(1,(x-a)/(b-a)));return u*u*(3-2*u);}
function paletteAt(worldX){var x=Math.max(0,worldX),zone=root.River3D.journey(x),stage=zone.stage,id=zone.id,p=PALETTES[id];if(!stage)return p;var blend=smooth(0,48,zone.offset);if(blend===1)return p;var old=PALETTES[(id+3)%4],out={};for(var key in p){var a=rgb(old[key]),b=rgb(p[key]);out[key]=[a[0]+(b[0]-a[0])*blend,a[1]+(b[1]-a[1])*blend,a[2]+(b[2]-a[2])*blend];}return out;}
// Broad, low-contrast patches belong to the riverbed and never outline a steering lane.
function waterColorAt(x,z,p,out){var water=rgb(p.water),deep=rgb(p.deep),depth=Math.max(0,.20+.08*Math.sin(x*.045+z*.55)+.06*Math.sin(x*.077-z*.72+1.1)+.03*Math.sin(x*.019+z*.93)-.06*smooth(4,WATER_HALF_WIDTH,Math.abs(z)));for(var k=0;k<3;k++)out[k]=water[k]+(deep[k]-water[k])*depth;return out;}
function noise(n){var k=Math.sin(n*127.1+31.7)*43758.5453;return k-Math.floor(k);}
function Renderer(canvas){this.canvas=canvas;this.low=false;this.stride=10;this.buffer=new Float32Array(2400000);this.count=0;this.group=null;this.palette=PALETTES[0];this.particles=[];this.coinPops=[];this.flagTransfer=null;this.flagGold=null;this.flagBlock=null;this.shadowFootprint=new Float32Array(8);this.waterTint=new Float64Array(3);this.waterGrid=new Float64Array(117);this.impact=0;this.impactPop=null;this.curve=new Float64Array(1402);this.curveStart=NaN;this.gl=canvas.getContext('webgl',{alpha:false,antialias:true,powerPreference:'low-power'});if(!this.gl)throw Error('此设备未能提供 WebGL 3D 画面。');this.init();this.resize();}
Renderer.prototype.init=function(){var gl=this.gl;if(this.program)gl.deleteProgram(this.program);if(this.gpu)gl.deleteBuffer(this.gpu);this.program=null;this.gpu=null;
 // The clear horizon extends to the clip plane without distance fog.
 var near=.1,far=300,depthScale=((far+near)/(far-near)).toFixed(9),depthOffset=(2*far*near/(far-near)).toFixed(9);
 var vs='attribute vec3 aPosition;attribute vec3 aColor;attribute vec3 aNormal;attribute float aMaterial;uniform vec3 eye;uniform vec3 right;uniform vec3 up;uniform vec3 forward;uniform float aspect;varying vec3 color;varying vec3 normal;varying vec3 viewDir;varying vec3 position;varying float material;void main(){vec3 p=aPosition-eye;float z=dot(p,forward);gl_Position=vec4(dot(p,right)*1.92/aspect,dot(p,up)*1.92,'+depthScale+'*z-'+depthOffset+',z);color=aColor;normal=aNormal;material=aMaterial;position=aPosition;viewDir=-p;}';
 var fs='precision mediump float;varying vec3 color;varying vec3 normal;varying vec3 viewDir;varying vec3 position;varying float material;uniform vec3 sky;uniform vec4 raftShadow;uniform vec4 shadowProjection;uniform float raftX;void main(){vec3 c=color;if(material< -0.5){vec2 p=vec2(position.x-raftX,position.z-raftShadow.x-position.x*shadowProjection.z);p=vec2(p.x*shadowProjection.x+p.y*shadowProjection.y,-p.x*shadowProjection.y+p.y*shadowProjection.x);vec2 uv=p/max(raftShadow.yz,vec2(0.001));float radius=dot(uv,uv);float soft=max(0.0,1.0-radius);soft=soft*soft*soft;float contact=max(0.0,1.0-radius*2.4);contact=contact*contact*contact;c*=1.0-raftShadow.w*soft-shadowProjection.w*contact;}if(material>0.5){vec3 n=normalize(normal),v=normalize(viewDir),l=normalize(vec3(-0.45,0.82,0.35));float diffuse=max(dot(n,l),0.0);float rim=pow(1.0-max(dot(n,v),0.0),3.0);if(material>5.5){float froth=sin(position.x*47.1+sin(position.z*21.8)*2.3)*sin(position.z*51.7+sin(position.x*37.3)*1.7);float foamMask=smoothstep(0.76,0.92,color.g);if(position.y< -0.024)discard;float wet=smoothstep(-0.02,0.23,position.y);c*=1.0+wet*(-0.10+0.12*diffuse+0.10*froth*foamMask);c+=vec3(0.8,0.95,0.93)*pow(max(dot(n,normalize(l+v)),0.0),28.0)*0.025*wet;}else if(material>4.5){vec3 reflection=reflect(-v,n);float environment=0.48+0.17*reflection.y+0.24*smoothstep(-0.15,0.65,reflection.y);float band=pow(max(0.0,1.0-abs(dot(reflection,normalize(vec3(-0.3,0.7,0.55)))-0.38)*4.5),4.0);float polish=pow(max(dot(n,normalize(l+v)),0.0),64.0);c=color*(0.60+0.25*diffuse+environment*0.32);c+=vec3(1.0,0.79,0.36)*(band*0.42+polish*0.9+rim*0.11);}else{float sheen=pow(max(dot(n,normalize(l+v)),0.0),material>2.5&&material<3.5?48.0:22.0);c*=0.59+0.19*(n.y*0.5+0.5)+0.29*diffuse;c+=vec3(1.0,0.93,0.8)*sheen*(material>2.5&&material<3.5?0.36:0.1);c+=vec3(0.65,0.84,0.8)*rim*0.045;if(material>1.5&&material<2.5){float grain=sin(position.z*74.0+sin(position.x*2.6)*1.7+sin(position.z*18.0)*2.0);c*=0.96+0.04*grain;}if(material>3.5){float weave=sin(position.x*110.0)*sin(position.z*110.0);c*=0.98+weave*0.02;}}}gl_FragColor=vec4(c,1.0);}';
 function shader(type,src){var s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){gl.deleteShader(s);throw Error('3D 着色器编译失败');}return s;}
 var v,f;try{v=shader(gl.VERTEX_SHADER,vs);f=shader(gl.FRAGMENT_SHADER,fs);}catch(error){if(v)gl.deleteShader(v);throw error;}this.program=gl.createProgram();gl.attachShader(this.program,v);gl.attachShader(this.program,f);gl.linkProgram(this.program);gl.deleteShader(v);gl.deleteShader(f);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS)){gl.deleteProgram(this.program);this.program=null;throw Error('3D 场景初始化失败');}gl.useProgram(this.program);this.gpu=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.gpu);gl.bufferData(gl.ARRAY_BUFFER,this.buffer.byteLength,gl.DYNAMIC_DRAW);var p=gl.getAttribLocation(this.program,'aPosition'),c=gl.getAttribLocation(this.program,'aColor');gl.enableVertexAttribArray(p);gl.enableVertexAttribArray(c);gl.vertexAttribPointer(p,3,gl.FLOAT,false,40,0);gl.vertexAttribPointer(c,3,gl.FLOAT,false,40,12);var normal=gl.getAttribLocation(this.program,'aNormal'),material=gl.getAttribLocation(this.program,'aMaterial');gl.enableVertexAttribArray(normal);gl.enableVertexAttribArray(material);gl.vertexAttribPointer(normal,3,gl.FLOAT,false,40,24);gl.vertexAttribPointer(material,1,gl.FLOAT,false,40,36);this.uniform={};var self=this;['eye','right','up','forward','aspect','sky','raftShadow','shadowProjection','raftX'].forEach(function(n){self.uniform[n]=gl.getUniformLocation(self.program,n);});gl.enable(gl.DEPTH_TEST);
};
Renderer.prototype.resize=function(){var r=this.canvas.getBoundingClientRect(),dpr=Math.min(root.devicePixelRatio||1,this.low?1:1.5),max=this.low?1000000:2000000;dpr=Math.min(dpr,Math.sqrt(max/(r.width*r.height)));this.canvas.width=Math.max(1,Math.round(r.width*dpr));this.canvas.height=Math.max(1,Math.round(r.height*dpr));this.aspect=r.width/r.height;this.viewHeight=r.height;this.gl.viewport(0,0,this.canvas.width,this.canvas.height);};
// Sample the smooth river curve once per frame instead of four trig calls per vertex.
// Half-metre interpolation stays below 0.00011 world units of the analytic curve.
Renderer.prototype.prepareCurve=function(offset){this.curveStart=Math.floor((offset-120)*2)*.5;for(var i=0;i<701;i++){var x=this.curveStart+i*.5;this.curve[i*2]=Math.sin(x*.018)*3+Math.sin(x*.041)*1.5;this.curve[i*2+1]=Math.cos(x*.018)*.054+Math.cos(x*.041)*.0615;}};
Renderer.prototype.scenePalette=paletteAt;
Renderer.prototype.waterColorAt=function(worldX,z,out){return waterColorAt(worldX,z,paletteAt(worldX),out||this.waterTint);};
// Shared edge samples keep adjacent world tiles seamless in either quality setting.
Renderer.prototype.waterSurface=function(worldX){
 var tint=this.waterTint,grid=this.waterGrid;
 for(var row=0;row<3;row++){var x=worldX+row*5,p=paletteAt(x);for(var col=0;col<13;col++){waterColorAt(x,-WATER_HALF_WIDTH+col*WATER_HALF_WIDTH/6,p,tint);var at=(row*13+col)*3;for(var c=0;c<3;c++)grid[at+c]=tint[c];}}
 for(var i=0;i<2;i++)for(var j=0;j<12;j++)for(var v=0;v<6;v++){
  var r=v===0||v===3||v===5?i:i+1,s=v===0||v===1||v===3?j:j+1,index=(r*13+s)*3;
  for(var k=0;k<3;k++)tint[k]=grid[index+k];this.vertex(worldX+r*5-this.offset,-.025,-WATER_HALF_WIDTH+s*WATER_HALF_WIDTH/6,tint,1.08,0,0,0,-1);
 }
};
Renderer.prototype.vertex=function(x,y,z,c,light,nx,ny,nz,material){nx=nx||0;ny=ny||0;nz=nz||0;var actor=this.actor;if(actor){var rx=x*actor.cos+z*actor.sin;z=-x*actor.sin+z*actor.cos+actor.z;x=rx+actor.x;y=y*(actor.squash||1)+actor.y;var nr=nx*actor.cos+nz*actor.sin;nz=-nx*actor.sin+nz*actor.cos;nx=nr;ny/=actor.squash||1;}var jaw=this.jaw;if(jaw){var jx=x-jaw.x,jy=y-jaw.y,jr=nx*jaw.cos-ny*jaw.sin;x=jaw.x+jx*jaw.cos-jy*jaw.sin;y=jaw.y+jx*jaw.sin+jy*jaw.cos;ny=nx*jaw.sin+ny*jaw.cos;nx=jr;}
 // One shared spine deformation carries skin, armor, sockets and both jaws.
 // The neck/head move rigidly; the waist blends continuously into the tail.
 var spine=this.crocSpine;if(spine>0&&x>-4.7){var spineU=Math.max(0,Math.min(1,(x+4.7)/1.75)),spineBlend=spineU*spineU*(3-2*spineU),spineAngle=spine*spineBlend,spineRate=spine*6*spineU*(1-spineU)/1.75,spineCos=spineU===1&&this.crocSpineCos!==undefined?this.crocSpineCos:Math.cos(spineAngle),spineSin=spineU===1&&this.crocSpineSin!==undefined?this.crocSpineSin:Math.sin(spineAngle),spineDX=x+4.3,spineDY=y-.35,spineX=spineDX*spineCos-spineDY*spineSin,spineY=spineDX*spineSin+spineDY*spineCos,spineJX=spineCos-spineY*spineRate,spineJY=spineSin+spineX*spineRate,spineDet=spineJX*spineCos+spineSin*spineJY,spineNX=nx;
  x=spineX-4.3;y=spineY+.35;nx=(spineCos*nx-spineJY*ny)/spineDet;ny=(spineSin*spineNX+spineJX*ny)/spineDet;
 }
 var immersion=this.crocImmersion;if(immersion>0){var waterU=Math.max(0,Math.min(1,(x+8.85)/4.05)),waterBlend=waterU*waterU*(3-2*waterU);y-=immersion*(.08+.34*waterBlend);nx+=ny*immersion*.34*6*waterU*(1-waterU)/4.05;}
 var g=this.group;if(g){var cy=g.yawCos===undefined?Math.cos(g.yaw||0):g.yawCos,sy=g.yawSin===undefined?Math.sin(g.yaw||0):g.yawSin,turnX=x*cy-z*sy;z=x*sy+z*cy;x=turnX;var turnN=nx*cy-nz*sy;nz=nx*sy+nz*cy;nx=turnN;var groupScale=g.scale===undefined?1.45:g.scale;x*=groupScale;y*=groupScale;z*=groupScale;var xx=x*g.cos-y*g.sin,yy=x*g.sin+y*g.cos;x=xx+g.x;y=yy+g.y;z+=g.z;var rotated=nx*g.cos-ny*g.sin;ny=nx*g.sin+ny*g.cos;nx=rotated;}
 z+=this.entityZ||0;var bendX=x+this.offset,ci=(bendX-this.curveStart)*2,curve,slope;
 if(ci>=0&&ci<700){var ix=Math.floor(ci),mix=ci-ix,j=ix*2;curve=this.curve[j]+(this.curve[j+2]-this.curve[j])*mix;if(material)slope=this.curve[j+1]+(this.curve[j+3]-this.curve[j+1])*mix;}
 else{curve=Math.sin(bendX*.018)*3+Math.sin(bendX*.041)*1.5;if(material)slope=Math.cos(bendX*.018)*.054+Math.cos(bendX*.041)*.0615;}
 z+=curve-this.bend;if(material)nx-=nz*slope;
 var a=this.buffer,n=this.count;if(n+10>a.length)throw Error('场景超出当前设备的绘制预算');a[n]=x;a[n+1]=y;a[n+2]=z;a[n+3]=c[0]*light;a[n+4]=c[1]*light;a[n+5]=c[2]*light;a[n+6]=nx;a[n+7]=ny;a[n+8]=nz;a[n+9]=material||0;this.count+=10;
};
Renderer.prototype.tri=function(a,b,c,color,shade){var col=rgb(color);this.vertex(a[0],a[1],a[2],col,shade||1);this.vertex(b[0],b[1],b[2],col,shade||1);this.vertex(c[0],c[1],c[2],col,shade||1);};
Renderer.prototype.quad=function(a,b,c,d,color,shade){this.tri(a,b,c,color,shade);this.tri(a,c,d,color,shade);};
var cubeFaces=[[-1,1,-1,1,1,-1,1,1,1,-1,1,1],[-1,-1,1,1,-1,1,1,1,1,-1,1,1],[1,-1,-1,-1,-1,-1,-1,1,-1,1,1,-1],[1,-1,1,1,-1,-1,1,1,-1,1,1,1],[-1,-1,-1,-1,-1,1,-1,1,1,-1,1,-1],[-1,-1,-1,1,-1,-1,1,-1,1,-1,-1,1]],cubeShade=[1.08,.88,.7,.76,.93,.6],cubeOrder=[0,1,2,0,2,3];
Renderer.prototype.box=function(x,y,z,w,h,d,color,endColor,surfaceMaterial){var c=rgb(color),end=endColor?rgb(endColor):c;for(var f=0;f<6;f++){var face=cubeFaces[f];for(var i=0;i<6;i++){var n=cubeOrder[i]*3;this.vertex(x+face[n]*w*.5,y+face[n+1]*h*.5,z+face[n+2]*d*.5,face[n]>0?end:c,cubeShade[f],0,0,0,f===0?surfaceMaterial:0);}}};
Renderer.prototype.cone=function(x,y,z,r,h,color,sides){var N=sides||6;for(var i=0;i<N;i++){var a=i/N*Math.PI*2,b=(i+1)/N*Math.PI*2;this.tri([x+Math.cos(a)*r,y,z+Math.sin(a)*r],[x,y+h,z],[x+Math.cos(b)*r,y,z+Math.sin(b)*r],color,.78+.24*(Math.sin(a)+1)/2);}};
Renderer.prototype.blob=function(x,y,z,w,h,d,color){for(var i=0;i<8;i++){var a=i*Math.PI/4,b=(i+1)*Math.PI/4,A=[x+Math.cos(a)*w/2,y,z+Math.sin(a)*d/2],B=[x+Math.cos(b)*w/2,y,z+Math.sin(b)*d/2];this.tri(A,[x,y+h/2,z],B,color,.83+.2*Math.sin(a+1));this.tri(B,[x,y-h/2,z],A,color,.7+.16*Math.sin(a+1));}};
Renderer.prototype.disc=function(x,y,z,rx,rz,color){for(var i=0;i<16;i++){var a=i*Math.PI/8,b=(i+1)*Math.PI/8;this.tri([x,y,z],[x+Math.cos(a)*rx,y,z+Math.sin(a)*rz],[x+Math.cos(b)*rx,y,z+Math.sin(b)*rz],color);}};
Renderer.prototype.shadow=function(x,y,z,rx,rz,strength,yaw){
 var cs=yaw?Math.cos(yaw):1,sn=yaw?Math.sin(yaw):0;
 for(var i=0;i<32;i++){
  var a=i*Math.PI/16,b=(i+1)*Math.PI/16;
  for(var v=0;v<3;v++){
   var angle=v===1?a:b,dx=v?Math.cos(angle)*rx:0,dz=v?Math.sin(angle)*rz:0;
   var xx=x+dx*cs+dz*sn,zz=z+dz*cs-dx*sn,c=this.waterColorAt((this.offset||0)+xx,zz+(this.entityZ||0));
   this.vertex(xx,y,zz,c,1.08*(v?1:1-strength*.25),0,0,0,-1);
  }
 }
};
// Shared unit meshes are built once. Detail mode changes topology, never allocates GPU buffers.
var roundedMeshes={};
function roundedMesh(sides,rings){var key=sides+':'+rings;if(roundedMeshes[key])return roundedMeshes[key];var data=[];
 function point(i,j){var a=i/sides*Math.PI*2,b=j/rings*Math.PI;return [Math.sin(b)*Math.cos(a),Math.cos(b),Math.sin(b)*Math.sin(a)];}
 function face(a,b,c){[a,b,c].forEach(function(p){data.push(p[0],p[1],p[2]);});}
 for(var j=0;j<rings;j++)for(var i=0;i<sides;i++){var a=point(i,j),b=point(i+1,j),c=point(i+1,j+1),d=point(i,j+1);if(j>0)face(a,b,d);if(j<rings-1)face(b,c,d);}return roundedMeshes[key]=new Float32Array(data);
}
roundedMesh(16,10);roundedMesh(12,8);roundedMesh(8,6);
Renderer.prototype.round=function(x,y,z,w,h,d,color,material){var small=Math.max(w,h,d)<.27,mesh=roundedMeshes[this.low||this.farDetail||small?'8:6':this.mediumDetail?'12:8':Math.max(w,h,d)>.6?'16:10':'12:8'],c=rgb(color),m=material||((color==='#233c34'||color==='#293c2c'||color==='#3f392e')?3:1);for(var i=0;i<mesh.length;i+=3)this.vertex(x+mesh[i]*w*.5,y+mesh[i+1]*h*.5,z+mesh[i+2]*d*.5,c,1,mesh[i]/w,mesh[i+1]/h,mesh[i+2]/d,m);};
var pipeRings={};[8,16,24,32].forEach(function(n){var ring=[];for(var i=0;i<=n;i++)ring.push([Math.cos(i*Math.PI*2/n),Math.sin(i*Math.PI*2/n)]);pipeRings[n]=ring;});
Renderer.prototype.tube=function(ax,ay,az,bx,by,bz,r1,r2,color,cap,material){var dx=bx-ax,dy=by-ay,dz=bz-az,len=Math.sqrt(dx*dx+dy*dy+dz*dz);if(len<.00001)return;dx/=len;dy/=len;dz/=len;var ux,uy,uz;
 if(Math.abs(dy)>.9){ux=1;uy=0;uz=0;}else{var q=Math.sqrt(dx*dx+dz*dz);ux=-dz/q;uy=0;uz=dx/q;}var vx=dy*uz-dz*uy,vy=dz*ux-dx*uz,vz=dx*uy-dy*ux,c=rgb(color),end=rgb(cap||color),N=this.low||Math.max(r1,r2)<.08?8:16,ring=pipeRings[N],slope=(r1-r2)/len,m=material||1;
 for(var i=0;i<N;i++){var a=ring[i],b=ring[i+1],px=ux*a[0]+vx*a[1],py=uy*a[0]+vy*a[1],pz=uz*a[0]+vz*a[1],qx=ux*b[0]+vx*b[1],qy=uy*b[0]+vy*b[1],qz=uz*b[0]+vz*b[1];
 this.vertex(ax+px*r1,ay+py*r1,az+pz*r1,c,1,px+dx*slope,py+dy*slope,pz+dz*slope,m);this.vertex(bx+px*r2,by+py*r2,bz+pz*r2,c,1,px+dx*slope,py+dy*slope,pz+dz*slope,m);this.vertex(bx+qx*r2,by+qy*r2,bz+qz*r2,c,1,qx+dx*slope,qy+dy*slope,qz+dz*slope,m);
 this.vertex(ax+px*r1,ay+py*r1,az+pz*r1,c,1,px+dx*slope,py+dy*slope,pz+dz*slope,m);this.vertex(bx+qx*r2,by+qy*r2,bz+qz*r2,c,1,qx+dx*slope,qy+dy*slope,qz+dz*slope,m);this.vertex(ax+qx*r1,ay+qy*r1,az+qz*r1,c,1,qx+dx*slope,qy+dy*slope,qz+dz*slope,m);
 this.vertex(ax,ay,az,end,1,-dx,-dy,-dz,m);this.vertex(ax+qx*r1,ay+qy*r1,az+qz*r1,end,1,-dx,-dy,-dz,m);this.vertex(ax+px*r1,ay+py*r1,az+pz*r1,end,1,-dx,-dy,-dz,m);
 this.vertex(bx,by,bz,end,1,dx,dy,dz,m);this.vertex(bx+px*r2,by+py*r2,bz+pz*r2,end,1,dx,dy,dz,m);this.vertex(bx+qx*r2,by+qy*r2,bz+qz*r2,end,1,dx,dy,dz,m);}
};
// A continuous torus replaces capped pipe segments: round ropes and rings without joints.
var loopMeshes={};
function loopMesh(n,m){var key=n+':'+m;if(loopMeshes[key])return loopMeshes[key];var out=[];for(var i=0;i<n;i++)for(var j=0;j<m;j++){var corners=[[i,j],[i+1,j],[i+1,j+1],[i,j],[i+1,j+1],[i,j+1]];corners.forEach(function(p){var u=p[0]*Math.PI*2/n,v=p[1]*Math.PI*2/m;out.push(Math.cos(u),Math.sin(u),Math.cos(v),Math.sin(v),i);});}return loopMeshes[key]=new Float32Array(out);}
loopMesh(24,6);loopMesh(16,4);
Renderer.prototype.loop=function(x,y,z,a,b,r,color,axis,striped){var mesh=loopMeshes[this.low?'16:4':'24:6'],base=rgb(color),ivory=rgb('#fff3df');for(var i=0;i<mesh.length;i+=5){var u=mesh[i],v=mesh[i+1],cr=mesh[i+2],sr=mesh[i+3],px=u*(a+r*cr),py=v*(b+r*cr),pz=r*sr,nx=u*cr,ny=v*cr,nz=sr,c=striped&&Math.floor(mesh[i+4]/(this.low?4:6))%2===0?ivory:base;
 this.vertex(x+(axis===0?pz:px),y+(axis===1?pz:axis===0?px:py),z+(axis===2?pz:py),c,1,axis===0?nz:nx,axis===1?nz:axis===0?nx:ny,axis===2?nz:ny,1);}};
// Turned profile surface, used for a curved hat brim and tapered woven crown.
Renderer.prototype.lathe=function(x,y,z,profile,color){var n=this.low?16:32,ring=pipeRings[n],c=rgb(color);for(var j=0;j<profile.length-1;j++)for(var i=0;i<n;i++){for(var k=0;k<6;k++){var row=k===0||k===1||k===3?j:j+1,a=ring[k===0||k===3||k===5?i:i+1],pr=profile[row],before=profile[Math.max(0,row-1)],after=profile[Math.min(profile.length-1,row+1)],dr=after[0]-before[0],dy=after[1]-before[1];this.vertex(x+a[0]*pr[0],y+pr[1],z+a[1]*pr[0],c,1,a[0]*dy,-dr,a[1]*dy,4);}}};
Renderer.prototype.animalEye=function(x,y,head,blink){
 var dx=(x-head[0])/head[3],dy=(y-head[1])/head[4],z=head[2]+head[5]*Math.sqrt(Math.max(.01,1-dx*dx-dy*dy)),n=paddleUnit([dx/head[3],dy/head[4],(z-head[2])/(head[5]*head[5])]),right=paddleUnit([n[2],0,-n[0]]),up=paddleCross(n,right),self=this;
 function patch(px,py,pz,w,h,d,color){var mesh=roundedMeshes['8:6'],c=rgb(color);for(var i=0;i<mesh.length;i+=3){var a=px+mesh[i]*w*.5,b=py+mesh[i+1]*h*.5,f=pz+mesh[i+2]*d*.5,nx=mesh[i]/w,ny=mesh[i+1]/h,nz=mesh[i+2]/d;self.vertex(x+right[0]*a+up[0]*b+n[0]*f,y+right[1]*a+up[1]*b+n[1]*f,z+right[2]*a+up[2]*b+n[2]*f,c,1,right[0]*nx+up[0]*ny+n[0]*nz,right[1]*nx+up[1]*ny+n[1]*nz,right[2]*nx+up[2]*ny+n[2]*nz,3);}}
 patch(0,0,.010,.145,blink?.025:.18,.07,'#233c34');if(!blink){patch(-.018,.028,.044,.038,.045,.016,'#fff9e9');if(!this.low)patch(.024,-.035,.040,.016,.018,.009,'#93c9b6');}
};
Renderer.prototype.face=function(y,z,spread,blink,head){var human=this.actor&&this.actor.role==='captain';
 for(var side=-1;side<=1;side+=2){
  if(human){this.round(side*spread,y,z+.006,.112,blink?.025:.185,.055,'#493025',3);if(!blink)this.round(side*spread-.019,y+.045,z+.033,.027,.038,.012,'#fff6dc',3);}
  else if(head)this.animalEye(side*spread,y-.008,head,blink);
  else{this.round(side*spread,y-.008,z+.03,.145,blink?.025:.18,.07,'#233c34',3);if(!blink){this.round(side*spread-.025,y+.04,z+.065,.043,.05,.018,'#fff9e9',3);if(!this.low)this.round(side*spread+.025,y-.045,z+.064,.018,.02,.012,'#93c9b6',3);}}
 }
 if(human){this.round(0,y-.205,z+.024,.235,.18,.055,'#78372c');this.round(0,y-.151,z+.05,.16,.038,.018,'#fff1ce');this.round(.015,y-.252,z+.049,.12,.055,.016,'#e47b62');}
 else if(!(this.actor&&this.actor.role==='duck'))for(var i=0;i<6;i++){var a=i/6,b=(i+1)/6;this.tube(-.1+a*.2,y-.18-Math.sin(a*Math.PI)*.036,z+.008,-.1+b*.2,y-.18-Math.sin(b*Math.PI)*.036,z+.008,.012,.012,'#77513f');}
};
// Broad rolled straw brim. Crown and brim share the same gentle tilt.
Renderer.prototype.captainHat=function(){
 var self=this,n=this.low||this.farDetail?24:48,rings=5,base=1.80,gold=rgb('#e5ac55'),under=rgb('#c99143');
 function point(i,j,bottom){var a=i*Math.PI*2/n,u=j/rings,r=.34+.45*u,x=Math.cos(a)*r,z=Math.sin(a)*r*.95,y=base+.13*x-.075*z+.10*u*u+.035*Math.sin(a*3+.4)*u*u-(bottom?.048:0);return [x,y,z];}
 function triangle(a,b,c,color){var ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2],nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,len=Math.sqrt(nx*nx+ny*ny+nz*nz)||1;[a,b,c].forEach(function(p){self.vertex(p[0],p[1],p[2],color,1,nx/len,ny/len,nz/len,4);});}
 for(var i=0;i<n;i++)for(var j=0;j<rings;j++){var a=point(i,j,false),b=point(i+1,j,false),c=point(i+1,j+1,false),d=point(i,j+1,false),col=(i%6===0?rgb('#edbd70'):gold);triangle(a,c,b,col);triangle(a,d,c,col);a=point(i,j,true);b=point(i+1,j,true);c=point(i+1,j+1,true);d=point(i,j+1,true);triangle(a,b,c,under);triangle(a,c,d,under);if(j===rings-1){a=point(i,rings,false);b=point(i+1,rings,false);triangle(a,b,c,gold);triangle(a,c,d,gold);}}
 // Apply tilt to the crown before the actor/raft transforms.
 var vertex=this.vertex;this.vertex=function(x,y,z){arguments[1]=y+.13*x-.075*z;arguments[6]-=.13*arguments[7];arguments[8]+=.075*arguments[7];return vertex.apply(this,arguments);};
 this.lathe(-.025,base,0,[[.39,0],[.40,.075],[.375,.24],[.30,.355],[.17,.40],[0,.41]],'#efc16f');
 this.tube(-.025,base+.025,0,-.025,base+.085,0,.403,.401,'#be8641');
 if(!this.low&&!this.farDetail)for(var row=0;row<3;row++)this.loop(-.025,base+.13+row*.07,0,.39-row*.024,.39-row*.024,.006,'#d9a452',1);
 this.vertex=vertex;
};
// Red neckerchief with a tied front and a short folded tail behind the shoulder.
Renderer.prototype.captainScarf=function(t){
 this.loop(0,1.105,.015,.295,.245,.075,'#d95736',1);
 this.tube(-.22,1.12,.20,-.035,1.025,.335,.067,.065,'#e6643d');this.tube(.22,1.12,.20,.035,1.025,.335,.067,.065,'#ee7549');
 this.round(0,1.025,.34,.15,.16,.13,'#cf4c30');
 this.tube(-.035,.985,.34,-.13,.80,.36,.06,.045,'#e6643d');this.tube(.035,.98,.34,.12,.86,.37,.06,.037,'#ed7548');
 var wave=this.reducedMotion?0:Math.sin(t*3.4)*.025,col=rgb('#db5b38'),points=[[-.20,1.11,-.17,.10],[-.39,1.13,-.30,.115],[-.60,1.12+wave,-.41,.105],[-.77,1.16+wave,-.47,.035]],self=this;
 function tri(a,b,c){var u=b.map(function(v,i){return v-a[i];}),v=c.map(function(v,i){return v-a[i];}),n=paddleUnit(paddleCross(u,v));[a,b,c].forEach(function(p){self.vertex(p[0],p[1],p[2],col,1,n[0],n[1],n[2],1);});}
 for(var i=0;i<points.length-1;i++){var p=points[i],q=points[i+1],a=[p[0],p[1]+p[3],p[2]],b=[q[0],q[1]+q[3],q[2]],c=[q[0],q[1]-q[3],q[2]],d=[p[0],p[1]-p[3],p[2]];tri(a,b,c);tri(a,c,d);tri(c,b,a);tri(d,c,a);}
};
// Each occupied seat owns a full catch / pull / recovery cycle.
Renderer.prototype.rowerPose=function(role,phase,active){
 var pose=root.River3D.paddlePose(phase,active);
 if(role==='turtle'&&active){var p=((phase%1)+1)%1,drive=p<.6,u=drive?p/.6:(p-.6)/.4,ease=(1-Math.cos(u*Math.PI))*.5;pose.x=drive?.8-1.6*ease:-.8+1.6*ease;pose.lift=drive?0:Math.pow(Math.sin(u*Math.PI),2)*1.05;}
 return pose;
};
Renderer.prototype.crewPaddlePose=function(role,g,intro,t){
 var escape=typeof this.openingTime==='number',offsets={captain:.25,otter:0,duck:.5,turtle:.76},phase=escape?(this.openingTime/.56+(offsets[role]||0))%1:role==='otter'&&!intro?g.paddlePhase:((intro?t:g.time)/1.25+(offsets[role]||0))%1;
 var aboard=role==='captain'||intro||g.has(role),active=aboard&&(intro||g.mode==='play')&&g.y<=.02&&g.vy<=0&&!g.stumble;
 var side=role==='duck'||role==='turtle'?-1:1,cfg=paddleBodies[role];if(side*(g.z||0)>PADDLE_EDGE-RAFT_SCALE*(.65+cfg.outboard+.4))active=false;
 var pose=this.rowerPose(role,phase,active);pose.phase=phase;pose.active=active;pose.side=role==='duck'||role==='turtle'?-1:1;pose.turn=role==='captain'?(g.lateralVelocity||0)/8:0;return pose;
};
// A single rigid paddle defines both grip points and the blade frame.
var paddleBodies={captain:{length:2.28,outboard:1.4,recovery:.44,spacing:.46,shoulder:.96,upper:.40,fore:.39,skin:'#f2c296'},otter:{length:2.28,outboard:1.4,recovery:.44,spacing:.46,shoulder:.96,upper:.40,fore:.39,skin:'#825739'},duck:{length:2.28,outboard:1.6,recovery:.36,spacing:.39,shoulder:.72,upper:.35,fore:.34,skin:'#f2dc9a'},turtle:{length:2.28,outboard:1.6,recovery:.40,spacing:.34,forward:.31,sweep:.44,topSweep:.06,shoulder:1.07,shoulderX:.38,shoulderZ:.25,upper:.40,fore:.39,poleX:.73,poleY:-.56,poleZ:.82,skin:'#95b878'}};
function paddleUnit(v){var n=Math.sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2])||1;return [v[0]/n,v[1]/n,v[2]/n];}
function paddleCross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
Renderer.prototype.paddleRig=function(role,pose){
 var a=this.actor,g=this.group,cfg=paddleBodies[role],side=pose.side||1;
 // Follow the raft in flight; only remove its small resting bob from the catch height.
 var scale=g&&g.scale!==undefined?g.scale:RAFT_SCALE,wetY=g?(.035-.14*RAFT_RATIO-g.y+(this.paddleRun.y||0))/scale:-.38,lift=pose.lift*cfg.recovery,forward=cfg.forward||0,bx=a.x+forward+pose.x*(cfg.sweep===undefined?.62:cfg.sweep),bz=a.z+side*cfg.outboard,tx=a.x+forward+.28+pose.x*(cfg.topSweep===undefined?.08:cfg.topSweep),tz=a.z-side*.06,dx=bx-tx,dz=bz-tz;
 var by=wetY+lift,ty=by+Math.sqrt(Math.max(.01,cfg.length*cfg.length-dx*dx-dz*dz)),blade=[bx,by,bz],top=[tx,ty,tz],axis=paddleUnit([tx-bx,ty-by,tz-bz]);
 // Present the broad blade against the backward pull; feather only above water.
 var normal=paddleUnit([1-axis[0]*axis[0],-axis[0]*axis[1],-axis[0]*axis[2]]),width=paddleUnit(paddleCross(axis,normal)),feather=0;
 if(!pose.contact){var recovery=(pose.phase-.6)/.4,clear=by+paddleBladeLow(axis[1],width[1],normal[1]);feather=smooth(-.16,-.035,clear-(g?(.035-g.y)/scale:0))*smooth(.1,.3,recovery)*(1-smooth(.7,.92,recovery));}
 var angle=feather*Math.PI*.5,co=Math.cos(angle),si=Math.sin(angle),n=normal.map(function(v,i){return v*co+width[i]*si;}),w=width.map(function(v,i){return v*co-normal[i]*si;});
 var lower=top.map(function(v,i){return v-axis[i]*cfg.spacing;});
 function local(v){var x=v[0]-a.x,z=v[2]-a.z;return [x*a.cos-z*a.sin,v[1]-a.y,x*a.sin+z*a.cos];}
 return {blade:blade,top:top,lower:lower,axis:axis,normal:n,width:w,feather:feather,topLocal:local(top),lowerLocal:local(lower),length:cfg.length,spacing:cfg.spacing};
};
// Analytic two-link arm: fixed bone lengths, elbows bend outward and forward.
Renderer.prototype.paddleArm=function(sign,hand,cfg){
 var shoulder=[sign*(cfg.shoulderX||.3),cfg.shoulder,cfg.shoulderZ===undefined?.06:cfg.shoulderZ],delta=hand.map(function(v,i){return v-shoulder[i];}),distance=Math.sqrt(delta[0]*delta[0]+delta[1]*delta[1]+delta[2]*delta[2]),dir=paddleUnit(delta),d=Math.max(.001,distance),along=(cfg.upper*cfg.upper-cfg.fore*cfg.fore+d*d)/(2*d),height=Math.sqrt(Math.max(0,cfg.upper*cfg.upper-along*along));
 var pole=[sign*(cfg.poleX||.65),cfg.poleY===undefined?-.55:cfg.poleY,cfg.poleZ||.65],dot=pole[0]*dir[0]+pole[1]*dir[1]+pole[2]*dir[2],bend=paddleUnit(pole.map(function(v,i){return v-dir[i]*dot;})),elbow=shoulder.map(function(v,i){return v+dir[i]*along+bend[i]*height;});
 if(this.actor&&this.actor.role==='turtle')this.round(shoulder[0],shoulder[1],shoulder[2],.25,.25,.25,cfg.skin);
 var wing=this.actor&&this.actor.role==='duck';
 this.tube(shoulder[0],shoulder[1],shoulder[2],elbow[0],elbow[1],elbow[2],wing?.17:.105,wing?.13:.085,cfg.skin);this.tube(elbow[0],elbow[1],elbow[2],hand[0],hand[1],hand[2],wing?.13:.085,wing?.085:.07,cfg.skin);
 if(this.actor&&this.actor.role==='captain'){var sleeve=shoulder.map(function(v,i){return v+(elbow[i]-v)*.65;});this.tube(shoulder[0],shoulder[1],shoulder[2],sleeve[0],sleeve[1],sleeve[2],.16,.145,'#f6e4bd');this.round(sleeve[0],sleeve[1],sleeve[2],.29,.20,.28,'#fff0d2');}
 this.round(elbow[0],elbow[1],elbow[2],wing?.27:.18,wing?.27:.18,wing?.27:.18,cfg.skin);this.round(hand[0],hand[1],hand[2],wing?.20:.17,wing?.20:.17,wing?.20:.17,cfg.skin);
 return {shoulder:shoulder,elbow:elbow,hand:hand,distance:distance,upper:cfg.upper,fore:cfg.fore};
};
// Shared solid maple blade: broad rounded shoulders, a thin edge and a tapered neck.
var paddleBladeProfiles=[[-.33,0,0],[-.30,.13,.020],[-.22,.245,.037],[-.08,.29,.046],[.09,.28,.046],[.23,.18,.044],[.31,.065,.040],[.34,.035,.035],[.37,0,0]],paddleBladeMeshes={};
function paddleBladeLow(uy,wy,ny){var low=Infinity;for(var i=0;i<paddleBladeProfiles.length;i++){var p=paddleBladeProfiles[i],edge=p[0]*uy-Math.sqrt(p[1]*p[1]*wy*wy+p[2]*p[2]*ny*ny);low=Math.min(low,edge);}return low;}
function paddleBladeMesh(low){
 var key=low?'low':'fine';if(paddleBladeMeshes[key])return paddleBladeMeshes[key];var N=low?10:16,rings=paddleBladeProfiles,mesh=[],wood=rgb('#ddb074'),neck=rgb('#a97843');
 function emit(row,side){var p=rings[row],before=rings[Math.max(0,row-1)],after=rings[Math.min(rings.length-1,row+1)],span=after[0]-before[0],dw=(after[1]-before[1])/span,dt=(after[2]-before[2])/span,a=side%N/N*Math.PI*2,co=Math.cos(a),si=Math.sin(a),x=p[1]*co,z=p[2]*si,nx,ny,nz;if(row===0||row===rings.length-1){nx=nz=0;ny=row===0?-1:1;}else{nx=co/p[1];nz=si/p[2];ny=-nx*dw*co-nz*dt*si;}var blend=smooth(.20,.37,p[0]),grain=1+.025*Math.sin(x*110+p[0]*7)+.018*Math.sin(x*210+p[0]*11)-.08*Math.pow(Math.abs(co),6)*Math.min(1,p[1]/.12);mesh.push(x,p[0],z,nx,ny,nz,(wood[0]+(neck[0]-wood[0])*blend)*grain,(wood[1]+(neck[1]-wood[1])*blend)*grain,(wood[2]+(neck[2]-wood[2])*blend)*grain);}
 for(var row=0;row<rings.length-1;row++)for(var side=0;side<N;side++){if(row>0){emit(row,side);emit(row,side+1);emit(row+1,side+1);}if(row<rings.length-2){emit(row,side);emit(row+1,side+1);emit(row+1,side);}}
 return paddleBladeMeshes[key]=new Float32Array(mesh);
}
Renderer.prototype.paddleBlade=function(rig){
 var mesh=paddleBladeMesh(this.low),b=rig.blade,u=rig.axis,w=rig.width,n=rig.normal,c=[0,0,0];
 for(var i=0;i<mesh.length;i+=9){var x=mesh[i],y=mesh[i+1],z=mesh[i+2],nx=mesh[i+3],ny=mesh[i+4],nz=mesh[i+5];c[0]=mesh[i+6];c[1]=mesh[i+7];c[2]=mesh[i+8];this.vertex(b[0]+w[0]*x+u[0]*y+n[0]*z,b[1]+w[1]*x+u[1]*y+n[1]*z,b[2]+w[2]*x+u[2]*y+n[2]*z,c,1,w[0]*nx+u[0]*ny+n[0]*nz,w[1]*nx+u[1]*ny+n[1]*nz,w[2]*nx+u[2]*ny+n[2]*nz,2);}
};
Renderer.prototype.workingOar=function(role,pose){
 var actor=this.actor,rig=this.paddleRig(role,pose),cfg=paddleBodies[role],side=pose.side||1;
 // The inboard hand holds the T grip, the outboard hand holds lower on the shaft.
 rig.upperArm=this.paddleArm(side,rig.topLocal,cfg);rig.lowerArm=this.paddleArm(-side,rig.lowerLocal,cfg);

 this.actor=undefined;var t=rig.top,b=rig.blade,u=rig.axis,w=rig.width,n=rig.normal;
 this.tube(t[0],t[1],t[2],b[0]+u[0]*.23,b[1]+u[1]*.23,b[2]+u[2]*.23,.034,.038,'#8c603b');
 this.tube(t[0]-w[0]*.12,t[1]-w[1]*.12,t[2]-w[2]*.12,t[0]+w[0]*.12,t[1]+w[1]*.12,t[2]+w[2]*.12,.041,.036,'#bc9258');
 this.paddleBlade(rig);
 this.actor=actor;if(this.group){this.paddleRigs[role]=rig;this.recordPaddleWater(role,pose,rig);}
};
Renderer.prototype.recordPaddleWater=function(role,pose,rig){
 var g=this.group,state=this.paddleStates[role]||(this.paddleStates[role]={contact:false,lastEmit:-99}),clock=this.paddleClock,b=rig.blade,scale=g.scale===undefined?RAFT_SCALE:g.scale;
 function worldY(v){return (v[0]*g.yawCos-v[2]*g.yawSin)*g.sin+v[1]*g.cos;}
 var rx=b[0]*g.yawCos-b[2]*g.yawSin,rz=b[0]*g.yawSin+b[2]*g.yawCos,px=(rx*g.cos-b[1]*g.sin)*scale+g.x,py=(rx*g.sin+b[1]*g.cos)*scale+g.y,pz=rz*scale+g.z;
 var bottom=py+scale*paddleBladeLow(worldY(rig.axis),worldY(rig.width),worldY(rig.normal));
 state.x=px;state.y=py;state.z=pz;state.bottom=bottom;state.phase=pose.phase;state.active=pose.active;state.side=pose.side;state.feather=rig.feather;
 if(!this.paddleWater||!pose.active){state.contact=false;state.driving=false;return;}
 var contact=state.bottom<.035&&Math.abs(pz)<PADDLE_EDGE,driving=contact&&pose.contact,entry=contact&&!state.contact,exit=!contact&&state.contact;
 if((entry||exit||(driving&&clock-state.lastEmit>=.13))&&clock>state.lastEmit+.00001){
  this.paddleMarks.push({x:exit?state.wetWorldX:this.offset+px,z:exit?state.wetZ:pz,born:clock,kind:entry?1:exit?2:0,power:Math.max(.2,pose.power),side:pose.side,flow:this.paddleFlow,seed:this.paddleSerial++,role:role});
  if(this.paddleMarks.length>32)this.paddleMarks.shift();state.lastEmit=clock;
 }
 if(contact){state.wetWorldX=this.offset+px;state.wetZ=pz;}state.contact=contact;state.driving=driving;
};
// A feathered, broken ellipse stays on the water, separate from the moving raft.
Renderer.prototype.paddleRipple=function(x,z,rx,rz,width,amount,seed,p){
 var n=this.low?8:14,foam=rgb('#e6f5ec'),tint=this.waterTint;
 for(var i=0;i<n;i++){
  var a=(i/n*1.7+.12)*Math.PI,b=((i+1)/n*1.7+.12)*Math.PI,ra=1+Math.sin(a*3+seed)*.035,rb=1+Math.sin(b*3+seed)*.035;
  for(var strip=0;strip<2;strip++)for(var j=0;j<6;j++){
   var outer=j===0||j===1||j===3?strip:strip+1,angle=j===0||j===3||j===5?a:b,radius=angle===a?ra:rb,xx=x+Math.cos(angle)*(rx+(outer-1)*width)*radius,zz=z+Math.sin(angle)*(rz+(outer-1)*width)*radius;
   waterColorAt(this.offset+xx,zz,p,tint);for(var k=0;k<3;k++){tint[k]*=1.08;if(outer===1)tint[k]+=(foam[k]-tint[k])*amount;}
   this.vertex(xx,.035,zz,tint,1,0,0,0,-1);
  }
 }
};
var paddleDropMesh=roundedMesh(6,4);
Renderer.prototype.paddleDrop=function(x,y,z,size,color){var c=rgb(color||'#cbe9e4'),mesh=paddleDropMesh;for(var i=0;i<mesh.length;i+=3)this.vertex(x+mesh[i]*size,y+mesh[i+1]*size*1.8,z+mesh[i+2]*size,c,1,mesh[i],mesh[i+1]/1.8,mesh[i+2],3);};
// One bounded wake for every surfing source. Uses simulation time, with no particle pool growth.
Renderer.prototype.surfWater=function(g){
 if(!(g.goldBoost>0||g.flagSpeed>0)||g.mode!=='play'||g.stumble||g.y>.4)return;
 var quiet=this.reducedMotion,clock=quiet?0:g.time,steps=quiet?6:this.low?8:14,length=quiet?4:6,z=g.z||0,foam=rgb('#edfff9'),tint=this.waterTint;
 for(var band=-1;band<=1;band++)for(var i=0;i<steps;i++){
  var u=i/steps,v=(i+1)/steps,mid=(u+v)*.5,x0=-1.2-u*length,x1=-1.2-v*length;
  var z0=z+band*(1+u*1.5),z1=z+band*(1+v*1.5),w0=(band?.13:.3)*(1-u*.75),w1=(band?.13:.3)*(1-v*.75);
  var pulse=quiet?1:.82+.18*Math.sin(clock*14-i*1.9),amount=(band?.95:.62)*(1-mid*.65)*(1-smooth(.72,1,mid))*pulse;
  waterColorAt(this.offset+(x0+x1)*.5,(z0+z1)*.5,this.palette,tint);for(var c=0;c<3;c++)tint[c]+=(foam[c]-tint[c])*amount;
  this.vertex(x0,.055,z0-w0,tint,1);this.vertex(x1,.055,z1-w1,tint,1);this.vertex(x1,.055,z1+w1,tint,1);
  this.vertex(x0,.055,z0-w0,tint,1);this.vertex(x1,.055,z1+w1,tint,1);this.vertex(x0,.055,z0+w0,tint,1);
 }
 // Raised bow shoulders make the active state readable even when the long trail leaves a short screen.
 var crestSteps=this.low?6:10,blue=rgb('#8ee4dc'),white=rgb('#f1fff8');
 for(var side=-1;side<=1;side+=2)for(var k=0;k<crestSteps;k++){
  var a=k/crestSteps,b=(k+1)/crestSteps,sa=Math.sin(a*Math.PI),sb=Math.sin(b*Math.PI),x0=1.3-a*3.9,x1=1.3-b*3.9;
  var lift=quiet?.13:.38+.06*Math.sin(clock*12+k*.7),y0=.055+sa*lift,y1=.055+sb*lift,z0=z+side*(1.16+sa*.5),z1=z+side*(1.16+sb*.5),inner0=z+side*(1.02+sa*.12),inner1=z+side*(1.02+sb*.12);
  this.vertex(x0,.05,inner0,blue,1);this.vertex(x1,.05,inner1,blue,1);this.vertex(x1,y1,z1,white,1);
  this.vertex(x0,.05,inner0,blue,1);this.vertex(x1,y1,z1,white,1);this.vertex(x0,y0,z0,white,1);
 }
 // Bright broken whitecaps travel aft and spray away from the crew silhouette.
 if(!quiet){var count=this.low?8:16;for(var d=0;d<count;d++){
  var age=(clock*1.8+d/count)%1,side=d%2?1:-1,fade=1-age;
  this.paddleDrop(.9-age*5,.07+Math.sin(age*Math.PI)*(.65+noise(d+17)*.5),z+side*(1.22+age*.95),(.1+noise(d+31)*.06)*Math.sqrt(fade));
  if(d%2===0)this.box(-1.5-age*5,.072,z+side*(1.05+age*1.25),.34+age*.6,.025,.1*fade,'#eafff9');
 }}
};
Renderer.prototype.drawPaddleWater=function(){
 var clock=this.paddleClock;this.paddleMarks=this.paddleMarks.filter(function(m){return clock>=m.born&&clock-m.born<.82;});
 for(var i=0;i<this.paddleMarks.length;i++){
  var m=this.paddleMarks[i],age=clock-m.born,fade=Math.pow(1-age/.82,2),x=m.x+m.flow*age-this.offset,z=m.z+m.side*age*.12,p=paletteAt(m.x+m.flow*age),quiet=this.reducedMotion;
  this.paddleRipple(x,z,.17+age*.9,.12+age*.52,.027,fade*(quiet?.13:m.kind?.5:.26),m.seed,p);
  if(!quiet&&m.kind&&age<.42)for(var d=0;d<(this.low?1:3);d++){
   var a=age-d*.026;if(a<0)continue;var speed=1.1+noise(m.seed*5+d)*.7,y=.04+speed*a-4.5*a*a;
   if(y>.04)this.paddleDrop(x-(.4+noise(m.seed+d))*a,y,z+m.side*(.3+noise(m.seed*3+d)*.5)*a,(.023+noise(m.seed+d)*.012)*(1-a/.45));
  }
 }
};
// Vertical scutes follow the standing turtle's domed back, with narrow seams.
Renderer.prototype.shellPanel=function(points,color){var cx=0,cz=0;for(var i=0;i<points.length;i++){cx+=points[i][0];cz+=points[i][1];}cx/=points.length;cz/=points.length;var c=rgb(color),self=this;
 function emit(x,y){var depth=Math.sqrt(Math.max(.001,1-x*x/(.47*.47)-y*y/(.55*.55)));self.vertex(x,.82+y,-.12-.268*depth,c,1,x/(.47*.47),y/(.55*.55),-depth/.268,1);}
 for(var j=0;j<points.length;j++){var a=points[j],b=points[(j+1)%points.length],ax=cx+(a[0]-cx)*.94,az=cz+(a[1]-cz)*.94,bx=cx+(b[0]-cx)*.94,bz=cz+(b[1]-cz)*.94,N=4;
 for(var u=0;u<N;u++)for(var v=0;v<N-u;v++){var x=cx+(ax-cx)*u/N+(bx-cx)*v/N,z=cz+(az-cz)*u/N+(bz-cz)*v/N,dx=(ax-cx)/N,dz=(az-cz)/N,ex=(bx-cx)/N,ez=(bz-cz)/N;emit(x,z);emit(x+dx,z+dz);emit(x+ex,z+ez);if(u+v<N-1){emit(x+dx,z+dz);emit(x+dx+ex,z+dz+ez);emit(x+ex,z+ez);}}}};
// A single closed surface carries the otter's torso through its rump into the tail.
var otterMeshes={};
function otterMesh(low){
 var key=low?'low':'fine';if(otterMeshes[key])return otterMeshes[key];
 var profile=[[-.32,.65,0,0],[-.295,.65,.155,.217],[-.24,.65,.265,.371],[-.16,.65,.346,.485],[-.08,.65,.387,.542],[0,.65,.4,.56],[.08,.65,.387,.542],[.16,.64,.346,.49],[.23,.60,.278,.44],[.29,.50,.225,.36],[.35,.35,.19,.24],[.43,.23,.16,.13],[.56,.175,.125,.085],[.74,.13,.082,.055],[.91,.105,.043,.033],[1.02,.10,.017,.018],[1.05,.10,0,0]],slopes=[],rings=[],mesh=[],N=low?12:20,steps=low?1:2;
 // Shape-preserving Hermite slopes keep the profile continuous without pinching.
 for(var i=0;i<profile.length;i++){var slope=[0];for(var j=1;j<4;j++){var a=profile[Math.max(0,i-1)],b=profile[i],c=profile[Math.min(profile.length-1,i+1)],left=i?(b[j]-a[j])/(b[0]-a[0]):0,right=i<profile.length-1?(c[j]-b[j])/(c[0]-b[0]):0;slope[j]=left*right>0?2*left*right/(left+right):0;}slopes.push(slope);}
 for(var row=0;row<profile.length-1;row++)for(var sub=0;sub<steps;sub++){
  var u=sub/steps,u2=u*u,u3=u2*u,a=profile[row],b=profile[row+1],span=b[0]-a[0],p=[a[0]+u*span],d=[1];
  for(var j=1;j<4;j++){var ma=slopes[row][j],mb=slopes[row+1][j];p[j]=(2*u3-3*u2+1)*a[j]+(u3-2*u2+u)*span*ma+(-2*u3+3*u2)*b[j]+(u3-u2)*span*mb;d[j]=((6*u2-6*u)*a[j]+(3*u2-4*u+1)*span*ma+(-6*u2+6*u)*b[j]+(3*u2-2*u)*span*mb)/span;}rings.push({p:p,d:d});
 }
 rings.push({p:profile[profile.length-1],d:[1,0,0,0]});
 var body=rgb('#956442'),tail=rgb('#875b40');
 function emit(row,side){var ring=rings[row],p=ring.p,d=ring.d,angle=side%N/N*Math.PI*2,co=Math.cos(angle),si=Math.sin(angle),nx,ny,nz;if(row===0||row===rings.length-1){nx=ny=0;nz=row===0?1:-1;}else{nx=co/p[2];ny=si/p[3];nz=nx*d[2]*co+ny*(d[1]+d[3]*si);}var amount=smooth(.2,.85,p[0])*(.24-.12*si*Math.min(1,p[3]/.08));mesh.push(p[2]*co,p[1]+p[3]*si,-p[0],nx,ny,nz,body[0]+(tail[0]-body[0])*amount,body[1]+(tail[1]-body[1])*amount,body[2]+(tail[2]-body[2])*amount);}
 for(var row=0;row<rings.length-1;row++)for(var side=0;side<N;side++){if(row>0){emit(row,side);emit(row,side+1);emit(row+1,side+1);}if(row<rings.length-2){emit(row,side);emit(row+1,side+1);emit(row+1,side);}}
 return otterMeshes[key]=new Float32Array(mesh);
}
Renderer.prototype.otterBody=function(t){
 var mesh=otterMesh(this.low),wag=this.reducedMotion?0:Math.sin(t*(this.airborne?1.8:5.2))*.055,c=[0,0,0];
 for(var i=0;i<mesh.length;i+=9){var u=Math.max(0,Math.min(1,(-mesh[i+2]-.25)/.8)),weight=u*u*(3-2*u),rate=6*u*(1-u)/.8;c[0]=mesh[i+6];c[1]=mesh[i+7];c[2]=mesh[i+8];this.vertex(mesh[i]+wag*weight,mesh[i+1],mesh[i+2],c,1,mesh[i+3],mesh[i+4],mesh[i+5]+mesh[i+3]*wag*rate,1);}
};
Renderer.prototype.person=function(x,y,z,role,t){var previous=this.actor,blink=(t%5.7)>5.5,bob=role==='turtle'?0:Math.sin(t*3.4)*.025,skin='#f2c296';var pose=this.group&&this.crewPoses?this.crewPoses[role]:null,heading=this.endingPerson&&role==='captain'?(typeof this.endingHeading==='number'?this.endingHeading:Math.PI/2):pose?Math.PI/2-(pose.side||1)*(.2+(role==='turtle'?0:.08*pose.x)):Math.atan2(-.342,.94);if(role==='turtle'&&this.group)y+=this.paddleRun&&this.paddleRun.skin===4?.045:-.035;this.actor={role:role,x:x,y:y+bob-(this.group&&role!=='turtle'?(this.landing||0)*.15:0),z:z,cos:Math.cos(heading),sin:Math.sin(heading),squash:1};
 if(role==='captain'){
  // Logo costume: ivory shirt, brown shorts, bare knees and leather boots.
  var mount=Number(this.ridingCaptain)||0,rise=(this.endingStand||0)*.34-(this.endingCrouch||0)*.2,walk=this.endingWalk||0,boot='#65432d',shorts='#82603c',shirt='#f6e4bd';
  if(this.endingPerson){for(var leg=-1;leg<=1;leg+=2){var kneeY=.38+rise*.55+(.05-.38)*mount,kneeZ=.04+walk*leg*.12+.38*mount,footY=.16+(-.5-.16)*mount,footZ=.1+(.37-.1)*mount+walk*leg*.15;this.tube(leg*.19,.56+rise,0,leg*(.2+.19*mount),kneeY,kneeZ,.17,.16,shorts);this.tube(leg*(.2+.19*mount),kneeY,kneeZ,leg*(.2+.2*mount),footY+.08,footZ,.115,.105,skin);this.round(leg*(.2+.2*mount),footY,footZ,.32,.28,.49,boot);}}
  else{for(var leg=-1;leg<=1;leg+=2){this.round(leg*.2,.16,.1,.32,.29,.49,boot);this.tube(leg*.19,.24,.04,leg*.19,.39,.01,.12,.13,skin);this.tube(leg*.19,.36,.01,leg*.19,.57,-.025,.17,.185,shorts);this.loop(leg*.19,.36,.01,.171,.171,.022,'#a27b4e',1);}}
  if(!mount){this.round(-.2,.055,.13,.33,.065,.48,'#b18b56');this.round(.2,.055,.13,.33,.065,.48,'#b18b56');}
  this.actor.y+=rise;var torsoHeading=heading+(this.endingLook||0)*.45;this.actor.cos=Math.cos(torsoHeading);this.actor.sin=Math.sin(torsoHeading);
  this.round(0,.78,0,.76,.71,.55,shirt);this.round(0,.51,.015,.69,.18,.48,shorts);
  this.tube(0,.55,0,0,.595,0,.35,.35,'#684c32');this.round(0,.575,.343,.11,.095,.035,'#c49c59');
  this.round(-.12,1.06,.23,.22,.14,.09,'#fff0d2');this.round(.12,1.06,.23,.22,.14,.09,'#fff0d2');
  this.tube(0,.67,.276,0,.98,.276,.009,.009,'#d2b887');
  if(this.honorLevel>0&&this.group){this.round(-.22,.87,.26,.16,.18,.05,this.honorColor,3);this.round(-.22,.88,.29,.065,.07,.016,'#fff0b9',3);}
  this.captainScarf(t);
  var headHeading=torsoHeading+(this.endingLook||0)*1.0;this.actor.cos=Math.cos(headHeading);this.actor.sin=Math.sin(headHeading);
  this.round(0,1.40,.015,.94,.84,.78,skin);
  this.round(-.46,1.36,.005,.17,.235,.18,skin);this.round(.46,1.36,.005,.17,.235,.18,skin);this.round(-.49,1.36,.055,.055,.115,.075,'#df997a');this.round(.49,1.36,.055,.055,.115,.075,'#df997a');
  this.round(0,1.65,-.085,.92,.38,.72,'#60412d');
  for(var curl=0;curl<4;curl++){var cx=-.30+curl*.19;this.tube(cx-.055,1.76,.19,cx+.015,1.61+(curl%2)*.045,.315,.115,.085,curl%2?'#715036':'#60412d');}
  this.round(-.38,1.48,-.015,.18,.34,.33,'#60412d');this.round(.38,1.50,-.035,.17,.28,.30,'#60412d');
  this.face(1.43,.368,.18,blink);this.round(0,1.30,.399,.105,.105,.105,skin);
  this.tube(-.255,1.585,.32,-.12,1.60,.36,.023,.02,'#60412d');this.tube(.12,1.60,.36,.255,1.585,.32,.02,.023,'#60412d');
  this.round(-.29,1.285,.308,.12,.075,.028,'#e89677');this.round(.29,1.285,.308,.12,.075,.028,'#e89677');
  this.captainHat();
  this.actor.cos=Math.cos(torsoHeading);this.actor.sin=Math.sin(torsoHeading);
  if(this.distress){this.round(0,1.225,.405,.20,.21,.035,'#663c32');for(var hand=-1;hand<=1;hand+=2){var wave=this.reducedMotion?0:Math.sin(t*8+hand)*.22;this.tube(hand*.35,.94,0,hand*.65,1.28+wave,.03,.16,.14,shirt);this.tube(hand*.65,1.28+wave,.03,hand*.76,1.85+wave,.1,.105,.075,skin);this.round(hand*.76,1.85+wave,.1,.22,.26,.18,skin);}}
  else if(this.endingPerson){for(var hand=-1;hand<=1;hand+=2){var wave=hand<0?(this.endingWave||0):0,swing=Math.sin((this.endingGestureTime||0)*12)*.13*wave,ex=hand*(.39+.16*wave),ey=.78+.48*wave,ez=.44-.34*wave,hx=hand*(.38+.23*wave)+swing,hy=.83+1.35*wave,hz=.78-.66*wave;this.tube(hand*.34,.95,.04,ex,ey,ez,.15,.125,shirt);this.tube(ex,ey,ez,hx,hy,hz,.095,.07,skin);this.round(hx,hy,hz,.18,.21,.17,skin);}}

  else this.workingOar('captain',this.steeringPose||{x:.15,lift:1.05,side:1});
 }else if(role==='otter'){
  this.otterBody(t);this.round(0,.67,.29,.52,.72,.13,'#e2bc86');this.round(0,1.36,.01,.96,.81,.8,'#ab7950');this.loop(0,.98,0,.32,.29,.045,'#4d9185',1);this.round(.23,.92,.27,.13,.15,.13,'#eacb82');
  for(var ear=-1;ear<=1;ear+=2){this.round(ear*.36,1.66,-.04,.26,.3,.19,'#92603d');this.round(ear*.36,1.67,.06,.13,.15,.045,'#dca977');this.round(ear*.23,.15,.12,.27,.2,.43,'#684b37');}
  this.round(-.15,1.24,.35,.34,.28,.22,'#e7c99b');this.round(.15,1.24,.35,.34,.28,.22,'#e7c99b');this.round(0,1.34,.47,.19,.12,.1,'#3f392e',3);this.round(-.29,1.26,.34,.14,.07,.06,'#cc9571');this.round(.29,1.26,.34,.14,.07,.06,'#cc9571');this.face(1.46,.36,.21,blink,[0,1.36,.01,.48,.405,.4]);
  if(!this.low)for(var whisker=-1;whisker<=1;whisker+=2){this.tube(whisker*.2,1.25,.46,whisker*.53,1.29,.45,.008,.005,'#604b36');this.tube(whisker*.2,1.2,.46,whisker*.5,1.16,.45,.008,.005,'#604b36');}
  if(this.group)this.workingOar('otter',this.strokePose);else{this.round(-.31,.67,.34,.22,.32,.29,'#825739');this.round(.31,.67,.34,.22,.32,.29,'#825739');}
 }else if(role==='duck'){
  this.round(0,.58,0,.96,.84,.81,'#f6e8b8');this.round(0,.91,.11,.52,.43,.51,'#f6e8b8');this.round(0,1.17,.16,.74,.73,.7,'#ffe5a0');
  // Joined upper/lower bill with a narrow mouth seam, rather than a floating slab.
  this.round(0,1.035,.545,.55,.16,.43,'#e8a042');this.round(0,.979,.57,.49,.065,.36,'#dc913b');this.round(0,1.002,.691,.40,.012,.12,'#a96632');
  this.face(1.29,.46,.19,blink,[0,1.17,.16,.37,.365,.35]);
  for(var wing=-1;wing<=1;wing+=2){if(!this.group){var lift=Math.sin(t*4.5)*.045;this.round(wing*.4,.64+lift,.04,.34,.46,.48,'#e9cf83');this.round(wing*.47,.56+lift,.16,.15,.25,.28,'#f4e1a3');}
   this.tube(wing*.22,.34,.14,wing*.22,.095,.23,.075,.065,'#e5a047');this.round(wing*.22,.08,.25,.35,.13,.46,'#e5a047');}
  this.tube(0,.5,-.25,0,.75,-.64,.22,.02,'#f9edc5');this.tube(-.11,1.48,.03,.02,1.64,-.02,.065,.015,'#e8bd66');this.tube(.02,1.5,0,.13,1.61,-.05,.06,.012,'#e8bd66');
  this.loop(0,.9,.10,.255,.25,.048,'#cf7754',1);this.round(.19,.85,.295,.16,.15,.12,'#b95e44');this.tube(.19,.82,.30,.29,.62,.34,.055,.035,'#d77d57');this.tube(.16,.82,.31,.08,.66,.40,.05,.035,'#c16a4e');if(this.group)this.workingOar('duck',this.crewPoses.duck);
 }else{
  // Upright shell and belly; two hind legs support a stable rowing stance.
  this.round(0,.82,-.12,.94,1.10,.50,'#325f4d');this.round(0,.79,.12,.78,.94,.54,'#d1b875');
  var inner=[];for(var panel=0;panel<6;panel++){var pa=panel*Math.PI/3;inner.push([Math.cos(pa)*.21,Math.sin(pa)*.25]);}this.shellPanel(inner,'#86a56b');for(var panel=0;panel<6;panel++){var pa=panel*Math.PI/3,pb=(panel+1)*Math.PI/3;this.shellPanel([inner[panel],inner[(panel+1)%6],[Math.cos(pb)*.43,Math.sin(pb)*.50],[Math.cos(pa)*.43,Math.sin(pa)*.50]],panel%2?'#608653':'#78985c');}
  this.loop(0,.82,-.12,.45,.52,.035,'#a7b277',2);
  this.round(0,1.25,.08,.30,.32,.34,'#86a66a');this.round(0,1.52,.14,.62,.58,.55,'#95b878');this.round(0,1.41,.395,.24,.17,.105,'#aac385');this.face(1.60,.423,.15,blink,[0,1.52,.14,.31,.29,.275]);
  for(var foot=-1;foot<=1;foot+=2){this.tube(foot*.22,.44,.03,foot*.25,.16,.09,.13,.105,'#86a66a');this.round(foot*.25,.10,.14,.34,.17,.43,'#86a66a');}
  this.tube(0,.41,-.25,Math.sin(t*3)*.035,.30,-.49,.085,.008,'#86a66a');
  if(this.group)this.workingOar('turtle',this.crewPoses.turtle);else for(var hand=-1;hand<=1;hand+=2){this.round(hand*.38,1.07,.25,.25,.25,.25,'#95b878');this.tube(hand*.38,1.07,.25,hand*.47,.79,.25,.105,.085,'#95b878');this.tube(hand*.47,.79,.25,hand*.40,.58,.30,.085,.065,'#95b878');this.round(hand*.47,.79,.25,.18,.18,.18,'#95b878');this.round(hand*.40,.58,.30,.17,.17,.17,'#95b878');}

 }
 this.actor=previous;
};
// Darken the existing water pixels instead of painting a water-coloured decal over them.
// The footprint stays on the river through jumps and follows steering, never the flip rotation.
Renderer.prototype.prepareRaftShadow=function(g,offset){
 var h=Math.max(0,g.y||0),spread=1-Math.exp(-h*.23),yaw=(g.lateralVelocity||0)*.025,a=this.shadowFootprint;
 var angle=g.stumble?Math.sin(g.time*9)*.3+.8:g.angle||0,projected=.76+.24*Math.abs(Math.cos(angle));
 a[0]=g.z||0;a[1]=(3.55+spread*1.35)*RAFT_RATIO*projected;a[2]=(2.75+spread*.95)*RAFT_RATIO;a[3]=.27/(1+h*.15);
 a[4]=Math.cos(yaw);a[5]=Math.sin(yaw);a[6]=Math.cos(offset*.018)*.054+Math.cos(offset*.041)*.0615;a[7]=.12*Math.exp(-h*1.8);
 if(typeof this.defeatTime==='number'&&this.defeatTime>=root.River3D.defeatStory.crush){a[3]=0;a[7]=0;}
 this.gl.uniform1f(this.uniform.raftX,this.openingBoatX||0);this.gl.uniform4f(this.uniform.raftShadow,a[0],a[1],a[2],a[3]);this.gl.uniform4f(this.uniform.shadowProjection,a[4],a[5],a[6],a[7]);
};
// The same cloth geometry is used by the river pickup and the equipped boat flag.
Renderer.prototype.flagCloth=function(x,y,z,skin,t,scale,spread){
 var style=root.River3D.flagStyle(skin);if(!style)return;var r=this,s=scale||1,flutter=this.reducedMotion||skin===5?0:Math.sin(t*5)*.085,open=spread===undefined?1:spread;
 // Keep the gold emblem still; separate overlapping artwork along the camera-facing side.
 function p(u,v,depth){return [x+(flutter*u-(depth||0))*s,y-v*.74*s,z-u*1.22*s*open];}
 function tri(a,b,c,color){r.tri(p(a[0],a[1],.016),p(b[0],b[1],.016),p(c[0],c[1],.016),color);}
 function quad(a,b,c,d,color,depth){depth=depth===undefined?.016:depth;r.quad(p(a[0],a[1],depth),p(b[0],b[1],depth),p(c[0],c[1],depth),p(d[0],d[1],depth),color);}
 var shape=style.shape,c=style.accent;
 if(shape==='pennant')r.tri(p(0,0),p(1.12,.5),p(0,1),style.color);
 else if(shape==='swallow'){r.quad(p(0,0),p(1,0),p(.77,.5),p(0,.5),style.color);r.quad(p(0,.5),p(.77,.5),p(1,1),p(0,1),style.color);}
 else if(shape==='shield'){r.quad(p(0,0),p(1,0),p(1,.68),p(0,.68),style.color);r.tri(p(0,.68),p(1,.68),p(.5,1.15),style.color);}
 else if(shape==='point'){r.quad(p(0,0),p(.83,0),p(.83,1),p(0,1),style.color);r.tri(p(.83,0),p(1.12,.5),p(.83,1),style.color);}
 else r.quad(p(0,0),p(1,0),p(1,1),p(0,1),style.color);
 // A narrow stitched hoist ties every design to the wooden pole.
 quad([.035,.04],[.095,.04],[.095,.96],[.035,.96],c);
 if(skin===1){for(var k=0;k<2;k++){var u=.22+k*.3;quad([u,.25],[u+.12,.25],[u+.31,.5],[u+.19,.5],c);quad([u+.19,.5],[u+.31,.5],[u+.12,.75],[u,.75],c);}}
 if(skin===2){
  quad([.23,.31],[.36,.31],[.36,.65],[.23,.65],c);quad([.57,.31],[.7,.31],[.7,.65],[.57,.65],c);quad([.23,.59],[.7,.59],[.7,.76],[.23,.76],c);
  quad([.21,.21],[.38,.21],[.38,.43],[.21,.43],'#e34f51',.036);quad([.55,.21],[.72,.21],[.72,.43],[.55,.43],'#338bdf',.036);
  quad([.245,.30],[.345,.30],[.345,.34],[.245,.34],'#fffdf2',.054);quad([.275,.25],[.315,.25],[.315,.39],[.275,.39],'#fffdf2',.054);
  quad([.585,.30],[.685,.30],[.685,.34],[.585,.34],'#fffdf2',.054);
 }
 if(skin===3){quad([.24,.22],[.8,.22],[.8,.57],[.24,.57],c);tri([.24,.57],[.8,.57],[.52,.89],c);quad([.35,.42],[.42,.35],[.56,.51],[.49,.58],style.color);quad([.49,.58],[.56,.51],[.7,.33],[.77,.4],style.color);}
 if(skin===4){for(var i=0;i<10;i++){var a=-Math.PI/2+i*Math.PI/5,b=a+Math.PI/5,ra=i%2?.12:.25,rb=i%2?.25:.12;tri([.5,.5],[.5+Math.cos(a)*ra,.5+Math.sin(a)*ra*1.3],[.5+Math.cos(b)*rb,.5+Math.sin(b)*rb*1.3],c);}}
 if(skin===5){for(var petal=0;petal<12;petal++){var a=petal*Math.PI/6,b=(petal+1)*Math.PI/6;tri([.52,.5],[.52+Math.cos(a)*.27,.5+Math.sin(a)*.34],[.52+Math.cos(b)*.27,.5+Math.sin(b)*.34],c);}quad([.47,.28],[.57,.28],[.57,.72],[.47,.72],'#b77c2e',.036);}
 if(skin===6){for(var row=0;row<3;row++)for(var col=0;col<3;col++)if((row+col)%2===0){var u=.2+col*.25,v=.1+row*.27;quad([u,v],[u+.23,v],[u+.23,v+.25],[u,v+.25],c);}}
};
// One cosmetic transfer at a time, timed by simulation so pauses never consume it.
Renderer.prototype.beginFlagTransfer=function(g,data){
 if(this.reducedMotion||!data||!root.River3D.flagStyle(data.skin)){this.flagTransfer=null;return;}
 this.flagTransfer={run:g,skin:data.skin,previousSkin:this.flagShownSkin===undefined?(data.previousSkin||0):this.flagShownSkin,x:data.x,z:data.z,born:g.time};
};
Renderer.prototype.flagMount=function(g,t){
 var yaw=(g.lateralVelocity||0)*.025,cy=Math.cos(yaw),sy=Math.sin(yaw),angle=g.stumble?Math.sin(t*9)*.3+.8:g.angle||0,cs=Math.cos(angle),sn=Math.sin(angle),x=(-1.45*cy+1.28*sy)*RAFT_SCALE,y=3.38*RAFT_SCALE;
 return {x:x*cs-y*sn,y:g.y+(.46+Math.sin(t*4)*.055)*RAFT_RATIO+x*sn+y*cs,z:(-1.45*sy-1.28*cy)*RAFT_SCALE+(g.z||0),yaw:yaw,angle:angle};
};
Renderer.prototype.flagFlight=function(f,g,t,clock){
 var u=Math.max(0,Math.min(1,((clock===undefined?g.time:clock)-f.born)/.5)),pull=u*u*(3-2*u),mount=this.flagMount(g,t);
 return {x:(f.x-g.distance)*(1-pull)+mount.x*pull,y:3.3*(1-pull)+mount.y*pull+Math.sin(u*Math.PI)*1.45,z:f.z*(1-pull)+mount.z*pull,scale:1.45+(RAFT_SCALE-1.45)*pull,angle:mount.angle*pull,yaw:mount.yaw*pull,u:u};
};
Renderer.prototype.flagMotif=function(skin,x,y,z,size,angle,color){
 var cs=Math.cos(angle),sn=Math.sin(angle),r=this;
 function p(u,v){return [x,y+(u*sn+v*cs)*size,z+(u*cs-v*sn)*size];}
 function tri(a,b,c,col){r.tri(p(a[0],a[1]),p(b[0],b[1]),p(c[0],c[1]),col||color);}
 function quad(a,b,c,d,col){r.quad(p(a[0],a[1]),p(b[0],b[1]),p(c[0],c[1]),p(d[0],d[1]),col||color);}
 if(skin===1){quad([-1,.3],[.1,.65],[1,.1],[.1,.3]);quad([-.8,-.35],[.1,-.1],[.85,-.55],[0,-.5]);}
 else if(skin===2){quad([-1,0],[0,.62],[1,0],[0,-.48]);tri([-.75,0],[.7,0],[-.3,-.12],'#dceeb0');}
 else if(skin===3){for(var w=0;w<2;w++){var v=w*.5-.3;quad([-1,v],[0,v+.35],[1,v],[0,v+.12]);}}
 else if(skin===4){for(var k=0;k<10;k++){var a=k*Math.PI/5,b=(k+1)*Math.PI/5,ra=k%2?.42:1,rb=k%2?1:.42;tri([0,0],[Math.cos(a)*ra,Math.sin(a)*ra],[Math.cos(b)*rb,Math.sin(b)*rb]);}}
 else if(skin===5){tri([-1,0],[0,.7],[1,0]);tri([-1,0],[1,0],[0,-.32]);}
 else quad([-.65,-.65],[.65,-.65],[.65,.65],[-.65,.65]);
};
Renderer.prototype.flagEffects=function(g,t){
 var f=this.flagTransfer;if(!f||f.run!==g||this.reducedMotion)return;var age=g.time-f.born,style=root.River3D.flagStyle(f.skin);
 if(age<.5){
  var pose=this.flagFlight(f,g,t);this.group={x:pose.x,y:pose.y,z:pose.z,scale:pose.scale,cos:Math.cos(pose.angle),sin:Math.sin(pose.angle),yawCos:Math.cos(pose.yaw),yawSin:Math.sin(pose.yaw)};
  this.flagCloth(0,0,0,f.skin,g.time,1,.85+.15*pose.u);this.group=null;
  // A few short-lived colour flecks trace the same arc, without a full-screen flash.
  for(var j=1;j<=(this.low?2:4);j++){var back=Math.max(0,g.time-j*.025),sample=this.flagFlight(f,g,t,back);this.coinSpark(sample.x-.08,sample.y-.3,sample.z-.4,.055*(1-j/6),j%2?style.color:style.accent);}
 }else if(age<1.45){
  var mount=this.flagMount(g,t),u=(age-.5)/.95,fade=Math.sin(u*Math.PI),count=this.low?4:({1:7,2:5,3:4,4:6,5:8,6:8})[f.skin];
  for(var i=0;i<count;i++){var a=i*6.283/count+f.skin*.3,spread=.22+u*1.05,sz=(.18+(i%3)*.035)*fade,x=mount.x-.2+Math.sin(a)*.12,y=mount.y-.42+Math.sin(a)*spread*.65+u*.45,z=mount.z-.75+Math.cos(a)*spread;
   this.flagMotif(f.skin,x,y,z,sz,a+u*(f.skin===2?1.1:2.3),i%2?style.color:style.accent);
  }
 }
};
// Concrete, local effects: wind arrows, a magnet, a shield and eight real coin meshes.
// All clocks come from the model; geometry stays in the existing fixed buffer.
Renderer.prototype.flagPowerEffects=function(g){
 var z=g.z||0,t=this.reducedMotion?0:g.time,y=g.y||0,quiet=this.reducedMotion,low=this.low;
 if(g.flagSpeed>0&&!g.stumble){
  for(var side=-1;side<=1;side+=2)for(var i=0;i<(low?2:3);i++){
   var x=1.1-(quiet?i*1.6:(t*4.5+i*1.6)%5.1),zz=z+side*1.9;
   this.quad([x+.65,.12,zz],[x-.22,.12,zz-.34],[x-.5,.12,zz-.34],[x+.28,.12,zz],'#e87768');
   this.quad([x+.28,.12,zz],[x-.5,.12,zz+.34],[x-.22,.12,zz+.34],[x+.65,.12,zz],'#e87768');
  }
 }
 if(g.flagMagnet>0){
  // Red/blue poles and raised +/- marks keep the magnet readable in both qualities.
  var mx=-.35,my=y+1.65,mz=z+1.7;
  this.tube(mx,my-.22,mz-.52,mx,my+.55,mz-.52,.15,.15,'#d5e7df');
  this.tube(mx,my-.22,mz+.52,mx,my+.55,mz+.52,.15,.15,'#e8f0e8');
  this.tube(mx,my-.22,mz-.52,mx,my-.22,mz+.52,.17,.17,'#4fa58d');
  this.box(mx,my+.5,mz-.52,.4,.4,.4,'#e34f51');this.box(mx,my+.5,mz+.52,.4,.4,.4,'#338bdf');
  var face=mx-.215,py=my+.5,pz=mz-.52;
  this.quad([face,py-.035,pz-.12],[face,py+.035,pz-.12],[face,py+.035,pz+.12],[face,py-.035,pz+.12],'#fffdf2');
  this.quad([face-.002,py-.12,pz-.035],[face-.002,py+.12,pz-.035],[face-.002,py+.12,pz+.035],[face-.002,py-.12,pz+.035],'#fffdf2');
  pz=mz+.52;this.quad([face,py-.035,pz-.12],[face,py+.035,pz-.12],[face,py+.035,pz+.12],[face,py-.035,pz+.12],'#fffdf2');
  var segments=low?3:6;
  for(var field=0;field<segments;field++){
   var a=field/segments,b=(field+1)/segments;
   this.tube(mx,my+.73+Math.sin(a*Math.PI)*.25,mz-.42+a*.84,mx,my+.73+Math.sin(b*Math.PI)*.25,mz-.42+b*.84,.024,.024,'#9fe7c6');
  }
  // Short arrows stay beside/behind the raft, away from forward obstacle windows.
  for(var side=-1;side<=1;side+=2)for(var j=0;j<(low?1:2);j++){
   var u=quiet?.5:(t*.9+j*.5)%1,zz=z+side*(3.3-u*1.6),xx=-1.3-j*.55;
   this.tri([xx-.25,.12,zz+side*.25],[xx+.25,.12,zz+side*.25],[xx,.12,zz-side*.3],'#96e2b5');
  }
 }
 if(g.flagGuard>0){
  this.loop(0,y+.18,z,2.3,1.85,.12,'#5d9fce',1);
  // Two open arches describe a bubble without opaque surfaces over the crew.
  var seg=low?8:12;
  for(var arch=0;arch<(low?1:2);arch++)for(var k=0;k<seg;k++){
   var a=k*Math.PI/seg,b=(k+1)*Math.PI/seg;
   if(arch===0)this.tube(0,y+.18+Math.sin(a)*2.95,z+Math.cos(a)*1.65,0,y+.18+Math.sin(b)*2.95,z+Math.cos(b)*1.65,.1,.1,'#70b9e1');
   else this.tube(Math.cos(a)*2.1,y+.18+Math.sin(a)*2.95,z,Math.cos(b)*2.1,y+.18+Math.sin(b)*2.95,z,.08,.08,'#9ed6ee');
  }
  var bx=-.4,by=y+1.95,bz=z-2.15;
  this.quad([bx,by+.8,bz-.6],[bx,by+.8,bz+.6],[bx,by-.1,bz+.6],[bx,by-.1,bz-.6],'#548dc1');
  this.tri([bx,by-.1,bz-.6],[bx,by-.1,bz+.6],[bx,by-.7,bz],'#548dc1');
  this.tube(bx-.025,by+.16,bz-.24,bx-.025,by-.05,bz-.04,.075,.075,'#fff8e8');this.tube(bx-.025,by-.05,bz-.04,bx-.025,by+.35,bz+.27,.075,.075,'#fff8e8');
 }
 var gold=this.flagGold;
 if(gold){var age=g.time-gold.born;if(gold.run!==g||quiet||age<0||age>1.25)this.flagGold=null;
  else{var oldDetail=this.farDetail;this.farDetail=true;
   for(var c=0;c<8;c++){var u=Math.max(0,Math.min(1,(age-c*.045)/.8));if(age<c*.045||u>=1)continue;var pull=u*u*(3-2*u),a=c*Math.PI/4;
    this.coin((Math.cos(a)*1.65)*(1-pull),y+1.1+Math.sin(u*Math.PI)*2.1,z+Math.sin(a)*1.8*(1-pull),.92*(1-u*.5),g.time+c);
   }this.farDetail=oldDetail;
  }
 }
 var block=this.flagBlock;
 if(block){var age=g.time-block.born;if(block.run!==g||age<0||age>.6)this.flagBlock=null;
  else if(!quiet){var u=age/.6,amount=1-u,count=low?6:10;
   for(var b=0;b<count;b++){var a=b*Math.PI*2/count,x=Math.cos(a)*(1.5+u*2),bz=block.z+Math.sin(a)*(1.3+u*1.8),by=.5+Math.sin(u*Math.PI)*1.1;
    this.tri([x,by,bz],[x-.18*amount,by+.45*amount,bz+.18*amount],[x+.24*amount,by+.14*amount,bz-.2*amount],b%2?'#548dc1':'#c2eaff');
   }
  }
 }
};
Renderer.prototype.flagPickup=function(f,offset,t){
 var x=f.x-offset,bob=this.reducedMotion?0:Math.sin(t*3+f.id)*.12,top=3.3+bob;
 this.entityZ=f.z;this.disc(x,.045,0,.64,.64,'#dfefce');this.loop(x,.18,0,.5,.5,.09,'#f4cf7e',1,true);
 this.tube(x,.18,0,x,top+.1,0,.045,.032,'#aa7b4e');this.flagCloth(x,top,0,f.skin,t,1.45);
 this.round(x,top+.17,0,.14,.14,.14,'#ffe5a0',3);
 if(!this.reducedMotion){var near=Math.max(0,1-x/45),style=root.River3D.flagStyle(f.skin),pulse=(t*.7+f.id*.31)%1;this.loop(x,.045,0,.65+pulse*.4,.65+pulse*.4,.025*(1-pulse),style.accent,1,true);for(var glint=0;glint<(this.low?1:2);glint++){var a=t*.8+glint*Math.PI;this.coinSpark(x-.12,1.4+Math.sin(a)*.3,Math.cos(a)*(.45+near*.2),.07+near*.025,style.accent);}}this.entityZ=0;
};
Renderer.prototype.raft=function(g,t,intro,skinOnly){this.honorLevel=g.honorLevel||0;this.honorColor=root.River3D.titleInfo(g.honors,g.honorFloor).color;this.airborne=g.y>.2;if(this.lastHeight>.25&&g.y<=.25)this.landing=.12;this.landing=(this.landing||0)*.82;this.lastHeight=g.y;var y=g.y+(.46+Math.sin(t*4)*.055)*RAFT_RATIO,angle=g.stumble?Math.sin(t*9)*.3+.8:g.angle+(typeof this.openingTime==='number'?(this.openingRush||0)*.055:0);this.group={x:typeof this.openingTime==='number'?(this.openingBoatX||0):(this.endingRaftX||0),y:y,z:g.z||0,scale:RAFT_SCALE,yawCos:Math.cos((g.lateralVelocity||0)*.025),yawSin:Math.sin((g.lateralVelocity||0)*.025),cos:Math.cos(angle),sin:Math.sin(angle)};
 var members=intro?['otter','duck','turtle']:g.crew,playground=g.skin===4,wood=[['#ae7444','#cb975d'],['#ad5b47','#db8965'],['#427d70','#78aa8a'],['#455a72','#8090ab'],['#183e5a','#326a83']][g.skin||0]||['#ae7444','#cb975d'],length=3.5;
 if(playground)this.playgroundRaft(intro?t:g.time);else{
 for(var i=0;i<6;i++){var zz=(i-2.5)*.49,end=length*.5+(i%2)*.09;this.tube(-end,0,zz,end,0,zz,.255,.23,i%2?wood[0]:wood[1],'#e5be82',2);
  for(var side=-1;side<=1;side+=2){this.round(side*end,0,zz,.085,.48,.45,'#deb379',2);this.loop(side*(end+.044),0,zz,.14,.14,.014,'#9c7049',0);if(!this.low)this.loop(side*(end+.046),0,zz,.065,.063,.01,'#b08352',0);}
  if(!this.low){this.tube(-1.4,.205,zz+.1,1.4,.205,zz+.1,.012,.009,'#94633b');this.tube(-1,.242,zz-.04,.65,.242,zz-.04,.008,.012,'#dfb477');}}
 for(var tie=-1;tie<=1;tie+=2){this.loop(tie*1.12,0,0,.31,1.51,.045,'#e3c58c',0);this.loop(tie*1.22,0,0,.31,1.51,.036,'#d7b47c',0);this.round(tie*1.17,.32,1.27,.17,.14,.23,'#ecd3a0');}
 }
 var escaping=typeof this.openingTime==='number',drive=intro||escaping?{water:true}:g.propulsion(),clock=escaping?this.openingTime:intro?t:g.time;
 if(this.paddleRun!==g||this.paddleIntro!==intro||clock<(this.paddleClock||0)||clock-(this.paddleClock||clock)>.5){this.paddleStates={};this.paddleMarks=[];this.paddleSerial=0;}
 this.paddleRun=g;this.paddleIntro=intro;this.paddleClock=clock;this.paddleWater=drive.water;this.paddleFlow=escaping?9:intro?5.5:Math.min(6,g.currentSpeed*.38);this.crewPoses={};this.paddleRigs={};
 var rowers=['captain','otter','duck','turtle'];for(var ri=0;ri<rowers.length;ri++){var name=rowers[ri],pose=this.crewPaddlePose(name,g,intro,t);this.crewPoses[name]=pose;if(!pose.active&&this.paddleStates[name]){this.paddleStates[name].active=false;this.paddleStates[name].contact=false;}}
 this.strokePose=this.crewPoses.otter;this.steeringPose=this.crewPoses.captain;if(!skinOnly){if(!g.endingCaptainAway)this.person(.83,.28,.65,'captain',t);for(var j=0;j<members.length;j++){var role=members[j],px=role==='duck'?.83:-.85,pz=role==='otter'?.65:-.65;this.person(px,.27+(!intro&&g.time-g.lapFinishAt<2.4?Math.max(0,Math.sin(t*7+j))*.18:0),pz,role,t+j*.63);}}
 // A hollow lifebuoy sits beside the crew; the flagpole base stays clear.
 var buoyY=playground?.49:.37;this.loop(.14,buoyY,1.49,.42,.42,.105,'#df784c',1,true);if(!this.low)this.loop(.14,buoyY,1.49,.56,.56,.018,'#e7cda1',1);
 // Cross-river flag faces the forward camera, above the crew silhouette.
 if(!skinOnly){
 this.tube(-1.45,.2,-1.28,-1.45,3.4,-1.28,.035,.025,'#96754a');var flutter=Math.sin(t*5)*.1;
 var transfer=this.flagTransfer,age=transfer&&transfer.run===g?g.time-transfer.born:99,shownSkin=age<.5?-1:g.flagSkin,open=age>=.5&&age<.8?Math.max(.08,.08+.92*(1-Math.pow(1-(age-.5)/.3,3))+Math.sin((age-.5)/.3*Math.PI)*.14):1;this.flagShownSkin=shownSkin;
 if(age>=.5&&root.River3D.flagStyle(shownSkin)){this.flagCloth(-1.45,3.38,-1.28,shownSkin,intro?t:g.time,1,open);}
 else if(age>=.5){this.quad([-1.45,3.38,-1.28],[-1.45+flutter,3.3,-2.3],[-1.45+flutter,2.64,-2.3],[-1.45,2.72,-1.28],this.honorColor);this.tri([-1.45+flutter,3.3,-2.3],[-1.44+flutter,2.97,-2.57],[-1.45+flutter,2.64,-2.3],'#f4d18a');
 // Rank bars are visible from both sides and independent of raft skin.
 for(var stripe=0;stripe<Math.min(this.honorLevel,6);stripe++){var zz=-1.4-stripe*.13;this.box(-1.45+flutter*((-zz-1.28)/1.02),3.01,zz,.04,.38,.045,'#fff0b9');}}
 if(this.honorLevel>=4){this.tube(-1.45,3.4,-1.28,-1.45,3.53,-1.28,.08,.035,'#ecc263');}if(this.honorLevel>=6){this.round(-1.45,3.57,-1.28,.21,.21,.21,'#ffe49b',3);}
 }
 if(!skinOnly&&g.has('duck')&&g.y>1&&g.vy<0){this.tube(-.6,1.2,0,-.6,3.8,0,.033,.028,'#755a3e');for(var k=0;k<12;k++){var a=k*Math.PI/6,b=(k+1)*Math.PI/6;this.tri([-.6,4.15,0],[-.6+Math.cos(a)*1.7,3.45,Math.sin(a)*1.7],[-.6+Math.cos(b)*1.7,3.45,Math.sin(b)*1.7],k%2?'#f5d58d':'#d77a57',1);this.tube(-.6,4.13,0,-.6+Math.cos(a)*1.7,3.44,Math.sin(a)*1.7,.016,.012,'#ad8152');}this.round(-.6,4.18,0,.16,.16,.16,'#76543b');}this.group=null;this.drawPaddleWater();
};
// Static rounded geometry is cached in both quality levels, then shares the raft draw.
var playgroundMeshes={};
var playgroundColors=['#63c9cf','#f48c67','#ffd16f','#fff0cd','#f7c85f'],playgroundRGB=playgroundColors.map(rgb),playgroundStarPoints=new Float32Array(20);
for(var starPoint=0;starPoint<10;starPoint++){var starAngle=starPoint*Math.PI/5-Math.PI/2,starRadius=starPoint%2?.47:1;playgroundStarPoints[starPoint*2]=Math.cos(starAngle)*starRadius;playgroundStarPoints[starPoint*2+1]=Math.sin(starAngle)*starRadius;}
function playgroundPath(a,b,r,steps){
 var corners=[[a-r,b-r],[-a+r,b-r],[-a+r,-b+r],[a-r,-b+r]],outline=[],points=[];
 for(var c=0;c<4;c++)for(var j=0;j<=steps;j++){var angle=(c+j/steps)*Math.PI/2;outline.push([corners[c][0]+Math.cos(angle)*r,corners[c][1]+Math.sin(angle)*r]);}
 for(var i=0;i<outline.length;i++){var p=outline[i],q=outline[(i+1)%outline.length],dx=q[0]-p[0],dz=q[1]-p[1],count=Math.max(1,Math.ceil(Math.sqrt(dx*dx+dz*dz)/.34));for(var n=0;n<count;n++)points.push([p[0]+dx*n/count,p[1]+dz*n/count]);}
 return points;
}
function playgroundMesh(low){
 var key=low?'low':'fine';if(playgroundMeshes[key])return playgroundMeshes[key];var mesh=[],steps=low?3:6;
 function put(x,y,z,nx,ny,nz,color){mesh.push(x,y,z,nx,ny,nz,color);}
 function ring(a,b,r,rx,ry,y,colored){
  var path=playgroundPath(a,b,r,steps),cross=colored?(low?6:8):(low?4:6);
  function point(i,j,color){var at=(i+path.length)%path.length,p=path[at],before=path[(at+path.length-1)%path.length],next=path[(at+1)%path.length],dx=next[0]-before[0],dz=next[1]-before[1],length=Math.sqrt(dx*dx+dz*dz),nx=dz/length,nz=-dx/length,angle=j/cross*Math.PI*2,co=Math.cos(angle),si=Math.sin(angle),phase=(at/path.length*14)%1,puff=colored?.95+.05*Math.sin(phase*Math.PI):1;put(p[0]+nx*rx*co*puff,y+ry*si*puff,p[1]+nz*rx*co*puff,nx*co/rx,si/ry,nz*co/rx,color);}
  for(var i=0;i<path.length;i++){var color=colored?Math.floor(i/path.length*14)%3:4;for(var j=0;j<cross;j++){point(i,j,color);point(i+1,j,color);point(i+1,j+1,color);point(i,j,color);point(i+1,j+1,color);point(i,j+1,color);}}
 }
 ring(1.60,1.22,.32,.23,.23,-.035,true);
 var floor=playgroundPath(1.65,1.20,.25,steps);
 for(var i=0;i<floor.length;i++){var p=floor[i],q=floor[(i+1)%floor.length],dx=q[0]-p[0],dz=q[1]-p[1],length=Math.sqrt(dx*dx+dz*dz),nx=dz/length,nz=-dx/length;
  put(0,.33,0,0,1,0,3);put(p[0],.33,p[1],0,1,0,3);put(q[0],.33,q[1],0,1,0,3);
  put(p[0],.14,p[1],nx,0,nz,4);put(q[0],.14,q[1],nx,0,nz,4);put(q[0],.33,q[1],nx,0,nz,4);
  put(p[0],.14,p[1],nx,0,nz,4);put(q[0],.33,q[1],nx,0,nz,4);put(p[0],.33,p[1],nx,0,nz,4);
 }
 ring(1.68,1.25,.26,.085,.085,.30,false);
 return playgroundMeshes[key]=new Float32Array(mesh);
}
function playgroundStar(renderer,x,y,z,r,vertical){
 var c=rgb(vertical?'#fff2c9':'#f9cf65'),points=playgroundStarPoints;
 for(var j=0;j<10;j++){var p=j*2,q=((j+1)%10)*2;if(vertical){renderer.vertex(x,y,z,c,1,-1,0,0,1);renderer.vertex(x,y-points[p+1]*r,z+points[p]*r,c,1,-1,0,0,1);renderer.vertex(x,y-points[q+1]*r,z+points[q]*r,c,1,-1,0,0,1);}else{renderer.vertex(x,y,z,c,1,0,1,0,1);renderer.vertex(x+points[p]*r,y,z+points[p+1]*r,c,1,0,1,0,1);renderer.vertex(x+points[q]*r,y,z+points[q+1]*r,c,1,0,1,0,1);}}
}
Renderer.prototype.playgroundRaft=function(clock){
 var mesh=playgroundMesh(this.low),colors=playgroundRGB,yellow='#f7c85f',coral='#f48c67',aqua='#63c9cf',cream='#fff2c9';
 for(var i=0;i<mesh.length;i+=7)this.vertex(mesh[i],mesh[i+1],mesh[i+2],colors[mesh[i+6]],1,mesh[i+3],mesh[i+4],mesh[i+5],1);
 this.tube(-1.38,.339,0,1.38,.339,0,.009,.009,'#edc477');this.tube(0,.339,-1.03,0,.339,1.03,.009,.009,'#edc477');
 playgroundStar(this,1.29,.343,0,.19,false);playgroundStar(this,-.1,.343,-.95,.15,false);playgroundStar(this,-1.835,.015,0,.19,true);
 for(var side=-1;side<=1;side+=2){
  this.round(-1.72,.42,side*.86,.22,.13,.29,coral);this.round(-1.72,.58,side*.86,.20,.25,.25,cream,3);this.tube(-1.69,.58,side*.86,-1.77,.58,side*.86,.123,.123,yellow,cream,3);
  this.tube(-1.83,.035,side*.46-.07,-1.83,.035,side*.46+.07,.022,.022,cream);this.tube(-1.83,-.06,side*.46-.07,-1.83,-.06,side*.46+.07,.022,.022,cream);
  for(var stud=0;stud<3;stud++)this.round(-1.28+stud*1.28,.39,side*1.25,.095,.095,.095,cream);
 }
 // Compact rear fan fits behind the rear row, below their shoulders and away from the flag.
 this.box(-1.63,.32,0,.19,.16,.70,aqua);this.loop(-1.67,.59,0,.29,.29,.065,aqua,0);
 var spin=this.reducedMotion?0:(clock||0)*4,blade=rgb(cream),cx=-1.744,cy=.59;
 for(var b=0;b<5;b++){var a=spin+b*Math.PI*2/5,ca=Math.cos(a),sa=Math.sin(a);for(var j=0;j<10;j++){var u=j*Math.PI/5,v=(j+1)*Math.PI/5;
   this.vertex(cx,cy+ca*.16,sa*.16,blade,1,-1,0,0,1);
   this.vertex(cx,cy+ca*(.16+Math.cos(u)*.12)-sa*Math.sin(u)*.055,sa*(.16+Math.cos(u)*.12)+ca*Math.sin(u)*.055,blade,1,-1,0,0,1);
   this.vertex(cx,cy+ca*(.16+Math.cos(v)*.12)-sa*Math.sin(v)*.055,sa*(.16+Math.cos(v)*.12)+ca*Math.sin(v)*.055,blade,1,-1,0,0,1);
  }}
 this.round(-1.765,cy,0,.10,.14,.14,coral,3);
};

// Tail, torso, throat and lower jaw are slices of ONE closed, smooth skin.
// Shared seam rings use the same samples and tangents, including during waves.
// A bowed chin and a crowned snout give the mouth volume in silhouette.
// The shallow waist widens into a rounded nose; attachments use these same sections.
var crocTrunk=[[-5.35,.08,0,0],[-5.08,.1,.05,.035],[-4.75,.12,.085,.064],[-4.4,.15,.12,.095],[-4,.18,.15,.13],[-3.6,.21,.17,.17],[-3.2,.24,.19,.22],[-2.8,.27,.21,.27],[-2.4,.30,.24,.34],[-2,.35,.29,.44],[-1.7,.39,.34,.53],[-1.3,.43,.43,.68],[-.6,.46,.49,.79],[.1,.45,.48,.76],[.65,.47,.4,.65],[1.0,.43,.33,.57],[1.15,.35,.27,.54],[1.35,.25,.17,.54],[1.55,.145,.115,.55],[1.6,.12,.12,.55],[2,.065,.125,.55],[2.5,.025,.12,.50],[2.95,.07,.105,.51],[3.25,.145,.085,.48],[3.4,.18,.055,.34],[3.46,.195,.035,.22],[3.5,.20,0,0]],
 crocUpper=[[.72,.48,0,0],[.9,.49,.20,.38],[1.15,.50,.29,.55],[1.55,.53,.28,.59],[1.9,.51,.26,.61],[2.35,.44,.255,.54],[2.8,.42,.21,.55],[3.18,.46,.17,.54],[3.38,.39,.105,.42],[3.46,.34,.06,.26],[3.5,.306,0,0]],crocMeshes={},crocSections={},crocTint=new Float64Array(3),crocTeeth={};
function crocSlope(profile,i,k){var a=profile[Math.max(0,i-1)],b=profile[i],c=profile[Math.min(profile.length-1,i+1)],left=(b[k]-a[k])/(b[0]-a[0]||1),right=(c[k]-b[k])/(c[0]-b[0]||1);if(!i)return right;if(i===profile.length-1)return left;if(left*right<=0)return 0;var h0=b[0]-a[0],h1=c[0]-b[0],w0=2*h1+h0,w1=h1+2*h0;return (w0+w1)/(w0/left+w1/right);}
// Shape-preserving cubic sections also place armor, teeth and cheek roots.
function crocSection(kind,x){var key=kind==='upper'?'upper':'trunk',profile=key==='upper'?crocUpper:crocTrunk,cache=crocSections[key]||(crocSections[key]={}),cached=cache[x];if(cached)return cached;var row=0;while(row<profile.length-2&&x>profile[row+1][0])row++;var a=profile[row],b=profile[row+1],h=b[0]-a[0],u=Math.max(0,Math.min(1,(x-a[0])/h)),u2=u*u,u3=u2*u,out=[x];
 for(var k=1;k<4;k++){var m=crocSlope(profile,row,k)*h,n=crocSlope(profile,row+1,k)*h;out[k]=(2*u3-3*u2+1)*a[k]+(u3-2*u2+u)*m+(-2*u3+3*u2)*b[k]+(u3-u2)*n;out[k+3]=((6*u2-6*u)*a[k]+(3*u2-4*u+1)*m+(-6*u2+6*u)*b[k]+(3*u2-2*u)*n)/h;}return cache[x]=out;
}
// A cupped floor and arched roof meet at one lip line instead of two oval sides.
function crocSurface(kind,x,c){var p=crocSection(kind,x),y=p[1]+c*p[2];if(kind!=='upper'&&kind!=='lower')return y;var blend=smooth(1.25,1.85,x);if(!blend)return y;
 var lower=crocSection('lower',x),lip=lower[1]+lower[2]+.065*Math.min(1,lower[3]/.35),top=p[1]+p[2],bottom=p[1]-p[2],shaped;
 if(kind==='upper'){if(p[3]<.00001)return lower[1];var roof=Math.min(top-.035,lip+.20);shaped=c>=0?lip+(top-lip)*c:lip-(roof-lip)*c;}
 else shaped=c>=0?lip-(lip-top)*c:lip+(lip-bottom)*c;
 return y+(shaped-y)*blend;
}
function crocMesh(kind,low){var key=kind+':'+low;if(crocMeshes[key])return crocMeshes[key];var profile=kind==='upper'?crocUpper:crocTrunk,n=low?10:20,out=[],rows=[],start=kind==='tail'?-5.35:kind==='body'?-1.7:kind==='lower'?1.15:.72,end=kind==='tail'?-1.7:kind==='body'?1.15:3.5;
 for(var i=0;i<profile.length-1;i++){var from=profile[i][0],to=profile[i+1][0];if(from<start||to>end)continue;var steps=Math.ceil((to-from)/(low?.45:.30));for(var step=0;step<steps;step++)rows.push(from+(to-from)*step/steps);}rows.push(end);
 function point(row,col){var x=rows[row],p=crocSection(kind,x),a=(col%n)/n*Math.PI*2,c=Math.cos(a),s=Math.sin(a),tip=p[2]<.00001||p[3]<.00001,y=crocSurface(kind,x,c),yx=(crocSurface(kind,x+.0001,c)-crocSurface(kind,x-.0001,c))/.0002,yc=(crocSurface(kind,x,c+.0001)-crocSurface(kind,x,c-.0001))/.0002;return [x,y,s*p[3],tip?(row?1:-1):-p[6]*s*s*yc-yx*c*p[3],tip?0:c*p[3],tip?0:s*yc,c];}
 for(var row=0;row<rows.length-1;row++)for(var col=0;col<n;col++){var a=point(row,col),b=point(row+1,col),c=point(row+1,col+1),d=point(row,col+1);if(row||a[1]!==d[1]||a[2]!==d[2])[a,b,d].forEach(put);if(row<rows.length-2||b[1]!==c[1]||b[2]!==c[2])[b,c,d].forEach(put);}function put(v){for(var k=0;k<7;k++)out.push(v[k]);}return crocMeshes[key]=new Float32Array(out);
}
['body','tail','upper','lower'].forEach(function(kind){crocMesh(kind,false);crocMesh(kind,true);});
// Equal pitch and a half-pitch offset let the two rows interlock on closing.
// Rendering and hull contact share the cached roots and actual tooth tips.
function crocDentalSurface(upper,x,z,low,back){var mesh=crocMesh(upper?'upper':'lower',low),minimum=back?!upper:upper,height=minimum?Infinity:-Infinity;
 for(var i=0;i<mesh.length;i+=21){var ax=mesh[i],az=mesh[i+2],bx=mesh[i+7],bz=mesh[i+9],cx=mesh[i+14],cz=mesh[i+16],den=(bz-cz)*(ax-cx)+(cx-bx)*(az-cz);if(Math.abs(den)<1e-10)continue;var u=((bz-cz)*(x-cx)+(cx-bx)*(z-cz))/den,v=((cz-az)*(x-cx)+(ax-cx)*(z-cz))/den,w=1-u-v;if(u<-.000001||v<-.000001||w<-.000001)continue;var y=u*mesh[i+1]+v*mesh[i+8]+w*mesh[i+15];height=minimum?Math.min(height,y):Math.max(height,y);}
 return height;
}
function crocDentalWidth(upper,x,low){var mesh=crocMesh(upper?'upper':'lower',low),width=0;for(var i=0;i<mesh.length;i+=21)for(var j=0;j<3;j++){var a=i+j*7,b=i+(j+1)%3*7,ax=mesh[a],bx=mesh[b],dx=bx-ax;if(Math.abs(dx)<1e-9){if(Math.abs(x-ax)<1e-6)width=Math.max(width,Math.abs(mesh[a+2]),Math.abs(mesh[b+2]));continue;}var u=(x-ax)/dx;if(u>=0&&u<=1)width=Math.max(width,Math.abs(mesh[a+2]+(mesh[b+2]-mesh[a+2])*u));}return width;}
function crocDentalRow(upper,low){var key=upper+':'+low;if(crocTeeth[key])return crocTeeth[key];var count=low?7:10,row=[];
 for(var i=0;i<count;i++){var u=(i+(upper?.75:.25))/count,x=1.69+u*1.6,z=crocDentalWidth(upper,x,low)*(low?.97:.965),h=(upper?(i%3===0?.17:.13)*(1-u*.22):(i%3===1?.15:.115)*(1-u*.24)),surface=crocDentalSurface(upper,x,z,low),inset=Math.min(low?.028:.018,Math.abs(crocDentalSurface(upper,x,z,low,true)-surface)*.4),y=surface+(upper?inset:-inset),opposite=crocDentalSurface(!upper,x-.025,z,low),clearance=upper?y-opposite:opposite-y;if(isFinite(clearance))h=Math.min(h,Math.max(.025,clearance-.018));row.push([x,y,z,upper?-h:h]);}
 return crocTeeth[key]=row;
}
function crocLipRow(low){var key='lip:'+low;if(crocTeeth[key])return crocTeeth[key];var row=[],count=low?4:7;for(var i=0;i<=count;i++){var x=1.64+i/count*1.65,p=crocSection('upper',x),z=p[3]*(low?.94:.985),y=crocDentalSurface(true,x,z,low);row.push([x,isFinite(y)?y:crocSurface('upper',x,-Math.sqrt(1-Math.pow(z/p[3],2))),z+.018]);}return crocTeeth[key]=row;}
[false,true].forEach(function(low){crocDentalRow(false,low);crocDentalRow(true,low);crocLipRow(low);});
function crocJawAngle(open){return open*.5;}
function crocWave(x,phase){var u=Math.max(0,Math.min(1,(-x-1.35)/4)),a=(.022+.58*u*u)*(1-smooth(.65,1.05,x));return Math.sin(phase-x*1.12)*a;}
Renderer.prototype.crocSkin=function(kind,phase){var mesh=crocMeshes[kind+':'+this.low],top=rgb('#5d8556'),side=rgb('#769963'),belly=rgb('#b4bb80');
 for(var i=0;i<mesh.length;i+=7){var x=mesh[i],y=mesh[i+1],z=mesh[i+2],nx=mesh[i+3],ny=mesh[i+4],nz=mesh[i+5],w=mesh[i+6],bend=kind!=='upper';if(bend){z+=crocWave(x,phase);var slope=(crocWave(x+.001,phase)-crocWave(x-.001,phase))/.002;nx-=nz*slope;}var color=w<-.15?belly:w<.55?side:top;if(kind==='lower'){var mix=smooth(1.15,1.85,x),cream=rgb('#c4c58b');for(var k=0;k<3;k++)crocTint[k]=color[k]+(cream[k]-color[k])*mix;color=crocTint;if(x>=1.55&&w>.55)color=rgb('#a57560');}if(kind==='upper'&&x>1.42&&w<-.2)color=rgb('#936354');this.vertex(x-3.5,y,z,color,1,nx,ny,nz,1);}
};
// Bevelled hexagonal shields follow the skin with smooth inset crowns.
var crocShield=[];
(function(){function v(a,inner){return [Math.cos(a)*(inner?.62:1),inner?1:0,Math.sin(a)*(inner?.62:1),Math.cos(a)*(inner?.18:.6),1,Math.sin(a)*(inner?.18:.6)];}for(var f=0;f<6;f++){var a=f*Math.PI/3,b=(f+1)*Math.PI/3,A=v(a,false),B=v(b,false),C=v(a,true),D=v(b,true);[A,B,C,B,D,C,C,D,[0,1.04,0,0,1,0]].forEach(function(p){crocShield.push(p);});}})();
Renderer.prototype.crocScute=function(x,y,z,length,width,height,color,side,skin,phase){var c=rgb(color),embed=Math.min(height*.7,this.low?.032:.016);for(var i=0;i<crocShield.length;i++){var v=crocShield[i],nx=v[3]*height*6/length,nz=v[5]*height*6/width,xx=v[0]*length*.5,yy=v[1]*height,zz=v[2]*width*.5,px=x+xx,py=y+(side?zz:yy),pz=z+(side?yy*side:zz);if(skin){var s=crocSection(skin==='skull'?'upper':skin,px+3.5);if(side){var q=Math.max(-.94,Math.min(.94,(y+zz-s[1])/Math.max(.001,s[2])));py=s[1]+q*s[2];pz=side*(s[3]*Math.sqrt(1-q*q)+yy-embed);}else{var q=Math.max(-.94,Math.min(.94,(z+zz)/Math.max(.001,s[3])));py=crocSurface(skin==='skull'?'upper':skin,px+3.5,Math.sqrt(1-q*q));pz=q*s[3];if(skin==='skull'){var a=1-Math.pow((px+3.5-1.32)/.44,2)-Math.pow(pz/.57,2),b=1-Math.pow((px+3.5-1.34)/.33,2)-Math.pow(pz/.385,2);if(a>0)py=Math.max(py,.69+.23*Math.sqrt(a));if(b>0)py=Math.max(py,.88+.09*Math.sqrt(b));}py+=yy-embed;}if(skin!=='upper'&&skin!=='skull')pz+=crocWave(px+3.5,phase||0);}this.vertex(px,py,pz,c,1,nx,side?nz:1,side?side:nz,1);}};
// Small side webs close the moving mouth corners; the rear wall closes the throat.
Renderer.prototype.crocCheeks=function(angle){var hingeX=1.15,hingeY=.34,c=Math.cos(angle),s=Math.sin(angle),self=this,root=[];
 function edge(kind,x,side){var p=crocSection(kind,x),z=side*p[3]*Math.sin(Math.PI*.4),y=crocSurface(kind,x,(kind==='upper'?-1:1)*Math.cos(Math.PI*.4));if(kind==='upper'){var dx=x-hingeX,dy=y-hingeY;x=hingeX+dx*c-dy*s;y=hingeY+dx*s+dy*c;}return [x-3.5,y,z];}
 for(var side=-1;side<=1;side+=2){var a=edge('lower',1.15,side),b=edge('lower',1.55,side),d=edge('upper',1.15,side),e=edge('upper',1.55,side);this.quad(a,b,e,d,'#78935e',.92);root.push(a,d);}
 self.quad(root[0],root[1],root[3],root[2],'#80564c',.9);
};
Renderer.prototype.crocTooth=function(x,y,z,h,lean){var n=this.low?5:7,c=rgb('#f3e7c3'),r=Math.abs(h)*.26;for(var ring=0;ring<2;ring++)for(var j=0;j<n;j++)for(var k=0;k<6;k++){var upper=k===1||k===2||k===4,row=ring+(upper?1:0),a=(j+(k===2||k===4||k===5?1:0))/n*Math.PI*2,u=row*.5,radius=r*(row===2?0:row===1?.58:1);this.vertex(x+Math.cos(a)*radius+lean*u*u,y+h*u,z+Math.sin(a)*radius,c,1,Math.cos(a),h>0?.22:-.22,Math.sin(a),1);}};
Renderer.prototype.departingBuddies=function(g,t){
 for(var i=0;i<g.departures.length;i++){
  var e=g.departures[i],age=g.time-e.at;if(age<0||age>1.6)continue;
  var u=Math.min(1,age/.8),x=e.x-g.distance-1.1*u,z=Math.max(-6.7,Math.min(6.7,e.z+e.side*(.6+u*3.2))),y=(e.y+.6)*(1-u)+Math.sin(u*Math.PI)*(e.reason==='arrival'?1:2.6);
  if(!this.reducedMotion&&age<.8)this.person(x,y,z,e.role,t);
  if(age>=.65){var splash=(age-.65)/.95,r=.45+splash*1.6;this.loop(x,.08,z,r,r*.7,.045*(1-splash),'#f4f2ce',1,true);if(!this.reducedMotion&&age<1.05)for(var n=0;n<(this.low?4:7);n++){var a=n*6.283/7;this.box(x+Math.cos(a)*r,.15+Math.sin(splash*Math.PI)*.8,z+Math.sin(a)*r,.11,.17,.11,'#d9eee3');}}
 }
};
// Follow a world position from behind the camera; simulation time freezes this during pause.
// Snout-to-stern spacing is the same meter scale as the physics/HUD.
Renderer.prototype.crocApproach=function(g,nearX){this.crocRun=g;this.crocViewAt=g.time;this.crocViewX=nearX;return nearX;};
// A calm near-water threat: wait after arrival, then snap only once every 8–10 seconds.
Renderer.prototype.crocBite=function(g,eligible,airborne){
 if(this.crocBiteRun!==g){this.crocBiteRun=g;this.crocBiteAt=-99;this.crocBiteNext=g.time+3;this.crocBiteCount=0;}
 if(!eligible||this.reducedMotion||g.mode!=='play'){this.crocBiteNext=Math.max(this.crocBiteNext,g.time+3);this.crocBiteAt=-99;this.crocBiteAge=-1;return .12;}
 if(airborne){this.crocBiteAt=-99;this.crocBiteAge=-1;return .12;}
 if(g.time>=this.crocBiteNext){this.crocBiteAt=g.time;this.crocBiteCount++;this.crocBiteNext=g.time+8+noise(g.seed+this.crocBiteCount*17)*2;}
 var age=g.time-this.crocBiteAt;this.crocBiteAge=age>=0&&age<1.3?age:-1;
 return .12+.78*smooth(0,.32,age)*(1-smooth(.5,.67,age));
};
Renderer.prototype.crocBiteWater=function(g,x,t){var age=this.crocBiteAge-.55;if(this.reducedMotion||age<0||age>.65)return;
 var u=age/.65,z=(g.z||0)*.7+.3+Math.sin(t*2)*.1,px=x+2.4;
 this.paddleRipple(px,z,.55+u*.55,1.2+u*.6,.065*(1-u),.6*(1-u),3,paletteAt(this.offset+px));
 var n=this.low?4:8;for(var i=0;i<n;i++){var side=i%2?1:-1,a=Math.floor(i/2)/(n/2-1)*Math.PI;this.paddleDrop(px+Math.cos(a)*.38,.08+Math.sin(u*Math.PI)*(.45+noise(i+7)*.25),z+side*(1.15+u*.65+noise(i)*.12),.075*(1-u));}
};
// Position-driven clearance: pause/reduced motion still keep the entire animal above hazards.
Renderer.prototype.crocJump=function(g,x,z){
 var best={height:0,pitch:0,backstep:0,progress:0,obstacle:null},pitchSum=0,weightSum=0;
 for(var i=0;i<g.entities.length;i++){
  var e=g.entities[i];if((e.kind!=='rock'&&e.kind!=='log')||(e.done&&!e.passed))continue;var lateral=Math.abs((e.z||0)-z),limit=e.kind==='rock'?(e.reef==='ridge'?6.15:e.pillar?5:4.3):4.8;if(lateral>=limit+1)continue;
  // The visible double-size snout extends 3.5m forward and the tail reaches 14.2m back.
  var u=(g.distance+x-e.x+9)/28.5;if(u<=0||u>=1)continue;
  var side=1-smooth(limit,limit+1,lateral),height=Math.pow(Math.sin(u*Math.PI),.6)*smooth(0,.07,u)*(1-smooth(.95,1,u))*(e.kind==='rock'?4.8:4.2)*side,weight=height*height*height*height;
  // A compact recoil keeps the vault visible; tuck the snout while the body rises.
  best.backstep=Math.max(best.backstep,1.95*smooth(0,.07,u)*(1-smooth(.96,1,u))*side);
  pitchSum-=Math.asin(Math.max(0,height-2)/8.6)*weight;weightSum+=weight;
  if(height>best.height){best.height=height;best.progress=u;best.obstacle=e;}
 }
 if(weightSum>0)best.pitch=pitchSum/weightSum;return best;
};
Renderer.prototype.croc=function(x,t,follow,open,turn,hop){var phase=t*3.6,z=(follow||0)*.7+.3+Math.sin(t*2)*.1,angle=crocJawAngle(open||0),bob=Math.sin(phase*2)*.018,yaw=Math.sin(phase)*.016+Math.max(-.055,Math.min(.055,(turn||0)*.005));
 var contact=this.crocContactPose;if(contact){z=contact.z;yaw=contact.yaw||0;bob=contact.y;}var staged=this.endingCrocPose;if(staged){z=staged.z+.4*Math.sin(staged.yaw);yaw=staged.yaw;bob+=staged.y;}
 // The full model retains the fixed double scale and the snout anchor.
 this.group={x:x+3.5-(hop?hop.backstep||0:0),y:0,z:z,scale:2,cos:1,sin:0,yawCos:Math.cos(yaw),yawSin:Math.sin(yaw)};
 if(staged)this.group.x=staged.x+.4*Math.cos(yaw);if(!staged||!staged.walk)this.shadow(-3.5,.025,0,4.1,1.5,.7/(1+(hop?hop.height:0)*.3));var pitch=staged?staged.pitch||0:hop?hop.pitch:0;this.group.cos=Math.cos(pitch);this.group.sin=Math.sin(pitch);this.group.x-=8.6*(1-this.group.cos);this.group.y=bob+(hop?hop.height:0)+8.6*this.group.sin;this.crocImmersion=staged?(staged.walk?0:1-smooth(0,.55,staged.y)):(hop?1-smooth(0,.4,hop.height):1);this.crocSpine=contact?contact.spine:.24*smooth(.12,1.6,open||0);this.crocSpineCos=Math.cos(this.crocSpine);this.crocSpineSin=Math.sin(this.crocSpine);this.crocSkin('tail',phase);this.crocSkin('body',phase);
 // Three staggered rows of shoulder/back plates, with a split tail crest.
 for(var row=-1;row<=1;row++)for(var plate=0;plate<(this.low?5:8);plate++){var px=-1.5+plate*(this.low?.5:.34),zz=row*.39;this.crocScute(px-3.5,0,zz,.33,.27,row===0?.14:.08,plate%3===0?'#789b61':'#456d4b',0,'body',phase);}
 for(var plate=0;plate<(this.low?7:11);plate++){var u=plate/(this.low?6:10),px=-1.9-u*3.15,width=.26*(1-u)+.035;for(var side=-1;side<=1;side+=2)this.crocScute(px-3.5,0,side*width*.65,.3-u*.15,width,.17*(1-u)+.025,plate%2?'#446c48':'#5f8554',0,'tail',phase);}
 if(!this.low)for(var side=-1;side<=1;side+=2)for(var row=0;row<2;row++)for(var plate=0;plate<7;plate++){var px=-1.25+plate*.34;this.crocScute(px-3.5,.32+row*.21,0,.27,.18,.025,plate%2?'#86a16a':'#678a59',side,'body',phase);}
 // Opposite diagonals share a stroke. Toes point toward the snout (+X),
 // independently of the backward bend at the elbow/knee.
 var walking=staged&&staged.walk;
 for(var side=-1;side<=1;side+=2)for(var leg=-1;leg<=1;leg+=2){var ax=leg>0?.86:-1.3,p=phase+(side>0?0:Math.PI)+(leg>0?0:Math.PI),pull=Math.sin(p),kick=Math.cos(p),bodyWave=crocWave(ax,phase),ex=ax-.25+pull*.10,ez=side*(.97+kick*.025)+bodyWave,fx=ax-.24+pull*.22,fz=side*(1.22+kick*.055)+bodyWave,fy=.095+Math.max(0,kick)*.045;
  // A longer planted phase and a raised return keep the land gait from skating
  // at constant height. Cancel the small body bob at each planted sole.
  if(walking){var cycle=((p/(Math.PI*2))%1+1)%1,stance=.62,swing=cycle<stance?0:(cycle-stance)/(1-stance),reach=cycle<stance?1-2*cycle/stance:-Math.cos(swing*Math.PI);fx=ax-.16+reach*.38;fy=.135-Math.sin(phase*2)*.009+Math.sin(swing*Math.PI)*.26;fz=side*1.22+bodyWave;}
  this.tube(ax-3.5,.39,side*.55+bodyWave,ex-3.5,.25,ez,.22,.14,'#608557');this.round(ex-3.5,.25,ez,.35,.31,.34,'#73945f');this.tube(ex-3.5,.25,ez,fx-3.5,fy+.025,fz,.14,.085,'#789863');this.round(fx-3.5,fy+.025,fz,.20,.19,.20,'#789863');this.round(fx-3.46,fy,fz,.40,.14,.35,'#8da66d');
  for(var toe=-1;toe<=1;toe++){var tz=fz+toe*.105,tx=fx+.28-Math.abs(toe)*.035;this.tube(fx-3.44,fy,tz,tx-3.5,fy-.015,tz+toe*.035,.046,.028,'#9db47b');this.tube(tx-3.5,fy-.015,tz+toe*.035,tx-3.40,fy-.035,tz+toe*.05,.029,.008,'#e3d5a8');}
 }
 // Broad lower jaw, gum line and a tongue held inside the mouth cavity.
 this.crocSkin('lower',phase);this.round(-1.08,.16,0,1.05,.075,.30,'#bc7d68');this.crocCheeks(angle);
 var lowerTeeth=crocDentalRow(false,this.low),upperTeeth=crocDentalRow(true,this.low),teeth=lowerTeeth.length;for(var side=-1;side<=1;side+=2)for(var tooth=0;tooth<teeth;tooth++){var p=lowerTeeth[tooth];this.crocTooth(p[0]-3.5,p[1],side*p[2],p[3],-.025);}
 // Upper snout and teeth form one hinge, preserving the existing snap timing.
 this.jaw={x:-2.35,y:.34,cos:Math.cos(angle),sin:Math.sin(angle)};this.crocSkin('upper',phase);
 for(var side=-1;side<=1;side+=2){for(var tooth=0;tooth<teeth;tooth++){var p=upperTeeth[tooth];this.crocTooth(p[0]-3.5,p[1],side*p[2],p[3],-.025);}
  var nose=crocSection('upper',3.07),noseY=crocSurface('upper',3.07,Math.sqrt(1-Math.pow(.28/nose[3],2)));this.round(-.43,noseY-.015,side*.28,.23,.12,.19,'#77975c');this.round(-.4,noseY+.028,side*.29,.12,.032,.09,'#293f32',3);if(!this.low)this.round(-.43,noseY+.040,side*.27,.038,.012,.02,'#a5ba7d');
  var lip=crocLipRow(this.low);for(var rim=0;rim<lip.length-1;rim++){var a=lip[rim],b=lip[rim+1];this.tube(a[0]-3.5,a[1],side*a[2],b[0]-3.5,b[1],side*b[2],.014,.012,'#4c7048');}
 }
 for(var row=-1;row<=1;row++)for(var mark=0;mark<(this.low?3:6);mark++){var px=1.85+mark*(this.low?.36:.19),zz=row*.26;this.crocScute(px-3.5,0,zz,.18,.17,.014,mark%2?'#77965d':'#6e8d56',0,'upper',phase);}
 this.round(-2.18,.69,0,.88,.46,1.14,'#648a55');this.round(-2.16,.88,0,.66,.18,.77,'#72955c');
 // Amber eyes, vertical slit pupils, heavy brows and a short soft blink.
 var blink=smooth(.95,1,Math.sin(t*1.7)),eyeH=.28*(1-blink)+.025;
 for(var side=-1;side<=1;side+=2){this.round(-2.16,.84,side*.5,.6,.46,.42,'#76995f');this.round(-2.04,.91,side*.635,.31,eyeH,.09,'#d4b852',3);this.round(-2,.91,side*.682,.055,eyeH*.82,.018,'#25382a',3);if(!this.low)this.round(-1.965,.96-blink*.05,side*.695,.044,.045*(1-blink)+.006,.01,'#fff0c6',3);this.tube(-2.33,1.0-blink*.04,side*.52,-2.14,1.04-blink*.04,side*.54,.065,.06,'#4a724a');this.tube(-2.14,1.04-blink*.04,side*.54,-1.92,.95-blink*.05,side*.57,.06,.04,'#4a724a');this.tube(-2.28,.77,side*.59,-1.96,.79,side*.63,.04,.025,'#a1b57b');}
 for(var brow=0;brow<3;brow++)this.crocScute(-2.34+brow*.2,0,0,.19,.34,.017,brow%2?'#648950':'#567e4d',0,'skull',phase);this.jaw=null;this.crocSpine=0;this.crocImmersion=0;this.group=null;
};
Renderer.prototype.tree=function(x,z,h,p){this.mediumDetail=true;this.tube(x,0,z,x+.12,h*.7,z,.34,.18,'#907351');this.tube(x,h*.42,z,x+.8,h*.7,z+.25,.14,.05,'#907351');this.round(x,h*.8,z,3.7,h*1.15,3.2,p.tree);this.round(x-.6,h*1.05,z+.2,2.9,h*.85,2.6,p.leaf);this.round(x+.8,h*.86,z+.42,2.7,h*.8,2.5,p.leaf);this.mediumDetail=false;};
function stoneFace(faces,a,b,c,color){
 var abx=b[0]-a[0],aby=b[1]-a[1],abz=b[2]-a[2],acx=c[0]-a[0],acy=c[1]-a[1],acz=c[2]-a[2];
 var nx=aby*acz-abz*acy,ny=abz*acx-abx*acz,nz=abx*acy-aby*acx,len=Math.sqrt(nx*nx+ny*ny+nz*nz);
 faces.push({points:[a,b,c],nx:nx/len,ny:ny/len,nz:nz/len,color:color});
}
// Closed reefs taper from a broad, submerged foot to an uneven stone shelf.
// Explicit crests give the ridge two peaks with a continuous saddle.
function reefMesh(rim,crest,footX,footZ,shadowX,shadowZ){
 var faces=[],foot=rim.map(function(p){return [p[0]*footX,-.34,p[2]*footZ];}),bottom=[0,-.34,0];
 for(var i=0;i<rim.length;i++){
  var j=(i+1)%rim.length;
  stoneFace(faces,crest,rim[j],rim[i],i%3===0?2:1);
  stoneFace(faces,rim[i],rim[j],foot[i],i%3===1?1:0);
  stoneFace(faces,rim[j],foot[j],foot[i],0);
  stoneFace(faces,bottom,foot[i],foot[j],0);
 }
 return {faces:faces,shadowX:shadowX,shadowZ:shadowZ};
}
var reefMeshes={
 slab:reefMesh([[-.88,.38,-1.24],[.60,.57,-1.25],[1.33,.72,-.51],[1.20,.62,.80],[.41,.82,1.30],[-.83,.58,1.24],[-1.42,.52,.33]],[-.12,.76,.19],1.10,1.12,1.73,1.59),
 spire:reefMesh([[-.52,.57,-.77],[.32,1.16,-.82],[.82,.91,-.37],[.58,1.40,.36],[.04,1.21,.86],[-.56,.86,.69],[-.95,.61,.18]],[-.19,1.53,.22],1.53,1.56,1.63,1.52),
 ridge:reefMesh([[-.52,.46,-3.00],[.68,.62,-2.76],[1.10,1.11,-1.52],[.67,.73,-.15],[1.12,1.05,1.42],[.75,.67,2.82],[-.35,.63,3.05],[-1.00,1.20,1.65],[-.66,.76,.24],[-1.12,1.34,-1.48]],[-.12,.94,.22],1.29,1.09,1.70,3.48)
};
// River obstacles have their own stone colors. The canyon's red palette
// still belongs to the cliffs and the rocks on the banks.
var reefStone={slab:rgb('#989e9a'),spire:rgb('#768187'),ridge:rgb('#858e90')},reefMoss=rgb('#879785');
Renderer.prototype.stone=function(x,z,variant){
 var mesh=reefMeshes[variant]||reefMeshes.slab,base=reefStone[variant]||reefStone.slab,faces=mesh.faces;
 this.shadow(x,.019,z,mesh.shadowX,mesh.shadowZ,.72);
 for(var i=0;i<faces.length;i++){
  var face=faces[i],color=face.color===2?reefMoss:base;
  for(var j=0;j<3;j++){
   var v=face.points[j],shade=(face.color===0?.88:1)*(.78+.22*smooth(-.025,.50,v[1]));
   this.vertex(x+v[0],v[1],z+v[2],color,shade,face.nx,face.ny,face.nz,1);
  }
 }
};

// Each section gives a cross-river position, a centre x/y and two radii.
var driftwoodStyles=[
 {sections:[[-1.73,-.13,.29,.37,.32],[-.50,-.06,.31,.44,.38],[.65,.02,.32,.49,.40],[1.71,.12,.30,.52,.39]],
  bark:'#b7986b',strip:'#c9ae80',end:'#e2c79a',ring:'#ac895a'},
 {sections:[[-1.58,-.13,.31,.55,.37],[-.48,.07,.34,.61,.45],[.54,.13,.34,.52,.41],[1.54,-.18,.31,.44,.38]],
  bark:'#816449',strip:'#a07f58',end:'#c4a77c',ring:'#957653',branch:[.07,.64,-.39,.64,.99,-.16,.18,.08]}
];
function driftwoodMesh(style){
 var faces=[],n=8,bark=rgb(style.bark),strip=rgb(style.strip),end=rgb(style.end),ring=rgb(style.ring);
 var sections=style.sections.map(function(section){
  var points=[];
  for(var i=0;i<n;i++){
   var a=i*Math.PI*2/n,uneven=i%3===0?.93:1;
   points.push([section[1]+Math.cos(a)*section[3]*uneven,section[2]+Math.sin(a)*section[4]*uneven,section[0]]);
  }
  return points;
 });
 for(var i=0;i<sections.length-1;i++)for(var j=0;j<n;j++){
  var a=sections[i],b=sections[i+1],k=(j+1)%n,c=j===1||j===3?strip:bark;
  stoneFace(faces,a[j],a[k],b[j],c);
  stoneFace(faces,a[k],b[k],b[j],c);
 }
 function cap(index,far){
  var outer=sections[index],s=style.sections[index],center=[s[1],s[2],s[0]];
  function face(a,b,c,color){stoneFace(faces,a,far?b:c,far?c:b,color);}
  [.87,.67,.56].forEach(function(scale,band){
   var inner=sections[index].map(function(p){return [center[0]+(p[0]-center[0])*scale,center[1]+(p[1]-center[1])*scale,p[2]];});
   for(var j=0;j<n;j++){
    var k=(j+1)%n,color=band===0?bark:band===1?end:ring;
    face(outer[j],outer[k],inner[j],color);
    face(outer[k],inner[k],inner[j],color);
   }
   outer=inner;
  });
  for(var j=0;j<n;j++)face(outer[j],outer[(j+1)%n],center,end);
 }
 cap(0,false);cap(sections.length-1,true);
 return faces;
}
var driftwoodMeshes=driftwoodStyles.map(driftwoodMesh);
Renderer.prototype.riverLog=function(x,en){
 var key=Number.isFinite(en.encounter)?en.encounter:en.x;
 // Pair different wood and lengths across the blocked lanes. Use the
 // original lane so size and orientation stay stable as the log sways.
 var lane=Math.round((Number.isFinite(en.baseZ)?en.baseZ:en.z||0)/3.7);
 var row=Math.floor(key*.5),slot=lane<0||lane===0&&en.safeLane<0?0:1;
 var index=(row+slot)&1,long=((row+Math.floor(row*.5))&1)===slot;
 var seed=row*7+lane*19;
 var length=(long?1.07:.76)+.07*noise(seed+.3),width=.93+.16*noise(seed+8);
 var side=slot===0?-1:1,stagger=side*(row%2===0?1:-1);
 var yaw=side*(.15+.13*noise(seed+2)),cs=Math.cos(yaw),sn=Math.sin(yaw);
 x+=stagger*(.19+.12*noise(seed+5));
 var style=driftwoodStyles[index],faces=driftwoodMeshes[index];
 this.shadow(x,.019,0,.83*width,1.86*length,.56,yaw);
 for(var i=0;i<faces.length;i++){
  var face=faces[i],nx=face.nx/width,nz=face.nz/length;
  for(var j=0;j<3;j++){
   var v=face.points[j],shade=.79+.21*smooth(-.025,.38,v[1]),px=v[0]*width,pz=v[2]*length;
   this.vertex(x+px*cs+pz*sn,v[1],pz*cs-px*sn,face.color,shade,nx*cs+nz*sn,face.ny,nz*cs-nx*sn,1);
  }
 }
 var branch=style.branch;
 if(branch){
  var ax=branch[0]*width,az=branch[2]*length,bx=branch[3]*width,bz=branch[5]*length;
  this.tube(x+ax*cs+az*sn,branch[1],az*cs-ax*sn,x+bx*cs+bz*sn,branch[4],bz*cs-bx*sn,branch[6]*width,branch[7]*width,style.bark,style.end);
 }
};

// Uneven, flat-lit cuts on a single closed mesh. The chips share this geometry.
var flyingStoneColors=[rgb('#81867b'),rgb('#999b8b'),rgb('#b3ad93')];
var flyingStoneFaces=(function(){
 var top=[[-.53,.30,-.44],[.06,.58,-.49],[.52,.39,-.25],[.59,.33,.19],[.20,.49,.55],[-.34,.35,.48],[-.61,.24,.04]];
 var base=[[-.54,-.39,-.48],[-.11,-.55,-.62],[.45,-.39,-.46],[.72,-.16,.05],[.38,-.40,.59],[-.30,-.53,.58],[-.70,-.22,.09]];
 var crown=[-.09,.51,.02],sole=[.01,-.54,-.03],faces=[];
 for(var i=0;i<top.length;i++){
  var j=(i+1)%top.length;
  stoneFace(faces,crown,top[j],top[i],flyingStoneColors[i===1||i===2?2:1]);
  stoneFace(faces,top[i],top[j],base[i],flyingStoneColors[i===4?2:1]);
  stoneFace(faces,top[j],base[j],base[i],flyingStoneColors[0]);
  stoneFace(faces,sole,base[i],base[j],flyingStoneColors[0]);
 }
 return faces;
})();
var flyingStoneChips=[
 {release:.13,scale:.24,drift:-1.4,carry:.76,lift:.75},
 {release:.19,scale:.17,drift:1.8,carry:.52,lift:.15},
 {release:.25,scale:.28,drift:2.0,carry:.83,lift:.85},
 {release:.31,scale:.20,drift:-2.5,carry:.66,lift:.1},
 {release:.38,scale:.22,drift:-.6,carry:.87,lift:.5},
 {release:.43,scale:.15,drift:1.25,carry:.72,lift:.1}
];
Renderer.prototype.flyingStoneMesh=function(x,y,z,scale,yaw,roll){
 var cs=Math.cos(yaw),sn=Math.sin(yaw),cr=Math.cos(roll),sr=Math.sin(roll);
 for(var i=0;i<flyingStoneFaces.length;i++){
  var face=flyingStoneFaces[i],nz=face.ny*sr+face.nz*cr,ny=face.ny*cr-face.nz*sr;
  for(var j=0;j<3;j++){
   var p=face.points[j],py=p[1]*cr-p[2]*sr,pz=p[1]*sr+p[2]*cr;
   this.vertex(x+scale*(p[0]*cs+pz*sn),y+scale*py,z+scale*(pz*cs-p[0]*sn),
    face.color,1,face.nx*cs+nz*sn,ny,nz*cs-face.nx*sn,1);
  }
 }
};
// A soft water shadow marks the actual landing point before the throw.
Renderer.prototype.projectileTarget=function(en,x){
 this.shadow(x,.024,en.targetZ,1.55,1.12,.8);
};
Renderer.prototype.projectileStone=function(g,en,x){
 if(en.throwAt===null)return;
 var age=g.time-en.throwAt,flight=en.flightSeconds||1.05,travel=en.targetZ-en.launchZ,dir=Math.sign(travel);
 var roll=this.reducedMotion||age>=flight?0:dir*Math.PI*2*smooth(0,flight,age);
 this.flyingStoneMesh(x,en.y,0,1,dir*.35,roll);
 if(this.reducedMotion||age<=0||age>=flight)return;
 for(var i=0;i<flyingStoneChips.length;i+=this.low?2:1){
  var chip=flyingStoneChips[i],u=chip.release,elapsed=age-u*flight;
  if(elapsed<=0)continue;
  // Peel from the trailing edge, inherit part of the throw, then fall on
  // independent arcs. Using the game clock makes the scatter pause with it.
  var y=.65-.3*u+1.25*Math.sin(Math.PI*u)+chip.lift*elapsed-7.8*elapsed*elapsed;
  if(y<=.02)continue;
  var releaseZ=en.launchZ+travel*u*u*(3-2*u)-dir*.45;
  var speedZ=travel*6*u*(1-u)/flight*chip.carry;
  this.flyingStoneMesh(x+chip.drift*(.10+elapsed),y,releaseZ+speedZ*elapsed-en.z,
   chip.scale,i*1.7+elapsed*chip.drift*3,dir*(i+1)*.6+elapsed*9);
 }
};
// A low volumetric swell joined to the river, sampled from the collision surface.
var waveGrids={};
Renderer.prototype.wave=function(x,t,power){
 var coarse=this.low||this.farDetail,N=coarse?18:30,M=coarse?12:20,key=N+':'+M,clock=this.reducedMotion?0:t;
 var grid=waveGrids[key]||(waveGrids[key]=new Float32Array((N+1)*(M+1)*10));
 var wavePalette=paletteAt(x+(this.offset||0)),water=rgb(wavePalette.water),tint=this.waveTint||(this.waveTint=[0,0,0]),foam=rgb('#edf9f3'),sample=this.wavePoint||(this.wavePoint={}),self=this;
 var color=this.waveColor||(this.waveColor=[0,0,0]),surface=root.River3D.waveSurface,W=root.River3D.wave;
 for(var i=0;i<=N;i++)for(var j=0;j<=M;j++){
  var xx=-W.approach-.4+i/N*(W.approach+W.rear+.8),z=(j/M*2-1)*W.halfWidth;
  surface(xx,z,power,sample);var h=sample.height,dx=sample.slope,dz=sample.crossSlope;
  // Broken foam eddies move across the lip; there is no rigid sheet or rim.
  var front=sample.local,band=Math.exp(-Math.pow((front-.12)/.85,2)),eddy=.5+.28*Math.sin(z*8.1+front*4.3-clock*2.4+Math.sin(z*3.7))+.22*Math.sin(z*17-front*7+clock*1.9);
  var white=band*smooth(.18,.68,eddy)*smooth(.01,.4,sample.edge);
  var blend=(.035+h*.065+white*.85)*smooth(0,.25,h),idx=(i*(M+1)+j)*10,norm=Math.sqrt(1+dx*dx+dz*dz);
  grid[idx]=x+xx;grid[idx+1]=h-.025;grid[idx+2]=z;
  waterColorAt(x+xx+(this.offset||0),z+(this.entityZ||0),wavePalette,tint);
  for(var k=0;k<3;k++)grid[idx+3+k]=tint[k]*1.08+(foam[k]-tint[k]*1.08)*blend;
  grid[idx+6]=-dx/norm;grid[idx+7]=1/norm;grid[idx+8]=-dz/norm;grid[idx+9]=6;
 }
 function emit(k){color[0]=grid[k+3];color[1]=grid[k+4];color[2]=grid[k+5];self.vertex(grid[k],grid[k+1],grid[k+2],color,1,grid[k+6],grid[k+7],grid[k+8],grid[k+9]);}
 for(var row=0;row<N;row++)for(var col=0;col<M;col++){
  var A=(row*(M+1)+col)*10,B=A+(M+1)*10,C=B+10,D=A+10;emit(A);emit(B);emit(C);emit(A);emit(C);emit(D);
 }
 // Thin, irregular foam streaks follow the actual water surface instead of floating.
 var ribbons=coarse?9:16;
 for(var r=0;r<ribbons;r++){
  var z0=(noise(r+39)-.5)*4.8,phase=(clock*.40+noise(r+81))%1,x0=.6-phase*7.7,len=.32+noise(r+67)*.70,width=.018+noise(r+11)*.035;
  for(var a=0;a<4;a++){
   var u=a/4,v=(a+1)/4,za=z0+Math.sin(u*3+r)*.11,zb=z0+Math.sin(v*3+r)*.11;
   surface(x0-u*len,za,power,sample);var ya=sample.height-.008;
   surface(x0-v*len,zb,power,sample);var yb=sample.height-.008;
   var fade=Math.sin(Math.PI*phase)*(.68+.17*Math.sin(r*2.3));
   for(var k=0;k<3;k++)color[k]=water[k]+(foam[k]-water[k])*fade;
   this.quad([x+x0-u*len,ya,za-width],[x+x0-v*len,yb,zb-width],[x+x0-v*len,yb,zb+width],[x+x0-u*len,ya,za+width],color);
  }
 }
 // Uneven froth islands hug the curved water. Overlapping, torn outlines
 // replace a continuous white rim; no raised slabs or regularly spaced beads.
 var froth=rgb('#f5fff9'),patches=coarse?16:28;
 function foamPoint(px,pz){surface(px,pz,power,sample);var n=Math.sqrt(1+sample.slope*sample.slope+sample.crossSlope*sample.crossSlope);self.vertex(x+px,sample.height-.009,pz,froth,1,-sample.slope/n,1/n,-sample.crossSlope/n,6);}
 for(var f=0;f<patches;f++){
  var phase=(clock*.72+noise(f+152))%1,z=(noise(f+143)-.5)*4.7;
  surface(0,z,power,sample);var cx=sample.crest-.55+phase*1.15,cz=z+Math.sin(phase*4+f)*.055;
  var fade=Math.sin(Math.PI*phase),rx=(.12+noise(f+163)*.15)*fade,rz=(.085+noise(f+178)*.12)*fade;
  for(var a=0;a<(coarse?8:12);a++){
   var step=Math.PI*2/(coarse?8:12),a0=a*step,a1=(a+1)*step,r0=1+.18*Math.sin(a0*5+f*2.1)+.10*Math.sin(a0*3+f),r1=1+.18*Math.sin(a1*5+f*2.1)+.10*Math.sin(a1*3+f);
   foamPoint(cx,cz);foamPoint(cx+Math.cos(a0)*rx*r0,cz+Math.sin(a0)*rz*r0);foamPoint(cx+Math.cos(a1)*rx*r1,cz+Math.sin(a1)*rz*r1);
  }
 }
 // Bright spray peels off the crest in varied arcs and falls back towards it.
 if(!this.reducedMotion)for(var d=0;d<(coarse?10:18);d++){
  var phase=(clock*(.85+noise(d+127)*.45)+noise(d+102))%1,z=(noise(d+95)-.5)*4.6;
  surface(0,z,power,sample);var origin=sample.crest-.12;surface(origin,z,power,sample);
  var size=(.045+noise(d+119)*.035)*Math.sin(Math.PI*phase),lift=(.38+noise(d+113)*.36)*Math.sin(Math.PI*phase)-phase*.22;
  this.paddleDrop(x+origin+phase*(.65+noise(d+124)*.9),sample.height+.045+lift,z+phase*(noise(d+131)-.5)*.9,size,'#f4fff9');
 }

};
Renderer.prototype.landmark=function(x,kind,t){
 var p=this.palette;
 if(kind===0){for(var side=-1;side<=1;side+=2){this.box(x,4.5,side*9,.7,9,.8,'#886c48');this.box(x-2,4.5,side*9,.7,9,.8,'#886c48');this.box(x-1,8.8,side*9,3.4,.55,1,'#ac8655');}for(var z=-10;z<=10;z+=1.3){this.box(x-1,8.6,z,2.5,.24,1.15,'#b5925e');this.box(x-2.3,9.3,z,.08,1.4,.08,'#e0c384');this.box(x+.3,9.3,z,.08,1.4,.08,'#e0c384');}this.box(x-2.3,10,-.2,.1,.1,21,'#705b42');this.box(x+.3,10,-.2,.1,.1,21,'#705b42');}
 else if(kind===1){this.cone(x,.7,-16,3.5,3.5,'#d99b65',4);this.tri([x-1,.7,-12.5],[x,3.2,-14],[x+1,.7,-12.5],'#4d6251',1);this.box(x+6,1,-12,3,.4,2,'#9c794b');this.box(x+6,.5,-12,.4,1,.4,'#705b42');for(var i=0;i<4;i++){this.box(x-5+i*.8,.8,-11,.2,1.6,.2,'#e1c68b');this.tri([x-5+i*.8,1.7,-11],[x-4.5+i*.8,1.4,-11],[x-5+i*.8,1.1,-11],i%2?'#de8859':'#f0d68d');}}
 else{this.blob(x,4,-22,7,10,7,p.rock);this.box(x+1,4.3,-18.8,3,8,.2,'#a9d9d2');for(var j=0;j<8;j++)this.box(x-.3+(j%3),1+((j*1.4-t*2)%7+7)%7,-18.65,.08,.65,.07,'#e7f4df');this.disc(x,.4,-17,4,3,'#8ac9bb');}
};
// Deterministic riverbank vignettes; their positions never consume gameplay RNG.
function bankClearing(worldX,side){return root.River3D.bankSitesBetween(worldX-9,worldX+9).some(function(s){return s.side===side;});}
Renderer.prototype.bankVisitor=function(x,y,z,side,t,pose,response){
 response=response||{};if(response.cheer)y+=Math.max(0,Math.sin(t*5))*.22;
 var old=this.actor,skin='#efbd91',shirt=pose==='fish'?'#c08b4d':pose==='wave'||pose==='throw'?'#d77a58':'#668b9a',seated=pose!=='wave'&&pose!=='throw',lift=pose==='fish'?Math.max(response.progress||0,Math.max(0,Math.sin(t*.85))*.34):0;
 this.actor={x:x,y:y,z:z,cos:-side,sin:0,role:'captain'};
 // Bent legs, sturdy boots and a loose vest, separate from the raft's captain model.
 for(var s=-1;s<=1;s+=2){this.tube(s*.23,seated?.50:.75,0,s*.23,seated?.47:.25,seated?.52:.02,.17,.13,'#465c5c');if(seated)this.tube(s*.23,.47,.52,s*.23,.18,.58,.13,.11,'#465c5c');this.round(s*.23,.16,seated?.7:.16,.36,.25,.54,'#493c31');}
 if(seated){this.actor.y-=.24;y-=.24;}
 this.round(0,1.11,0,.94,.99,.65,shirt);this.box(0,1.13,.33,.11,.65,.035,'#ead7ad');this.round(0,1.94,.02,.79,.86,.74,skin);this.round(0,2.23,-.1,.8,.4,.65,'#514538');this.face(1.99,.365,.17,false);this.round(0,1.91,.42,.14,.17,.16,skin);
 if(pose==='fish'){this.lathe(0,2.3,0,[[.67,0],[.69,.055],[.42,.12],[.36,.39],[0,.39]],'#d9ba7b');this.tube(-.35,1.36,.08,-.44,1.02,.48,.13,.1,shirt);this.tube(-.44,1.02,.48,-.12,1.12+lift,.74,.095,.075,skin);this.tube(.35,1.35,.08,.38,1.12,.4,.13,.1,shirt);this.tube(.38,1.12,.4,.1,1.2+lift,.8,.095,.075,skin);
  var tipY=2.15+lift*2,tipZ=2.85;this.tube(0,.94+lift,.43,0,1.8+lift,1.65,.044,.03,'#765334');this.tube(0,1.8+lift,1.65,0,tipY,tipZ,.03,.014,'#c89b57');this.round(.1,1.13+lift,.69,.2,.21,.2,'#364f4a');
  var bob=.035+Math.sin(t*2.2)*.045;for(var line=0;line<4;line++){var u=line/4,v=(line+1)/4;this.tube(0,tipY*(1-u)-y*u+Math.sin(u*Math.PI)*-.25,tipZ+u*.15,0,tipY*(1-v)-y*v+Math.sin(v*Math.PI)*-.25,tipZ+v*.15,.009,.009,'#e4e5c8');}
  this.round(0,-y+.13+bob,3,.13,.25,.13,'#d86544');this.round(0,-y+.26+bob,3,.1,.12,.1,'#fff1c5');if(!this.low)this.loop(0,-y+.035,3,.22+Math.sin(t*2.2)*.06,.22+Math.sin(t*2.2)*.06,.012,'#d7ebcb',1);
 }else if(pose==='throw'){var ready=response.age<.2,release=response.age>.12&&response.age<.52,arm=ready?-.2:release?.34:.12;this.tube(-.39,1.43,0,-.66,1.05,.14,.13,.09,shirt);this.round(-.66,1.05,.14,.2,.23,.2,skin);this.tube(.38,1.43,0,.62,1.35,.25,.14,.1,shirt);this.tube(.62,1.35,.25,.86,1.55+arm,.58,.1,.08,skin);this.round(.86,1.55+arm,.58,.2,.22,.2,skin);this.round(0,2.38,0,.91,.23,.85,'#f0ce81');
 }else if(pose==='wave'||response.near||response.cheer){var wave=Math.sin(t*3)*.18;this.tube(-.39,1.43,0,-.66,1.05,.14,.13,.09,shirt);this.round(-.66,1.05,.14,.2,.23,.2,skin);this.tube(.38,1.43,0,.7,1.85,.1,.13,.09,shirt);this.tube(.7,1.85,.1,.76+wave,2.35,.17,.085,.065,skin);this.round(.76+wave,2.35,.17,.22,.26,.16,skin);this.round(0,2.38,0,.91,.23,.85,'#f0ce81');
 }else{this.tube(-.38,1.4,0,-.49,.95,.5,.13,.08,shirt);this.tube(.38,1.4,0,.42,1.15,.43,.13,.09,shirt);this.tube(.42,1.15,.43,.2,1.43+Math.sin(t)*.03,.62,.08,.065,skin);this.tube(.2,1.36,.66,.2,1.61,.66,.12,.14,'#f3e5c0');}
 this.actor=old;
};
Renderer.prototype.bankScene=function(x,side,kind,t,response){
 var oldDetail=this.farDetail,oldZ=this.entityZ||0;this.farDetail=true;this.entityZ=oldZ-side*BANK_INSET;var z=side*10.3,wood='#a78051';
 if(kind===0){
  // A fisherman with folding stool, creel, thermos, bobber and curved line.
  this.disc(x,.61,z,3.3,2.35,'#b2b77d');this.box(x,.96,z,.86,.18,.8,'#789086');for(var s=-1;s<=1;s+=2){this.tube(x+s*.35,.62,z-.34,x-s*.35,.99,z+.34,.045,.045,'#5c6860');}
  this.bankVisitor(x,.64,z,side,t,'fish',response);this.tube(x+1.45,.61,z+.25*side,x+1.45,1.25,z+.25*side,.36,.43,'#73968a','#b4d0ad');this.loop(x+1.45,1.28,z+.25*side,.43,.43,.035,'#d2dab5',1);this.loop(x+1.45,1.45,z+.25*side,.34,.3,.025,'#596b58',2);this.tube(x-.9,.63,z+.4*side,x-.9,1.12,z+.4*side,.14,.14,'#d7c395');this.box(x-.9,1.15,z+.4*side,.29,.08,.29,'#726b50');
  this.box(x+1.6,.77,z+1.45*side,1.6,.32,.85,'#b9935d');this.box(x+1.6,.95,z+1.45*side,1.7,.1,.9,'#e3c38a');
 }else if(kind===1){
  // An open A-frame tent, striped picnic blanket and a camper with a mug.
  var tz=side*12.4;this.box(x,.65,tz,3.3,.12,4,'#a68e66');this.quad([x-1.65,.7,tz-2],[x-1.65,3.5,tz],[x+1.65,3.5,tz],[x+1.65,.7,tz-2],'#d89159');this.quad([x-1.65,3.5,tz],[x-1.65,.7,tz+2],[x+1.65,.7,tz+2],[x+1.65,3.5,tz],'#ebbb7b');var front=x-1.67;this.tri([front,.72,tz-1.7],[front,3.22,tz],[front,.72,tz+1.7],'#4c6860');this.tri([front-.02,.72,tz-1.7],[front-.02,3.22,tz],[front-.02,.72,tz-.7],'#e8ba7b');this.tube(front-.7,.62,tz-2.6,front,3.5,tz,.018,.018,'#eee0b5');this.tube(front-.7,.62,tz+2.6,front,3.5,tz,.018,.018,'#eee0b5');this.box(x-.9,.78,tz+.4,1.1,.12,.8,'#e3be7d');
  this.box(x-3.3,.64,side*10,2.7,.06,2.5,'#f1d8a1');for(var stripe=0;stripe<4;stripe++)this.box(x-4.25+stripe*.62,.679,side*10,.19,.014,2.45,'#be735c');this.box(x-3.3,.81,side*10,1,.26,.7,'#b58e52');this.round(x-3.6,1.03,side*10,.3,.3,.3,'#d57c4d');this.round(x-3.05,1.02,side*10,.27,.28,.28,'#e7b54c');
  this.box(x+2.8,.86,side*9.9,1,.45,.9,wood);this.bankVisitor(x+2.8,.64,side*9.9,side,t,'tea',response);
 }else{
  // A little landing, moored canoe, life ring and someone waving at the raft.
  for(var plank=0;plank<7;plank++)this.box(x-2+plank*.65,.64,side*9.5,.59,.2,3.6,plank%2?'#bc9865':'#aa8050');for(var edge=-1;edge<=1;edge+=2){this.tube(x+edge*2,.02,side*8.15,x+edge*2,1.18,side*8.15,.13,.12,'#7b6142');this.tube(x+edge*2,.2,side*10.8,x+edge*2,1.18,side*10.8,.13,.12,'#7b6142');}
  this.bankVisitor(x+.6,.76,side*9.8,side,t,'wave',response);this.loop(x-1.45,.88,side*9.5,.46,.46,.12,'#e8b25b',1,true);var by=.08+Math.sin(t*1.7)*.018,bz=side*8.1;this.canoe(x-3.7,by,bz);this.tube(x-2.05,by+.16,bz+side*.15,x-2,.85,side*8.15,.024,.024,'#ddc796');
  this.tube(x+2.5,.6,side*11,x+2.5,3.6,side*11,.06,.045,'#846443');this.quad([x+2.5,3.55,side*11],[x+3.9,3.4,side*11+Math.sin(t*3)*.12],[x+3.9,2.75,side*11],[x+2.5,2.88,side*11],'#df9855');
 }
 this.farDetail=oldDetail;this.entityZ=oldZ;
};
Renderer.prototype.riverside=function(offset,t,g){
 var sites=root.River3D.bankSitesBetween(offset-20,offset+90);
 for(var i=0;i<sites.length;i++){
  var site=sites[i],state=g&&g.bankSites.filter(function(s){return s.id===site.id;})[0];
  var response=g?{near:Math.abs(site.x-g.distance)<24&&g.z*site.side>2.5,progress:state?state.progress*1.6:0,cheer:state&&(g.time-state.completedAt<1.8||state.delivered&&Math.abs(site.x-g.distance)<20)}:null;
  this.bankScene(site.x-offset,site.side,site.kind,t+site.id*.7,response);
  if(g&&state)this.bankActivity(state,g,t);
 }
};
Renderer.prototype.fish=function(x,y,z,scale){
 var s=scale||1;this.round(x,y,z,1.1*s,.45*s,.38*s,'#e1b35b');this.tube(x+.35*s,y,z,x+.62*s,y,z,.11*s,.065*s,'#c9944a');
 // A thin, closed vertical tail fin extends backward from the narrow tail root.
 var outline=[[.52,0],[.96,.28],[.86,0],[.96,-.28]],color='#b47b42';
 for(var side=-1;side<=1;side+=2)for(var i=0;i<4;i++){var a=outline[i],b=outline[(i+1)%4];this.tri([x+.69*s,y,z+side*.035*s],[x+a[0]*s,y+a[1]*s,z+side*.035*s],[x+b[0]*s,y+b[1]*s,z+side*.035*s],color);if(side===1)this.quad([x+a[0]*s,y+a[1]*s,z-.035*s],[x+b[0]*s,y+b[1]*s,z-.035*s],[x+b[0]*s,y+b[1]*s,z+.035*s],[x+a[0]*s,y+a[1]*s,z+.035*s],color);}
 for(var eye=-1;eye<=1;eye+=2)this.round(x-.35*s,y+.075*s,z+eye*.14*s,.07*s,.08*s,.05*s,'#243f39',3);
};
Renderer.prototype.basket=function(x,y,z,gift){
 if(gift){this.box(x,y,z,.85,.58,.7,'#e7a260');this.box(x,y+.29,z,.9,.09,.75,'#e9c98b');this.box(x,y+.35,z,.12,.04,.76,'#f7edd1');this.box(x,y,z+.36,.13,.6,.03,'#f7edd1');return;}
 this.box(x,y-.24,z,.85,.1,.7,'#8b683f');this.box(x,y-.165,z,.73,.05,.58,'#66573c');
 for(var side=-1;side<=1;side+=2){this.box(x+side*.39,y,z,.07,.5,.7,'#a77c47');this.box(x,y,z+side*.315,.72,.5,.07,'#b78b51');this.tube(x-.43,y+.27,z+side*.35,x+.43,y+.27,z+side*.35,.028,.028,'#e9c98b');this.tube(x+side*.43,y+.27,z-.35,x+side*.43,y+.27,z+.35,.028,.028,'#e9c98b');}
 this.round(x,y+.09,z,.69,.12,.53,'#d6ba77');this.fish(x-.09,y+.254,z,.46);
 for(var i=0;i<12;i++){var a=i/12*Math.PI,b=(i+1)/12*Math.PI;this.tube(x,y+.27+Math.sin(a)*.65,z+Math.cos(a)*.32,x,y+.27+Math.sin(b)*.65,z+Math.cos(b)*.32,.028,.028,'#ddba7d');}
};
Renderer.prototype.canoe=function(x,y,z){
 var rings=[[0,0,-.21],[1.30,.36,-.13],[1.8,.70,.16],[1.59,.50,.16],[1.14,.29,-.035],[0,0,-.035]],n=this.low?12:24;
 for(var row=0;row<rings.length-1;row++)for(var i=0;i<n;i++)for(var k=0;k<6;k++){if((row===0&&k<3)||(row===rings.length-2&&k>=3))continue;var a=(i+(k===1||k===2||k===4?1:0))/n*Math.PI*2,p=rings[row+(k===2||k===4||k===5?1:0)],co=Math.cos(a),si=Math.sin(a),c=rgb(row<2?'#b57545':row===2?'#dfb778':'#516d60');this.vertex(x+co*p[0],y+p[2],z+si*p[1],c,1,co,.6,si,2);}
 for(var seat=-1;seat<=1;seat+=2)this.box(x+seat*.55,y+.18,z,.26,.10,1.04,'#e1be7e');
};
Renderer.prototype.bankActivity=function(s,g,t){
 var x=s.x-g.distance,z=s.side*4.35,old=this.farDetail;this.farDetail=true;
 var live=s.status==='ready',color=s.kind===1?'#f4cb78':'#f7efb9';
 if(live){
  // A reachable target in the outer lane, physically connected to its bank scene.
  this.loop(x,.08,z,1.25,1.15,.055,color,1);
  for(var i=0;i<3;i++)this.box(x-4-i*2,.06,z,.85,.025,.2,color);
  if(s.kind===0){
   this.tube(x,2.8,s.side*(7.45-BANK_INSET),x,.35,z,.022,.022,'#f5edce');
   this.fish(x,.32+Math.abs(Math.sin(t*4))*.24,z);this.loop(x,.10,z,.48+s.progress,.48+s.progress,.04,'#fff7db',1);
   if(s.progress>0)this.tube(x,.4,z,1.4,g.y+.8,g.z,.04,.04,'#d8bd7f');
  }else if(s.kind===1){
   var cast=Math.max(0,Math.min(1,(24-x)/17)),pz=s.side*(9.9-BANK_INSET-(5.55-BANK_INSET)*cast),py=2.6+Math.sin(cast*Math.PI)*1.4;
   this.basket(x,py,pz,true);this.loop(x,2.8,z,.85,.85,.06,color,0);
  }else{
   this.tube(x+.6,2.1,s.side*(9.8-BANK_INSET),x,.3,z,.045,.045,'#e9c98b');this.loop(x,.3,z,.65,.65,.13,'#efbd68',1,true);
  }
 }else if(s.status==='done'){this.disc(x,.06,z,.65,.65,'#a9d9b1');}
 this.farDetail=old;
};
Renderer.prototype.bankFeedback=function(g,t){
 var old=this.farDetail;this.farDetail=true;
 if(g.fishCargo){
  // The cargo rides the raft transform through steering, jumping and flips.
  this.group={x:0,y:g.y+.12*RAFT_RATIO,z:g.z,scale:RAFT_SCALE,cos:Math.cos(g.angle),sin:Math.sin(g.angle),yaw:0};
  this.basket(-.8,.85,.8,false);this.group=null;
 }
 if(g.time-g.shieldAt<.65){this.loop(0,g.y+.6*RAFT_RATIO,g.z,2.4*RAFT_RATIO,2.1*RAFT_RATIO,.07*RAFT_RATIO,'#d5e8ac',1);}
 if(g.tow){
  var x=g.tow.x-g.distance;
  if(x>0)this.tube(x+.6,2.1,g.tow.side*(9.8-BANK_INSET),1.6*RAFT_RATIO,.85*RAFT_RATIO,g.z,.055,.055,'#f5df9a');
  for(var n=0;n<5;n++)this.box(-3-n*.9,.1,g.z+Math.sin(n+t*5)*.4,.6,.04,.12,'#f1f6db');
 }
 for(var i=0;i<g.bankEffects.length;i++){
  var e=g.bankEffects[i],age=g.time-e.at;if(age<0||age>1.2)continue;
  var u=Math.min(1,age/.75),x,z,y;
  if(e.type==='fish'||e.type==='gift'){
   x=(e.x-g.distance)*(1-u);z=e.side*4.35*(1-u)+g.z*u;y=1+g.y*u+Math.sin(u*Math.PI)*2.2;
   if(u<1){if(e.type==='fish')this.fish(x,y,z);else this.basket(x,y,z,true);}
  }else if(e.type==='delivery'){
   x=(e.raftX-g.distance)*(1-u)+(e.x-g.distance)*u;z=e.raftZ*(1-u)+e.side*10*u;y=1.4+(e.raftY||0)*(1-u)+Math.sin(u*Math.PI)*3;
   this.basket(x,y,z,false);
  }else if(e.type==='drop'){this.basket(e.raftX-g.distance,.3,e.raftZ,false);}
  if(e.type!=='drop')this.loop(e.x-g.distance,.12,e.side*4.35,1+age*2,1+age*2,.035,'#ffedbd',1);
 }
 this.farDetail=old;
};

// Gold uses its own material (5), never the woven-cloth branch (4).
// Cached turned profiles give the face a raised rim, chamfer and milled edge.
var coinMeshes={},coinTints=[rgb('#eeb63f'),rgb('#ffd36a'),rgb('#c58a23'),rgb('#ffe098')];
function coinMesh(segments,detail){
 var key=segments+':'+detail;if(coinMeshes[key])return coinMeshes[key];var out=[],face=coinTints[0],rim=coinTints[1],edge=coinTints[2],stamp=coinTints[3];
 function vertex(p,n,c){out.push(p[0],p[1],p[2],n[0],n[1],n[2],c===face?0:c===rim?1:c===edge?2:3);}
 function triangle(a,b,c,n,color){vertex(a,n,color);vertex(b,n,color);vertex(c,n,color);}
 var profile=detail?[[-.14,0],[-.13,.51],[-.17,.56],[-.17,.62],[-.095,.7],[.095,.7],[.17,.62],[.17,.56],[.13,.51],[.14,0]]:[[-.14,0],[-.13,.59],[-.09,.7],[.09,.7],[.13,.59],[.14,0]];
 for(var j=0;j<profile.length-1;j++){
  var a=profile[j],b=profile[j+1],dx=b[0]-a[0],dr=b[1]-a[1],side=Math.abs(dx)>.15,color=side?edge:Math.max(a[1],b[1])>.51?rim:face;
  for(var i=0;i<segments;i++){
   var u=i*Math.PI*2/segments,v=(i+1)*Math.PI*2/segments,cu=Math.cos(u),su=Math.sin(u),cv=Math.cos(v),sv=Math.sin(v),ra=a[1],rb=b[1];
   var a0=[a[0],cu*ra,su*ra],a1=[a[0],cv*ra,sv*ra],b0=[b[0],cu*rb,su*rb],b1=[b[0],cv*rb,sv*rb];
   // Alternate the edge normals to catch narrow bright/dark machining lines.
   var groove=side&&detail?(i%2?.23:-.23):0;
   var na=[-dr,dx*cu-groove*su,dx*su+groove*cu],nb=[-dr,dx*cv-groove*sv,dx*sv+groove*cv];
   if(ra>0){vertex(a0,na,color);vertex(a1,nb,color);vertex(b0,na,color);}
   if(rb>0){vertex(a1,nb,color);vertex(b1,nb,color);vertex(b0,na,color);}
  }
 }
 // Abstract cash seal: a round raised band with a square negative space.
 // The motif is geometric and shared by both faces; it names no real currency.
 var sealSegments=16,outer=.34,hole=.125;
 for(var sign=-1;sign<=1;sign+=2){
  var front=sign*.188,back=sign*.131,normal=[sign,0,0];
  for(var k=0;k<sealSegments;k++){
   var a=k*Math.PI*2/sealSegments,b=(k+1)*Math.PI*2/sealSegments,ca=Math.cos(a),sa=Math.sin(a),cb=Math.cos(b),sb=Math.sin(b),ia=hole/Math.max(Math.abs(ca),Math.abs(sa)),ib=hole/Math.max(Math.abs(cb),Math.abs(sb));
   var oa=[front,ca*outer,sa*outer],ob=[front,cb*outer,sb*outer],ha=[front,ca*ia,sa*ia],hb=[front,cb*ib,sb*ib];
   triangle(oa,ob,hb,normal,stamp);triangle(oa,hb,ha,normal,stamp);
   if(detail){
    var oab=[back,oa[1],oa[2]],obb=[back,ob[1],ob[2]],hab=[back,ha[1],ha[2]],hbb=[back,hb[1],hb[2]],outerNormal=[0,ca+cb,sa+sb],innerNormal=[0,-(ha[1]+hb[1]),-(ha[2]+hb[2])];
    triangle(oa,oab,obb,outerNormal,edge);triangle(oa,obb,ob,outerNormal,edge);
    triangle(ha,hb,hbb,innerNormal,edge);triangle(ha,hbb,hab,innerNormal,edge);
   }
  }
 }
 return coinMeshes[key]=new Float32Array(out);
}
coinMesh(24,true);coinMesh(16,true);coinMesh(12,false);
Renderer.prototype.coin=function(x,y,z,scale,t){
 var detailed=!this.low&&!this.farDetail,mesh=coinMeshes[detailed?(this.mediumDetail?'16:true':'24:true'):'12:false'],yaw=Math.sin(t*.9)*.42,cs=Math.cos(yaw),sn=Math.sin(yaw);
 for(var i=0;i<mesh.length;i+=7){var px=mesh[i]*scale,py=mesh[i+1]*scale,pz=mesh[i+2]*scale,nx=mesh[i+3],ny=mesh[i+4],nz=mesh[i+5];
  this.vertex(x+px*cs+pz*sn,y+py,z-px*sn+pz*cs,coinTints[mesh[i+6]],1,nx*cs+nz*sn,ny,-nx*sn+nz*cs,5);
 }
};
// Pickups move into the raft only after the model has confirmed collection.
Renderer.prototype.coinFlight=function(cp,g,t){var age=t-cp.born,u=Math.max(0,Math.min(1,age/(cp.magnet?.72:.42))),pull=smooth(.08,1,u),scale=u<.16?1+u:1.16*(1-pull);return {x:(cp.x-g.distance)*(1-pull)+.65*pull,y:cp.y*(1-pull)+(g.y+1.15)*pull+Math.sin(u*Math.PI)*1.15,z:cp.z*(1-pull)+(g.z||0)*pull,scale:scale};};
var coinStar=[[0,1],[.13,.13],[1,0],[.13,-.13],[0,-1],[-.13,-.13],[-1,0],[-.13,.13]];
Renderer.prototype.coinSpark=function(x,y,z,size,color){var c=rgb(color);for(var i=0;i<8;i++){var a=coinStar[i],b=coinStar[(i+1)%8];this.vertex(x,y,z,c,1);this.vertex(x,y+a[0]*size,z+a[1]*size,c,1);this.vertex(x,y+b[0]*size,z+b[1]*size,c,1);}};
Renderer.prototype.syncFlagEffects=function(g){
 var serial=g.flagSerial||0;if(this.flagEffectRun===g&&this.flagEffectSerial===serial)return;
 this.flagEffectRun=g;this.flagEffectSerial=serial;this.flagTransfer=null;this.flagGold=null;this.flagBlock=null;
 this.coinPops=(this.coinPops||[]).filter(function(p){return !p.magnet;});
 this.particles=(this.particles||[]).filter(function(p){return !p.magnet;});
};
Renderer.prototype.burst=function(g,type,t,data){
 this.syncFlagEffects(g);
 if(type==='coin'&&data&&data.magnet&&data.flagSerial!==undefined&&data.flagSerial!==g.flagSerial)return;
 if(type==='flag'){if(data&&data.serial!==undefined&&data.serial!==g.flagSerial)return;if(data&&data.effect==='gold'&&!this.reducedMotion)this.flagGold={run:g,born:g.time,serial:g.flagSerial};this.beginFlagTransfer(g,data);return;}
 if(type==='flag-guard'){var equipped=root.River3D.flagStyle(g.flagSkin);if(!equipped||equipped.effect!=='guard'||g.flagGuard>0)return;this.flagBlock={run:g,born:g.time,z:g.z,serial:g.flagSerial};return;}
 if(type==='crash')this.impact=Math.max(this.impact,.3);
 if(type==='impact'){this.impact=Math.max(this.impact,.48);this.impactPop={x:data.x,y:data.y,z:data.z,born:t,kind:data.kind};}
 var hit=type==='impact',coin=type==='coin',surf=type==='boost'&&g.goldBoost>0&&g.y<.4,count=this.low?(coin?6:8):(coin?12:20),color=type==='flag-guard'?'#8fbdd3':surf?'#eafff9':hit?(data.kind==='rock'?'#9daaa0':'#bc8959'):coin?'#ffcf52':type==='crash'?'#d6ab73':type==='flip'||type==='boost'?'#fbe3a0':'#e5f5dc',x=(coin||hit)&&data?data.x:g.distance,y=(coin||hit)&&data?data.y+.3:g.y+.3,z=(coin||hit)&&data?data.z:(g.z||0);
 if(coin){this.coinPops.push({x:x,y:y,z:z,born:g.time,simulation:true,magnet:!!(data&&data.magnet),flagSerial:data&&data.magnet?g.flagSerial:null});if(this.coinPops.length>6)this.coinPops.shift();}
 for(var i=0;i<count;i++){var a=i*2.4,side=i%2?1:-1;this.particles.push({x:x+(surf?.8:0),y:surf?.08:y,z:z+(surf?side*1.1:0),vx:surf?-2-noise(i+7)*3:Math.cos(a)*(coin?1.4:4),vy:2+noise(i+t)*(surf?2:coin?1.8:5),vz:surf?side*(.8+noise(i+13)):Math.sin(a)*(coin?2.2:3),born:coin||type==='flag-guard'?g.time:t,simulation:coin||type==='flag-guard',color:hit&&i%3===0?'#e5f5ed':i%3===0&&coin?'#fff1b4':color,coin:coin,surf:surf,magnet:!!(coin&&data&&data.magnet)});}if(this.particles.length>80)this.particles.splice(0,this.particles.length-80);
};
// Brief contact rays in the camera-facing plane; world anchored so they flow past.
Renderer.prototype.impactFlash=function(g,t){
 var hit=this.impactPop;if(!hit)return;var age=t-hit.born;if(age<0||age>.34||this.reducedMotion){this.impactPop=null;return;}
 var fade=1-age/.34,size=1.3+age*7,x=hit.x-g.distance,y=hit.y+.8,z=hit.z;
 this.loop(x,.08,z,3.2+age*7,2.7+age*5,.10*fade,'#f5edd1',1);
 // Keep the contact accent on the near side of the deck so the raft cannot hide it.
 x-=4.3;
 for(var i=0;i<8;i++){var a=i*Math.PI/4,sy=Math.sin(a),sz=Math.cos(a),inner=size*.55,outer=size*(i%2?1:1.35),w=.22*fade;
  this.quad([x,y+sy*inner,z+sz*inner],[x,y+sy*outer+sz*w,z+sz*outer-sy*w],[x,y+sy*outer-sz*w,z+sz*outer+sy*w],[x,y+sy*inner-sz*w,z+sz*inner+sy*w],i%2?'#fff3c4':'#e7a55b');
 }
};
// World-anchored silhouettes make each region distinct even with reduced animation.
Renderer.prototype.regionProp=function(x,z,h,id,p,k){
 if(id===1){
  this.box(x,h*.65,z,4.5,h*1.3,4,p.rock);this.box(x-.45,h*1.4,z+.2,3.3,h*.5,3.6,p.bank);
  this.box(x,h*.63,z,4.6,.16,4.1,'#d7a17b');this.cone(x+2,0,z+3,2,h*.7,p.tree,5);
 }else if(id===2){
  this.box(x,1,z,3.5,2,3.5,p.rock);this.box(x,h*.7,z,1.8,h*1.4,1.8,p.bank);
  this.box(x,h*1.4,z,3,.6,2.7,p.rock);this.box(x-.55,h*.4,z+1,.5,h*.8,.16,p.tree);
  if(k%2===0)this.box(x+2.2,h*1.4,z,4.4,.65,2.2,p.bank);
  this.cone(x-2,.6,z+2,1.5,1.6,p.leaf,5);
 }else if(id===3){
  this.cone(x,.2,z,3.2,3.6,k%2?'#d7ac75':'#9ca4ac',4);
  this.tri([x-1,.2,z-2.3],[x,2.7,z-2.3],[x+1,.2,z-2.3],'#3d5268',1);
  this.box(x+3,2,z-2,.12,4,.12,'#756f63');this.box(x+3,3.8,z-2,.7,.8,.7,'#ffe5a0');
  this.disc(x+3,.12,z-2,1.2,1.2,'#ad9277');
 }else if(Math.abs(z)<28){var detail=this.farDetail;this.farDetail=true;this.tree(x,z,h,p);this.farDetail=detail;}
 else{this.box(x,1,z,.65,2,.65,'#827454');this.cone(x,1.5,z,2.2,h,p.tree);this.cone(x,3,z,1.7,h*.7,p.leaf);}
};
// Low-cost bunting marks the end of each journey without covering the water route.
Renderer.prototype.journeyFinish=function(g,t){
 if(g.endless)return;
 var length=root.River3D.lapLength,lap=Math.floor(Math.max(0,g.distance-20)/length),wx=g.stageIndex!==undefined?g.distance+Math.max(0,root.River3D.campaign.durations[g.stageIndex]-root.River3D.campaign.elapsed(g))*g.flowSpeed():lap*length+length,x=wx-g.distance;
 if(g.stageIndex===3&&!g.practiceReplay&&this.finaleGate){if(x>=-30&&x<=155)this.finaleGate(x,g,t);return;}
 if(x<-20||x>85)return;
 for(var side=-1;side<=1;side+=2){this.tube(x,0,side*7.9,x,9.6,side*7.9,.09,.065,'#ae8050');this.box(x,9.2,side*7.9,.16,.55,1.2,'#f4cf78');}
 this.tube(x,9.1,-7.9,x,9.1,7.9,.024,.024,'#edcf91');
 for(var i=0;i<9;i++){var z=-6.6+i*1.65;this.tri([x,9.08,z-.55],[x,9.08,z+.55],[x,7.95+Math.sin(t*3+i)*.08,z],i%2?'#73af94':'#f1c671',1);}
 this.box(x,.045,0,1.1,.025,13,'#e8d5a3');for(var k=0;k<7;k++)this.box(x-.02,.065,-5.6+k*1.85,.95,.025,.85,k%2?'#61988a':'#fff0c0');
 if(g.time-g.lapFinishAt<2.4){for(var j=0;j<7;j++)this.box(-3-j*.6,.3+(j%3)*.4,g.z+Math.sin(t*3+j)*2,.16,.16,.16,j%2?'#f7d371':'#d5eee0');}
};
// Tapered ribbons reuse the scene buffer: no textures, transparency pass or particle history.
Renderer.prototype.flowRibbon=function(x,y,z,length,width,bend,sign,color,segments){
 var c=rgb(color),n=segments||6;
 for(var i=0;i<n;i++){
  var a=i/n,b=(i+1)/n,ax=x+Math.sin(a*Math.PI)*bend,bx=x+Math.sin(b*Math.PI)*bend;
  var az=Math.max(-PADDLE_EDGE,Math.min(PADDLE_EDGE,z+sign*(a-.5)*length)),bz=Math.max(-PADDLE_EDGE,Math.min(PADDLE_EDGE,z+sign*(b-.5)*length));
  var aw=Math.sin(a*Math.PI)*width,bw=Math.sin(b*Math.PI)*width;
  this.vertex(ax-aw,y,az,c,1);this.vertex(bx-bw,y,bz,c,1);this.vertex(bx+bw,y,bz,c,1);
  this.vertex(ax-aw,y,az,c,1);this.vertex(bx+bw,y,bz,c,1);this.vertex(ax+aw,y,az,c,1);
 }
};
Renderer.prototype.currentMarks=function(offset,t){
 var quiet=this.reducedMotion,clock=quiet?0:t;
 // Sparse, steady arrows remain the functional direction cue in every quality mode.
 for(var wx=Math.floor((offset-16)/18)*18;wx<offset+75;wx+=18){
  var flow=root.River3D.crossCurrent(wx),power=Math.min(1.35,Math.abs(flow));if(power<.12)continue;
  var x=wx-offset,sign=flow>0?1:-1,scale=.6+.25*Math.min(1,power);
  for(var lane=-1;lane<=1;lane++){var z=lane*3;
   this.box(x,.06,z,1.1*scale,.02,.065,'#b6d8d2');
   this.tri([x-.58*scale,.065,z],[x,.065,z+sign*.74*scale],[x+.58*scale,.065,z],'#c7e1d9',1);
  }
 }
 if(quiet)return;
 var step=this.low?18:12,segments=this.low?3:6;
 for(var anchor=Math.floor((offset-18)/step)*step;anchor<offset+54;anchor+=step){
  for(var stream=0;stream<(this.low?1:2);stream++){
   var sx=anchor+stream*4,force=root.River3D.crossCurrent(sx),strength=Math.min(1.35,Math.abs(force));if(strength<.04)continue;
   var seed=noise(sx*1.73+stream),phase=((clock*(.12+strength*.105)+seed)%1+1)%1;
   var life=smooth(0,.14,phase)*(1-smooth(.86,1,phase))*smooth(0,.45,strength),direction=force>0?1:-1;
   var gust=.8+.2*Math.sin(clock*2.3+sx*.31),zz=direction*(-6.6+phase*13.2);
   this.flowRibbon(sx-offset,.075,zz,(2.2+strength*1.4)*gust,(.035+strength*.035)*life,.22+seed*.3,direction,'#b9ded9',segments);
  }
  // A few higher curved wisps and tumbling leaves make the lateral motion readable at a glance.
  var windX=anchor+5,wind=root.River3D.crossCurrent(windX),amount=Math.min(1.35,Math.abs(wind));
  if(amount<.04||windX-offset>38||windX-offset< -9)continue;
  var seed=noise(windX*2.39),sign=wind>0?1:-1,phase=((clock*(.14+amount*.09)+seed+.31)%1+1)%1;
  var life=smooth(0,.16,phase)*(1-smooth(.84,1,phase))*smooth(0,.45,amount),z=sign*(-6.5+phase*13),height=1.15+seed*1.5+Math.sin(clock*2+seed*8)*.12;
  this.flowRibbon(windX-offset,height,z,3.1+amount*.9,(.03+amount*.027)*life,.5+seed*.55,sign,'#d6e6d9',segments);
  if(Math.floor(anchor/step)%2===0){
   var size=(.18+amount*.06)*life,angle=clock*sign*4+seed*9,cs=Math.cos(angle),sn=Math.sin(angle),xx=windX-offset+.7,yy=height+.3,fold=Math.sin(clock*8+seed)*size*.5,c=rgb('#cdbb82');
   this.vertex(xx-cs*size,yy,z-sn*size,c,1);this.vertex(xx-sn*size*.5,yy+fold,z+cs*size*.5,c,1);this.vertex(xx+cs*size,yy,z+sn*size,c,1);
   this.vertex(xx-cs*size,yy,z-sn*size,c,1);this.vertex(xx+cs*size,yy,z+sn*size,c,1);this.vertex(xx+sn*size*.5,yy-fold,z-cs*size*.5,c,.86);
  }
 }
};
// A separate presentation timeline leaves the finished run and its rewards untouched.
Renderer.prototype.prepareDefeat=function(g){
 if(this.defeatRun===g)return;
 this.defeatRun=g;this.defeatView=Object.create(g);this.defeatSerial=(this.defeatSerial||0)+1;
 // Sample once per performance, separate from the gameplay RNG and stable on redraw.
 var seed=(g.seed+Math.floor(g.distance*17+g.time*997)+this.defeatSerial*7919)>>>0;
 function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
 var pieces=[];
 for(var row=0;row<6;row++){
  var cuts=[-2.65,-1.25+random()*.9,.5+random()*.9,2.65];
  for(var col=0;col<3;col++){var length=cuts[col+1]-cuts[col]-.06;pieces.push({x:(cuts[col]+cuts[col+1])*.5,z:(row-2.5)*.71,length:length,vx:(random()-.5)*5.8,vz:(random()-.5)*5.2,lift:1.3+random()*2.2,flight:.8+random()*.8,pitch:(random()-.5)*2.4,yaw:(random()-.5)*6.2,spin:(random()-.5)*8,bob:random()*6.28,color:Math.floor(random()*3)});}
 }
 this.defeatPieces=pieces;
};
// Match the inner teeth farther into the rear hull, using the same head/spine
// transforms and swim immersion as the model. The lower teeth seat first;
// the upper jaw closes onto the opposite surface and holds until the break.
Renderer.prototype.crocGrip=function(g,phase,contactOverride){
 var story=root.River3D.defeatStory,close=smooth(.9,story.grip,phase),hold=smooth(story.grip,story.grip+.15,phase),crush=smooth(story.crush,story.crush+.16,phase),spine=.075,raw=3.1,count=this.low?7:10,low=this.low;
 var boatAngle=this.reducedMotion?0:Math.sin(phase*19)*.008*hold,boatY=.06*hold,baseY=boatY+(.46+Math.sin(phase*4)*.055)*RAFT_RATIO,contactX=typeof contactOverride==='number'?contactOverride:g.skin===4?-.75:-.82,cs=Math.cos(boatAngle),sn=Math.sin(boatAngle);
 function tooth(upper,open){var index=Math.max(0,Math.min(count-1,Math.ceil((raw-1.69)/1.6*count-(upper?.75:.25)))),p=crocDentalRow(upper,low)[index],x=p[0]-.025,y=p[1]+p[3],z=p[2];
  if(upper){var a=crocJawAngle(open),dx=x-1.15,dy=y-.34;x=1.15+dx*Math.cos(a)-dy*Math.sin(a);y=.34+dx*Math.sin(a)+dy*Math.cos(a);}
  var dx=x+.8,dy=y-.35;return {x:(-.8+dx*Math.cos(spine)-dy*Math.sin(spine)-3.5)*2+3.5,y:(.35+dx*Math.sin(spine)+dy*Math.cos(spine)-.42)*2,z:z*2,index:index};
 }
 function hull(z,upper){if(g.skin===4)return (upper?.33:.14)*RAFT_SCALE;var nearest=0,delta=Infinity;for(var i=0;i<6;i++){var dz=Math.abs(z-(i-2.5)*.49*RAFT_SCALE);if(dz<delta){delta=dz;nearest=i;}}var end=1.75+(nearest%2)*.09,u=(contactX/RAFT_SCALE+end)/(end*2),radius=(.255+(.23-.255)*u)*RAFT_SCALE;return (upper?1:-1)*Math.sqrt(Math.max(0,radius*radius-delta*delta));}
 var lower=tooth(false,0),upper=tooth(true,0),bottom=hull(lower.z,false),top=hull(upper.z,true),bottomY=baseY+contactX*sn+bottom*cs,topY=baseY+contactX*sn+top*cs,targetX=contactX*cs-bottom*sn,lo=0,hi=1,wanted=Math.max(.025,topY-bottomY-.035);
 for(var i=0;i<14;i++){var mid=(lo+hi)*.5;if(tooth(true,mid).y-lower.y<wanted)lo=mid;else hi=mid;}
 var clamp=(lo+hi)*.5,open=1.28*(1-close)+clamp*close;open=open*(1-crush)+.025*crush;
 var lunge=smooth(.20,.96,phase),retreat=smooth(3.25,4.7,phase),seat=targetX-lower.x,x=-11+(seat+11)*lunge-11*retreat,y=bottomY+.0175-lower.y,upper=tooth(true,open);
 return {x:x,y:y,z:g.z||0,spine:spine,open:open,clampOpen:clamp,boatY:boatY,boatAngle:boatAngle,bottom:bottomY,top:topY,contactX:targetX,lower:{x:x+lower.x,y:y+lower.y,z:(g.z||0)+lower.z,index:lower.index},upper:{x:x+upper.x,y:y+upper.y,z:(g.z||0)+upper.z,index:upper.index}};
};
Renderer.prototype.defeatScene=function(g,t){
 this.prepareDefeat(g);var story=root.River3D.defeatStory,quiet=this.reducedMotion;
 var phase=quiet?(t<story.grip?.8:t<story.crush?2.25:t<story.splash?3.3:t<story.help?4.4:6):t,z=g.z||0,grip=this.crocGrip(g,phase);
 this.crocContactPose=grip;this.croc(grip.x,quiet?0:phase,z/.7-.3/.7,grip.open,0,null);this.crocContactPose=null;
 if(phase<story.crush){
  var view=this.defeatView;view.y=grip.boatY;view.vy=0;view.angle=grip.boatAngle;view.stumble=0;view.lateralVelocity=0;view.time=g.time;this.raft(view,phase,false);return;
 }
 var age=phase-story.crush,colors=[['#ae7444','#cb975d','#deb379'],['#ad5b47','#db8965','#e8b58b'],['#427d70','#78aa8a','#b8cf9b'],['#455a72','#8090ab','#c4c4ad'],['#f3bf61','#69b8b3','#e88269']][g.skin||0];
 for(var index=0;index<this.defeatPieces.length;index++){
  var piece=this.defeatPieces[index],u=Math.min(1,age/piece.flight),travel=1-Math.pow(1-u,2),floatAge=Math.max(0,age-piece.flight),pitch=piece.pitch+piece.spin*Math.min(age,piece.flight),yaw=piece.yaw+piece.spin*.43*Math.min(age,piece.flight);
  var px=Math.max(-7,Math.min(6,piece.x*RAFT_RATIO+piece.vx*travel+piece.vx*floatAge*.055)),pz=Math.max(-6.3,Math.min(6.3,piece.z*RAFT_RATIO+piece.vz*travel));
  var py=.12+(1-u)*.48+Math.sin(u*Math.PI)*piece.lift+(quiet?0:Math.sin(phase*2.5+piece.bob)*.035*u);
  this.group={x:px,y:py,z:z+pz,scale:RAFT_RATIO,cos:Math.cos(pitch),sin:Math.sin(pitch),yawCos:Math.cos(yaw),yawSin:Math.sin(yaw)};
  if(g.skin===4)this.box(0,0,0,piece.length,.24,.62,colors[piece.color]);else this.tube(-piece.length*.5,0,0,piece.length*.5,0,0,.29,.25,colors[piece.color],'#e5be82',2);
  this.group=null;
 }
 var fall=smooth(story.crush+.12,story.splash+.35,phase),arc=Math.sin(smooth(story.crush,story.splash+.35,phase)*Math.PI),cx=1.2+fall*1.5,cz=z+.95+fall*.7;
 this.group={x:cx,y:.85+arc*1.65-fall*1.8+(quiet?0:Math.sin(phase*4)*.07),z:cz,scale:RAFT_SCALE,cos:1,sin:0};
 this.distress=true;this.person(0,0,0,'captain',quiet?0:phase);this.distress=false;this.group=null;
 if(phase>story.splash){this.loop(cx,.16,cz,.73,.73,.14,'#e68b49',1,true);for(var buddy=0;buddy<g.crew.length;buddy++){var role=g.crew[buddy],bx=3+buddy*1.25,bz=z-1.5-buddy*.45;this.person(bx,-.65,bz,role,quiet?0:phase);this.paddleRipple(bx,bz,.6,.45,.025,.7,buddy,this.palette);}}
 this.paddleRipple(cx,cz,.85+fall*.4,.6+fall*.2,.035,.8,4,this.palette);
 if(!quiet&&age<1.8)for(var spray=0;spray<(this.low?10:20);spray++){var a=spray*2.4,life=Math.min(1,age/1.8),radius=life*(2+noise(spray)*2);this.paddleDrop(Math.cos(a)*radius,Math.max(.035,Math.sin(life*Math.PI)*(1+noise(spray+9)*2)),z+Math.sin(a)*radius,.065*(1-life));}
};
// The opening is a short virtual world trajectory. Both actors move downstream;
// The crocodile first surges toward the raft, then the boat accelerates away.
// The shot follows the crocodile through the empty bite before returning to the raft.
// Its final origin and velocity match gameplay without changing the run state.
Renderer.prototype.openingPose=function(g,time){
 var story=root.River3D.openingStory,T=story.escapeDuration,chase=Math.max(0,Math.min(story.chaseDuration,time));
 var t=time>=story.chaseDuration+T?T:Math.max(0,time-story.chaseDuration),clock=chase+t;
 var base=g.flowSpeed?g.flowSpeed():g.speed||8,pred=g.predatorSpeed?g.predatorSpeed():g.crocSpeed||9;
 var stern=g.skin===4?-1.30:-1.42,seat=this.crocGrip(g,clock,stern),start=stern-(seat.lower.x-seat.x)+.55,end=-6.1-Math.max(0,g.gap),length=start-end+pred*T;
 var initialGap=3.7,lungeDuration=.95-story.lungeAt,lunge=Math.max(0,Math.min(1,(chase-story.lungeAt)/lungeDuration)),surge=4*lunge*(1-lunge);
 var chaseGap=initialGap*(1-lunge*lunge*(3-2*lunge)),openUp=smooth(.34,.80,chase);
 function integral(a,b,x){if(x<=a)return 0;if(x>=b)return x-(a+b)*.5;var u=(x-a)/(b-a);return (b-a)*(u*u*u-.5*u*u*u*u);}
 var launchAt=story.launchAt,launchFullAt=launchAt+.16,brakeAt=launchAt+1.17,brakedAt=brakeAt+1.4;
 var A=integral(launchAt,launchFullAt,T),B=integral(brakeAt,brakedAt,T),peak=(length-pred*(T-A)-base*B)/(A-B);
 var cruise=pred*clock,travel=cruise+(peak-pred)*integral(launchAt,launchFullAt,t)+(base-peak)*integral(brakeAt,brakedAt,t);
 var slowing=smooth(brakeAt,brakedAt,t),launch=smooth(launchAt,launchFullAt,t);
 var speed=pred+(peak-pred)*launch+(base-peak)*slowing;
 var bite=story.biteAt,cameraPull=smooth(bite+.08,bite+1.34,t),lag=(travel-cruise)*(1-cameraPull);
 // Keep space above and below the hull until it has cleared the snout.
 var rush=launch*(1-slowing),nearMouth=seat.clampOpen+.42;
 // Overlap the draw-down and snap so the jaw keeps moving between them.
 var drawDown=smooth(0,bite-.11,t),snapClose=smooth(bite-.22,bite,t);
 var mouth=(1.44-nearMouth)*(1-drawDown)+nearMouth*(1-snapClose)-(1.44-.12)*(1-openUp)+.12*smooth(bite+.13,bite+.58,t);
 // Dip the lower jaw under the stern before the snout reaches it.
 var release=smooth(.36,.65,chase)*(1-smooth(bite,bite+.55,t)),phase=clock*3.6;
 var y=(seat.y-seat.boatY-.23)*release+Math.sin(phase*2)*.018*(1-release)-.06*surge;
 var begin=g.distance-length-pred*story.chaseDuration,crocWorld=begin+start+cruise-chaseGap,origin=t===T?g.distance:begin+travel-lag;
 return {travel:travel,origin:origin,boatX:t===T?0:lag,boatWorld:t===T?g.distance:begin+travel,boatSpeed:t===T?base:speed,crocX:t===T?end:crocWorld-origin,crocWorld:crocWorld,predatorSpeed:pred+initialGap*1.5*surge/lungeDuration,peakSpeed:peak,cameraPull:cameraPull,rush:rush,surge:surge,mouth:mouth,contact:{y:y,spine:.075*release+.24*smooth(.12,1.6,mouth)*(1-release),z:(g.z||0)*release+((g.z||0)*.7+.3+Math.sin(clock*2)*.1)*(1-release),yaw:Math.sin(phase)*.016*(1-release)}};
};
Renderer.prototype.render=function(g,t,intro,frameDt){var ending=typeof this.endingTime==='number'&&root.River3D.ending,et=ending?this.endingTime:0;if(root.River3D.setRenderGame)root.River3D.setRenderGame(g);this.syncFlagEffects(g);this.count=0;this.skyVertexCount=0;if(this.flagTransfer&&(intro||this.flagTransfer.run!==g||this.reducedMotion||g.time<this.flagTransfer.born||g.time-this.flagTransfer.born>=1.45))this.flagTransfer=null;var defeat=typeof this.defeatTime==='number',ft=defeat?this.defeatTime:0,opening=typeof this.openingTime==='number',ot=opening?this.openingTime:0;if(opening)t=ot;if(defeat)t=this.reducedMotion?0:ft;var escape=opening?this.openingPose(g,ot):null,rush=escape?escape.rush:0;this.openingRush=rush;this.openingBoatX=escape?escape.boatX:0;this.openingSpeed=escape?escape.boatSpeed:0;var offset=escape?escape.origin:intro?t*1.8:g.distance,p=paletteAt(offset);this.palette=p;var gl=this.gl,col=rgb(p.sky);gl.clearColor(col[0],col[1],col[2],1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);var ratio=this.aspect,scale=Math.max(.43,.32/ratio),targetX=0,targetY=15,eye=[-12*scale,25*scale+15,40*scale],lookZ=0,crewAim=2.5+(2+4*(1-smooth(568,844,this.viewHeight)))*smooth(8,22,g.gap);
 // Short screens reserve headroom below the roster; close pursuit restores room for the jaw.
 // Retain the close chase rig after the cinematic, with smooth route/shore following.
 if(!intro){targetX=-1.5;targetY=crewAim+g.y*.12;var distanceScale=Math.max(1,.65/ratio),bankPeek=0;for(var bi=0;bi<g.bankSites.length;bi++){var bs=g.bankSites[bi],near=smooth(36,0,Math.abs(bs.x-g.distance)),toward=smooth(1.8,4.3,g.z*bs.side);bankPeek=Math.max(bankPeek,near*toward);}lookZ=g.z*(.72+.08*bankPeek);distanceScale*=1+bankPeek*.06;eye=[-16*distanceScale,14*distanceScale,lookZ+3.5*distanceScale];}
 // The final vault gets a broad approach view so its crest remains below the HUD.
 if(!intro&&!ending&&g.stageIndex===3&&!g.endless&&!g.practiceReplay&&this.finaleGate){var gateDistance=Math.max(0,root.River3D.campaign.durations[3]-root.River3D.campaign.elapsed(g))*g.flowSpeed(),reveal=smooth(150,65,gateDistance),wideGate=Math.max(1,.65/ratio),gateEye=[-34*wideGate,22*wideGate,lookZ+6*wideGate];for(var gi=0;gi<3;gi++)eye[gi]+=(gateEye[gi]-eye[gi])*reveal;targetX+=(8-targetX)*reveal;targetY+=(12-targetY)*reveal;}
 if(opening){
  var pull=escape.cameraPull,wide=Math.max(1,.65/ratio),nearWide=Math.max(.8,.46/ratio);
  var story=root.River3D.openingStory,local=ot-story.chaseDuration;
  var closeUp=this.reducedMotion?0:smooth(story.launchAt-.4,story.launchAt,local);
  var press=this.reducedMotion?0:.06*smooth(0,story.launchAt+.12,local)+.065*closeUp;
  var chaseWide=(1-smooth(.26,.92,ot))*nearWide;
  var near=nearWide*(1-press);
  targetX=(-1.7-.22*closeUp)*(1-pull)-1.5*pull-1.9*chaseWide;targetY=1.1+(crewAim-1.1)*pull+.9*chaseWide;lookZ=0;
  eye=[-8.5*near*(1-pull)-16*wide*pull-2.3*chaseWide,4.1*near*(1-pull)+14*wide*pull+2.3*chaseWide,13.3*near*(1-pull)+3.5*wide*pull+7.4*chaseWide];
 }
 if(defeat){var wide=Math.max(1,.65/ratio),settle=this.reducedMotion?(ft>=root.River3D.defeatStory.splash?1:0):smooth(3.3,5,ft);targetX=-1+settle*2;targetY=1.2-settle*.3;lookZ=g.z;eye=[(-10+settle*3)*wide,(8-settle)*wide,lookZ+(15-settle*4)*wide];}
 // Frame-rate independent follow; retain a frozen camera when only a paused frame is redrawn.
 var target=[eye[0],eye[1],eye[2],targetX,targetY,lookZ];if(ending)target=this.endingCamera(g,root.River3D.ending.pose(et),target);var dt=frameDt===undefined?Math.max(0,Math.min(.05,t-(this.cameraTime===undefined?t:this.cameraTime))):Math.max(0,Math.min(.05,frameDt));this.cameraTime=t;
 if(!this.camera||Math.abs(offset-(this.cameraOffset||0))>90)this.camera=target.slice();else{var follow=1-Math.exp(-dt/0.18);for(var cam=0;cam<6;cam++)this.camera[cam]+=(target[cam]-this.camera[cam])*follow;}this.cameraOffset=offset;eye=this.camera.slice(0,3);targetX=this.camera[3];targetY=this.camera[4];lookZ=this.camera[5];
 var snapAge=local-root.River3D.openingStory.biteAt,snap=opening&&!this.reducedMotion&&snapAge>=0&&snapAge<.28?Math.sin(snapAge*62)*.085*Math.exp(-snapAge*16):0;eye[0]+=Math.sin(t*49)*this.impact+snap;eye[1]+=Math.sin(t*57)*this.impact*.4+snap*.35;this.impact*=Math.exp(-dt*9);function norm(a){var l=Math.sqrt(a[0]*a[0]+a[1]*a[1]+a[2]*a[2]);return a.map(function(x){return x/l;});}var forward=norm([targetX-eye[0],targetY-eye[1],lookZ-eye[2]]),right=norm([-forward[2],0,forward[0]]),up=[right[1]*forward[2]-right[2]*forward[1],right[2]*forward[0]-right[0]*forward[2],right[0]*forward[1]-right[1]*forward[0]];gl.uniform3fv(this.uniform.eye,eye);gl.uniform3fv(this.uniform.right,right);gl.uniform3fv(this.uniform.up,up);gl.uniform3fv(this.uniform.forward,forward);gl.uniform3fv(this.uniform.sky,col);gl.uniform1f(this.uniform.aspect,ratio);
 this.offset=offset;this.bend=Math.sin(offset*.018)*3+Math.sin(offset*.041)*1.5;this.prepareCurve(offset);this.prepareRaftShadow(g,offset);if(this.sunnySky)this.sunnySky(g,eye,forward,right,up);if(this.clearHorizon)this.clearHorizon(g);if(ending){gl.uniform4fv(this.uniform.raftShadow,[0,1,1,0]);}
 // Fixed world tiles with shared endpoint colours: boundaries slide past, never jump.
 for(var wx=Math.floor((offset-85)/10)*10;wx<offset+295;wx+=10){var seg=wx+5-offset,sp=paletteAt(wx),ep=paletteAt(wx+10);
  this.box(seg,-2.4,0,10,4.5,180,sp.grass,ep.grass);this.waterSurface(wx);
  for(var bank=-1;bank<=1;bank+=2){this.box(seg,-.18,bank*(8.2-BANK_INSET),10,.7,2.1,sp.bank,ep.bank);this.box(seg,.1,bank*(10.3-BANK_INSET),10,1,2.4,sp.grass,ep.grass);}
 }
 // Low quality uses the same even world anchors on every frame, regardless of camera distance.
 var spacing=this.low?16:8;
 for(var k=Math.floor((offset-(this.low?50:70))/spacing)*(spacing/8);k<Math.floor((offset+(this.low?110:145))/8);k+=spacing/8){var x=k*8-offset,id=sceneryAt(k*8),pp=paletteAt(k*8);
  for(var side=-1;side<=1;side+=2){var nz=noise(k*7+side),z=side*(id===0?14+nz*22:11.5+nz*8),h=2+noise(k*9)*5,clearing=bankClearing(k*8,side);
   var landing=this.endingLandingOffset?this.endingLandingOffset(g):null;if(side===1&&landing!==null&&landing<=140&&(Math.abs(z)<18||(x>landing-35&&x<landing+85&&Math.abs(z)<28)))continue;if(clearing&&Math.abs(z)<21)continue;
   this.regionProp(x,z,h,id,pp,k);
   if(id===0){for(var flower=0;flower<3;flower++){this.box(x+flower*.6,.55,side*(11+noise(k+flower)*2),.12,.7,.12,pp.tree);this.blob(x+flower*.6,.9,side*(11+noise(k+flower)*2),.35,.3,.35,k%2?'#f2d494':'#eee8c3');}}
   if(k%3===0&&!bankClearing(k*8+3,side))this.blob(x+3,.5,side*9.5,2.8,1.65,2,pp.rock);
   if(k%5===0){this.cone(x,-.4,side*(40+nz*9),17,id===1?23:15,pp.tree,7);this.cone(x+11,-.4,side*43,14,12,pp.leaf,7);}
  }
 }
 if(this.endingLanding)this.endingLanding(g,t);this.currentMarks(offset,intro?t:g.time);
 for(var n=0;n<(this.low?34:75);n++){var flow=t*5.5,xx=((n*13.7-offset+flow)%150+150)%150-55,zz=(noise(n+71)-.5)*(13-BANK_INSET*2);this.box(xx,.025,zz,1+noise(n)*3,.015,.07,n%4?'#a2dacf':'#daf1d9');}
 for(var e=0;e<g.entities.length;e++){var en=g.entities[e],ex=en.x-(opening?offset:g.distance);if(en.projectile&&!en.done&&ex>=-2.4&&ex<=220){this.entityZ=0;this.projectileTarget(en,ex);}if(ex<((en.kind==='rock'||en.kind==='log')?-34:-15)||ex>85||(en.done&&!en.passed))continue;this.entityZ=en.z||0;this.farDetail=ex>24||ex< -15;if(en.kind==='thrower'){var throwAt=en.stone.throwAt;this.bankVisitor(ex,0,0,en.side,g.time,'throw',{age:throwAt===null?0:g.time-throwAt});}else if(en.kind==='rock'){if(en.projectile){this.projectileStone(g,en,ex);}else if(en.pillar){this.box(ex,.65,0,3.2,1.3,3.8,'#82968f');this.box(ex,1.38,0,3.6,.16,4.1,'#b8c5b0');this.box(ex-.1,.7,-1.94,.22,.8,.04,'#b3c4b1');}else this.stone(ex,0,en.reef);}else if(en.kind==='log'){this.riverLog(ex,en);}else if(en.kind==='ramp'){this.wave(ex,t,en.power);}else if(en.kind==='buddy'){this.disc(ex,.04,0,1,1,p.deep);this.loop(ex,.27,0,.68,.68,.16,'#e8b65e',1,true);this.person(ex,.25,0,en.role,t);this.cone(ex,3.2+Math.sin(t*3)*.2,0,.3,-.5,g.has(en.role)?'#a7b8a4':'#f7d180',4);}else{var cy=en.y+.3+Math.sin(t*2+en.x)*.1;this.coin(ex,cy,0,1,t+en.x);}}
 this.entityZ=0;this.farDetail=false;
 if(!intro)for(var fi=0;fi<(g.flags||[]).length;fi++){var flag=g.flags[fi],fx=flag.x-offset;if(!flag.done&&fx>=-8&&fx<=85)this.flagPickup(flag,offset,this.reducedMotion?0:g.time);}this.entityZ=0;
 for(var land=root.River3D.journey(Math.max(0,offset-85)).start;land<offset+100;){var landmarkZone=root.River3D.journey(land),mark=land+landmarkZone.length*.55;if(mark>offset-35&&mark<offset+85&&landmarkZone.id!==2)this.landmark(mark-offset,landmarkZone.id===3?1:landmarkZone.id===1?2:0,t);land+=landmarkZone.length;}
 if(!ending)this.riverside(offset,t,intro?null:g);if(!intro)this.journeyFinish(g,t);
 // Crossing 10m changes the destination; the whole animal swims in and out from behind.
 if(ending)this.endingActors(g,et);else if(defeat)this.defeatScene(g,ft);else{var crocTime=opening||intro?t:(this.reducedMotion?0:g.time+(this.crocClockOffset||0)),gap=intro?14:g.gap,chaseX=-6.1-Math.max(0,gap),crocX=opening?escape.crocX:chaseX,mouth=opening?escape.mouth:.12;if(opening){this.crocRun=g;this.crocViewX=crocX;this.crocViewAt=g.time;}else if(!intro)crocX=this.crocApproach(g,chaseX);else{this.crocRun=null;crocX=null;}this.crocHop=null;if(crocX!==null){this.crocHop=!opening&&!intro?this.crocJump(g,crocX,(g.z||0)*.7+.3+Math.sin(crocTime*2)*.1):null;if(!opening)mouth=this.crocBite(g,gap<10&&Math.abs(crocX-chaseX)<1,this.crocHop&&this.crocHop.height>=.15);if(opening)this.crocContactPose=escape.contact;this.croc(crocX,crocTime,g.z,mouth,g.lateralVelocity||0,this.crocHop);if(opening)this.crocContactPose=null;if(!opening)this.crocBiteWater(g,crocX,crocTime);}this.raft(g,t,intro);if(!intro){this.flagEffects(g,t);this.flagPowerEffects(g);this.departingBuddies(g,t);this.bankFeedback(g,t);}
 }
 if(opening&&!this.reducedMotion&&escape.surge>0){for(var lungeSpray=0;lungeSpray<(this.low?4:8);lungeSpray++){var age=(ot*3.8+lungeSpray*.137)%1,side=lungeSpray%2?1:-1;this.paddleDrop(escape.crocX+2.7-age*2.7,.08+Math.sin(age*Math.PI)*.55*escape.surge,side*(.6+age*.65),.045*(1-age)*escape.surge);}}
 if(opening&&!this.reducedMotion&&rush>0){for(var spray=0;spray<(this.low?6:12);spray++){var age=(ot*3.8+spray*.137)%1,side=spray%2?1:-1;this.paddleDrop(this.openingBoatX-RAFT_RATIO-age*3,.08+Math.sin(age*Math.PI)*1.1*rush,side*(2.2+age*.9)*RAFT_RATIO,.045*(1-age));}}
 if(opening&&!this.reducedMotion&&snapAge>=0&&snapAge<.46){var splash=snapAge/.46;for(var toothSpray=0;toothSpray<(this.low?4:8);toothSpray++){var side=toothSpray%2?1:-1,spread=.6+splash*.9+noise(toothSpray)*.25;this.paddleDrop(escape.crocX+2.6+Math.cos(toothSpray*2.4)*splash,.08+Math.sin(splash*Math.PI)*(.4+noise(toothSpray+5)*.4),side*spread,.055*(1-splash));}}
 if(!defeat&&!intro&&!opening)this.surfWater(g);
 if(!defeat&&(g.boost>0||g.escape>0)){for(var b=0;b<10;b++)this.box(-3*RAFT_RATIO-b*.65,.2+noise(b)*.4,(g.z||0)+Math.sin(b*2+t*4)*1.4*RAFT_RATIO,.5,.15,.16,b%2?'#fff0aa':'#f2fcdf');}
 if(!ending&&!defeat&&g.y<.25&&!g.stumble){var flowSpeed=opening?escape.boatSpeed:intro?12:Math.max(4,g.speed),wake=Math.max(.65,Math.min(2,flowSpeed/14))+rush*.9;for(var w=0;w<10;w++){var age=(((opening?escape.travel*.18:t*1.5)+w*.1)%1);for(var ws=-1;ws<=1;ws+=2)this.box((opening?escape.boatX:0)-2*RAFT_RATIO-age*5*wake,.045,(g.z||0)+ws*(1.8+age*.8)*RAFT_RATIO,(.5+age*.5)*wake,.02,.05,'#d4ecce');}}
 for(var ci=this.coinPops.length-1;ci>=0;ci--){var cp=this.coinPops[ci],clock=cp.simulation?g.time:t,ca=clock-cp.born;if(ca>(cp.magnet?.72:.42)||ca<0){this.coinPops.splice(ci,1);continue;}var flight=this.coinFlight(cp,g,clock);this.farDetail=true;
  if(cp.magnet&&!this.reducedMotion){var samples=this.low?2:4;for(var trail=1;trail<=samples;trail++){var earlier=this.coinFlight(cp,g,Math.max(cp.born,clock-trail*.035));this.coinSpark(earlier.x,earlier.y,earlier.z,.1*(1-trail/(samples+1)),'#88d9a5');}}
  this.coin(flight.x,flight.y,flight.z,flight.scale*(cp.magnet?1.25:1),clock+ci);this.farDetail=false;}
 for(var pi=this.particles.length-1;pi>=0;pi--){var pt=this.particles[pi],age=(pt.simulation?g.time:t)-pt.born;if(age>(pt.coin?.55:1.2)||age<0){this.particles.splice(pi,1);continue;}var py=pt.y+pt.vy*age-5*age*age;if(py>0){var px=pt.x-g.distance+pt.vx*age,pz=pt.z+pt.vz*age;if(pt.coin)this.coinSpark(px,py,pz,.14*Math.max(0,1-age/.55),pt.color);else if(pt.surf)this.paddleDrop(px,py,pz,.13*Math.max(0,1-age/1.2));else this.box(px,py,pz,.16,.16,.16,pt.color);}}
 this.impactFlash(g,t);
 gl.bindBuffer(gl.ARRAY_BUFFER,this.gpu);gl.bufferSubData(gl.ARRAY_BUFFER,0,this.buffer.subarray(0,this.count));var skyVertices=this.skyVertexCount||0;if(skyVertices){gl.disable(gl.DEPTH_TEST);gl.depthMask(false);gl.drawArrays(gl.TRIANGLES,0,skyVertices);gl.depthMask(true);gl.enable(gl.DEPTH_TEST);}gl.drawArrays(gl.TRIANGLES,skyVertices,this.count/this.stride-skyVertices);this.triangles=this.count/(this.stride*3);
};
root.RiverRenderer=Renderer;
})(window);
