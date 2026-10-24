import * as THREE from './vendor/metal/three.module.js';
import {GLTFLoader} from './vendor/metal/addons/loaders/GLTFLoader.js';
import {HDRLoader} from './vendor/metal/addons/loaders/HDRLoader.js';
const host=document.querySelector('.avatar-button');
if(host){
try{
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0xffffff,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.AgXToneMapping;renderer.toneMappingExposure=1.15;host.append(renderer.domElement);renderer.domElement.setAttribute('aria-label','Interactive polished-metal portrait');host.classList.add('webgl-ready');
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.1,100);camera.position.set(0,.15,8);
// Use the supplied polished-metal character and its studio reflections.
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
const [gltf,envTexture]=await Promise.all([
 new GLTFLoader().loadAsync('assets/avatar-metal.glb?v=20261024-revised'),
 new HDRLoader().loadAsync('assets/avatar-metal-studio.hdr')
]);
const pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromEquirectangular(envTexture).texture;pmrem.dispose();envTexture.dispose();
const model=gltf.scene,head=new THREE.Group(),recoil=new THREE.Group();scene.add(recoil);recoil.add(head);head.add(model);
// Normalize the updated export's nested transforms before local interactions.
model.updateMatrixWorld(true);
const portraitMeshes=[];model.traverse(mesh=>{if(mesh.isMesh)portraitMeshes.push(mesh)});
for(const mesh of portraitMeshes){
 mesh.geometry=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
 mesh.position.set(0,0,0);mesh.quaternion.identity();mesh.scale.set(1,1,1);model.add(mesh);
}
const bounds=new THREE.Box3().setFromObject(model),center=bounds.getCenter(new THREE.Vector3()),size3=bounds.getSize(new THREE.Vector3());
model.position.sub(center);model.scale.setScalar(2.65/size3.y);model.position.multiplyScalar(2.65/size3.y);
model.traverse(mesh=>{if(mesh.isMesh){mesh.material=new THREE.MeshStandardMaterial({color:new THREE.Color(.73,.70,.68),metalness:1,roughness:.16,envMapIntensity:1});}});
// Bend only the two tips above the crown; the roots stay attached to the hair.
const tuftMotion={value:new THREE.Vector2()};
model.traverse(mesh=>{if(!mesh.isMesh||mesh.name!=='圓管')return;
 mesh.material.onBeforeCompile=shader=>{
  shader.uniforms.tuftMotion=tuftMotion;
  shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
   uniform vec2 tuftMotion;
   float tuftAngle(vec3 p){return mix(tuftMotion.x,tuftMotion.y,smoothstep(-.015,.025,p.x))*smoothstep(.487,.565,p.y);}
   mat3 tuftTurn(float a){float c=cos(a),s=sin(a);return mat3(c,s,0.,-s,c,0.,0.,0.,1.);}
  `).replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
   objectNormal=tuftTurn(tuftAngle(position))*objectNormal;
  `).replace('#include <begin_vertex>',`#include <begin_vertex>
   vec3 tuftRoot=vec3(position.x<0.?-.005:.025,.487,.04);
   transformed=tuftRoot+tuftTurn(tuftAngle(position))*(transformed-tuftRoot);
  `);
 };
 mesh.material.customProgramCacheKey=()=> 'click-tuft-spring-v1';
});
const eyes=[];model.traverse(mesh=>{if(!mesh.isMesh||!mesh.name.startsWith('四邊形球'))return;
 mesh.geometry.computeBoundingBox();const box=mesh.geometry.boundingBox,eyeSize=box.getSize(new THREE.Vector3());
 if(Math.max(eyeSize.x,eyeSize.y,eyeSize.z)<.16){const pivot=box.getCenter(new THREE.Vector3());mesh.geometry.translate(-pivot.x,-pivot.y,-pivot.z);mesh.position.copy(pivot);mesh.userData.openEyeScaleY=1;eyes.push(mesh);}
});
let nextBlink=2.7,blinkStart=-10,blueTarget=0,blueStrength=0,clickAt=-10,studioRotation=0;
// Tuning controls appear only in the requested lighting preview.
if(new URLSearchParams(location.search).has('lighting')){
 const controls=document.createElement('aside');controls.className='avatar-light-controls';controls.setAttribute('aria-label','人偶光影預覽');
 const title=document.createElement('strong');title.textContent='人偶光影預覽';controls.append(title);
 function slider(label,min,max,step,value,update,suffix=''){
  const row=document.createElement('label'),text=document.createElement('span'),output=document.createElement('output'),input=document.createElement('input');text.textContent=label;input.type='range';input.min=min;input.max=max;input.step=step;input.value=value;input.setAttribute('aria-label',label);output.textContent=value+suffix;
  input.addEventListener('input',()=>{output.textContent=Number(input.value).toFixed(step<1?1:0)+suffix;update(Number(input.value))});row.append(text,output,input);controls.append(row);
 }
 slider('環境光亮度',.3,6,.1,1,value=>model.traverse(mesh=>{if(mesh.isMesh)mesh.material.envMapIntensity=value}),'×');
 slider('光源方向',0,360,1,0,value=>studioRotation=value*Math.PI/180,'°');
 document.body.append(controls);
}

const ambient=new THREE.HemisphereLight(0xffffff,0x303030,.4);scene.add(ambient);const key=new THREE.DirectionalLight(0xffffff,.6);key.position.set(-3,4,5);scene.add(key);
let targetX=0,targetY=0,visible=true,pointerActive=false;const reduced=matchMedia('(prefers-reduced-motion:reduce)');
const size=()=>{const r=host.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix()};new ResizeObserver(size).observe(host);size();
// Apply blur and grain only around pointer marks in the rendered portrait.
const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType});
const marks=[];let localX=.5,localY=.5;const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
function addMark(e){const r=renderer.domElement.getBoundingClientRect();localX=(e.clientX-r.left)/r.width;localY=1-(e.clientY-r.top)/r.height;pointer.set(localX*2-1,localY*2-1);raycaster.setFromCamera(pointer,camera);if(!raycaster.intersectObject(head,true).length)return;marks.unshift({x:localX,y:localY,born:performance.now()});marks.splice(12);host.dataset.frost='local';}
function blueHover(e){const r=renderer.domElement.getBoundingClientRect();localX=(e.clientX-r.left)/r.width;localY=1-(e.clientY-r.top)/r.height;pointer.set(localX*2-1,localY*2-1);raycaster.setFromCamera(pointer,camera);blueTarget=raycaster.intersectObject(head,true).length?1:0;}
host.addEventListener('pointermove',blueHover);host.addEventListener('pointerleave',()=>blueTarget=0);host.addEventListener('click',()=>{nextBlink=0;clickAt=clock.getElapsedTime();host.classList.remove('avatar-tapped');void host.offsetWidth;host.classList.add('avatar-tapped')});
const postScene=new THREE.Scene(),postCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
const uniforms={blueSpot:{value:new THREE.Vector3(.5,.5,0)},map:{value:target.texture},resolution:{value:new THREE.Vector2(1,1)},spots:{value:Array.from({length:12},()=>new THREE.Vector3(-10,-10,0))}};
const post=new THREE.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,uniforms,vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`,fragmentShader:`precision highp float;varying vec2 vUv;uniform sampler2D map;uniform vec2 resolution;uniform vec3 spots[12];uniform vec3 blueSpot;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}void main(){float mask=0.;for(int i=0;i<12;i++){vec2 d=(vUv-spots[i].xy)*resolution;mask=max(mask,(1.-smoothstep(18.,85.,length(d)))*spots[i].z);}vec4 crisp=texture2D(map,vUv);vec4 fog=vec4(0.);for(int i=0;i<24;i++){float a=float(i)*2.39996;float r=sqrt((float(i)+.5)/24.)*25.;fog+=texture2D(map,vUv+vec2(cos(a),sin(a))*r/resolution);}fog/=24.;vec4 c=mix(crisp,fog,mask);float grain=(hash(gl_FragCoord.xy)-.5)*.16*mask;c.rgb+=grain*c.a;vec2 blueDelta=(vUv-blueSpot.xy)*resolution;float glow=exp(-dot(blueDelta,blueDelta)/(resolution.y*resolution.y*.012))*blueSpot.z;c.rgb=mix(c.rgb,c.rgb*.6+vec3(.015,.04,1.3),glow*.55*c.a);c.a=clamp(c.a+grain*.18*mask,0.,1.);gl_FragColor=c;\n#include <tonemapping_fragment>
#include <colorspace_fragment>}`});
postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),post));
const originalSize=size;new ResizeObserver(()=>{const r=host.getBoundingClientRect();const ratio=renderer.getPixelRatio();target.setSize(Math.round(r.width*ratio),Math.round(r.height*ratio));uniforms.resolution.value.set(r.width*ratio,r.height*ratio)}).observe(host);
const area=document.querySelector('.about');const statement=document.querySelector('.about-3d-statement');
const lines=statement.innerHTML.split('<br>');statement.innerHTML=lines.map(line=>`<span class="reactive-line">${[...line].map(c=>`<span class="reactive-letter">${c===' '?'&nbsp;':c}</span>`).join('')}</span>`).join('');
let letters=[...statement.querySelectorAll('.reactive-letter')];function updatePortraitLanguage(){const lines=document.documentElement.lang==='zh-Hant'?['以細膩觀察，','成就精準設計。']:['Thoughtful by nature.','Precise by design.'];statement.innerHTML=lines.map(line=>`<span class="reactive-line">${[...line].map(c=>`<span class="reactive-letter">${c===' '?'&nbsp;':c}</span>`).join('')}</span>`).join('');letters=[...statement.querySelectorAll('.reactive-letter')];}document.addEventListener('portfolio-languagechange',updatePortraitLanguage);updatePortraitLanguage();let mouseX=0,mouseY=0;
window.addEventListener('pointermove',e=>{if(reduced.matches)return;const r=host.getBoundingClientRect();mouseX=e.clientX;mouseY=e.clientY;pointerActive=true;targetY=THREE.MathUtils.clamp((e.clientX-(r.left+r.width/2))/(innerWidth/2),-1,1)*.72;targetX=THREE.MathUtils.clamp((e.clientY-(r.top+r.height/2))/(innerHeight/2),-1,1)*.32;});
document.addEventListener('pointerleave',()=>{pointerActive=false;targetX=targetY=0});
new IntersectionObserver(entries=>{visible=entries[0].isIntersecting}).observe(host);
const clock=new THREE.Clock();function frame(){requestAnimationFrame(frame);if(!visible)return;const t=clock.getElapsedTime();
if(!reduced.matches&&t>nextBlink){blinkStart=t;nextBlink=t+2.8+Math.random()*2.4;}
const blinkTime=t-blinkStart;let openness=1;
if(blinkTime<.11)openness=1-.93*Math.sin(blinkTime/.11*Math.PI/2);else if(blinkTime<.18)openness=.07;else if(blinkTime<.34)openness=.07+.93*Math.sin((blinkTime-.18)/.16*Math.PI/2);
for(const eye of eyes)eye.scale.y=eye.userData.openEyeScaleY*openness;
blueStrength=0;uniforms.blueSpot.value.set(localX,localY,blueStrength);
for(let i=0;i<12;i++){const m=marks[i];uniforms.spots.value[i].set(m?m.x:-10,m?m.y:-10,m?Math.max(0,1-(performance.now()-m.born)/1500):0);}head.rotation.y+=(targetY-head.rotation.y)*.075;head.rotation.x+=(targetX-head.rotation.x)*.065;head.rotation.z+=((reduced.matches?0:-targetY*.13+Math.sin(t*.7)*.018)-head.rotation.z)*.045;
head.position.set(0,0,0);
// A quick retreat into depth followed by a small, damped return.
const elapsed=t-clickAt;
const kick=!reduced.matches&&elapsed>=0&&elapsed<1.6?1.9*Math.exp(-elapsed*5.4)*Math.sin(elapsed*9.5):0;
recoil.position.set(0,kick*.06,-kick*1.5);
recoil.rotation.x=-kick*.46;
const hairTime=t-clickAt;
if(!reduced.matches&&hairTime>=0&&hairTime<1.65){
 const decay=Math.exp(-hairTime*3.3),attack=1-Math.exp(-hairTime*35);
 tuftMotion.value.set(Math.sin(hairTime*19)*.65*decay*attack,-Math.sin(hairTime*21)*.8*decay*attack);
}else tuftMotion.value.set(0,0);
head.scale.set(1,1,1);
scene.environmentRotation.y=studioRotation;scene.environmentRotation.x=0;
if(!reduced.matches){for(const letter of letters){const r=letter.getBoundingClientRect();const dx=r.left+r.width/2-mouseX,dy=r.top+r.height/2-mouseY;const distance=Math.hypot(dx,dy);const force=pointerActive?Math.max(0,1-distance/205):0;const angle=Math.atan2(dy,dx);letter.style.transform=`translate(${Math.cos(angle)*force*62}px,${Math.sin(angle)*force*68}px) rotate(${Math.cos(angle)*force*60}deg) scale(${1+force*.12})`;letter.style.color=force>.12?'#2455FF':'';}}
renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(postScene,postCamera)}frame();
}catch(error){console.warn('3D portrait unavailable',error);host.classList.add('webgl-fallback');}
}
