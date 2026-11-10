const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const code=fs.readFileSync('scripts/ai-photos.js','utf8').split('function mountFacelessProduction(project){')[1];
async function run({failPhotos=false,failSync=false}={}){
 const order=[],photos=new Map(),p={id:'fixture',scenes:[{text:'Hola.'}]},nodes={};
 for(const id of ['productionStart','productionStop','productionStatus','productionPass','aiPhotosPasscode','aiVoicePasscode','aiPhotosStatus','aiVoiceStatus','renderStatus','downloadArea'])nodes[id]={value:id==='productionPass'?'fixture-private-code':'',style:{},textContent:'',scrollIntoView(){},focus(){}};
 const panel={querySelector:s=>nodes[s.slice(1)]};let download=false;
 const context={console,Boolean,Error,Map,window:{AudioContext:class{async resume(){}async close(){}},facelessEnsureAudioSync:async()=>{order.push('sync');if(failSync)throw Error('sync failed');p.audioAlignment={method:'speech'};p.subtitleTextSignature='Hola.';}},navigator:{},document:{createElement:()=>panel,querySelector:s=>s.includes('video-workspace')?{prepend(){}}:s==='#downloadArea a'&&download?{}:null,querySelectorAll:()=>[],getElementById:id=>nodes[id]},facelessImageRunning:false,facelessVoiceBusy:false,facelessImageCancel:false,facelessVoiceCancel:false,rendering:false,facelessImagePasscode:'',facelessVoicePassword:'',safeMime:()=> 'video/mp4',facelessRestoreMedia:async()=>{},facelessProjectPhotos:()=>photos,FacelessTiming:{signature:()=> 'Hola.'},updateAudioAttachmentUI(){},renderVideo:async()=>{order.push('export');assert.equal(p.audioAlignment.method,'speech');download=true;},audioFile:null,audioFileProjectId:null};
 nodes.aiPhotosStart={onclick:async()=>{order.push('photos');if(!failPhotos)photos.set(0,{});}};
 nodes.aiVoiceGenerate={onclick:async()=>{order.push('voice');context.audioFile={};context.audioFileProjectId=p.id;}};
 vm.createContext(context);vm.runInContext('function mountFacelessProduction(project){'+code,context);context.mountFacelessProduction(p);await nodes.productionStart.onclick();
 assert.equal(context.window.facelessProductionBusy,false);return {order,status:nodes.productionStatus.textContent};
}
(async()=>{
 assert.deepEqual((await run()).order,['photos','voice','sync','export']);
 assert.deepEqual((await run({failPhotos:true})).order,['photos']);
 const failed=await run({failSync:true});assert.deepEqual(failed.order,['photos','voice','sync']);assert.match(failed.status,/sync failed/);
 console.log('PASS: AI stages run in order; missing photos and failed synchronization prevent export; controls recover');
})().catch(error=>{console.error(error);process.exitCode=1;});
