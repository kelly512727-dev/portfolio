(()=>{
 const hero=document.querySelector('.hero'),work=document.querySelector('#work');
 if(!hero||!work||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
 const scene=document.createElement('div');scene.className='hero-scroll-scene';hero.before(scene);scene.append(hero);document.documentElement.classList.add('has-hero-transition');
 let pending=false;
 function update(){pending=false;const h=innerHeight,start=scene.getBoundingClientRect().top+scrollY;const p=Math.max(0,Math.min(1,(scrollY-start)/(h*.95)));const eased=p*p*(3-2*p);
 hero.style.setProperty('--hero-exit-y',`${eased*h*.28}px`);hero.style.setProperty('--hero-exit-opacity',String(1-eased));hero.style.setProperty('--hero-exit-scale',String(1-eased*.045));hero.style.pointerEvents=p>.85?'none':'';
 work.style.setProperty('--work-arrival',String(Math.max(0,Math.min(1,(h-work.getBoundingClientRect().top)/(h*.65)))));
 }
 addEventListener('scroll',()=>{if(!pending){pending=true;requestAnimationFrame(update);}},{passive:true});addEventListener('resize',update);update();
})();
