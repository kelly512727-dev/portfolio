import * as THREE from './three.module.js';
const host=document.querySelector('.avatar-button');
if(host){
try{
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0xffffff,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.AgXToneMapping;renderer.toneMappingExposure=1.15;host.append(renderer.domElement);renderer.domElement.setAttribute('aria-label','Interactive chrome portrait with blinking eyes');host.classList.add('webgl-ready');
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.1,100);camera.position.set(0,.15,8);
// Real HDR studio illumination: broad highlights and detailed neutral reflections.
const envPixels=new Float32Array(await fetch('assets/nomad-environment.f32').then(r=>r.arrayBuffer()));
const envTexture=new THREE.DataTexture(envPixels,1024,512,THREE.RGBAFormat,THREE.FloatType);envTexture.mapping=THREE.EquirectangularReflectionMapping;envTexture.needsUpdate=true;
const pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromEquirectangular(envTexture).texture;pmrem.dispose();envTexture.dispose();
const chrome=new THREE.MeshPhysicalMaterial({color:0xeeeeee,metalness:1,roughness:.15,envMapIntensity:1.25,clearcoat:.6,clearcoatRoughness:.12});
const head=new THREE.Group();scene.add(head);
const modelData=await fetch('assets/avatar-nomad.json').then(r=>r.json());
for(const data of modelData){const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));geometry.setIndex(data.indices);geometry.setAttribute('normal',new THREE.Float32BufferAttribute(data.normals,3));const material=chrome.clone();if(data.material){material.color.fromArray(data.material.color);material.metalness=data.material.metalness;material.roughness=data.material.roughness;material.clearcoat=0;}material.envMapIntensity=2.26;const mesh=new THREE.Mesh(geometry,material);mesh.userData.eye=!!data.eye;mesh.name=data.name;mesh.material.vertexColors=false;head.add(mesh);}
// Mirror the supplied right headphone across the model's center plane.
const rightHeadphone=head.children.find(mesh=>mesh.name==='UV球體'&&!head.children.some(other=>other.name==='UV球體.001'));
if(rightHeadphone){const mirrored=rightHeadphone.clone();mirrored.geometry=rightHeadphone.geometry.clone();const position=mirrored.geometry.attributes.position,normal=mirrored.geometry.attributes.normal;for(let i=0;i<position.count;i++){position.setX(i,-position.getX(i));normal.setX(i,-normal.getX(i));}const index=mirrored.geometry.index;for(let i=0;i<index.count;i+=3){const a=index.getX(i);index.setX(i,index.getX(i+2));index.setX(i+2,a);}mirrored.geometry.computeBoundingBox();mirrored.name='Headphone mirrored';head.add(mirrored);}
const bounds=new THREE.Box3().setFromObject(head),center=bounds.getCenter(new THREE.Vector3()),size3=bounds.getSize(new THREE.Vector3());
for(const mesh of head.children){mesh.geometry.translate(-center.x,-center.y,-center.z);mesh.geometry.scale(2.65/size3.y,2.65/size3.y,2.65/size3.y);const positions=mesh.geometry.attributes.position,colors=[];for(let i=0;i<positions.count;i++){const x=positions.getX(i),y=positions.getY(i);const color=new THREE.Color('#f3d4ac').lerp(new THREE.Color('#d794bb'),THREE.MathUtils.clamp(.5-y*.35+x*.12,0,1));colors.push(color.r,color.g,color.b);}mesh.geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));mesh.material.vertexColors=false;mesh.material.needsUpdate=true;}
// Keep eye pivots local so blinks never deform the face or hair.
const eyes=head.children.filter(mesh=>mesh.userData.eye);
for(const eye of eyes){eye.geometry.computeBoundingBox();const pivot=eye.geometry.boundingBox.getCenter(new THREE.Vector3());eye.geometry.translate(-pivot.x,-pivot.y,-pivot.z);eye.position.copy(pivot);}
let nextBlink=2.7,blinkStart=-10,blueTarget=0,blueStrength=0,clickAt=-10,studioRotation=238.666687*Math.PI/180;
// Tuning controls appear only in the requested lighting preview.
if(new URLSearchParams(location.search).has('lighting')){
 const controls=document.createElement('aside');controls.className='avatar-light-controls';controls.setAttribute('aria-label','人偶光影預覽');
 const title=document.createElement('strong');title.textContent='人偶光影預覽';controls.append(title);
 function slider(label,min,max,step,value,update,suffix=''){
  const row=document.createElement('label'),text=document.createElement('span'),output=document.createElement('output'),input=document.createElement('input');text.textContent=label;input.type='range';input.min=min;input.max=max;input.step=step;input.value=value;input.setAttribute('aria-label',label);output.textContent=value+suffix;
  input.addEventListener('input',()=>{output.textContent=Number(input.value).toFixed(step<1?1:0)+suffix;update(Number(input.value))});row.append(text,output,input);controls.append(row);
 }
 slider('環境光亮度',.3,6,.1,2.3,value=>head.children.forEach(mesh=>mesh.material.envMapIntensity=value),'×');
 slider('光源方向',0,360,1,239,value=>studioRotation=value*Math.PI/180,'°');
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
for(const eye of eyes)eye.scale.y=openness;
blueStrength=0;uniforms.blueSpot.value.set(localX,localY,blueStrength);
for(let i=0;i<12;i++){const m=marks[i];uniforms.spots.value[i].set(m?m.x:-10,m?m.y:-10,m?Math.max(0,1-(performance.now()-m.born)/1500):0);}head.rotation.y+=(targetY-head.rotation.y)*.075;head.rotation.x+=(targetX-head.rotation.x)*.065;head.rotation.z+=((reduced.matches?0:-targetY*.13+Math.sin(t*.7)*.018)-head.rotation.z)*.045;
head.position.set(0,0,0);
const elapsed=t-clickAt,pulse=!reduced.matches&&elapsed<1.2?Math.sin(elapsed*13)*Math.exp(-elapsed*4):0;
head.rotation.x+=pulse*.018;head.scale.set(1+pulse*.025,1-pulse*.02,1);
scene.environmentRotation.y=studioRotation;scene.environmentRotation.x=0;
if(!reduced.matches){for(const letter of letters){const r=letter.getBoundingClientRect();const dx=r.left+r.width/2-mouseX,dy=r.top+r.height/2-mouseY;const distance=Math.hypot(dx,dy);const force=pointerActive?Math.max(0,1-distance/205):0;const angle=Math.atan2(dy,dx);letter.style.transform=`translate(${Math.cos(angle)*force*62}px,${Math.sin(angle)*force*68}px) rotate(${Math.cos(angle)*force*60}deg) scale(${1+force*.12})`;letter.style.color=force>.12?'#2455FF':'';}}
renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(postScene,postCamera)}frame();
}catch(error){console.warn('3D portrait unavailable',error);host.classList.add('webgl-fallback');}
}
