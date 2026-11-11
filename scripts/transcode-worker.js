/* Single-thread FFmpeg runs off the UI thread and works on GitHub Pages. */
self.onmessage=async({data})=>{
 let engine;
 try{
  const base='https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm/';
  const factory=(await import(base+'ffmpeg-core.js')).default;
  engine=await factory({mainScriptUrlOrBlob:base+'ffmpeg-core.js#'+btoa(JSON.stringify({wasmURL:base+'ffmpeg-core.wasm'}))});
  engine.setProgress(({progress})=>self.postMessage({progress:Math.min(99,Math.max(0,Math.floor(progress*100)))}));
  const input='source.'+data.source,output='result.'+data.format;
  engine.FS.writeFile(input,new Uint8Array(data.input));
  const encoding=data.action==='remux'?['-c','copy','-movflags','+faststart']:data.action==='extract'?['-vn','-ac','1','-ar','16000','-c:a','pcm_s16le']:data.format==='mp4'?['-c:v','libx264','-preset','ultrafast','-crf','21','-pix_fmt','yuv420p','-c:a','aac','-movflags','+faststart']:['-c:v','libvpx','-deadline','realtime','-cpu-used','8','-b:v','5M','-c:a','libopus'];
  engine.setTimeout(11*60*1000);const limit=Number.isFinite(data.duration)&&data.duration>0?['-t',String(data.duration)]:[];
  const tracks=data.action==='extract'?['-map','0:a:0']:['-map','0:v:0','-map','0:a:0?'];
  engine.exec('-i',input,...tracks,...limit,...encoding,output);
  if(engine.ret!==0)throw Error(data.action==='extract'?'No se pudo extraer una pista de voz. Puedes añadir tu audio por separado.':'El dispositivo no pudo convertir el video. Prueba 720p o el formato nativo.');
  const bytes=engine.FS.readFile(output);self.postMessage({output:bytes.buffer},[bytes.buffer]);
 }catch(error){self.postMessage({error:String(error.message||error)});}
};
