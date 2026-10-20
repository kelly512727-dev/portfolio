(()=>{
 const seen=new WeakSet(),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const observer=new IntersectionObserver(entries=>entries.forEach(({target,isIntersecting})=>{if(!isIntersecting)return;observer.unobserve(target);target.classList.add('is-playing');target.querySelectorAll('[data-count]').forEach(el=>{const value=Number(el.dataset.count),digits=value%1?1:0;if(reduced.matches){el.textContent=value+'%';return;}let start;function frame(now){if(!el.isConnected)return;start??=now;const t=Math.min((now-start)/1800,1);el.textContent=(value*(1-Math.pow(1-t,3))).toFixed(digits)+'%';if(t<1)requestAnimationFrame(frame);}requestAnimationFrame(frame);});}),{threshold:.4});
 function init(){document.querySelectorAll('.oasis-context-motion').forEach(el=>{if(seen.has(el))return;seen.add(el);el.querySelectorAll('[data-count]').forEach(n=>n.textContent=reduced.matches?n.dataset.count+'%':'0%');observer.observe(el);});}
 new MutationObserver(init).observe(document.querySelector('#detail-content'),{childList:true,subtree:true});init();
})();
