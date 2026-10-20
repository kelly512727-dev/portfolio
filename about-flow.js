const aboutFlow=document.querySelector('.about');
if(aboutFlow){
 const host=aboutFlow.querySelector('.avatar-button'),copy=aboutFlow.lastElementChild,p=copy.querySelector('p');
 const copies={en:p.querySelector('.copy-en')?.textContent||p.innerText,'zh-Hant':p.querySelector('.copy-zh')?.textContent||p.innerText};
 let source=copies[document.documentElement.lang]||copies.en,dx=0,dy=0,queued=false;
 const measure=document.createElement('canvas').getContext('2d');
 function layout(){
  queued=false;const width=p.clientWidth;if(!width)return;
  const mobile=width<600,style=getComputedStyle(p),line= parseFloat(style.lineHeight),radius=mobile?115:175;
  measure.font=style.font;const words=document.documentElement.lang==='zh-Hant'?[...source]:source.match(/\S+\s*/g)||[];
  const height=mobile?480:350;
  host.style.transform=`translate(calc(-50% + ${dx}px),${dy}px)`;
  const portrait=host.getBoundingClientRect(),paragraph=p.getBoundingClientRect();
  const cx=portrait.left+portrait.width/2-paragraph.left,cy=portrait.top+portrait.height*.59-paragraph.top;
  const statement=aboutFlow.querySelector('.about-3d-statement');
  statement.style.opacity=String(Math.max(0,Math.min(1,(paragraph.top-innerHeight*.58)/(innerHeight*.32))));
  let index=0,row=0;const fragment=document.createDocumentFragment();
  while(index<words.length&&row<60){
   const y=row*line,distance=(y+line/2-cy)/(mobile?155:195);
   const half=Math.abs(distance)<1?Math.sqrt(1-distance*distance)*radius:0;
   const slots=half?[[0,Math.max(0,cx-half)],[Math.min(width,cx+half),width]]:[[0,width]];
   for(const [left,right] of slots){let x=left;while(index<words.length){const word=words[index],w=measure.measureText(word).width;if(x+w>right)break;const span=document.createElement('span');span.textContent=word;span.style.transform=`translate(${x}px,${y}px)`;fragment.append(span);x+=w;index++;}}
   row++;
  }
  p.replaceChildren(fragment);p.style.height=Math.max(height,row*line)+'px';
  host.style.transform=`translate(calc(-50% + ${dx}px),${dy}px)`;
 }
 const schedule=()=>{if(!queued){queued=true;requestAnimationFrame(layout)}};
 document.addEventListener('portfolio-languagechange',()=>setTimeout(()=>{source=copies[document.documentElement.lang]||copies.en;schedule()},0));
 addEventListener('scroll',schedule,{passive:true});
 new ResizeObserver(schedule).observe(copy);layout();
}
