// Into the Whirlpool: visions ("memories of the future").
window.WP_initMem=function(C){
const {THREE,renderer,glow,mobile,mulberry,TAU,NOISE,PAL,BYID}=C;
const RS=mobile?384:512;
const pmrem=new THREE.PMREMGenerator(renderer);
const envTex=THREE.RoomEnvironment?pmrem.fromScene(new THREE.RoomEnvironment(),.04).texture:null;
const phys=(c,o)=>new THREE.MeshPhysicalMaterial(Object.assign({color:c,roughness:.35,metalness:0,clearcoat:.5,clearcoatRoughness:.25,envMapIntensity:1},o||{}));
function lights(sc,key,rim,ki){sc.add(new THREE.HemisphereLight(0xbfd4ff,0x0a0806,.35));
const d=new THREE.DirectionalLight(key||'#ffffff',ki||1.3);d.position.set(3,5,4);sc.add(d);
const r=new THREE.PointLight(rim||'#6aa8ff',2.2,30);r.position.set(-4,-1.5,-3);sc.add(r);}
function blobGeo(r,det,amp,fr){const g=new THREE.SphereGeometry(r,12+det*12,8+det*9);const pa=g.attributes.position,p=new THREE.Vector3();amp=amp||.18;fr=fr||1;
for(let i=0;i<pa.count;i++){p.fromBufferAttribute(pa,i);const q=p.clone().multiplyScalar(fr/r);
const n=1+amp*Math.sin(q.x*3.1+q.y*1.7)*Math.sin(q.y*2.3+q.z*2.9)+amp*.45*Math.sin(q.z*7+q.x*5);p.multiplyScalar(n);pa.setXYZ(i,p.x,p.y,p.z);}
g.computeVertexNormals();return g;}
function mk3D(bgc,build,envI){const sc=new THREE.Scene();sc.background=new THREE.Color(bgc);if(envTex)sc.environment=envTex;
const cam=new THREE.PerspectiveCamera(38,1,.1,250);const rt=new THREE.WebGLRenderTarget(RS,RS);
const upd=build(sc,cam);envI=envI==null?1:envI;sc.traverse(o=>{if(o.material&&'envMapIntensity' in o.material)o.material.envMapIntensity=envI;});try{renderer.compile(sc,cam);}catch(e){}
return {tex:rt.texture,lin:1,update(t){upd(t);renderer.setRenderTarget(rt);renderer.render(sc,cam);renderer.setRenderTarget(null);}};}
function mk2D(build){const c=document.createElement('canvas');c.width=c.height=RS;const x=c.getContext('2d');
const t=new THREE.CanvasTexture(c);t.minFilter=THREE.LinearFilter;t.generateMipmaps=false;
const d=build(x,RS);return {tex:t,lin:0,update(tm){d(tm);t.needsUpdate=true;}};}
function mkShader(frag){const sc=new THREE.Scene();const cam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);const u={t:{value:0}};
sc.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({uniforms:u,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:frag})));
const rt=new THREE.WebGLRenderTarget(RS,RS);
return {tex:rt.texture,lin:0,update(t){u.t.value=t;renderer.setRenderTarget(rt);renderer.render(sc,cam);renderer.setRenderTarget(null);}};}

const MEM={
// ---- DNA with a gene-editing enzyme / mRNA + lipid nanoparticle
helix:v=>mk3D('#03060c',(sc,cam)=>{sc.fog=new THREE.FogExp2(0x03060c,.08);lights(sc,'#cfe8ff','#ff9a6b',1.5);
const g=new THREE.Group();sc.add(g);const N=72,single=v==='mrna';
const sm=new THREE.InstancedMesh(new THREE.SphereGeometry(.17,20,14),phys('#e6eef8',{roughness:.22,clearcoat:1}),N*2);
const cm=new THREE.InstancedMesh(new THREE.CylinderGeometry(.065,.065,1,12),phys('#ffffff',{roughness:.35}),N);
const cols=['#e8505b','#f9d56e','#14b1ab','#5a7bd8'].map(c=>new THREE.Color(c));
const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0);
for(let i=0;i<N;i++){const a=i*.36,y=(i-N/2)*.2;
 const A=new THREE.Vector3(Math.cos(a)*1.1,y,Math.sin(a)*1.1),B=new THREE.Vector3(Math.cos(a+Math.PI)*1.1,y,Math.sin(a+Math.PI)*1.1);
 sm.setMatrixAt(i*2,m4.makeTranslation(A.x,A.y,A.z));
 sm.setMatrixAt(i*2+1,single?m4.makeScale(.0001,.0001,.0001):m4.makeTranslation(B.x,B.y,B.z));
 const E=single?A.clone().multiplyScalar(.4):B;const mid=A.clone().add(E).multiplyScalar(.5);
 q.setFromUnitVectors(up,E.clone().sub(A).normalize());cm.setMatrixAt(i,m4.compose(mid,q,new THREE.Vector3(1,A.distanceTo(E),1)));cm.setColorAt(i,cols[(i*7)%4]);}
g.add(sm,cm);
const en=new THREE.Mesh(single?blobGeo(1.3,5,.06,4):blobGeo(1.15,4,.2,1),phys(single?'#f3d9a4':'#d8794f',{roughness:single?.25:.5,clearcoat:single?1:.3,transparent:true,opacity:single?.78:.95}));
sc.add(en);const pl=new THREE.PointLight(single?'#ffd27a':'#ff7a3c',3,6);sc.add(pl);
return t=>{g.rotation.y=t*.25;en.position.set(1.7,Math.sin(t*.3)*2.4,.6);en.rotation.set(t*.2,t*.3,0);pl.position.copy(en.position).add(new THREE.Vector3(-1,0,.5));pl.intensity=2.5+Math.sin(t*5)*.6;
cam.position.set(Math.sin(t*.1)*1.5,.6+Math.sin(t*.13)*.5,6.4-Math.sin(t*.07));cam.lookAt(.4,0,0);};},.6),
// ---- a cell / microbes
cell:v=>mk3D(v==='microbe'?'#020805':'#0a0408',(sc,cam)=>{lights(sc,'#ffffff',v==='microbe'?'#7dff9a':'#ff7ab8',1.4);sc.fog=new THREE.FogExp2(v==='microbe'?0x020805:0x0a0408,.06);
const g=new THREE.Group();sc.add(g);const rr=mulberry(31);const parts=[];
if(v==='microbe'){for(let i=0;i<11;i++){const m=new THREE.Mesh(blobGeo(.5,3,.05,2),phys(i%3?'#86d17c':'#c9e27a',{roughness:.45,clearcoat:.8,transparent:true,opacity:.9}));
 m.scale.set(1,.34,.34);m.position.set((rr()-.5)*6,(rr()-.5)*4,(rr()-.5)*3);g.add(m);parts.push({m,s:rr()*6,r:rr()});}
 for(let i=0;i<60;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(.05,8,6),new THREE.MeshBasicMaterial({color:0xffd36e}));m.position.set((rr()-.5)*7,(rr()-.5)*5,(rr()-.5)*3);g.add(m);parts.push({m,s:rr()*6,r:rr(),tiny:1});}}
else{g.add(new THREE.Mesh(blobGeo(2.1,5,.04,1.3),phys('#f2a9c4',{transparent:true,opacity:.22,roughness:.1,clearcoat:1,side:THREE.DoubleSide,depthWrite:false})));
 const nu=new THREE.Mesh(blobGeo(.8,4,.12,2),phys('#6a3d9a',{roughness:.6}));g.add(nu);
 for(let i=0;i<8;i++){const m=new THREE.Mesh(blobGeo(.3,3,.1,2),phys('#f08a3c',{roughness:.5}));m.scale.set(1,.45,.45);const d=new THREE.Vector3(rr()-.5,rr()-.5,rr()-.5).normalize().multiplyScalar(1.15+rr()*.5);m.position.copy(d);m.rotation.set(rr()*3,rr()*3,0);g.add(m);parts.push({m,s:rr()*6,r:rr()});}
 for(let i=0;i<34;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(.07+rr()*.07,12,8),phys('#9ee6ff',{transparent:true,opacity:.75}));const d=new THREE.Vector3(rr()-.5,rr()-.5,rr()-.5).normalize().multiplyScalar(1+rr()*.9);m.position.copy(d);g.add(m);parts.push({m,s:rr()*6,r:rr(),tiny:1});}}
const base=parts.map(p=>p.m.position.clone());
return t=>{g.rotation.y=t*.12;parts.forEach((p,i)=>{const b=base[i];p.m.position.set(b.x+Math.sin(t*.7+p.s)*.08,b.y+Math.cos(t*.6+p.s)*.08,b.z);if(!p.tiny&&v==='microbe')p.m.rotation.set(t*.2*p.r,t*.3+p.s,Math.sin(t+p.s)*.3);});
cam.position.set(Math.sin(t*.09)*1.2,.4,v==='microbe'?7:6.2);cam.lookAt(0,0,0);};},.5),
// ---- ball-and-stick drug molecule
molecule:v=>mk3D('#07080c',(sc,cam)=>{lights(sc,'#fff4e6','#6ab0ff',1.5);const rr=mulberry(v==='b'?77:13);const g=new THREE.Group();sc.add(g);
const atoms=[];const add=(x,y,z,e)=>{for(const a of atoms)if(a.p.distanceTo(new THREE.Vector3(x,y,z))<.3)return a;const a={p:new THREE.Vector3(x,y,z),e};atoms.push(a);return a;};
const ring=(cx,cy,n,rot,z)=>{const r=1.4/(2*Math.sin(Math.PI/n));for(let i=0;i<n;i++){const a=rot+i*TAU/n;add(cx+Math.cos(a)*r,cy+Math.sin(a)*r,z+(i%2?.12:-.12),rr()<.18?'N':'C');}};
ring(0,0,6,Math.PI/6,0);ring(2.425,0,6,Math.PI/6,0);add(-2.45,1.4,.2,'C');ring(-3.4,2.1,5,Math.atan2(-.7,.95),.45);
const nb=a=>atoms.filter(b=>b!==a&&b.e!=='H'&&a.p.distanceTo(b.p)<1.6);
atoms.slice().forEach(a=>{const ns=nb(a);if(ns.length>=3)return;const c=new THREE.Vector3();ns.forEach(b=>c.add(b.p));c.multiplyScalar(1/ns.length);
 const d=a.p.clone().sub(c).normalize();if(rr()<.45){const e=['O','N','F','C','O'][Math.floor(rr()*5)];const s=add(a.p.x+d.x*1.45,a.p.y+d.y*1.45,a.p.z+(rr()-.5)*1.1,e);
  if(e!=='F'){const o=s.p.clone().add(d.clone().multiplyScalar(1.05));add(o.x,o.y,o.z+.5,'H');}}else add(a.p.x+d.x*1.05,a.p.y+d.y*1.05,a.p.z,'H');});
const ctr=new THREE.Vector3();atoms.forEach(a=>ctr.add(a.p));ctr.multiplyScalar(1/atoms.length);atoms.forEach(a=>a.p.sub(ctr));
const AC={C:['#3a3d44',.34],N:['#3b5bdb',.33],O:['#e03131',.33],F:['#5cd65c',.3],H:['#f1f3f5',.2]};const mats={};
atoms.forEach(a=>{const m=mats[a.e]||(mats[a.e]=phys(AC[a.e][0],{roughness:.2,clearcoat:1}));const s=new THREE.Mesh(new THREE.SphereGeometry(AC[a.e][1],28,20),m);s.position.copy(a.p);g.add(s);});
const bm=phys('#aeb3bb',{roughness:.3,metalness:.2}),cg=new THREE.CylinderGeometry(.085,.085,1,12),up=new THREE.Vector3(0,1,0);
for(let i=0;i<atoms.length;i++)for(let j=i+1;j<atoms.length;j++){const a=atoms[i],b=atoms[j],d=a.p.distanceTo(b.p),hy=a.e==='H'||b.e==='H';
 if(hy?(d<1.2&&!(a.e==='H'&&b.e==='H')):d<1.6){const m=new THREE.Mesh(cg,bm);m.position.copy(a.p).add(b.p).multiplyScalar(.5);m.scale.y=d;m.quaternion.setFromUnitVectors(up,b.p.clone().sub(a.p).normalize());g.add(m);}}
return t=>{g.rotation.set(Math.sin(t*.2)*.4,t*.25,Math.sin(t*.13)*.2);cam.position.set(0,0,10.5-Math.sin(t*.1)*1.2);cam.lookAt(0,0,0);};},.8),
// ---- robot arm in a night lab
robot:()=>mk3D('#05070b',(sc,cam)=>{sc.fog=new THREE.FogExp2(0x05070b,.07);sc.add(new THREE.HemisphereLight(0x8fb4ff,0x050505,.35));
const sp=new THREE.SpotLight(0xdfe9ff,3,25,.6,.5);sp.position.set(0,7,2);sc.add(sp);const bl=new THREE.PointLight(0x3e8bff,2,12);bl.position.set(-3,2,-2);sc.add(bl);
const bench=new THREE.Mesh(new THREE.BoxGeometry(12,.25,7),phys('#23272e',{metalness:.7,roughness:.3}));bench.position.y=-.13;sc.add(bench);
const plate=new THREE.Mesh(new THREE.BoxGeometry(2.6,.22,1.75),phys('#f2f4f7',{roughness:.3}));plate.position.set(.6,.11,.4);sc.add(plate);
const wm=new THREE.InstancedMesh(new THREE.CylinderGeometry(.075,.075,.06,14),phys('#ffffff',{roughness:.1,clearcoat:1}),96);let k=0;const m4=new THREE.Matrix4();const wc=['#ff4f8b','#ffd23f','#3ee8ff','#9d5cff'].map(c=>new THREE.Color(c));
for(let r=0;r<8;r++)for(let c=0;c<12;c++){wm.setMatrixAt(k,m4.makeTranslation(.6-1.1+c*.2,.23,.4-.7+r*.2));wm.setColorAt(k,wc[(r*3+c*5)%4]);k++;}sc.add(wm);
const wh=phys('#dfe3e8',{metalness:.35,roughness:.28}),dk=phys('#202226',{metalness:.85,roughness:.35});
const base=new THREE.Group();base.position.set(-1.9,0,-.4);sc.add(base);const bmh=new THREE.Mesh(new THREE.CylinderGeometry(.55,.65,.5,40),dk);bmh.position.y=.25;base.add(bmh);
const sh=new THREE.Group();sh.position.y=.5;base.add(sh);sh.add(new THREE.Mesh(new THREE.SphereGeometry(.32,24,16),dk));
const upA=new THREE.Group();sh.add(upA);const um=new THREE.Mesh(new THREE.BoxGeometry(.34,2,.34),wh);um.position.y=1;upA.add(um);
const el=new THREE.Group();el.position.y=2;upA.add(el);el.add(new THREE.Mesh(new THREE.SphereGeometry(.26,24,16),dk));
const fm=new THREE.Mesh(new THREE.BoxGeometry(.28,1.7,.28),wh);fm.position.y=.85;el.add(fm);
const wr=new THREE.Group();wr.position.y=1.7;el.add(wr);wr.add(new THREE.Mesh(new THREE.SphereGeometry(.2,20,14),dk));
const pip=new THREE.Mesh(new THREE.ConeGeometry(.07,.7,16),phys('#e8f6ff',{transparent:true,opacity:.7,roughness:.05}));pip.rotation.z=Math.PI;pip.position.y=-.45;wr.add(pip);
const tip=new THREE.PointLight(0x3ee8ff,1.5,2);tip.position.y=-.8;wr.add(tip);
const leds=[];for(let i=0;i<6;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(.035,8,6),new THREE.MeshBasicMaterial({color:i%2?0x32ff7e:0xff3b3b}));m.position.set(-5+i*.25,.05,3.2);sc.add(m);leds.push(m);}
return t=>{sh.rotation.y=Math.sin(t*.55)*.9+.9;upA.rotation.z=-.55+Math.sin(t*1.1)*.22;el.rotation.z=1.75+Math.sin(t*1.1+.9)*.28;wr.rotation.z=-(upA.rotation.z+el.rotation.z);
leds.forEach((m,i)=>m.visible=Math.sin(t*3+i*1.7)>0);cam.position.set(3.5+Math.sin(t*.08)*1.2,2.8,5.2);cam.lookAt(-.3,1,0);};},.25),
// ---- tokamak with glowing plasma
tokamak:()=>mk3D('#040308',(sc,cam)=>{sc.fog=new THREE.FogExp2(0x040308,.035);sc.add(new THREE.HemisphereLight(0x8a7bff,0x050308,.3));
const R0=3,cm=phys('#b87333',{metalness:1,roughness:.3});
for(let k=0;k<16;k++){const a=k/16*TAU;const m=new THREE.Mesh(new THREE.TorusGeometry(1.4,.13,14,56),cm);m.position.set(Math.cos(a)*R0,0,Math.sin(a)*R0);m.rotation.y=-a;sc.add(m);}
sc.add(new THREE.Mesh(new THREE.CylinderGeometry(.9,.9,4.2,48),phys('#8b919c',{metalness:.9,roughness:.3})));
for(let k=0;k<5;k++){const l=new THREE.PointLight(0xff5fd8,2.2,7);const a=k/5*TAU;l.position.set(Math.cos(a)*R0,0,Math.sin(a)*R0);sc.add(l);}
const pu={t:{value:0}};const pm=new THREE.ShaderMaterial({uniforms:pu,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,
vertexShader:'varying vec2 vUv;varying vec3 vN,vV;void main(){vUv=uv;vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
fragmentShader:'uniform float t;varying vec2 vUv;varying vec3 vN,vV;void main(){float f=pow(1.-abs(dot(vN,vV)),1.4);float s=.5+.5*sin(vUv.x*188.5+vUv.y*18.85-t*6.);float s2=.5+.5*sin(vUv.x*44.-t*2.+vUv.y*6.28);vec3 c=mix(vec3(1.,.32,.85),vec3(.55,.35,1.),s2);gl_FragColor=vec4(c*(.5+.5*s),(.07+.38*f)*(.7+.3*s));}'});
const pl=new THREE.Mesh(new THREE.TorusGeometry(R0,.72,48,220),pm);pl.rotation.x=Math.PI/2;sc.add(pl);
const core=new THREE.Mesh(new THREE.TorusGeometry(R0,.2,16,160),new THREE.MeshBasicMaterial({color:0xffb8f0,transparent:true,opacity:.35,blending:THREE.AdditiveBlending,depthWrite:false}));core.rotation.x=Math.PI/2;sc.add(core);
return t=>{pu.t.value=t;core.material.opacity=.28+.12*Math.sin(t*9);cam.position.set(Math.cos(t*.06)*7.6,3.1+Math.sin(t*.1),Math.sin(t*.06)*7.6);cam.lookAt(0,-.3,0);};},.35),
// ---- levitating magnet over a superconductor, LN2 vapour
levitate:v=>mk3D('#050608',(sc,cam)=>{lights(sc,'#ffffff','#5fb6ff',1.1);sc.fog=new THREE.FogExp2(0x050608,.05);
const sp=new THREE.SpotLight(0xffffff,2.6,30,.55,.6);sp.position.set(0,8,2);sc.add(sp);
const fl=new THREE.Mesh(new THREE.PlaneGeometry(40,40),phys('#0f1013',{roughness:.22,clearcoat:.9}));fl.rotation.x=-Math.PI/2;fl.position.y=-.6;sc.add(fl);
const n=v==='three'?3:1,mags=[],vap=[];
for(let k=0;k<n;k++){const g=new THREE.Group();g.position.x=(k-(n-1)/2)*3.3;sc.add(g);
 const dish=new THREE.Mesh(new THREE.CylinderGeometry(1.45,1.3,.5,64),phys('#9aa1ab',{metalness:1,roughness:.25}));dish.position.y=-.35;g.add(dish);
 const sup=new THREE.Mesh(new THREE.CylinderGeometry(1.05,1.05,.22,64),phys('#17181c',{roughness:.75,clearcoat:.15}));g.add(sup);
 const mag=new THREE.Mesh(new THREE.BoxGeometry(.85,.22,.85),phys('#eef1f6',{metalness:1,roughness:.05}));g.add(mag);mags.push(mag);
 for(let i=0;i<24;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:glow,color:0xdfefff,transparent:true,depthWrite:false,opacity:0}));g.add(s);vap.push({s,a:Math.random()*TAU,o:Math.random()});}}
return t=>{mags.forEach((m,i)=>{m.position.y=.78+Math.sin(t*1.3+i*2)*.06;m.rotation.y=t*.25+i;m.rotation.x=Math.sin(t*.7+i)*.05;});
vap.forEach(p=>{const l=(t*.12+p.o)%1,r=.4+l*2;p.s.position.set(Math.cos(p.a)*r,.08+l*.2-l*l*.45,Math.sin(p.a)*r);p.s.scale.setScalar(.6+l*1.8);p.s.material.opacity=Math.sin(l*Math.PI)*.13;});
cam.position.set(Math.sin(t*.08)*(n>1?4:2.2),1.5,n>1?9:5);cam.lookAt(0,.3,0);};},.45),
// ---- fluorescent neurons with travelling signals
neurons:()=>mk3D('#010304',(sc,cam)=>{sc.fog=new THREE.FogExp2(0x010304,.07);const rr=mulberry(11);const curves=[];
const ma=new THREE.MeshBasicMaterial({color:0x3fd8c8,transparent:true,opacity:.7,blending:THREE.AdditiveBlending,depthWrite:false});const mb=ma.clone();mb.color.set('#ff5fd2');
const rv=()=>new THREE.Vector3(rr()-.5,rr()-.5,rr()-.5);
function grow(p,dir,len,depth,m){const pts=[p.clone()];let c=p.clone();const d=dir.clone();for(let i=0;i<6;i++){d.add(rv().multiplyScalar(.6)).normalize();c=c.clone().addScaledVector(d,len/6);pts.push(c);}
 const cv=new THREE.CatmullRomCurve3(pts);curves.push(cv);sc.add(new THREE.Mesh(new THREE.TubeGeometry(cv,20,.016+.022*depth,6,false),m));
 if(depth>1)for(let k=0;k<(depth>2?3:2);k++)grow(c,d.clone().add(rv()),len*.7,depth-1,m);}
for(let n=0;n<5;n++){const p=new THREE.Vector3((rr()-.5)*6,(rr()-.5)*4,(rr()-.5)*4-1);const m=n%3===2?mb:ma;const s=new THREE.Mesh(blobGeo(.3,3,.25,2),m);s.position.copy(p);sc.add(s);
 for(let k=0;k<4;k++)grow(p,rv().normalize(),1.7,3,m);}
const pulses=[];for(let i=0;i<44;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:glow,color:i%4?0xbffcff:0xffc2f0,blending:THREE.AdditiveBlending,transparent:true,depthWrite:false}));s.scale.setScalar(.35);sc.add(s);pulses.push({s,c:curves[Math.floor(rr()*curves.length)],o:rr(),sp:.2+rr()*.4});}
return t=>{pulses.forEach(p=>{const u=(t*p.sp+p.o)%1;p.s.position.copy(p.c.getPoint(u));p.s.material.opacity=Math.sin(u*Math.PI);});
cam.position.set(Math.sin(t*.07)*2,Math.cos(t*.05),7);cam.lookAt(0,0,-1);};}),
// ---- night sky, observatory, a transient (or a lensing ring)
sky:v=>mk3D('#020309',(sc,cam)=>{const N=mobile?2600:4200,rr=mulberry(7),pos=[],col=[];
for(let i=0;i<N;i++){const band=i<N*.55;let x,y,z;if(band){const a=rr()*TAU,o=(rr()+rr()+rr()-1.5)*.16;x=Math.cos(a);y=Math.sin(a)*.55+o+.45;z=Math.sin(a)*.8-o;}else{x=rr()*2-1;y=rr();z=rr()*2-1;}
 const l=Math.hypot(x,y,z)||1,R=80;pos.push(x/l*R,Math.abs(y/l)*R,z/l*R);const b=.35+rr()*.65,c=rr();col.push(b*(c<.15?.7:1),b*(c<.15?.8:c>.9?.8:1),b*(c>.9?.6:1));}
const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));sg.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
sc.add(new THREE.Points(sg,new THREE.PointsMaterial({map:glow,size:1.1,vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending})));
const gg=new THREE.PlaneGeometry(260,260,60,60);gg.rotateX(-Math.PI/2);const gp=gg.attributes.position;for(let i=0;i<gp.count;i++){const x=gp.getX(i),z=gp.getZ(i);gp.setY(i,Math.sin(x*.05)*2+Math.cos(z*.07)*1.5-2.5+Math.max(0,-z-60)*.08);}gg.computeVertexNormals();
sc.add(new THREE.Mesh(gg,new THREE.MeshStandardMaterial({color:0x07080a,roughness:1})));
const moon=new THREE.DirectionalLight(0x9fb4ff,.55);moon.position.set(-5,6,3);sc.add(moon);sc.add(new THREE.HemisphereLight(0x1a2240,0x000000,.4));
const ob=new THREE.Group();ob.position.set(2,-1.4,-16);sc.add(ob);const om=phys('#8d939c',{metalness:.4,roughness:.55});
const cyl=new THREE.Mesh(new THREE.CylinderGeometry(2,2,2.4,48),om);cyl.position.y=1.2;ob.add(cyl);
const dome=new THREE.Group();dome.position.y=2.4;ob.add(dome);dome.add(new THREE.Mesh(new THREE.SphereGeometry(2,48,24,0,TAU,0,Math.PI/2),om));
const slit=new THREE.Mesh(new THREE.BoxGeometry(.55,2.3,.2),new THREE.MeshBasicMaterial({color:0x000000}));slit.position.set(0,1,1.55);slit.rotation.x=-.75;dome.add(slit);
const red=new THREE.PointLight(0xff3020,1.5,4);red.position.set(0,1.2,1.4);dome.add(red);
const tp=new THREE.Vector3(14,30,-60);const tr=new THREE.Sprite(new THREE.SpriteMaterial({map:glow,color:v==='dark'?0xb48cff:0xbfefff,blending:THREE.AdditiveBlending,transparent:true,depthWrite:false}));tr.position.copy(tp);sc.add(tr);
let ring=null;if(v==='dark'){ring=new THREE.Mesh(new THREE.RingGeometry(3.6,3.9,96),new THREE.MeshBasicMaterial({color:0xc6a4ff,transparent:true,opacity:.5,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,depthWrite:false}));ring.position.copy(tp);sc.add(ring);}
return t=>{dome.rotation.y=Math.sin(t*.1)*.6;const pk=Math.pow(Math.max(0,Math.sin(t*.7)),8);tr.scale.setScalar(2+pk*9);
if(ring){ring.lookAt(cam.position);ring.scale.setScalar(1+.08*Math.sin(t*1.3));ring.material.opacity=.3+.25*Math.sin(t*.9);}
cam.position.set(0,.4,0);cam.lookAt(5+Math.sin(t*.05)*4,9,-40);};},.08),
// ---- particle collision event display
collider:()=>mk3D('#03040a',(sc,cam)=>{const rm=new THREE.LineBasicMaterial({color:0x5c7aa8,transparent:true,opacity:.3});
for(const r of [.6,1.1,1.7,2.4,3.3])for(let zz=-3;zz<=3;zz+=1.5){const p=[];for(let i=0;i<=96;i++){const a=i/96*TAU;p.push(new THREE.Vector3(Math.cos(a)*r,Math.sin(a)*r,zz));}sc.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(p),rm));}
const tg=new THREE.BoxGeometry(.2,.2,1),towers=[];for(let i=0;i<60;i++){const m=new THREE.Mesh(tg,new THREE.MeshBasicMaterial({color:i%5?0xffb13e:0xff4a3e,transparent:true,opacity:.65,blending:THREE.AdditiveBlending,depthWrite:false}));sc.add(m);towers.push(m);}
const MP=140,tracks=[];for(let i=0;i<40;i++){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(MP*3),3));const l=new THREE.Line(g,new THREE.LineBasicMaterial({transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));sc.add(l);tracks.push(l);}
const fl=new THREE.Sprite(new THREE.SpriteMaterial({map:glow,color:0xffffff,blending:THREE.AdditiveBlending,transparent:true,depthWrite:false}));sc.add(fl);let ev=-1;
function gen(seed){const r=mulberry(seed);tracks.forEach((l,i)=>{const q=r()<.5?-1:1,Rc=i<2?14:.8+r()*8,phi=r()*TAU,dz=(r()-.5)*1.4;const a=l.geometry.attributes.position;let n=0;
 for(let s=0;n<MP;s+=.04){const th=phi+q*s/Rc,x=q*Rc*(Math.sin(th)-Math.sin(phi)),y=-q*Rc*(Math.cos(th)-Math.cos(phi)),z=s*dz;if(Math.hypot(x,y)>3.4||Math.abs(z)>3.2)break;a.setXYZ(n++,x,y,z);}
 l.userData.n=n;a.needsUpdate=true;l.material.color.set(i<2?'#ff3ec8':['#46e0ff','#7dff9a','#ffd36e','#ffffff'][i%4]);});
 towers.forEach((m,i)=>{const a=i<6?Math.atan2(tracks[i%2].geometry.attributes.position.getY(Math.max(0,tracks[i%2].userData.n-1)),tracks[i%2].geometry.attributes.position.getX(Math.max(0,tracks[i%2].userData.n-1)))+(r()-.5)*.2:r()*TAU;
 const e=i<6?1.6+r()*1.2:.15+Math.pow(r(),3)*1.6,z=(r()-.5)*4;m.position.set(Math.cos(a)*(3.6+e/2),Math.sin(a)*(3.6+e/2),z);m.lookAt(0,0,z);m.scale.set(1,1,e);});}
return t=>{const e=Math.floor(t/5);if(e!==ev){ev=e;gen(e*7+3);}const lt=t%5;
tracks.forEach(l=>{l.geometry.setDrawRange(0,Math.floor(l.userData.n*Math.min(1,lt/1.1)));l.material.opacity=lt>4?Math.max(0,5-lt):1;});
towers.forEach(m=>m.material.opacity=.65*Math.min(1,Math.max(0,lt-.8)*2)*(lt>4?5-lt:1));fl.scale.setScalar(Math.max(0,1-lt*2)*4);
cam.position.set(Math.sin(t*.1)*3,1.6,7.5);cam.lookAt(0,0,0);};}),
// ---- ink in water: turbulence heading for blow-up
fluid:()=>mkShader(`uniform float t;varying vec2 vUv;${NOISE}
void main(){vec2 p=vUv-.5;float r=length(p);float a=atan(p.y,p.x);
a+=(.55+.25*sin(t*.15))/(r+.1)+t*.07;vec2 q=vec2(cos(a),sin(a))*r*3.;
vec2 w=vec2(fbm(q+t*.05),fbm(q+vec2(5.2,1.3)-t*.04));
float d=fbm(q*1.3+w*2.2+t*.03),d2=fbm(q*1.3+w*2.2+t*.03+vec2(.012));
float ink=smoothstep(.42,.78,d),ink2=smoothstep(.55,.9,fbm(q*2.7+w*3.-t*.05));
vec3 water=mix(vec3(.88,.91,.94),vec3(.68,.76,.83),r*1.4);
vec3 c=mix(water,vec3(.07,.1,.3),ink*.88);c=mix(c,vec3(.02,.27,.36),ink2*.6);
c+=(d-d2)*4.;c*=1.-.4*smoothstep(.3,.75,r);gl_FragColor=vec4(c,1.);}`),
// ---- a plastic bottle being eaten into monomers
plastic:()=>mk3D('#06080a',(sc,cam)=>{lights(sc,'#ffffff','#7fc8ff',1.6);sc.fog=new THREE.FogExp2(0x06080a,.06);
const prof=[[0,-1.6],[.62,-1.6],[.7,-1.45],[.72,.4],[.6,.8],[.32,1.25],[.26,1.6],[.27,1.75],[0,1.75]].map(p=>new THREE.Vector2(p[0],p[1]));
const lg=new THREE.LatheGeometry(prof,64);const pa=lg.attributes.position,v3=new THREE.Vector3();
for(let i=0;i<pa.count;i++){v3.fromBufferAttribute(pa,i);const k=1+.12*Math.sin(v3.y*5+Math.atan2(v3.z,v3.x)*3)*Math.sin(v3.y*2.3+1)+.05*Math.sin(v3.x*11+v3.y*7);v3.x*=k;v3.z*=k;pa.setXYZ(i,v3.x,v3.y,v3.z);}lg.computeVertexNormals();
const bm=phys('#d6ecff',{transparent:true,opacity:.42,roughness:.05,clearcoat:1,side:THREE.DoubleSide,depthWrite:false});
const bottle=new THREE.Group();bottle.add(new THREE.Mesh(lg,bm));const cap=new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,.3,32),phys('#2a6fdb',{roughness:.4}));cap.position.y=1.88;bottle.add(cap);sc.add(bottle);
const eg=blobGeo(.17,2,.25,2),en=[];for(let i=0;i<14;i++){const m=new THREE.Mesh(eg,phys('#ff9a3c',{roughness:.5}));bottle.add(m);en.push({m,a:Math.random()*TAU,y:(Math.random()-.5)*2.6,s:.3+Math.random()*.5});}
const MP=420,mg=new THREE.BufferGeometry(),mpos=new Float32Array(MP*3),ms=[];for(let i=0;i<MP;i++)ms.push([Math.random()*TAU,(Math.random()-.5)*3,Math.random()]);
mg.setAttribute('position',new THREE.BufferAttribute(mpos,3));const mp=new THREE.Points(mg,new THREE.PointsMaterial({map:glow,size:.14,color:0x9ff3ff,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));sc.add(mp);
return t=>{const c=(t%14)/14,melt=Math.min(1,c*1.3);bottle.scale.set(1-melt*.35,1-melt*.75,1-melt*.35);bm.opacity=.42*(1-melt*.8);bottle.rotation.y=t*.3;bottle.rotation.z=Math.sin(t*.4)*.15;
en.forEach(e=>{const a=e.a+t*e.s;e.m.position.set(Math.cos(a)*.8,e.y,Math.sin(a)*.8);e.m.rotation.set(t,t*.7,0);});
for(let i=0;i<MP;i++){const s=ms[i],life=(c*1.4+s[2])%1,r=.7+life*3.2;mpos[i*3]=Math.cos(s[0]+t*.2)*r;mpos[i*3+1]=s[1]*(1-melt*.6)+life*1.5;mpos[i*3+2]=Math.sin(s[0]+t*.2)*r;}
mg.attributes.position.needsUpdate=true;mp.material.opacity=.15+melt*.85;cam.position.set(Math.sin(t*.12)*1.2,.6,5.8);cam.lookAt(0,0,0);};},.7),
// ---- a human eye, macro, the whirlpool reflected in the pupil
eye:v=>mk2D((x,S)=>{const rr=mulberry(5),IR=Math.floor(S*.2),iris=document.createElement('canvas');iris.width=iris.height=IR*2;const ix=iris.getContext('2d'),c=IR;
const bs=ix.createRadialGradient(c,c,IR*.2,c,c,IR);bs.addColorStop(0,v==='ai'?'#173847':'#6b4a22');bs.addColorStop(.45,v==='ai'?'#2f7c8f':'#4f7a8c');bs.addColorStop(.9,'#24414f');bs.addColorStop(1,'#0b141a');ix.fillStyle=bs;ix.beginPath();ix.arc(c,c,IR,0,TAU);ix.fill();
for(let i=0;i<2600;i++){const a=rr()*TAU,r1=IR*(.22+rr()*.25),r2=IR*(.5+rr()*.48),a2=a+(rr()-.5)*.08;ix.strokeStyle=`hsla(${rr()<.5?195+rr()*20:30+rr()*15},${30+rr()*30}%,${55+rr()*40}%,${.08+rr()*.18})`;ix.lineWidth=.5+rr()*1.3;
 ix.beginPath();ix.moveTo(c+Math.cos(a)*r1,c+Math.sin(a)*r1);ix.quadraticCurveTo(c+Math.cos(a+.03)*(r1+r2)/2,c+Math.sin(a+.03)*(r1+r2)/2,c+Math.cos(a2)*r2,c+Math.sin(a2)*r2);ix.stroke();}
for(let i=0;i<40;i++){const a=rr()*TAU,r=IR*(.4+rr()*.4);ix.fillStyle='rgba(10,15,20,.25)';ix.beginPath();ix.ellipse(c+Math.cos(a)*r,c+Math.sin(a)*r,IR*(.03+rr()*.04),IR*.012,a,0,TAU);ix.fill();}
ix.strokeStyle='rgba(200,150,90,.35)';ix.lineWidth=IR*.03;ix.beginPath();for(let i=0;i<=80;i++){const a=i/80*TAU,r=IR*(.36+.03*Math.sin(a*9));if(i)ix.lineTo(c+Math.cos(a)*r,c+Math.sin(a)*r);else ix.moveTo(c+Math.cos(a)*r,c+Math.sin(a)*r);}ix.stroke();
if(v==='ai')for(let k=0;k<8;k++){ix.strokeStyle='rgba(120,240,255,.22)';ix.lineWidth=1;ix.beginPath();ix.arc(c,c,IR*(.42+k*.07),rr()*TAU,rr()*TAU+4);ix.stroke();}
const lim=ix.createRadialGradient(c,c,IR*.78,c,c,IR);lim.addColorStop(0,'rgba(0,0,0,0)');lim.addColorStop(1,'rgba(5,8,10,.9)');ix.fillStyle=lim;ix.beginPath();ix.arc(c,c,IR,0,TAU);ix.fill();
const scl=document.createElement('canvas');scl.width=scl.height=S;const sx=scl.getContext('2d');const sg=sx.createRadialGradient(S/2,S/2,S*.1,S/2,S/2,S*.62);sg.addColorStop(0,'#f1e9e2');sg.addColorStop(.6,'#dcc9bf');sg.addColorStop(1,'#a77f72');sx.fillStyle=sg;sx.fillRect(0,0,S,S);
for(let i=0;i<46;i++){let px=rr()<.5?rr()*S*.2:S-rr()*S*.2,py=S*.32+rr()*S*.36;sx.strokeStyle=`rgba(${150+rr()*60|0},30,40,${.15+rr()*.3})`;sx.lineWidth=.4+rr()*1.2;sx.beginPath();sx.moveTo(px,py);for(let k=0;k<8;k++){px+=(S/2-px)*.08+(rr()-.5)*14;py+=(rr()-.5)*14;sx.lineTo(px,py);}sx.stroke();}
const sac={x:0,y:0,tx:0,ty:0,next:0};const P0=[S*.04,S/2],P2=[S*.96,S/2];
return t=>{const sk=x.createRadialGradient(S/2,S/2,S*.2,S/2,S/2,S*.75);sk.addColorStop(0,'#c4927c');sk.addColorStop(1,'#4a2a20');x.fillStyle=sk;x.fillRect(0,0,S,S);
 const bp=t%6.5,open=bp<.3?Math.abs(bp-.15)/.15:1,oh=S*.3*(.06+.94*open);
 x.strokeStyle='rgba(70,35,28,.45)';x.lineWidth=S*.012;x.beginPath();x.moveTo(S*.08,S/2-S*.03);x.quadraticCurveTo(S/2,S/2-S*.3*1.95,S*.92,S/2-S*.03);x.stroke();
 x.save();x.beginPath();x.moveTo(P0[0],P0[1]);x.quadraticCurveTo(S/2,S/2-oh*1.55,P2[0],P2[1]);x.quadraticCurveTo(S/2,S/2+oh*1.2,P0[0],P0[1]);x.closePath();x.clip();
 x.drawImage(scl,0,0);
 if(t>sac.next||t<sac.next-10){sac.tx=(Math.random()-.5)*S*.12;sac.ty=(Math.random()-.5)*S*.05;sac.next=t+1.2+Math.random()*2.5;}
 sac.x+=(sac.tx-sac.x)*.25;sac.y+=(sac.ty-sac.y)*.25;const cx=S/2+sac.x,cy=S/2+sac.y;x.drawImage(iris,cx-IR,cy-IR);
 const pr=IR*(.3+.07*Math.sin(t*.6)+(v==='mirror'?.13:0));const pg=x.createRadialGradient(cx,cy,pr*.85,cx,cy,pr*1.06);pg.addColorStop(0,'#030304');pg.addColorStop(1,'rgba(3,3,4,0)');x.fillStyle=pg;x.beginPath();x.arc(cx,cy,pr*1.06,0,TAU);x.fill();
 x.save();x.beginPath();x.arc(cx,cy,pr*.92,0,TAU);x.clip();x.globalCompositeOperation='lighter';
 for(let k=0;k<5;k++){x.strokeStyle=`hsla(${(t*30+k*70)%360},90%,60%,${v==='mirror'?.4:.13})`;x.lineWidth=pr*.07;x.beginPath();for(let i=0;i<60;i++){const a=i*.18+t*.8+k*1.25,r=pr*.92*(1-i/60),X=cx+Math.cos(a)*r,Y=cy+Math.sin(a)*r;if(i)x.lineTo(X,Y);else x.moveTo(X,Y);}x.stroke();}
 x.restore();
 const ls=x.createLinearGradient(0,S/2-oh*1.2,0,S/2+oh);ls.addColorStop(0,'rgba(40,20,15,.7)');ls.addColorStop(.35,'rgba(40,20,15,0)');ls.addColorStop(.85,'rgba(40,20,15,0)');ls.addColorStop(1,'rgba(40,20,15,.35)');x.fillStyle=ls;x.fillRect(0,0,S,S);
 x.fillStyle='rgba(255,255,255,.85)';x.beginPath();x.ellipse(cx-IR*.35,cy-IR*.38,IR*.13,IR*.08,-.5,0,TAU);x.fill();x.fillStyle='rgba(255,255,255,.3)';x.fillRect(cx+IR*.22,cy-IR*.5,IR*.1,IR*.16);
 x.restore();
 x.strokeStyle='rgba(18,9,7,.92)';x.lineCap='round';for(let i=1;i<46;i++){const u=i/46,px=(1-u)*(1-u)*P0[0]+2*u*(1-u)*S/2+u*u*P2[0],py=S/2-2*u*(1-u)*oh*1.55;
  x.lineWidth=1+Math.sin(u*Math.PI)*1.8;x.beginPath();x.moveTo(px,py);x.quadraticCurveTo(px+(u-.5)*S*.03,py-S*.04,px+(u-.5)*S*.08,py-S*.07*(.4+Math.sin(u*Math.PI)*.6));x.stroke();}};}),
// ---- a chalkboard, a mathematician's hand moving across it
board:v=>mk2D((x,S)=>{const bgc=document.createElement('canvas');bgc.width=bgc.height=S;const b=bgc.getContext('2d');const rr=mulberry(3);
b.fillStyle='#1c2924';b.fillRect(0,0,S,S);
for(let i=0;i<90;i++){const X=rr()*S,Y=rr()*S,R=20+rr()*120,g=b.createRadialGradient(X,Y,0,X,Y,R);g.addColorStop(0,`rgba(220,230,220,${.02+rr()*.05})`);g.addColorStop(1,'rgba(220,230,220,0)');b.fillStyle=g;b.fillRect(X-R,Y-R,R*2,R*2);}
for(let i=0;i<14;i++){b.strokeStyle=`rgba(220,230,220,${.03+rr()*.04})`;b.lineWidth=20+rr()*40;b.beginPath();const y=rr()*S;b.moveTo(-20,y);b.bezierCurveTo(S*.3,y+(rr()-.5)*80,S*.7,y+(rr()-.5)*80,S+20,y+(rr()-.5)*60);b.stroke();}
const LINES=v==='imo'?['IMO · Problem 6','Let n ≥ 2 and a₁ < a₂ < … < aₙ be','positive integers with  ∑ 1/aᵢ = 1 …','Proof (model, plain language)','∎  7 / 7 points']:v==='unit'?['Unit distances (Erdős, 1946)','u(n) ≤ n^{1+o(1)} ?','model: explicit construction','more unit distances than believed','✗  conjecture false']:v==='prize'?['∂u/∂t + (u·∇)u = −∇p + νΔu','∇·u = 0','‖u(·,t)‖ → ∞  as  t → T*','blow-up in finite time','$1,000,000']:v==='unexp'?['Lemma 4117 of 9320','⊢ ∀ G,  χ(G) ≤ Φ(G) + 7','by machine search, depth 81','... but why does it work?','✓ verified']:['Conjecture (1948)','∀ n ≥ 2  ∃ x, y, z ∈ ℕ :','4/n = 1/x + 1/y + 1/z','Proof.  (found by machine)','∎'];
const fs=S*.068;let tip={x:S/2,y:S/2},ghost=false;
return t=>{if(!ghost){b.font=`${S*.05}px Caveat, cursive`;b.fillStyle='rgba(230,235,225,.07)';['∫ f dμ','e^{iπ}+1=0','lim sup','∑ aₙ','p ≡ 1 (mod 4)','σ(n) > 2n','Γ(s)','∇²φ = 0'].forEach((s,i)=>b.fillText(s,rr()*S*.75,S*.08+i*S*.12));ghost=true;}
 x.drawImage(bgc,0,0);x.font=`600 ${fs}px Caveat, cursive`;const p=(t*.32+1.6)%(LINES.length+2.5);
 LINES.forEach((Ln,i)=>{const fr=Math.max(0,Math.min(1,p-i));if(fr<=0)return;const w=x.measureText(Ln).width,X=S*.08+(i===LINES.length-1&&v!=='unexp'?S*.3:0),Y=S*.2+i*fs*1.45;
  x.save();x.beginPath();x.rect(X-10,Y-fs,w*fr+12,fs*1.6);x.clip();x.fillStyle='rgba(245,245,235,.25)';x.fillText(Ln,X+1.2,Y+.8);x.fillStyle='rgba(245,245,235,.88)';x.fillText(Ln,X,Y);x.restore();
  if(fr<1){tip.x=X+w*fr;tip.y=Y-fs*.3;}});
 const hx=tip.x+S*.13,hy=tip.y+S*.2,hg=x.createRadialGradient(hx,hy,0,hx,hy,S*.28);hg.addColorStop(0,'rgba(0,0,0,.5)');hg.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=hg;x.fillRect(0,0,S,S);
 const cg=x.createRadialGradient(tip.x,tip.y,0,tip.x,tip.y,S*.035);cg.addColorStop(0,'rgba(255,255,240,.9)');cg.addColorStop(1,'rgba(255,255,240,0)');x.fillStyle=cg;x.fillRect(tip.x-S*.04,tip.y-S*.04,S*.08,S*.08);
 const wl=x.createLinearGradient(0,0,S,S);wl.addColorStop(0,'rgba(255,220,170,.14)');wl.addColorStop(.5,'rgba(255,220,170,0)');x.fillStyle=wl;x.fillRect(0,0,S,S);};}),
// ---- a proof assistant / a genome being patched
code:v=>mk2D((x,S)=>{const rr=mulberry(9);let Ls=[];
if(v==='py'||v==='evolve'){Ls=v==='py'?['import numpy as np','','def moving_average(xs, k):','    """Return the k-point moving average."""','    out = []','    for i in range(len(xs) - k + 1):','        out.append(sum(xs[i:i + k]) / k)','    return out','','def is_palindrome(s):','    s = "".join(c.lower() for c in s if c.isalnum())','    return s == s[::-1]','','# Copilot: suggestion accepted']:['# AlphaEvolve candidate #18,402','def mul4x4(A, B):','    # complex 4x4 product, rank-48 scheme','    m = [0] * 48','    m[0] = (A[0][0] + A[1][1]) * (B[0][0] + B[1][1])','    m[1] = (A[2][0] + A[3][1]) * B[0][0]','    m[2] = A[0][1] * (B[1][2] - B[3][3])','    # ... 45 more products ...','    C = combine(m)','    return C','','# multiplications: 48  (previous best: 49)','# verified on 10,000 random inputs'];for(let r=0;r<3;r++)Ls=Ls.concat(Ls);}
else if(v==='dna'){for(let i=0;i<60;i++){let s='';for(let k=0;k<26;k++)s+='ACGT'[Math.floor(rr()*4)];Ls.push((i===22?'- ':i===23?'+ ':'  ')+s);}Ls[21]='  // KRAS exon 2, codon 12';}
else{Ls=['theorem erdos_straus (n : ℕ) (hn : 2 ≤ n) :','    ∃ x y z : ℕ, (4 : ℚ) / n = 1/x + 1/y + 1/z := by','  obtain ⟨k, r, hr, rfl⟩ := Nat.exists_mod 840 n','  interval_cases r'];
 for(let i=0;i<70;i++)Ls.push(v==='dense'?`  have h${i} : ∀ x ∈ S${i%9}, f x ≤ g (x + ${i}) * φ x ^ ${2+i%5} := by nlinarith [sq_nonneg (x - ${i}), h${Math.max(0,i-3)}]`:['  · exact ⟨n, n+1, n*(n+1), by field_simp; ring⟩','  · refine aux_lemma_'+(1000+i*37)+' hn ?_','    simp only [Nat.cast_add, div_add_div]','    norm_num','  · omega','    positivity'][i%6]);
 Ls.push('-- No goals ✓');}
const KW=/^(theorem|have|by|exact|refine|obtain|simp|only|norm_num|omega|positivity|nlinarith|interval_cases|ring|field_simp|rfl|:=|def|return|for|in|if|import|as|range)$/;
const fs=S*.034,lh=fs*1.55;
return t=>{x.fillStyle='#0d1117';x.fillRect(0,0,S,S);x.font=`500 ${fs}px "JetBrains Mono", monospace`;x.textBaseline='alphabetic';
 const off=(t*(v==='dense'?3.2:1.1))%Ls.length,first=Math.floor(off),fr=off-first;
 for(let i=0;i<Math.ceil(S/lh)+1;i++){const idx=(first+i)%Ls.length,s=Ls[idx],y=S*.08+(i-fr)*lh;
  x.fillStyle='#3b4452';x.fillText(String(idx+1).padStart(3,' '),S*.02,y);
  if(v==='dna'){if(s[0]==='-'||s[0]==='+'){x.fillStyle=s[0]==='-'?'rgba(255,80,80,.18)':'rgba(80,255,140,.18)';x.fillRect(S*.1,y-fs,S,lh);}
   x.fillStyle=s[0]==='-'?'#ff8a8a':s[0]==='+'?'#8affb0':s.includes('//')?'#6a7686':'#c9d1d9';x.fillText(s,S*.1,y);continue;}
  let X=S*.1;s.split(/(\s+)/).forEach(tok=>{x.fillStyle=KW.test(tok)?'#ff7b72':/^[0-9]+$/.test(tok)?'#79c0ff':(tok==='--'||tok==='✓'||tok==='goals'||tok==='No')?'#7ee787':/[∀∃ℕℚ⟨⟩φ]/.test(tok)?'#d2a8ff':'#c9d1d9';x.fillText(tok,X,y);X+=x.measureText(tok).width;});
  if(idx%6===4&&v!=='dense'&&v!=='py'&&v!=='evolve'){x.fillStyle='#3fb950';x.fillText('✓',S*.93,y);}}
 x.fillStyle='rgba(56,139,253,.08)';x.fillRect(0,S*.55,S,lh);
 x.fillStyle='#161b22';x.fillRect(0,S-lh*1.5,S,lh*1.5);x.fillStyle=v==='dna'?'#8affb0':'#3fb950';
 x.fillText(v==='py'?'Copilot · suggestion accepted ✓':v==='evolve'?'AlphaEvolve · 48 multiplications ✓':v==='dna'?'patch applied · 1 codon changed':v==='dense'?'checking… 41,882 goals · all closed ✓':'Lean 4 · goals accomplished ✓',S*.03,S-lh*.5);};}),
// ---- a paper with an AI on the author line / a storm of papers
paper:v=>mk2D((x,S)=>{const PW=Math.floor(S*.62),PH=Math.floor(PW*1.3);const T=['A counterexample to the unit distance conjecture','Machine-discovered antibiotics of a new class','Ambient-pressure superconductivity at 151 K','Finite-time blow-up for 3D Navier–Stokes','A joint anomaly in collider and cosmology data','A verified proof with no human-readable insight','Closed-loop discovery of plastic-degrading enzymes'];
const AU='M. Ortega, J. Lindqvist, K. Hayashi, and an AI system';
function mkPage(title,seed){const r=mulberry(seed),c=document.createElement('canvas');c.width=PW;c.height=PH;const p=c.getContext('2d');
 p.fillStyle='#f4f0e7';p.fillRect(0,0,PW,PH);p.fillStyle='#161616';p.textAlign='center';p.font=`700 ${PW*.048}px Georgia, serif`;
 const w=title.split(' '),h=Math.ceil(w.length/2);p.fillText(w.slice(0,h).join(' '),PW/2,PH*.1);p.fillText(w.slice(h).join(' '),PW/2,PH*.1+PW*.064);
 p.font=`${PW*.03}px Georgia, serif`;p.fillStyle='#333';p.fillText(AU,PW/2,PH*.215);p.font=`700 ${PW*.03}px Georgia, serif`;p.fillText('Abstract',PW/2,PH*.27);
 p.fillStyle='#a09b91';for(let i=0;i<7;i++){const ww=PW*.74*(i===6?.5:.9+r()*.1);p.fillRect(PW*.13,PH*.29+i*PH*.022,ww,PH*.008);}
 for(let col=0;col<2;col++)for(let i=0;i<22;i++){if(col===1&&i>3&&i<12)continue;p.fillRect(PW*.08+col*PW*.45,PH*.47+i*PH*.021,PW*.38*(i%7===6?.6:.9+r()*.1),PH*.007);}
 const fx=PW*.53,fy=PH*.535,fw=PW*.38,fh=PH*.16;p.strokeStyle='#444';p.lineWidth=1;p.strokeRect(fx,fy,fw,fh);p.fillStyle='#2a5bd7';
 for(let i=0;i<40;i++){const u=r();p.fillRect(fx+u*fw,fy+fh*(.9-.7*u*u)+(r()-.5)*fh*.15,2,2);}p.strokeStyle='#d7372a';p.beginPath();for(let i=0;i<=30;i++){const u=i/30;if(i)p.lineTo(fx+u*fw,fy+fh*(.9-.7*u*u));else p.moveTo(fx,fy+fh*.9);}p.stroke();return c;}
const pages=v==='storm'?T.map((tt,i)=>mkPage(tt,i+5)):[mkPage(T[0],2)];
const mx=document.createElement('canvas').getContext('2d');mx.font=`${PW*.03}px Georgia, serif`;const fw=mx.measureText(AU).width,sw=mx.measureText('an AI system').width;
function desk(){const g=x.createRadialGradient(S*.45,S*.35,S*.05,S/2,S/2,S*.8);g.addColorStop(0,'#3a2a1c');g.addColorStop(1,'#0c0806');x.fillStyle=g;x.fillRect(0,0,S,S);}
return t=>{desk();
 if(v!=='storm'){x.save();x.translate(S/2,S/2+Math.sin(t*.3)*4);x.rotate(-.05+Math.sin(t*.2)*.01);x.shadowColor='rgba(0,0,0,.6)';x.shadowBlur=S*.05;x.shadowOffsetY=S*.02;x.drawImage(pages[0],-PW/2,-PH/2);x.shadowColor='transparent';
  const hl=Math.min(1,(t%7)/2.2);x.fillStyle='rgba(255,226,0,.42)';x.fillRect(-PW/2+PW/2+fw/2-sw-2,-PH/2+PH*.215-PW*.026,(sw+4)*hl,PW*.036);x.restore();}
 else{const order=pages.map((pg,k)=>({pg,k,ph:(t*.11+k/pages.length)%1})).sort((a,b)=>a.ph-b.ph);
  order.forEach(o=>{const sc=.18+o.ph*1.25;x.save();x.globalAlpha=Math.sin(o.ph*Math.PI);x.translate(S/2+Math.cos(o.k*2.4+t*.25)*S*.38*o.ph,S/2+Math.sin(o.k*1.7+t*.2)*S*.3*o.ph);x.rotate((o.k-3)*.35+t*.15*(o.k%2?1:-1));x.scale(sc,sc);
   x.shadowColor='rgba(0,0,0,.5)';x.shadowBlur=20;x.drawImage(o.pg,-PW/2,-PH/2);x.restore();});}
 const lamp=x.createRadialGradient(S*.3,S*.2,0,S*.3,S*.2,S*.6);lamp.addColorStop(0,'rgba(255,210,150,.16)');lamp.addColorStop(1,'rgba(255,210,150,0)');x.fillStyle=lamp;x.fillRect(0,0,S,S);};})
};

// ---- helpers for the new visions
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function textSprite(str,px,col,scale){const c=document.createElement('canvas'),p=c.getContext('2d');p.font=`600 ${px}px Manrope, system-ui, sans-serif`;
const w=Math.ceil(p.measureText(str).width+px*.8),h=Math.ceil(px*1.6);c.width=w;c.height=h;p.font=`600 ${px}px Manrope, system-ui, sans-serif`;p.textBaseline='middle';
p.shadowColor='rgba(0,0,0,.9)';p.shadowBlur=px*.3;p.fillStyle=col||'#fff';p.fillText(str,px*.4,h/2);
const t=new THREE.CanvasTexture(c);t.minFilter=THREE.LinearFilter;t.generateMipmaps=false;
const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false}));s.scale.set(scale*w/h,scale,1);return s;}
function wrapText(x,str,maxW){const out=[];str.split('\n').forEach(par=>{let line='';par.split(' ').forEach(w=>{const tt=line?line+' '+w:w;if(x.measureText(tt).width>maxW&&line){out.push(line);line=w;}else line=tt;});out.push(line);});return out;}
function hashStr(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}

const NEW={
// ---- AlexNet-style convolutional network
convnet:()=>mk3D('#05060a',(sc,cam)=>{lights(sc,'#ffffff','#5fb6ff',1.1);sc.fog=new THREE.FogExp2(0x05060a,.045);
const g=new THREE.Group();sc.add(g);
const ic=document.createElement('canvas');ic.width=ic.height=128;const ip=ic.getContext('2d');const gg=ip.createLinearGradient(0,0,0,128);gg.addColorStop(0,'#8fb7d9');gg.addColorStop(.6,'#cbb68c');gg.addColorStop(1,'#5f5234');ip.fillStyle=gg;ip.fillRect(0,0,128,128);
ip.fillStyle='#c98a3c';ip.beginPath();ip.ellipse(64,80,36,26,0,0,TAU);ip.fill();ip.beginPath();ip.ellipse(60,46,20,17,0,0,TAU);ip.fill();ip.fillStyle='#3a2a1a';const r0=mulberry(4);for(let i=0;i<55;i++){ip.beginPath();ip.arc(36+r0()*56,36+r0()*66,1.5+r0()*2.5,0,TAU);ip.fill();}
const inp=new THREE.Mesh(new THREE.PlaneGeometry(2.6,2.6),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(ic),side:THREE.DoubleSide}));inp.position.x=-6;inp.rotation.y=Math.PI/2.4;g.add(inp);
function featTex(seed){const c=document.createElement('canvas');c.width=c.height=64;const p=c.getContext('2d'),r=mulberry(seed);for(let i=0;i<16;i++)for(let j=0;j<16;j++){const v=Math.pow(r(),2.2);p.fillStyle=`rgba(${80+v*175|0},${150+v*105|0},255,${.2+v*.8})`;p.fillRect(i*4,j*4,4,4);}const t=new THREE.CanvasTexture(c);t.magFilter=THREE.NearestFilter;return t;}
const L=[[.12,2.4],[.45,1.9],[.7,1.4],[.9,1.05],[.9,1.05],[.7,.85],[.18,1.9],[.18,1.9]];let x=-4.4;const mats=[];
L.forEach((l,i)=>{const geo=new THREE.BoxGeometry(l[0],l[1],i>5?.18:l[1]);const m=new THREE.MeshBasicMaterial({map:featTex(i+1),transparent:true,opacity:.55,depthWrite:false});mats.push(m);
 const b=new THREE.Mesh(geo,m);b.position.x=x;g.add(b);const e=new THREE.LineSegments(new THREE.EdgesGeometry(geo),new THREE.LineBasicMaterial({color:0x9fd8ff,transparent:true,opacity:.7}));e.position.x=x;g.add(e);x+=l[0]/2+.9+(L[i+1]?L[i+1][0]/2:0);});
const out=['leopard .91','jaguar .05','cheetah .02','snow leopard .01','Egyptian cat .01'];
out.forEach((s,i)=>{const bar=new THREE.Mesh(new THREE.BoxGeometry(.12,.12,.12+parseFloat('0'+s.slice(s.indexOf('.')))*2.2),phys(i?'#5fb6ff':'#ffd36e',{roughness:.3}));bar.position.set(x+.4+(i?0:0),.9-i*.42,0);bar.rotation.y=Math.PI/2;g.add(bar);
 const lb=textSprite(s,40,i?'#cfe3ff':'#ffe08a',.26);lb.position.set(x+1.9,.9-i*.42,0);g.add(lb);});
const lines=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xffd36e,transparent:true,opacity:.8}));g.add(lines);
g.position.x=-1;
return t=>{const a=(t*1.1)%L.length;mats.forEach((m,i)=>m.opacity=.35+.6*Math.max(0,1-Math.abs(a-i)));
 const k=Math.floor(a),xs=g.children.filter(o=>o.type==='Mesh'&&o.geometry.type==='BoxGeometry');const A=xs[k],B=xs[k+1];
 if(A&&B){const py=Math.sin(t*2)*.3,pz=Math.cos(t*1.7)*.3,s=.15;const P=[];[[-1,-1],[1,-1],[1,1],[-1,1]].forEach(c=>{P.push(A.position.x,py+c[0]*s,pz+c[1]*s,B.position.x,py*.6,pz*.6);});lines.geometry.setAttribute('position',new THREE.Float32BufferAttribute(P,3));}
 cam.position.set(Math.sin(t*.08)*2.5+1,2.6,8.2);cam.lookAt(0,0,0);};},.6),
// ---- word embeddings: meaning as geometry
embed:v=>mk3D('#04050a',(sc,cam)=>{const rr=mulberry(17);
const WS=v==='bert'?[['bank',-1.6,1,0,'#ffd36e'],['money',-2.2,1.6,.5,'#ffd36e'],['river',1.6,-1,0,'#7dff9a'],['shore',2.2,-1.5,.6,'#7dff9a'],['[MASK]',0,0,1.6,'#ff5fa2'],['reads',-.5,-2,-1,'#c9a4ff'],['both',.6,-2.4,-1.2,'#c9a4ff'],['ways',1.2,-2,-.8,'#c9a4ff']]
:v==='llama'?[['def',-2,1.2,0,'#ff7b72'],['return',-2.4,.4,.6,'#ff7b72'],['llama',1.6,1.4,0,'#ffd36e'],['alpaca',2.2,.9,.5,'#ffd36e'],['vicuna',1.4,2,.8,'#ffd36e'],['weights',0,-1.6,1,'#46e0ff'],['laptop',-1,-2,-.5,'#7dff9a'],['open',.8,-2.2,-.6,'#7dff9a']]
:[['king',1.4,1.6,0,'#ffd36e'],['queen',1.9,-.3,1,'#ffd36e'],['man',-1.6,1.6,0,'#46e0ff'],['woman',-1.1,-.3,1,'#46e0ff'],['Paris',-.2,-2,-1.6,'#7dff9a'],['France',-1.6,-2.4,-1.2,'#7dff9a'],['Tokyo',1.6,-1.8,-1.8,'#7dff9a'],['Japan',.4,-2.3,-1.4,'#7dff9a']];
const P=[],Cc=[];WS.forEach(w=>{const c=new THREE.Color(w[4]);for(let i=0;i<120;i++){const s=.25+rr()*.35;P.push(w[1]+(rr()-.5)*s*2,w[2]+(rr()-.5)*s*2,w[3]+(rr()-.5)*s*2);Cc.push(c.r,c.g,c.b);}});
for(let i=0;i<900;i++){P.push((rr()-.5)*9,(rr()-.5)*7,(rr()-.5)*6);Cc.push(.35,.4,.55);}
const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.Float32BufferAttribute(P,3));pg.setAttribute('color',new THREE.Float32BufferAttribute(Cc,3));
const g=new THREE.Group();sc.add(g);g.add(new THREE.Points(pg,new THREE.PointsMaterial({map:glow,size:.16,vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending})));
WS.forEach(w=>{const s=textSprite(w[0],44,w[4],.38);s.position.set(w[1],w[2]+.42,w[3]);g.add(s);});
const arrow=(a,b,c)=>{const A=new THREE.Vector3(a[1],a[2],a[3]),B=new THREE.Vector3(b[1],b[2],b[3]);const d=B.clone().sub(A);g.add(new THREE.ArrowHelper(d.clone().normalize(),A,d.length(),c,.25,.14));};
if(v==='bert'){arrow(WS[4],WS[0],0xff5fa2);arrow(WS[4],WS[2],0xff5fa2);}else if(v==='llama'){arrow(WS[5],WS[6],0x46e0ff);arrow(WS[5],WS[7],0x46e0ff);}else{arrow(WS[0],WS[1],0xffffff);arrow(WS[2],WS[3],0xffffff);arrow(WS[5],WS[4],0x7dff9a);arrow(WS[7],WS[6],0x7dff9a);}
return t=>{g.rotation.y=Math.sin(t*.15)*.6;g.rotation.x=Math.sin(t*.1)*.15;cam.position.set(0,.5,9);cam.lookAt(0,-.2,0);};}),
// ---- GAN training grid: faces condensing out of noise
gan:()=>mkShader(`uniform float t;varying vec2 vUv;${NOISE}${PAL}
vec3 face(vec2 p,float s){vec2 c=p-vec2(.5,.46);float hw=.25+.05*h1(vec2(s,1.)),hh=.32+.04*h1(vec2(s,2.));
float head=1.-smoothstep(.92,1.04,length(c/vec2(hw,hh)));
vec3 skin=mix(vec3(.95,.78,.64),vec3(.42,.28,.2),h1(vec2(s,3.)));
vec3 bg=pal(h1(vec2(s,4.)))*.45+.3;
vec3 col=mix(bg,skin*(.85+.4*(.2-c.y)-.3*abs(c.x)),head);
float hair=smoothstep(hh*.25,hh*.5,c.y+(n2(p*18.+s)-.5)*.08)*(1.-smoothstep(.95,1.25,length(c/vec2(hw*1.15,hh*1.12))));
col=mix(col,mix(vec3(.07,.05,.03),vec3(.65,.45,.22),h1(vec2(s,5.)))*(.8+.3*n2(p*40.)),hair);
vec2 e=vec2(abs(c.x)-hw*.4,c.y-hh*.05);float eye=1.-smoothstep(.018,.032,length(e*vec2(1.,1.7)));col=mix(col,vec3(.08,.06,.06),eye*head);
float m=(1.-smoothstep(.006,.016,abs(c.y+hh*.45+c.x*c.x*1.2)))*step(abs(c.x),hw*.33);col=mix(col,vec3(.55,.22,.22),m*head);
return col;}
void main(){vec2 g=vUv*4.;vec2 id=floor(g),p=fract(g);float s=id.x+id.y*4.+floor(t/7.)*16.;
float ep=fract(t/7.);float nz=clamp(1.-ep*1.5+(id.x+id.y)*.04,0.,1.);
vec3 f=face(p+(vec2(n2(p*7.+s),n2(p*7.-s))-.5)*.3*nz,s);
vec2 q=floor(p*28.);vec3 rn=vec3(h1(q+s+floor(t*6.)),h1(q+s+1.3+floor(t*6.)),h1(q+s+2.7+floor(t*6.)));
vec3 col=mix(f,rn,nz*nz);float gap=step(.025,p.x)*step(.025,p.y)*step(p.x,.975)*step(p.y,.975);
gl_FragColor=vec4(col*gap+vec3(.03)*(1.-gap),1.);}`),
// ---- attention: heatmap (2014) or Transformer heads (2017)
attention:v=>mk2D((x,S)=>{
if(v==='rnn'){const src=['the','cat','sat','on','the','mat','.'],tgt=['le','chat','s’est','assis','sur','le','tapis','.'];const al=[0,1,2,2,3,4,5,6];
 return t=>{x.fillStyle='#0b0d12';x.fillRect(0,0,S,S);const gx=S*.28,gy=S*.24,cw=(S*.66)/src.length,ch=(S*.66)/tgt.length,row=Math.floor(t*1.2)%tgt.length;
  x.font=`600 ${S*.034}px Manrope, sans-serif`;x.fillStyle='#cfd6e6';x.textAlign='left';
  src.forEach((w,j)=>{x.save();x.translate(gx+j*cw+cw*.6,gy-8);x.rotate(-1.1);x.fillText(w,0,0);x.restore();});
  tgt.forEach((w,i)=>{x.textAlign='right';x.fillStyle=i===row?'#ffd36e':'#cfd6e6';x.fillText(w,gx-10,gy+i*ch+ch*.62);});
  for(let i=0;i<tgt.length;i++)for(let j=0;j<src.length;j++){let wv=Math.exp(-Math.pow(j-al[i],2)*1.4);if(i===2)wv=Math.max(wv,j===1?.35:0);const b=Math.min(1,wv*(i===row?1.15:.9));
   x.fillStyle=`rgb(${b*255|0},${b*235|0},${b*190+20|0})`;x.fillRect(gx+j*cw+1,gy+i*ch+1,cw-2,ch-2);}
  x.strokeStyle='#ffd36e';x.lineWidth=2;x.strokeRect(gx,gy+row*ch,cw*src.length,ch);
  x.textAlign='left';x.fillStyle='#7f8aa3';x.font=`500 ${S*.03}px "JetBrains Mono", monospace`;x.fillText('alignment weights α(i, j)',S*.05,S*.95);};}
const toks=['The','animal','didn’t','cross','the','street','because','it','was','too','tired'];const heads=['#46e0ff','#ff5fa2','#ffd36e','#7dff9a'];
return t=>{x.fillStyle='#0b0d12';x.fillRect(0,0,S,S);const n=toks.length,y1=S*.22,y2=S*.72,dx=S*.86/(n-1),x0=S*.07;
 const sel=Math.floor(t*.5)%3===0?7:Math.floor(t*1.3)%n;
 heads.forEach((hc,h)=>{for(let j=0;j<n;j++){let w=Math.exp(-Math.abs(j-sel)*(.5+h*.3))*.6;if(sel===7&&j===1)w=h<2?1:.5;if(h===3&&j===sel)w=.9;
  x.strokeStyle=hc;x.globalAlpha=Math.min(1,w)*(.6+.4*Math.sin(t*3+h));x.lineWidth=1+w*7;x.beginPath();x.moveTo(x0+sel*dx,y1+12);x.bezierCurveTo(x0+sel*dx,(y1+y2)/2,x0+j*dx,(y1+y2)/2,x0+j*dx,y2-22);x.stroke();}});
 x.globalAlpha=1;x.font=`700 ${S*.03}px Manrope, sans-serif`;x.textAlign='center';
 toks.forEach((w,i)=>{x.save();x.translate(x0+i*dx,y1);x.rotate(-.6);x.fillStyle=i===sel?'#fff':'#9aa6bd';x.fillText(w,0,0);x.restore();x.save();x.translate(x0+i*dx,y2);x.rotate(-.6);x.fillStyle=(sel===7&&i===1)?'#ffd36e':'#9aa6bd';x.fillText(w,0,0);x.restore();});
 x.font=`500 ${S*.04}px "JetBrains Mono", monospace`;x.fillStyle='#e6edf7';x.textAlign='center';x.fillText('softmax(QKᵀ/√d) V',S/2,S*.9);
 x.font=`500 ${S*.028}px "JetBrains Mono", monospace`;x.fillStyle='#6f7b93';x.fillText('4 heads shown · layer 5',S/2,S*.96);};}),
// ---- Go board, move 37
go:()=>mk3D('#0a0704',(sc,cam)=>{sc.add(new THREE.HemisphereLight(0xffe0b0,0x120a05,.35));const sp=new THREE.SpotLight(0xfff0d8,3.2,30,.6,.5);sp.position.set(2,8,3);sc.add(sp);
const wc=document.createElement('canvas');wc.width=wc.height=512;const w=wc.getContext('2d');w.fillStyle='#d6a75c';w.fillRect(0,0,512,512);const rr=mulberry(23);
for(let i=0;i<160;i++){w.strokeStyle=`rgba(120,70,25,${.05+rr()*.12})`;w.lineWidth=.5+rr()*2;w.beginPath();const y=rr()*512;w.moveTo(0,y);for(let k=0;k<=8;k++)w.lineTo(k*64,y+Math.sin(k*.9+i)*6+(rr()-.5)*4);w.stroke();}
w.strokeStyle='rgba(20,12,5,.85)';w.lineWidth=1.6;const m0=24,st=(512-2*m0)/18;for(let i=0;i<19;i++){w.beginPath();w.moveTo(m0,m0+i*st);w.lineTo(512-m0,m0+i*st);w.stroke();w.beginPath();w.moveTo(m0+i*st,m0);w.lineTo(m0+i*st,512-m0);w.stroke();}
w.fillStyle='#140c05';[3,9,15].forEach(a=>[3,9,15].forEach(b=>{w.beginPath();w.arc(m0+a*st,m0+b*st,4,0,TAU);w.fill();}));
const side=phys('#b8843f',{roughness:.5});const top=phys('#ffffff',{map:new THREE.CanvasTexture(wc),roughness:.55,clearcoat:.4});
const board=new THREE.Mesh(new THREE.BoxGeometry(4.4,.35,4.4),[side,side,top,side,side,side]);board.position.y=-.18;sc.add(board);
const sg=new THREE.SphereGeometry(.105,28,14);const bm=phys('#111214',{roughness:.12,clearcoat:1}),wm=phys('#f1eee6',{roughness:.22,clearcoat:1});
const pos=c=>-2.2+.208+(c)*((4.4-2*.208)/18);const used={};
function put(i,j,black){const m=new THREE.Mesh(sg,black?bm:wm);m.scale.y=.45;m.position.set(pos(i),.045,pos(j));sc.add(m);used[i+','+j]=1;return m;}
let ci=4,cj=15;for(let k=0;k<64;k++){ci=Math.max(0,Math.min(18,ci+Math.round((rr()-.5)*3)));cj=Math.max(0,Math.min(18,cj+Math.round((rr()-.5)*3)));if(rr()<.08){ci=Math.floor(rr()*19);cj=Math.floor(rr()*19);}if(!used[ci+','+cj]&&!(ci===13&&cj===4))put(ci,cj,k%2===0);}
const m37=put(13,4,true);const gl=new THREE.Sprite(new THREE.SpriteMaterial({map:glow,color:0xffd36e,blending:THREE.AdditiveBlending,transparent:true,depthWrite:false}));gl.position.copy(m37.position);sc.add(gl);
return t=>{const k=(t%9)/9;m37.position.y=.045+Math.max(0,1-k*4)*1.2;gl.scale.setScalar(k<.25?0:.6+Math.sin(t*3)*.15);gl.material.opacity=k<.25?0:.8;
 cam.position.set(Math.sin(t*.07)*1.5+1.2,2.3,3.6);cam.lookAt(pos(12),0,pos(6));};},.5),
// ---- a language model typing
typing:v=>mk2D((x,S)=>{const T={gpt1:['model: gpt-1 · 117M params','She opened the old notebook and',' found her grandmother’s handwriting, small and careful, describing a summer by the sea that nobody in the family had ever mentioned.'],
gpt2:['model: gpt-2 · 1.5B params · staged release','The last lighthouse keeper on Earth wrote in his diary:',' Day 41. The ships no longer need me. They steer by satellites now, and by quiet voices in their machines. Still, every night I light the lamp, in case something out there remembers.'],
gpt3:['model: gpt-3 · 175B params · few-shot','English: cheese → French: fromage\nEnglish: sea otter → French: loutre de mer\nEnglish: whirlpool → French:',' tourbillon']}[v]||[];
return t=>{x.fillStyle='#0a0c0f';x.fillRect(0,0,S,S);const fs=S*.042;x.font=`500 ${S*.028}px "JetBrains Mono", monospace`;x.fillStyle='#55627a';x.fillText(T[0],S*.06,S*.08);
 x.font=`600 ${fs}px "JetBrains Mono", monospace`;const maxW=S*.88;const pl=wrapText(x,T[1],maxW);let y=S*.18;x.fillStyle='#e8edf5';pl.forEach(l=>{x.fillText(l,S*.06,y);y+=fs*1.45;});
 const cyc=T[2].length/16+4;const n=Math.floor(Math.min(T[2].length,((t%cyc))*16));x.fillStyle='#57e0c6';
 const gl=wrapText(x,T[1].split('\n').pop()+T[2].slice(0,n),maxW);y-=fs*1.45;
 gl.forEach((l,i)=>{if(i===0){const pre=T[1].split('\n').pop();x.fillStyle='#e8edf5';x.fillText(pre,S*.06,y);x.fillStyle='#57e0c6';x.fillText(l.slice(pre.length),S*.06+x.measureText(pre).width,y);}else x.fillText(l,S*.06,y);if(i<gl.length-1)y+=fs*1.45;});
 const last=gl[gl.length-1];const cx=S*.06+x.measureText(last).width+4;if(Math.floor(t*2.5)%2===0){x.fillStyle='#57e0c6';x.fillRect(cx,y-fs*.8,fs*.55,fs*.95);}};}),
// ---- protein ribbon(s)
protein:v=>mk3D('#05040a',(sc,cam)=>{lights(sc,'#ffffff','#ff8ad8',1.4);sc.fog=new THREE.FogExp2(0x05040a,.05);const g=new THREE.Group();sc.add(g);
function chain(seed,len){const r=mulberry(seed);const pts=[];const p=new THREE.Vector3();let d=new THREE.Vector3(1,0,0);
 while(pts.length<len){const hx=r()<.55,n=hx?26:8+Math.floor(r()*10);const ax=d.clone().normalize();const pp=new THREE.Vector3(r()-.5,r()-.5,r()-.5).cross(ax).normalize(),p2=ax.clone().cross(pp);
  for(let i=0;i<n;i++){if(hx){const a=i*.62;pts.push(p.clone().addScaledVector(pp,Math.cos(a)*.42).addScaledVector(p2,Math.sin(a)*.42));p.addScaledVector(ax,.16);}
   else{d.add(new THREE.Vector3(r()-.5,r()-.5,r()-.5).multiplyScalar(.8)).normalize();p.addScaledVector(d,.36);pts.push(p.clone());}}
  d=new THREE.Vector3(r()-.5,r()-.5,r()-.5).normalize().addScaledVector(p.clone().normalize(),-.9).normalize();}
 return pts;}
function prot(seed,len,sc0){const pts=chain(seed,len),c=new THREE.Vector3();pts.forEach(q=>c.add(q));c.multiplyScalar(1/pts.length);pts.forEach(q=>q.sub(c));
 const seg=pts.length*3,geo=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),seg,.12,8,false);const cols=[],pc=geo.attributes.position.count;
 for(let i=0;i<pc;i++){const u=Math.floor(i/9)/seg,col=new THREE.Color().setHSL(.66-.66*u,.75,.55);cols.push(col.r,col.g,col.b);}geo.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));
 const m=new THREE.Mesh(geo,phys('#ffffff',{vertexColors:true,roughness:.3,clearcoat:.7}));m.scale.setScalar(sc0);return m;}
const ps=[];if(v==='db'){const r=mulberry(8);for(let i=0;i<8;i++){const m=prot(30+i,70,.42);m.position.set((r()-.5)*7,(r()-.5)*4.5,(r()-.5)*3);g.add(m);ps.push(m);}}else{const m=prot(5,230,.72);g.add(m);ps.push(m);}
return t=>{g.rotation.y=t*.18;ps.forEach((m,i)=>{if(ps.length>1){m.rotation.x=t*.2+i;m.rotation.y=t*.15+i;}});cam.position.set(0,.6,v==='db'?10:9);cam.lookAt(0,0,0);};},.7),
// ---- diffusion: an image condensing out of noise
diffusion:v=>mkShader(`uniform float t;varying vec2 vUv;${NOISE}
const float V=${v==='dalle'?1:v==='video'?2:0}.;
vec3 top(vec2 u){vec3 sky=V==1.?mix(vec3(.98,.7,.8),vec3(.3,.6,.75),u.y*1.3):mix(vec3(1.,.62,.36),vec3(.22,.28,.58),u.y*1.25);
float sun=1.-smoothstep(.065,.075,length(u-vec2(.63,.58)));sky=mix(sky,vec3(1.,.93,.75),sun);sky+=vec3(1.,.7,.4)*.25*exp(-length(u-vec2(.63,.58))*5.);
float m1=.44+.13*fbm(vec2(u.x*3.,1.)),m2=.34+.08*fbm(vec2(u.x*6.+7.,2.));vec3 c=sky;
if(u.y<m1)c=mix(vec3(.42,.3,.45),vec3(.24,.17,.32),clamp((m1-u.y)*4.,0.,1.));if(u.y<m2)c=vec3(.11,.09,.17)+.05*fbm(u*40.);return c;}
vec3 scene(vec2 u){if(V==2.)u.x+=t*.03;if(u.y>.27)return top(u);vec2 r=vec2(u.x+sin(u.y*90.+t*2.)*.004,.54-u.y);return mix(vec3(.05,.06,.12),top(r),.55)*(.8+.2*u.y/.27);}
void main(){float k=fract(t/7.);float lv=1.-smoothstep(0.,.78,k);vec2 u=vUv;
vec3 s=scene(u);vec3 b=(scene(u+vec2(.01,0))+scene(u-vec2(.01,0))+scene(u+vec2(0,.01))+scene(u-vec2(0,.01)))*.25;s=mix(s,b,lv);
vec2 q=floor(u*180.)+floor(t*10.);vec3 nz=vec3(h1(q),h1(q+3.1),h1(q+7.7));
gl_FragColor=vec4(mix(s,nz,lv*lv*.95),1.);}`),
// ---- a chat window
chat:v=>mk2D((x,S)=>{const C={'':['explain quantum computing like I’m five','Imagine a magic coin that is heads and tails at the same time while it spins. A quantum computer juggles lots of spinning coins at once, so it can explore many answers together, then makes them land on the right one.'],
gpt4:['[photo] what’s unusual about this picture?','A man is ironing clothes on an ironing board strapped to the roof of a moving taxi. Ironing is usually done indoors, so the setting is the joke.'],
think:['how many primes are there below 60?','There are 17: 2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53 and 59.'],
gpt5:['plan my week, fix this bug, and explain it all to my mum','Done. Your week is on the calendar, the off-by-one bug in line 42 is patched, and here is a version for your mum that uses a recipe as the metaphor.']}[v]||['',''];
return t=>{x.fillStyle='#17181c';x.fillRect(0,0,S,S);x.fillStyle='#202127';x.fillRect(0,0,S,S*.09);x.fillStyle='#9aa0ad';x.font=`600 ${S*.032}px Manrope, sans-serif`;x.textAlign='left';x.fillText(v==='think'?'reasoning model':'chat',S*.05,S*.058);
 const fs=S*.036;x.font=`500 ${fs}px Manrope, sans-serif`;const lh=fs*1.4;
 const ul=wrapText(x,C[0],S*.6);const uw=Math.max(...ul.map(l=>x.measureText(l).width))+S*.06;let y=S*.15;
 x.fillStyle='#2f3240';const bh=ul.length*lh+S*.04;x.beginPath();x.roundRect?x.roundRect(S*.93-uw,y,uw,bh,S*.03):x.rect(S*.93-uw,y,uw,bh);x.fill();x.fillStyle='#eef0f5';ul.forEach((l,i)=>x.fillText(l,S*.93-uw+S*.03,y+S*.02+lh*(i+.75)));y+=bh+S*.05;
 const cyc=C[1].length/22+(v==='think'?9:4);const tt=t%cyc;let shown=tt;
 if(v==='think'){const th=Math.min(tt,5);x.fillStyle='#22242b';x.fillRect(S*.05,y,S*.9,S*.16);x.fillStyle='#7c8394';x.font=`600 ${S*.03}px Manrope, sans-serif`;x.fillText(tt<5?'Thinking… '+Math.floor(th*8)+'s':'Thought for 41s',S*.08,y+S*.05);
  x.font=`500 ${S*.026}px "JetBrains Mono", monospace`;x.fillStyle='#5a6070';for(let i=0;i<3;i++)x.fillText(['check 2..59 for divisors','exclude 1, 49 = 7², 51 = 3·17','count = 17'][i].slice(0,Math.floor(th*14-i*10)),S*.08,y+S*.09+i*S*.025);y+=S*.2;shown=tt-5;x.font=`500 ${fs}px Manrope, sans-serif`;}
 const n=Math.max(0,Math.floor(shown*22));const al=wrapText(x,C[1].slice(0,n),S*.8);x.fillStyle='#e6e8ee';al.forEach((l,i)=>x.fillText(l,S*.07,y+lh*(i+.75)));
 if(n<C[1].length&&n>0&&Math.floor(t*3)%2===0){const l=al[al.length-1]||'';x.fillStyle='#e6e8ee';x.beginPath();x.arc(S*.07+x.measureText(l).width+fs*.5,y+lh*(al.length-.15)-fs*.3,fs*.28,0,TAU);x.fill();}
 x.fillStyle='#22242b';x.fillRect(S*.05,S*.88,S*.9,S*.08);x.fillStyle='#5f6473';x.font=`500 ${S*.03}px Manrope, sans-serif`;x.fillText('Message',S*.09,S*.93);};}),
// ---- a gold medal
medal:()=>mk3D('#0b0507',(sc,cam)=>{sc.add(new THREE.HemisphereLight(0xffe2c0,0x100505,.3));const sp=new THREE.SpotLight(0xfff1d6,4,30,.45,.5);sp.position.set(3,6,6);sc.add(sp);const rl=new THREE.PointLight(0xff9a50,2,15);rl.position.set(-4,-2,3);sc.add(rl);
const bc=document.createElement('canvas');bc.width=bc.height=512;const b=bc.getContext('2d');b.fillStyle='#777';b.fillRect(0,0,512,512);
b.strokeStyle='#ddd';b.lineWidth=12;b.beginPath();b.arc(256,256,238,0,TAU);b.stroke();b.lineWidth=3;b.beginPath();b.arc(256,256,212,0,TAU);b.stroke();
b.fillStyle='#d8d8d8';b.font='700 30px Georgia, serif';b.textAlign='center';b.textBaseline='middle';const txt='NOBEL PRIZE · MMXXIV · PHYSICS · CHEMISTRY · ';
for(let i=0;i<txt.length;i++){const a=-Math.PI/2+i/txt.length*TAU;b.save();b.translate(256+Math.cos(a)*186,256+Math.sin(a)*186);b.rotate(a+Math.PI/2);b.fillText(txt[i],0,0);b.restore();}
const nodes=[];for(let l=0;l<4;l++)for(let k=0;k<[3,4,4,2][l];k++)nodes.push([166+l*60,256+(k-([3,4,4,2][l]-1)/2)*52,l]);b.strokeStyle='#bbb';b.lineWidth=3;
nodes.forEach(a=>nodes.forEach(c=>{if(c[2]===a[2]+1){b.beginPath();b.moveTo(a[0],a[1]);b.lineTo(c[0],c[1]);b.stroke();}}));b.fillStyle='#e8e8e8';nodes.forEach(a=>{b.beginPath();b.arc(a[0],a[1],14,0,TAU);b.fill();});
const bt=new THREE.CanvasTexture(bc);const face=phys('#d9a843',{metalness:1,roughness:.24,clearcoat:.3,bumpMap:bt,bumpScale:.035}),rim=phys('#c79634',{metalness:1,roughness:.3});
const g=new THREE.Group();sc.add(g);const md=new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.5,.14,128),[rim,face,face]);md.rotation.x=Math.PI/2;g.add(md);
const vel=new THREE.Mesh(new THREE.PlaneGeometry(20,20),phys('#3a0a12',{roughness:1,clearcoat:0}));vel.position.z=-1.2;sc.add(vel);
return t=>{g.rotation.y=Math.sin(t*.4)*.6;g.rotation.x=Math.sin(t*.27)*.15;cam.position.set(0,.2,5.2);cam.lookAt(0,0,0);};},.7),
// ---- a market chart falling off a cliff
stock:()=>mk2D((x,S)=>{const r=mulberry(12),P=[];let p=118;for(let i=0;i<150;i++){if(i===104)p*=.83;p+=(r()-.46)*1.6+(i<104?.12:0);P.push(p);}
const mn=Math.min(...P)-4,mx=Math.max(...P)+4;
return t=>{x.fillStyle='#050608';x.fillRect(0,0,S,S);const n=Math.min(150,Math.floor((t*14)%190));const X=i=>S*.08+i/149*S*.84,Y=v=>S*.82-(v-mn)/(mx-mn)*S*.55;
 x.strokeStyle='#1c222b';x.lineWidth=1;for(let i=0;i<6;i++){const yy=S*.27+i*S*.11;x.beginPath();x.moveTo(S*.08,yy);x.lineTo(S*.92,yy);x.stroke();}
 x.font=`700 ${S*.05}px "JetBrains Mono", monospace`;x.fillStyle='#ffb13e';x.textAlign='left';x.fillText('NVDA',S*.08,S*.12);
 const last=P[Math.max(0,n-1)],chg=(last/P[0]-1)*100;x.fillStyle=n>104?'#ff4a4a':'#3fdc7c';x.font=`600 ${S*.036}px "JetBrains Mono", monospace`;x.fillText((chg>=0?'▲ +':'▼ ')+chg.toFixed(2)+'%',S*.3,S*.12);
 x.strokeStyle=n>104?'#ff4a4a':'#3fdc7c';x.lineWidth=2.4;x.beginPath();for(let i=0;i<n;i++){i?x.lineTo(X(i),Y(P[i])):x.moveTo(X(i),Y(P[i]));}x.stroke();
 if(n>104){x.fillStyle='#ff4a4a';x.font=`800 ${S*.09}px Manrope, sans-serif`;x.textAlign='right';x.globalAlpha=Math.min(1,(n-104)/12);x.fillText('−$589B',S*.92,S*.24);x.globalAlpha=1;
  x.font=`500 ${S*.03}px "JetBrains Mono", monospace`;x.fillStyle='#8a93a5';x.fillText('Jan 27 · DeepSeek R1',S*.92,S*.3);}
 x.font=`500 ${S*.026}px "JetBrains Mono", monospace`;x.fillStyle='#55607a';x.textAlign='left';x.fillText('illustrative intraday path',S*.08,S*.92);};}),
// ---- a data-centre aisle
datacenter:v=>mk3D('#03050a',(sc,cam)=>{sc.fog=new THREE.FogExp2(0x03050a,.075);sc.add(new THREE.HemisphereLight(0x6f8fff,0x020203,.3));
const rm=phys('#1a1d23',{metalness:.85,roughness:.38}),N=12;const LP=[],LC=[],LS=[];const r=mulberry(19);
const pal=v==='mythos'?['#c9a4ff','#ffd36e','#ff6ad5']:['#46e0ff','#7dff9a','#ffb13e'];
for(const sd of [-1,1])for(let i=0;i<N;i++){const b=new THREE.Mesh(new THREE.BoxGeometry(.9,2.4,1.1),rm);b.position.set(sd*1.25,1.2,-i*1.2);sc.add(b);
 for(let k=0;k<26;k++){LP.push(sd*(1.25-.46),.3+r()*1.9,-i*1.2+(r()-.5)*.9);const c=new THREE.Color(pal[Math.floor(r()*3)]);LC.push(c.r,c.g,c.b);LS.push(r()*10);}}
const lg=new THREE.BufferGeometry();lg.setAttribute('position',new THREE.Float32BufferAttribute(LP,3));lg.setAttribute('color',new THREE.Float32BufferAttribute(LC,3));lg.setAttribute('ph',new THREE.Float32BufferAttribute(LS,1));
const lu={t:{value:0}};sc.add(new THREE.Points(lg,new THREE.ShaderMaterial({uniforms:lu,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexColors:true,
 vertexShader:'uniform float t;attribute float ph;varying vec3 vC;varying float vA;void main(){vC=color;vA=step(.35,fract(sin(floor(t*4.+ph*7.)*12.9+ph)*43758.5));vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=60./-mv.z;}',
 fragmentShader:'varying vec3 vC;varying float vA;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(vC,smoothstep(.5,.0,d)*vA);}'})));
const fl=new THREE.Mesh(new THREE.PlaneGeometry(6,40),phys('#0b0d11',{roughness:.12,clearcoat:1}));fl.rotation.x=-Math.PI/2;fl.position.z=-12;sc.add(fl);
for(let i=0;i<6;i++){const s=new THREE.Mesh(new THREE.BoxGeometry(.2,.04,1.4),new THREE.MeshBasicMaterial({color:0xcfe0ff}));s.position.set(0,2.9,-i*2.6);sc.add(s);const l=new THREE.PointLight(0x9fb8ff,1.2,6);l.position.set(0,2.7,-i*2.6);sc.add(l);}
return t=>{lu.t.value=t;const z=2-((t*.6)%8);cam.position.set(Math.sin(t*.3)*.15,1.4,z);cam.lookAt(Math.sin(t*.2)*.3,1.2,z-6);};},.4),
// ---- a newspaper front page
news:v=>mk2D((x,S)=>{const it=BYID[v]||{t:String(v),d:'2026-01',k:'n'};const pred=it.k==='f',hl=it.hl||it.t;const r=mulberry(hashStr(String(v)));
const pc=document.createElement('canvas');const PW=Math.floor(S*.78),PH=Math.floor(S*1.0);pc.width=PW;pc.height=PH;const p=pc.getContext('2d');
p.fillStyle=pred?'#efe7d6':'#eeeae0';p.fillRect(0,0,PW,PH);for(let i=0;i<1400;i++){p.fillStyle=`rgba(80,60,30,${r()*.05})`;p.fillRect(r()*PW,r()*PH,1.5,1.5);}
p.fillStyle='#151515';p.textAlign='center';p.font=`900 ${PW*.085}px Georgia, serif`;p.fillText(pred?'The Future Times':'The Daily Machine',PW/2,PH*.1);
p.fillRect(PW*.05,PH*.125,PW*.9,2);p.fillRect(PW*.05,PH*.16,PW*.9,1);const yy=it.d.slice(0,4),mm=MON[parseInt(it.d.slice(5,7),10)-1];
p.font=`600 ${PW*.026}px Georgia, serif`;p.fillText(`${mm} ${yy}  ·  ${pred?'PREDICTED EDITION':'LATE EDITION'}`,PW/2,PH*.147);
p.font=`800 ${PW*.064}px Georgia, serif`;const L=wrapText(p,hl,PW*.88).slice(0,5);L.forEach((l,i)=>p.fillText(l,PW/2,PH*.235+i*PW*.074));
const top=PH*.235+L.length*PW*.074;const fx=PW*.06,fy=top,fw=PW*.5,fh=PH*.94-top;
for(let gy=0;gy<fh;gy+=5)for(let gx=0;gx<fw;gx+=5){const u=gx/fw,vv=gy/fh;const val=.5+.35*Math.sin(u*5+r()*.3)*Math.cos(vv*4)+.3*Math.exp(-((u-.5)**2+(vv-.45)**2)*10);p.fillStyle='#1a1a1a';p.beginPath();p.arc(fx+gx+2.5,fy+gy+2.5,Math.max(0,2.4*(1-val)),0,TAU);p.fill();}
p.fillStyle='#8f8a80';for(let i=0;i*PH*.022<fh;i++){p.fillRect(PW*.6,fy+i*PH*.022,PW*.34*(i%6===5?.6:.95),PH*.007);}
return t=>{const g=x.createRadialGradient(S*.4,S*.3,S*.05,S/2,S/2,S*.85);g.addColorStop(0,'#3a2c20');g.addColorStop(1,'#0b0806');x.fillStyle=g;x.fillRect(0,0,S,S);
 x.save();x.translate(S/2,S/2);x.rotate(-.04+Math.sin(t*.25)*.012);const sc0=.9+Math.min(t*.006,.12);x.scale(sc0,sc0);x.shadowColor='rgba(0,0,0,.6)';x.shadowBlur=S*.05;x.shadowOffsetY=S*.02;x.drawImage(pc,-PW/2,-PH/2);x.restore();
 const lamp=x.createRadialGradient(S*.3,S*.18,0,S*.3,S*.18,S*.7);lamp.addColorStop(0,'rgba(255,215,160,.14)');lamp.addColorStop(1,'rgba(255,215,160,0)');x.fillStyle=lamp;x.fillRect(0,0,S,S);};})
};
Object.assign(MEM,NEW);

return {MEM,RS};
};
