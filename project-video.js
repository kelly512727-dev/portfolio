(()=>{
 const dialog=document.querySelector('#detail'),content=document.querySelector('#detail-content');if(!dialog||!content)return;
 const reduced=matchMedia('(prefers-reduced-motion:reduce)'),seen=new WeakSet();let current=[];
 const visibility=new IntersectionObserver(entries=>{for(const entry of entries){const video=entry.target;if(entry.isIntersecting&&dialog.open&&!reduced.matches)video.play().catch(()=>{});else video.pause()}},{threshold:.15});
 function bind(){const next=[...content.querySelectorAll('video')];for(const video of current)if(!next.includes(video)){video.pause();visibility.unobserve(video)}current=next;for(const video of next)if(!seen.has(video)){seen.add(video);video.muted=true;if(reduced.matches)video.autoplay=false;visibility.observe(video)}}
 new MutationObserver(bind).observe(content,{childList:true,subtree:true});dialog.addEventListener('close',()=>current.forEach(video=>video.pause()));bind();
})();
