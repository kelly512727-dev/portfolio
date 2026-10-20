(()=>{
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const observed=new WeakSet();
 const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(!entry.isIntersecting)continue;observer.unobserve(entry.target);const el=entry.target,target=Number(el.dataset.value),ring=el.querySelector('.donut-value'),label=el.querySelector('.donut-number');if(reduced.matches){ring.style.strokeDashoffset=String(100-target);label.textContent=target+'%';continue;}let start;const duration=1450;function animate(now){if(!el.isConnected)return;if(start===undefined)start=now;const t=Math.min(1,(now-start)/duration),eased=1-Math.pow(1-t,3);ring.style.strokeDashoffset=String(100-target*eased);label.textContent=Math.round(target*eased)+'%';if(t<1)requestAnimationFrame(animate);}requestAnimationFrame(animate);}},{threshold:.45});
 function init(){for(const chart of document.querySelectorAll('.ning-donut')){if(observed.has(chart))continue;observed.add(chart);observer.observe(chart);}}
 new MutationObserver(init).observe(document.querySelector('#detail-content'),{childList:true,subtree:true});init();
 document.querySelector('#detail').addEventListener('close',()=>observer.disconnect());
})();
