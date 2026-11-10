/* Shared canvas composition for preview and downloaded video. No external video API. */
(function(root){
 'use strict';
 const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
 const ease=n=>(1-Math.cos(Math.PI*clamp(n)))/2;
 function camera(w,h,iw,ih,progress,index){
  const t=ease(progress),zoom=1.06+.12*(index%2?1-t:t),scale=Math.max(w/iw,h/ih)*zoom;
  const width=iw*scale,height=ih*scale;
  const direction=index%3===0?t:index%3===1?1-t:.5+.18*Math.sin(t*Math.PI);
  return {x:-(width-w)*(.25+.5*direction),y:-(height-h)*(.35+.3*(index%2?t:1-t)),width,height};
 }
 function captionState(cues,seconds){
  const cue=cues.find(c=>seconds>=c.start&&seconds<c.end);if(!cue)return null;
  const words=Array.isArray(cue.words)&&cue.words.length?cue.words:String(cue.text).split(/\s+/).filter(Boolean).map((text,i,all)=>({text,start:cue.start+(cue.end-cue.start)*i/all.length,end:cue.start+(cue.end-cue.start)*(i+1)/all.length}));
  return {cue,words,active:words.findIndex(w=>seconds>=w.start&&seconds<w.end),entrance:ease((seconds-cue.start)/.16)};
 }
 function background(ctx,p,index,seconds,image){
  const w=ctx.canvas.width,h=ctx.canvas.height,s=p.scenes[index]||p.scenes[0];
  const t=clamp((seconds-s.time)/Math.max(.01,s.duration));
  if(image){const r=camera(w,h,image.naturalWidth||image.width,image.naturalHeight||image.height,t,index);ctx.drawImage(image,r.x,r.y,r.width,r.height);return;}
  const palettes={Romance:['#261335','#46234e','#78406f'],Terror:['#070c17','#1b2535','#482a53'],Historia:['#311b20','#704739','#976b42'],Curiosidades:['#132d48','#175d71','#177d94'],Motivación:['#471c5b','#913266','#c77352'],Noticias:['#101e39','#235b93','#267fbd'],Educativo:['#0c2846','#126c7d','#258d88']};
  const colors=palettes[p.style]||['#030f2d','#13275f','#6b21a8'],g=ctx.createLinearGradient(0,0,w,h);colors.forEach((c,i)=>g.addColorStop(i/2,c));ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  for(let k=0;k<7;k++){const f=k*1.93+index*2.7,r=w*(.1+k%4*.07),x=w*(.15+(k*.17)%.9)+Math.sin(seconds*.31+f)*w*.11,y=h*(.14+(k*.13)%.78)+Math.cos(seconds*.23+f)*h*.06;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=k%2?'#ffffff0e':'#a473ff1c';ctx.fill();}
 }
 function rounded(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
 function captions(ctx,state,wide){
  if(!state)return;
  const w=ctx.canvas.width,h=ctx.canvas.height,maxWidth=w*.82;
  ctx.save();
  let size=wide?32:38,lines;
  do{
   ctx.font='800 '+size+'px system-ui, sans-serif';lines=[[]];let used=0;
   state.words.forEach((word,index)=>{const width=ctx.measureText(word.text).width+size*.3;if(used+width>maxWidth&&lines[lines.length-1].length){lines.push([]);used=0;}lines[lines.length-1].push({...word,index,width});used+=width;});
   if(lines.length<=2&&lines.every(line=>line.every(word=>word.width<=maxWidth)))break;
   size-=2;
  }while(size>10);
  const lineHeight=size*1.4,totalHeight=lines.length*lineHeight;
  const top=h*(wide?.71:.77)-totalHeight/2+(1-state.entrance)*8;
  ctx.globalAlpha=.75+.25*state.entrance;
  rounded(ctx,w*.06,top-size*.3,w*.88,totalHeight+size*.35,14);ctx.fillStyle='#060814c9';ctx.fill();
  ctx.textBaseline='middle';ctx.textAlign='left';ctx.lineJoin='round';ctx.lineWidth=4;
  lines.forEach((line,row)=>{
   const width=line.reduce((sum,word)=>sum+word.width,0);let x=(w-width)/2;
   const y=top+row*lineHeight+lineHeight/2;
   line.forEach(word=>{
    if(word.index===state.active){rounded(ctx,x-size*.1,y-size*.62,word.width-size*.06,size*1.23,8);ctx.fillStyle='#ffe14a';ctx.fill();ctx.fillStyle='#11121d';ctx.fillText(word.text,x,y);}
    else{ctx.strokeStyle='#060814';ctx.strokeText(word.text,x,y);ctx.fillStyle='#ffffff';ctx.fillText(word.text,x,y);}
    x+=word.width;
   });
  });ctx.restore();
 }
 function render(ctx,p,index,seconds,getImage,cues){
  const w=ctx.canvas.width,h=ctx.canvas.height,wide=w>h;
  ctx.save();ctx.clearRect(0,0,w,h);background(ctx,p,index,seconds,getImage(index));
  const scene=p.scenes[index],blend=clamp((seconds-scene.time)/.42);
  if(index>0&&blend<1){ctx.globalAlpha=1-ease(blend);background(ctx,p,index-1,scene.time,getImage(index-1));ctx.globalAlpha=1;}
  const shade=ctx.createLinearGradient(0,0,0,h);shade.addColorStop(0,'#03040b8c');shade.addColorStop(.3,'#03040b00');shade.addColorStop(.64,'#03040b00');shade.addColorStop(1,'#03040ba6');ctx.fillStyle=shade;ctx.fillRect(0,0,w,h);
  // A short opening title leaves the image unobstructed for the rest of the story.
  if(seconds<2.8){ctx.save();ctx.globalAlpha=clamp((2.8-seconds)/.5);ctx.font='700 '+(wide?25:26)+'px system-ui, sans-serif';ctx.textAlign='center';ctx.fillStyle='#f5f6ff';ctx.shadowColor='#000';ctx.shadowBlur=8;let title=p.title||'';while(ctx.measureText(title).width>w*.85&&title.length>1)title=title.slice(0,-2);if(title!==p.title)title+='…';ctx.fillText(title,w/2,h*.12);ctx.restore();}
  captions(ctx,captionState(cues,seconds),wide);
  const progress=clamp(seconds/Math.max(.01,p.duration));ctx.fillStyle='#ffffff38';ctx.fillRect(w*.08,h*.94,w*.84,4);const accent=ctx.createLinearGradient(w*.08,0,w*.92,0);accent.addColorStop(0,'#bd18ee');accent.addColorStop(.5,'#bc92ff');accent.addColorStop(1,'#2878ff');ctx.fillStyle=accent;ctx.fillRect(w*.08,h*.94,w*.84*progress,4);ctx.restore();
 }
 const api={camera,captionState,background,render};root.FacelessCinema=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
