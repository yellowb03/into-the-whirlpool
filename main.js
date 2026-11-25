// Into the Whirlpool: engine.
{
const TAU=Math.PI*2;
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const KIND={h:'Real milestone',p:'Prediction',n:'Real headline',f:'Made-up headline'};
const YC={2027:'#00c2ff',2028:'#ff48b0',2029:'#ff7a00',2030:'#9d7aff',2031:'#ffe800'};
const NOW=2026+10/12+.5/12;
const ITEMS=(window.WP_DATA||[]).map((it,i)=>{const y=parseInt(it.d.slice(0,4),10),m=parseInt(it.d.slice(5,7),10);return Object.assign({},it,{id:'i'+i,y,m,num:y+(m-1)/12+.5/12});});
ITEMS.sort((a,b)=>a.num-b.num);
const slugify=s=>s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48);
ITEMS.forEach(it=>it.slug=it.d+'-'+slugify(it.t));
const BYID={};ITEMS.forEach(it=>BYID[it.id]=it);
// public hooks for add-ons (audio.js etc.): read WP.state each frame, listen for wp:* events
const WP=window.WP={items:ITEMS,state:{date:0,prog:0,slow:0,pause:0,spinV:0,focus:null,open:null,started:false},emit(n,d){dispatchEvent(new CustomEvent('wp:'+n,{detail:d}));}};
let MANIFEST={visions:{},textures:{},characters:[]},SOURCES={};
fetch('sources.json').then(r=>r.ok?r.json():{}).then(j=>{SOURCES=j||{};}).catch(()=>{});
ITEMS.forEach(it=>{if(it.k==='n'||it.k==='f')it.v=['news',it.id];else if(it.v[0]==='news')it.v=['news',it.id];});
const FLOAT=ITEMS.filter(it=>it.k==='h'||it.k==='p'),HEAD=ITEMS.filter(it=>it.k==='n'||it.k==='f');
const colOf=it=>it.y>=2027?YC[it.y]:it.y<2017?'#0078bf':it.y<2020?'#00a95c':it.y<2023?'#ffe800':it.y<2025?'#f15060':'#ff48b0';
const L=140,SPAWN=2.3,LAG=3.3,CYCLE=FLOAT.length*SPAWN+12;
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const $=id=>document.getElementById(id);const hint=$('hint');

if(!window.THREE){document.body.insertAdjacentHTML('beforeend','<div class="err">The 3D engine could not load. Check your connection and reload.</div>');}
else{
const stage=$('stage');
const renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance'});
const PR=Math.min(devicePixelRatio||1,1.5);
renderer.setPixelRatio(PR);renderer.setClearColor(0x05020c,1);
stage.appendChild(renderer.domElement);
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(75,1,0.05,300);
const U={uTime:{value:0},uProg:{value:0},uDist:{value:0},uFlash:{value:0},uSway:{value:2.5},uRoll:{value:0},
uRes:{value:new THREE.Vector2(1,1)},uDrift:{value:new THREE.Vector2()},uPx:{value:PR},uL:{value:L},tTun:{value:null},uTunOn:{value:0}};
const PAL='vec3 pal(float t){return .5+.5*cos(6.28318*(t+vec3(0.,.33,.67)));}';
const NOISE='float h1(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h1(i),h1(i+vec2(1,0)),f.x),mix(h1(i+vec2(0,1)),h1(i+vec2(1,1)),f.x),f.y);}float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n2(p);p*=2.03;a*=.5;}return v;}';
const mobile=Math.min(innerWidth,innerHeight)<700;

// ---------- liquid whirlpool tunnel ----------
const bg=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({uniforms:U,depthWrite:false,depthTest:false,
vertexShader:'void main(){gl_Position=vec4(position.xy,.9999,1.);}',
fragmentShader:`uniform float uTime,uProg,uFlash,uRoll,uTunOn;uniform vec2 uRes,uDrift;uniform sampler2D tTun;${PAL}
void main(){vec2 p=(gl_FragCoord.xy-.5*uRes)/uRes.y-uDrift;
float r=length(p)+1e-4;float a=atan(p.y,p.x)-uRoll;
float depth=.32/r;float t=uTime;
float x=a+depth*(.9+uProg*1.8)+t*.12;
float y=depth+t*(.55+uProg*1.3);
for(int i=0;i<5;i++){float fi=float(i);
 x+=.32*sin(y*1.25+fi*1.7+t*.35)/(1.+fi*.45);
 y+=.42*sin(float(i+2)*x+t*.27+fi)/(1.+fi*.35);}
float f=.5+.5*sin(3.*x+y*2.1);
float g=.5+.5*sin(5.*x-y*1.4+f*3.);
float h=.5+.5*sin(2.*x+y*.7+g*2.);
vec3 c1=pal(y*.07+f*.35+uProg*1.25+t*.025);
vec3 c2=pal(y*.07+.45+g*.3+uProg*1.25);
vec3 col=mix(c1,c2,g);
float sheen=pow(max(0.,1.-abs(f-g)*2.2),6.);
float lum=.12+.7*pow(f*h,1.3)+sheen*.6;
float vign=1.-smoothstep(.15,1.25,r);
vec3 core=pal(t*.05+uProg*1.3);
if(uTunOn>.5){vec3 tt=texture2D(tTun,vec2(x/6.28318,y*.06)).rgb;col=mix(col,tt*(.4+lum),.45);}
col=col*lum*(.3+.7*vign)*(.55+uProg*.55);
col=mix(core*.8,col,smoothstep(.01,.08,r))+core*exp(-r*8.)*.45;
col+=vec3(uFlash);
gl_FragColor=vec4(col,1.);}`}));
bg.frustumCulled=false;bg.renderOrder=-10;scene.add(bg);

// ---------- dust + silk ribbons ----------
const ND=mobile?14000:32000,K=9,NP=mobile?1500:2800,NT=ND+K*NP;
const aS=new Float32Array(NT*4),aM=new Float32Array(NT);
for(let i=0;i<ND;i++){aS[i*4]=Math.random()*TAU;aS[i*4+1]=1.2+Math.pow(Math.random(),.7)*7;aS[i*4+2]=Math.random();aS[i*4+3]=Math.random();}
for(let k=0;k<K;k++)for(let j=0;j<NP;j++){const i=ND+k*NP+j;aS[i*4]=k*TAU/K;aS[i*4+1]=k;aS[i*4+2]=j/NP;aS[i*4+3]=Math.random();aM[i]=1;}
const pg=new THREE.BufferGeometry();
pg.setAttribute('position',new THREE.BufferAttribute(new Float32Array(NT*3),3));
pg.setAttribute('aS',new THREE.BufferAttribute(aS,4));pg.setAttribute('aM',new THREE.BufferAttribute(aM,1));
const pts=new THREE.Points(pg,new THREE.ShaderMaterial({uniforms:U,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
vertexShader:`uniform float uTime,uProg,uDist,uPx,uL,uSway;attribute vec4 aS;attribute float aM;varying vec3 vC;varying float vA;${PAL}
vec2 sway(float z){return vec2(sin(z*.045+uTime*.35),cos(z*.038+uTime*.28))*uSway*(1.-smoothstep(-50.,0.,z));}
void main(){bool rib=aM>.5;
float z=-uL+mod(aS.z*uL+uDist*(rib?1.:.8+.4*aS.w),uL);
float a,r;
if(rib){float k=aS.y;a=aS.x+z*(.05+.015*sin(k))+uTime*(.25+uProg*.5)+sin(z*.08+k*2.1+uTime*.6)*.7;
 r=2.7+1.6*sin(z*.06+k*1.3+uTime*.45)+(aS.w-.5)*.3;}
else{a=aS.x+z*.035+uTime*(.15+uProg*.45)*(1.+aS.w);r=aS.y+sin(z*.13+aS.x*3.+uTime*.7)*.6;}
vec3 pos=vec3(cos(a)*r,sin(a)*r,z);pos.xy+=sway(z);
vec4 mv=modelViewMatrix*vec4(pos,1.);gl_Position=projectionMatrix*mv;
float sz=rib?20.:(.5+aS.w*1.5)*28.;
gl_PointSize=min(sz*uPx/max(-mv.z,.3),80.);
vC=pal((rib?aS.y*.11+z*.01:z*.006+aS.w*.3)+uTime*.06+uProg*1.3);
vA=smoothstep(-uL,-uL+60.,z)*(1.-smoothstep(-6.,0.,z))*(rib?.5:.3+.4*aS.w);}`,
fragmentShader:'varying vec3 vC;varying float vA;void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d);gl_FragColor=vec4(vC*(1.+.7*a),a*a*vA);}'}));
pts.frustumCulled=false;scene.add(pts);

// glow texture
const gc=document.createElement('canvas');gc.width=gc.height=128;const gx=gc.getContext('2d');
const gr=gx.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.25,'rgba(255,255,255,.45)');gr.addColorStop(1,'rgba(255,255,255,0)');
gx.fillStyle=gr;gx.fillRect(0,0,128,128);const glow=new THREE.CanvasTexture(gc);

let time=0,sw=2.5;
const ss=(e0,e1,x)=>{const t=Math.max(0,Math.min(1,(x-e0)/(e1-e0)));return t*t*(3-2*t);};
const swayX=z=>Math.sin(z*.045+time*.35)*sw*ss(0,-50,z),swayY=z=>Math.cos(z*.038+time*.28)*sw*ss(0,-50,z);

// orbs
const orbs=[];for(let i=0;i<(mobile?26:44);i++){const m=new THREE.SpriteMaterial({map:glow,color:new THREE.Color().setHSL(Math.random(),1,.6),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,opacity:0});
const s=new THREE.Sprite(m);scene.add(s);orbs.push({s,a:Math.random()*6.28,r:1.5+Math.random()*6,z:-Math.random()*L,size:.6+Math.random()*3,h:Math.random()});}



// ---------- visions
const {MEM}=window.WP_initMem({THREE,renderer,glow,mobile,mulberry,TAU,NOISE,PAL,BYID});
const memCache={},IRS=mobile?512:1024,tload=new THREE.TextureLoader();
function imageVision(e){const base='assets/visions/',u={t:{value:0},tA:{value:null},tF:{value:null},tD:{value:null},hasF:{value:0},hasD:{value:0},ready:{value:0}};
tload.load(base+e.file,t=>{t.minFilter=THREE.LinearFilter;u.tA.value=t;u.ready.value=1;});
if(e.fg)tload.load(base+e.fg,t=>{u.tF.value=t;u.hasF.value=1;});if(e.depth)tload.load(base+e.depth,t=>{u.tD.value=t;u.hasD.value=1;});
const sc=new THREE.Scene(),cam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
sc.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({uniforms:u,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
fragmentShader:`uniform float t,hasF,hasD,ready;uniform sampler2D tA,tF,tD;varying vec2 vUv;
void main(){float z=1.08+.06*sin(t*.07);vec2 pan=vec2(sin(t*.05),cos(t*.043))*.025;vec2 uv=(vUv-.5)/z+.5+pan;vec2 par=vec2(sin(t*.31),cos(t*.23))*.014;
if(hasD>.5){float d=texture2D(tD,uv).r;uv+=par*(d-.5)*2.;}
vec3 c=ready>.5?texture2D(tA,uv).rgb:vec3(0.);
if(hasF>.5){vec4 f=texture2D(tF,(vUv-.5)/(z*1.04)+.5+pan*1.6+par*1.5);c=mix(c,f.rgb,f.a);}
gl_FragColor=vec4(c,1.);}`})));
const rt=new THREE.WebGLRenderTarget(IRS,IRS);return {tex:rt.texture,lin:0,update(tm){u.t.value=tm;renderer.setRenderTarget(rt);renderer.render(sc,cam);renderer.setRenderTarget(null);}};}
function getMem(it){const img=MANIFEST.visions&&MANIFEST.visions[it.slug];const k=img?'img:'+it.slug:it.v[0]+':'+it.v[1];
if(!(k in memCache)){try{memCache[k]=img?imageVision(img):MEM[it.v[0]](it.v[1]);}catch(e){console.error('vision',k,e);memCache[k]=null;}}return memCache[k];}

const ov=new THREE.Scene();
function mkSlot(mode,order){const mat=new THREE.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,
uniforms:{tMap:{value:null},uOp:{value:0},uTime:{value:0},uClar:{value:0},uLin:{value:0},uSeed:{value:0},uMode:{value:mode},uTint:{value:new THREE.Color()},uSize:{value:new THREE.Vector2(.5,.5)},uOff:{value:new THREE.Vector2()}},
vertexShader:'uniform vec2 uSize,uOff;varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy*uSize+uOff,0.,1.);}',
fragmentShader:`uniform sampler2D tMap;uniform float uOp,uTime,uClar,uLin,uSeed,uMode;uniform vec3 uTint;varying vec2 vUv;
float hh(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
float nn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hh(i),hh(i+vec2(1,0)),f.x),mix(hh(i+vec2(0,1)),hh(i+vec2(1,1)),f.x),f.y);}
vec3 tm(vec3 c){return uLin>.5?1.-exp(-c*1.25):c;}
void main(){float k=1.-uClar;vec2 uv=vUv;
uv+=(vec2(nn(uv*3.+uTime*.2+uSeed),nn(uv*3.-uTime*.17))-.5)*.03*k;
vec2 ca=(uv-.5)*(.003+.012*k);float b=.0015+.006*k;vec3 c=vec3(0.);
for(int i=0;i<6;i++){float a=float(i)*1.0472;vec2 o=vec2(cos(a),sin(a))*b;c.r+=texture2D(tMap,uv+o+ca).r;c.g+=texture2D(tMap,uv+o).g;c.b+=texture2D(tMap,uv+o-ca).b;}
c=tm(c/6.);c=mix(c,tm(texture2D(tMap,uv).rgb),uClar*.7);
float l=dot(c,vec3(.299,.587,.114));c=mix(vec3(l)*vec3(1.06,.98,.88),c,.5+.45*uClar);
c=mix(c,c*uTint*1.5,.2*k);
c+=vec3(1.,.55,.3)*.16*k*(1.-smoothstep(0.,.75,length(vUv-vec2(.08,.92))))*(.6+.4*sin(uTime*.7+uSeed));
c=mix(c*.88+.07,c,uMode);
c+=(hh(floor(vUv*420.)+fract(uTime*9.)*91.)-.5)*(.1-.06*uMode);
c*=.95+.05*sin(uTime*23.+uSeed)*(1.-uMode);
float m;if(uMode>.5){float d=max(abs(vUv.x-.5),abs(vUv.y-.5));m=1.-step(.5,d);}
else{float d=length(vUv-.5)+(nn(vUv*5.+uTime*.15+uSeed)-.5)*.17;m=1.-smoothstep(.2,.5,d);}
gl_FragColor=vec4(c,m*uOp);}`});
const mesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),mat);mesh.frustumCulled=false;mesh.renderOrder=order;mesh.visible=false;ov.add(mesh);
return {mesh,mat,mem:null,op:0,target:0,lt:0,seed:0};}
const slots=[mkSlot(0,-5),mkSlot(0,-5)];let act=0,curW=null;
function bindSlot(s,it){const m=getMem(it);s.mem=m;if(!m)return;const u=s.mat.uniforms;u.tMap.value=m.tex;u.uLin.value=m.lin;u.uTint.value.set(colOf(it));s.lt=0;s.seed=Math.random()*10;u.uSeed.value=s.seed;}
function showMem(w){WP.state.focus=w.item;WP.emit('focus',w.item);const s=slots[1-act];slots[act].target=0;act=1-act;bindSlot(s,w.item);s.target=1;}
const dim=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,uniforms:{o:{value:0}},vertexShader:'void main(){gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:'uniform float o;void main(){gl_FragColor=vec4(.02,.008,.05,o);}'}));
dim.frustumCulled=false;dim.renderOrder=11;dim.visible=false;
ov.add(dim);
const viz=mkSlot(1,12);viz.mat.uniforms.uClar.value=1;

// ---------- floating words
function split(str){if(str.length<15)return [str];const m=str.length/2;let best=-1;
for(let i=0;i<str.length;i++)if(str[i]===' '&&(best<0||Math.abs(i-m)<Math.abs(best-m)))best=i;
return best<0?[str]:[str.slice(0,best),str.slice(best+1)];}
function textTex(str,col,size,wrap,outline){const c=document.createElement('canvas'),x=c.getContext('2d');
const lines=wrap?split(str):[str];const font=`900 ${size}px "Big Shoulders Display", Impact, sans-serif`;x.font=font;
const off=size*.06,w=Math.ceil(Math.max(...lines.map(l=>x.measureText(l).width))+size*.6+off),lh=size*.98,h=Math.ceil(lh*lines.length+size*.5+off);
c.width=w;c.height=h;x.font=font;x.textAlign='center';x.textBaseline='middle';
const draw=(dx,dy,fn)=>lines.forEach((l,i)=>fn.call(x,l,w/2+dx,h/2+(i-(lines.length-1)/2)*lh+dy));
if(outline){x.lineWidth=size*.035;x.strokeStyle=col;draw(off,off,x.strokeText);x.strokeStyle='#fff';draw(0,0,x.strokeText);}
else{x.shadowColor='rgba(0,0,0,.75)';x.shadowBlur=size*.4;x.fillStyle='rgba(0,0,0,.6)';draw(0,0,x.fillText);x.shadowBlur=0;
 x.globalCompositeOperation='source-over';x.fillStyle=col;draw(off,off,x.fillText);x.fillStyle='#fff';draw(0,0,x.fillText);}
const t=new THREE.CanvasTexture(c);t.minFilter=THREE.LinearFilter;t.generateMipmaps=false;return {t,asp:w/h};}
const live=[];let roll=0;
function spawnWord(it){const portrait=innerWidth<innerHeight;const tx=textTex(it.t,colOf(it),72,portrait);
const m=new THREE.SpriteMaterial({map:tx.t,depthWrite:false,depthTest:false,transparent:true,opacity:0});
const s=new THREE.Sprite(m);s.renderOrder=5;const hh=portrait?(tx.asp>5?.5:.74):.9;s.scale.set(hh*tx.asp,hh,1);ov.add(s);
const a=portrait?(Math.random()<.5?1.5708:-1.5708)+(Math.random()-.5)*1.1:Math.random()*TAU;
getMem(it);WP.emit('word',it);
live.push({s,a,r:portrait?.7+Math.random()*1.1:1.1+Math.random()*1.6,z:-60,wob:Math.random()*6,k:1,big:false,sw:portrait?.35:1,item:it});}
function spawnYear(it){WP.emit('year',it.y);const tx=textTex(String(it.y),colOf(it),180,false,true);
const m=new THREE.SpriteMaterial({map:tx.t,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,opacity:0});
const s=new THREE.Sprite(m);const hh=innerWidth<innerHeight?3:5;s.scale.set(hh*tx.asp,hh,1);scene.add(s);
live.push({s,a:0,r:0,z:-85,wob:0,k:1.35,big:true,sw:1});}

// ---------- bloom
let composer=null,bloom=null;
if(THREE.EffectComposer&&THREE.UnrealBloomPass){composer=new THREE.EffectComposer(renderer);composer.addPass(new THREE.RenderPass(scene,camera));
bloom=new THREE.UnrealBloomPass(new THREE.Vector2(256,256),.7,.65,.28);composer.addPass(bloom);}

// ---------- news ticker
const lane=$('lane');const tick=[],tq=[];let hp=0;
function fmtDate(it){return it.k==='p'||it.k==='f'?String(it.y):MON[it.m-1]+' '+it.y;}
function pushHead(it){const b=document.createElement('button');b.className='hl'+(it.k==='f'?' pred':'');
const d=document.createElement('b');d.textContent=it.k==='f'?it.y+' · predicted':fmtDate(it);const s=document.createElement('span');s.textContent=it.t;b.append(d,s);
b.addEventListener('click',()=>openItem(it));lane.appendChild(b);WP.emit('headline',it);tick.push({el:b,x:lane.clientWidth,w:b.offsetWidth});}

// ---------- timeline canvas
const tl=$('tl'),tx=tl.getContext('2d');let TW=1,TH=1,ppy=200;
function drawTimeline(date){const d=Math.min(devicePixelRatio||1,2);if(tl.width!==Math.round(TW*d)){tl.width=Math.round(TW*d);tl.height=Math.round(TH*d);}
tx.setTransform(d,0,0,d,0,0);tx.fillStyle='#000';tx.fillRect(0,0,TW,TH);tx.fillStyle='#ffe800';tx.fillRect(0,0,TW,2);
const cx=TW/2,ly=TH*.5,X=n=>cx+(n-date)*ppy,span=TW/ppy/2+.2;
tx.font='400 10px "IBM Plex Mono", monospace';tx.textAlign='left';
for(let mi=Math.floor((date-span)*12);mi<=Math.ceil((date+span)*12);mi++){const x=Math.round(X(mi/12))+.5,mm=((mi%12)+12)%12,jan=mm===0,q=mm%3===0;
 tx.strokeStyle=jan?'#fff':'#5a5a5a';tx.lineWidth=1;tx.beginPath();tx.moveTo(x,TH);tx.lineTo(x,TH-(jan?26:q?12:7));tx.stroke();
 if(jan){const yr=Math.floor(mi/12);tx.fillStyle=yr>=2027?'#ff48b0':'#fff';tx.fillText(yr,x+4,TH-16);}}
const nx=Math.round(X(NOW))+.5;if(nx>-40&&nx<TW+40){tx.strokeStyle='#ff48b0';tx.setLineDash([3,3]);tx.beginPath();tx.moveTo(nx,6);tx.lineTo(nx,TH);tx.stroke();tx.setLineDash([]);tx.fillStyle='#ff48b0';tx.fillText('NOW',nx+4,14);}
ITEMS.forEach(it=>{const x=Math.round(X(it.num));if(x<-10||x>TW+10)return;const past=it.num<=date,hd=it.k==='n'||it.k==='f';
 tx.globalAlpha=past?1:.5;if(hd){tx.fillStyle=it.k==='f'?'#ff48b0':'#ffe800';tx.fillRect(x-1,ly-14,2,9);}
 else if(it.k==='p'){tx.strokeStyle=colOf(it);tx.lineWidth=1.5;tx.strokeRect(x-3.5,ly-3.5,7,7);}else{tx.fillStyle=colOf(it);tx.fillRect(x-3.5,ly-3.5,7,7);}});
tx.globalAlpha=1;const yr=Math.floor(date),mo=Math.min(11,Math.max(0,Math.floor((date-yr)*12)));const lab=(MON[mo]+' '+yr).toUpperCase();
tx.font='600 12px "IBM Plex Mono", monospace';const lw=tx.measureText(lab).width+12;tx.fillStyle=date>NOW?'#ff48b0':'#fff';tx.fillRect(cx-lw/2,4,lw,17);
tx.fillStyle='#000';tx.textAlign='center';tx.fillText(lab,cx,16);tx.fillStyle=date>NOW?'#ff48b0':'#fff';tx.fillRect(cx-1,21,2,TH-21);}
let lastDate=2011;
tl.addEventListener('click',e=>{const r=tl.getBoundingClientRect(),x=e.clientX-r.left;let best=null,bd=16;
ITEMS.forEach(it=>{const dx=Math.abs(TW/2+(it.num-lastDate)*ppy-x);if(dx<bd){bd=dx;best=it;}});if(best)openItem(best);});

// ---------- detail panel
const panel=$('panel');let openIt=null,openA=0,vt=0;
function openItem(it){wake();openIt=it;const spec=it.k==='p'||it.k==='f';
$('pfile').textContent='FILE '+it.d+' / '+KIND[it.k].toUpperCase();const st=$('pstamp');st.textContent=spec?'SPECULATION':'ON RECORD';st.className='stamp'+(spec?' spec':'');
$('ptitle').textContent=it.t;$('px').textContent=it.x||'';$('pi').textContent=it.i||'';
$('pcap').textContent=(it.k==='n'||it.k==='f'?'fig. front page, ':'fig. ')+(spec?'a guess at ':'a reconstruction of ')+(it.k==='p'||it.k==='f'?String(it.y):MON[it.m-1]+' '+it.y);
const sl=$('psrc');sl.textContent='';const src=SOURCES[it.slug];$('psrcw').hidden=!(src&&src.length);(src||[]).slice(0,4).forEach(s=>{const li=document.createElement('li'),a=document.createElement('a');a.href=s.url;a.target='_blank';a.rel='noopener';a.textContent=(s.publisher?s.publisher+': ':'')+s.title;li.appendChild(a);sl.appendChild(li);});
const od=$('podds');if(it.k==='p'&&it.o){od.hidden=false;$('poddsv').textContent=it.o+'%';const ta=$('ptally');ta.textContent='';for(let i=0;i<10;i++){const q=document.createElement('i');if(i<Math.round(it.o/10))q.className='on';ta.appendChild(q);}}else od.hidden=true;
panel.style.setProperty('--ac',colOf(it));panel.classList.add('open');panel.setAttribute('aria-hidden','false');
bindSlot(viz,it);vt=0;viz.target=1;WP.state.open=it;WP.emit('open',it);}
function closePanel(){if(openIt)WP.emit('close');WP.state.open=null;openIt=null;panel.classList.remove('open');panel.setAttribute('aria-hidden','true');viz.target=0;}
function step(d){if(!openIt)return;const i=ITEMS.indexOf(openIt);const j=Math.max(0,Math.min(ITEMS.length-1,i+d));if(j!==i)openItem(ITEMS[j]);}
$('pclose').addEventListener('click',closePanel);$('pprev').addEventListener('click',()=>step(-1));$('pnext').addEventListener('click',()=>step(1));
let vizRect={x:0,y:0,w:0,h:0};
panel.addEventListener('click',e=>{if(e.target!==panel)return;const inViz=e.clientX>vizRect.x&&e.clientX<vizRect.x+vizRect.w&&e.clientY>vizRect.y&&e.clientY<vizRect.y+vizRect.h;if(!inViz)closePanel();});

// ---------- input: tap a word, hold to slow time, drag to spin
let slow=0,slowT=0,spin=0,spinV=0,down=null,touched=false,pause=0;
function wake(){if(!touched){touched=true;hint.classList.add('gone');}if(!WP.state.started){WP.state.started=true;WP.emit('start');}}
const v1=new THREE.Vector3(),v2=new THREE.Vector3(),v3=new THREE.Vector3();
function pick(px,py){let best=null;const k0=H/(2*Math.tan(camera.fov*Math.PI/360));
for(const w of live){if(w.big||w.s.material.opacity<.15)continue;v3.copy(w.s.position).applyMatrix4(camera.matrixWorldInverse);if(v3.z>-.5)continue;
 const k=k0/-v3.z;v3.copy(w.s.position).project(camera);const sx=(v3.x*.5+.5)*W,sy=(-v3.y*.5+.5)*H;
 if(Math.abs(px-sx)<w.s.scale.x/2*k+8&&Math.abs(py-sy)<w.s.scale.y/2*k+10&&(!best||w.z>best.z))best=w;}
return best;}
stage.addEventListener('pointerdown',e=>{wake();down={x:e.clientX,x0:e.clientX,y0:e.clientY,t:performance.now()};slowT=1;try{stage.setPointerCapture(e.pointerId);}catch(_){}});
stage.addEventListener('pointermove',e=>{if(!down)return;spinV+=(e.clientX-down.x)*.0035;down.x=e.clientX;});
stage.addEventListener('pointerup',e=>{if(down&&performance.now()-down.t<300&&Math.hypot(e.clientX-down.x0,e.clientY-down.y0)<10){const w=pick(e.clientX,e.clientY)||curW;if(w)openItem(w.item);}down=null;slowT=0;});
stage.addEventListener('pointercancel',()=>{down=null;slowT=0;});stage.addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('keydown',e=>{if(e.key==='Escape')closePanel();else if(openIt&&e.key==='ArrowLeft')step(-1);else if(openIt&&e.key==='ArrowRight')step(1);
 else if(e.key===' '&&!openIt){e.preventDefault();wake();slowT=1;}});
addEventListener('keyup',e=>{if(e.key===' ')slowT=0;});
setTimeout(()=>hint.classList.add('gone'),9000);

let W=1,H=1;
function resize(){W=innerWidth;H=innerHeight;renderer.setSize(W,H,false);camera.aspect=W/H;camera.updateProjectionMatrix();
U.uRes.value.set(W*PR,H*PR);if(composer){composer.setSize(W,H);bloom.resolution.set(W/2,H/2);}
TW=W;TH=W<600?58:64;tl.style.height=TH+'px';ppy=W<600?110:190;
const narrow=W<760||H>W;let side,cx,cy;if(narrow){side=Math.min(W*.8,H*.32);cx=W/2;cy=104+side/2;panel.style.setProperty('--pt',(cy+side/2+58)+'px');}
else{side=Math.min(W*.42,H-230);cx=W*.27;cy=96+(H-96-TH-40)/2;}
panel.classList.toggle('narrow',narrow);vizRect={x:cx-side/2,y:cy-side/2,w:side,h:side};const pf=$('print');pf.style.left=(cx-side/2-12)+'px';pf.style.top=(cy-side/2-12)+'px';pf.style.width=(side+24)+'px';pf.style.height=(side+52)+'px';
viz.mat.uniforms.uSize.value.set(side/W,side/H);viz.mat.uniforms.uOff.value.set(cx/W*2-1,1-cy/H*2);}
addEventListener('resize',resize);resize();

const chars=[],drift=[];let nextChar=0;
let ct=0,k=0,next=1.2,flash=0,last=performance.now(),lastYear=0,crossed=false;
function dateAt(fi){const n=FLOAT.length;if(fi<=0)return FLOAT[0].num+fi*.3;if(fi>=n-1)return FLOAT[n-1].num+(fi-n+1)*.25;const a=Math.floor(fi),f=fi-a;return FLOAT[a].num+(FLOAT[a+1].num-FLOAT[a].num)*f;}
/*TESTHOOK*/
function frame(now){requestAnimationFrame(frame);
const dt=Math.min((now-last)/1000,.05);last=now;
slow+=(slowT-slow)*Math.min(1,dt*(slowT?4:2));pause+=((openIt?1:0)-pause)*Math.min(1,dt*4);
const date=dateAt(ct/SPAWN-LAG);lastDate=date;
const prog=Math.max(0,Math.min(1,date<NOW?.45*(date-2012)/(NOW-2012):.45+.55*(date-NOW)/(2032-NOW)));
const sf=(1-.88*slow)*(1-pause)*(reduce?.5:1);
time+=dt*sf*(1+prog*.8);ct+=dt*sf;
while(k<FLOAT.length&&ct>=next){const it=FLOAT[k];if(it.y!==lastYear){spawnYear(it);lastYear=it.y;}spawnWord(it);k++;next+=SPAWN;}
while(hp<HEAD.length&&HEAD[hp].num<=date)tq.push(HEAD[hp++]);
if(!crossed&&date>=NOW){crossed=true;flash=Math.max(flash,.55);WP.emit('now');}
if(ct>=CYCLE){ct=0;k=0;next=1.2;flash=1;hp=0;lastYear=0;crossed=false;WP.emit('restart');}
flash=Math.max(0,flash-dt*.6);
const fall=(7+prog*11)*sf;sw=2.5+prog*2.5;
U.uTime.value=time;U.uProg.value=prog;U.uDist.value+=fall*dt;U.uSway.value=sw;U.uFlash.value=flash*flash*1.3;
if(bloom)bloom.strength=((mobile?.4:.5)+prog*.6)*(1-slow*.35)+flash*.8;
spinV*=Math.pow(.04,dt);spin+=spinV*dt*10;
roll=spin+time*(reduce?0:.05)*(1+prog*2)+Math.sin(time*.21)*.15;
camera.rotation.set(Math.sin(time*.23)*.06,Math.cos(time*.17)*.06,roll);camera.updateMatrixWorld();
v1.set(0,0,-1000).project(camera);v2.set(1000,0,-1000).project(camera);
U.uDrift.value.set(v1.x*.5*W/H,v1.y*.5);U.uRoll.value=Math.atan2((v2.y-v1.y),(v2.x-v1.x)*W/H);
orbs.forEach(o=>{o.z+=fall*dt*.7;if(o.z>0){o.z=-L;o.a=Math.random()*6.28;o.r=1.5+Math.random()*6;}
o.a+=dt*sf*(.2+prog*.5);o.s.position.set(Math.cos(o.a)*o.r+swayX(o.z),Math.sin(o.a)*o.r+swayY(o.z),o.z);
o.s.scale.setScalar(o.size*(1+.2*Math.sin(time*2+o.h*9)));o.s.material.color.setHSL((o.h+time*.03+prog)%1,1,.6);
o.s.material.opacity=ss(-L,-L+30,o.z)*ss(0,-8,o.z)*.35;});
const ws=(4+prog*3)*sf;let best=null;
for(let i=live.length-1;i>=0;i--){const w=live[i];w.z+=ws*w.k*dt;
if(w.z>-1.5){w.s.parent.remove(w.s);w.s.material.map.dispose();w.s.material.dispose();live.splice(i,1);continue;}
w.a+=dt*sf*(.12+prog*.3)*(1+4/(-w.z+4))*w.sw;
const rr=w.r+Math.sin(time*.8+w.wob)*.25,wa=w.a+roll;
w.s.position.set(Math.cos(wa)*rr+swayX(w.z),Math.sin(wa)*rr+swayY(w.z),w.z);
w.s.material.rotation=w.big?Math.sin(time*.4)*.2:Math.sin(time*.5+w.wob)*.12;
w.s.material.opacity=ss(w.big?-85:-60,w.big?-60:-42,w.z)*ss(w.big?-3:-2.5,w.big?-14:-7,w.z)*(w.big?.4:1);
if(!w.big&&w.z<-6&&w.z>-46&&(!best||w.z>best.z))best=w;}
if(best&&best!==curW){curW=best;showMem(best);}
const side0=Math.min(W*1.02,H*.86);
slots.forEach(s=>{s.op+=(s.target-s.op)*Math.min(1,dt*(s.target?1.4:2.2));s.mesh.visible=s.op>.01&&!!s.mem&&pause<.98;if(!s.mesh.visible)return;
 s.lt+=dt*sf;try{s.mem.update(s.lt);}catch(e){console.error(e);s.mem=null;return;}
 const u=s.mat.uniforms;u.uOp.value=s.op*(.68+slow*.3);u.uTime.value=time;u.uClar.value=.2+slow*.75;
 const side=side0*(1+Math.min(s.lt*.03,.2));u.uSize.value.set(side/W,side/H);
 u.uOff.value.set(Math.sin(time*.13+s.seed)*.04,Math.cos(time*.11+s.seed)*.04+(W<H?.05:0));});
// detail view
openA+=((openIt?1:0)-openA)*Math.min(1,dt*5);dim.visible=openA>.01;dim.material.uniforms.o.value=openA*.8;
viz.op+=(viz.target-viz.op)*Math.min(1,dt*5);viz.mesh.visible=viz.op>.01&&!!viz.mem;
if(viz.mesh.visible){vt+=dt;try{viz.mem.update(vt);}catch(e){console.error(e);}const u=viz.mat.uniforms;u.uOp.value=viz.op;u.uTime.value=vt;}
// ticker
const tsp=(70*Math.max(sf,.12*(1-pause)))*(1+Math.min(tq.length,4)*.5)*dt;
for(let i=tick.length-1;i>=0;i--){const it=tick[i];it.x-=tsp;it.el.style.transform=`translateX(${it.x.toFixed(1)}px)`;if(it.x+it.w<-10){it.el.remove();tick.splice(i,1);}}
if(tq.length){const lw=lane.clientWidth,lt=tick[tick.length-1];if(!lt||lt.x+lt.w<lw-48)pushHead(tq.shift());}
drawTimeline(date);const S=WP.state;S.date=date;S.prog=prog;S.slow=slow;S.pause=pause;S.spinV=spinV;
// drifting characters from the asset pack
if(chars.length&&now>nextChar){nextChar=now+9000+Math.random()*9000;const c=chars[Math.floor(Math.random()*chars.length)];if(c.tex){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:c.tex,transparent:true,depthWrite:false,depthTest:false,opacity:0}));s.renderOrder=2;const sz=c.size||2.2;s.scale.set(sz*c.asp,sz,1);ov.add(s);drift.push({s,a:Math.random()*TAU,r:2+Math.random()*2.5,z:-L*.7,spin:(Math.random()-.5)*.3});}}
for(let i=drift.length-1;i>=0;i--){const d=drift[i];d.z+=fall*dt*.55;if(d.z>-2){ov.remove(d.s);d.s.material.dispose();drift.splice(i,1);continue;}d.a+=dt*sf*.15;const wa=d.a+roll;d.s.position.set(Math.cos(wa)*d.r+swayX(d.z),Math.sin(wa)*d.r+swayY(d.z),d.z);d.s.material.rotation+=d.spin*dt*sf;d.s.material.opacity=ss(-L*.7,-L*.45,d.z)*ss(-2,-12,d.z)*.6;}
if(composer)composer.render();else renderer.render(scene,camera);
renderer.autoClear=false;renderer.clearDepth();renderer.render(ov,camera);renderer.autoClear=true;}
function useManifest(mf){MANIFEST=Object.assign({visions:{},textures:{},characters:[]},mf||{});
if(MANIFEST.textures.tunnel)tload.load('assets/textures/'+MANIFEST.textures.tunnel,t=>{t.wrapS=t.wrapT=THREE.RepeatWrapping;U.tTun.value=t;U.uTunOn.value=1;});
(MANIFEST.characters||[]).forEach(c=>{const o=Object.assign({asp:1},c);tload.load('assets/characters/'+c.file,t=>{o.tex=t;o.asp=t.image.width/t.image.height;});chars.push(o);});}
const mfp=fetch('assets/manifest.json').then(r=>r.ok?r.json():{}).catch(()=>({})).then(useManifest);
const go=()=>mfp.then(()=>requestAnimationFrame(frame));
if(document.fonts&&document.fonts.load){Promise.race([Promise.all([document.fonts.load('900 72px "Big Shoulders Display"'),document.fonts.load('400 13px "IBM Plex Mono"'),document.fonts.load('600 40px Caveat'),document.fonts.load('500 20px "JetBrains Mono"'),document.fonts.load('600 16px Manrope')]),new Promise(r=>setTimeout(r,2500))]).then(go,go);}else go();
}
}
