(()=>{
 const cards=[...document.querySelectorAll('#gallery .project,.gallery .project,.masonry .project')];
 if(!cards.length)return;const reduced=matchMedia('(prefers-reduced-motion:reduce)');
 if(reduced.matches)return;
 const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting){entry.target.classList.add('work-revealed');observer.unobserve(entry.target);}}},{threshold:.08});
 cards.forEach((card,i)=>{card.classList.add('work-motion');card.style.setProperty('--reveal-delay',(i%2)*90+'ms');observer.observe(card);card.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;const r=card.getBoundingClientRect();card.style.setProperty('--hover-x',((e.clientX-r.left)/r.width-.5)*8+'px');card.style.setProperty('--hover-y',((e.clientY-r.top)/r.height-.5)*8+'px');});card.addEventListener('pointerleave',()=>{card.style.setProperty('--hover-x','0px');card.style.setProperty('--hover-y','0px');});});
 let queued=false;const update=()=>{queued=false;const h=innerHeight;for(const card of cards){const r=card.getBoundingClientRect();if(r.bottom<0||r.top>h)continue;const progress=(r.top+r.height/2-h/2)/(h+r.height);card.style.setProperty('--scroll-y',Math.max(-18,Math.min(18,progress*-42))+'px');}};
 addEventListener('scroll',()=>{if(!queued){queued=true;requestAnimationFrame(update);}},{passive:true});addEventListener('resize',update);update();
})();
