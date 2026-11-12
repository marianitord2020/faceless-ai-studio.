const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const elements=[];
class Element{
 constructor(id=''){this.id=id;this.value='';this.dataset={};this.style={};this.listeners={};this.children=[];this.isConnected=true;this.hidden=false;elements.push(this);}
 addEventListener(event,fn){this.listeners[event]=fn;}after(){}append(...nodes){this.children.push(...nodes);}setAttribute(){}focus(){this.focused=true;}
}
const nodes=Object.fromEntries(['studioWrittenUrl','studioWrittenTitle','studioWrittenText','studioWrittenLanguage','studioPass'].map(id=>[id,new Element(id)]));
const document={getElementById:id=>elements.find(el=>el.id===id),createElement:()=>new Element()};const window={};
vm.runInNewContext(fs.readFileSync('scripts/url-reader.js','utf8'),{window,document,URL,setTimeout,clearTimeout,copy(){}});
let session='',calls=0,behavior='success',resolveRead;
window.facelessMountUrlReader({busy:()=>false,getAccess:()=>session,setAccess:code=>session=code,read:async()=>{calls++;if(behavior==='auth')throw Error('Código privado incorrecto.');if(behavior==='slow')return new Promise(resolve=>resolveRead=resolve);return {title:'Título original',text:'Relato cargado.',language:'es',characters:15,sourceURL:'https://example.org/story'};}});
(async()=>{
 nodes.studioWrittenUrl.value='https://example.org/story';nodes.studioWrittenText.value='Mi texto anterior.';
 assert.equal(await window.facelessReadWrittenURL(),false);assert.equal(calls,0);assert.equal(document.getElementById('studioUrlAccess').hidden,false);assert.equal(nodes.studioWrittenText.value,'Mi texto anterior.');
 const access=document.getElementById('studioUrlPass');access.value='fixture-private-app-code';await document.getElementById('studioUrlAccess').children[3].onclick();
 assert.equal(calls,1);assert.equal(session,'fixture-private-app-code');assert.equal(nodes.studioWrittenText.value,'Relato cargado.');assert.equal(access.value,'');assert.equal(document.getElementById('studioUrlAccess').hidden,true);
 behavior='auth';assert.equal(await window.facelessReadWrittenURL(),false);assert.equal(document.getElementById('studioUrlAccess').hidden,false);assert.equal(nodes.studioWrittenText.value,'Relato cargado.');
 behavior='slow';const pending=window.facelessReadWrittenURL();nodes.studioWrittenText.value='Mi edición manual.';nodes.studioWrittenText.listeners.input();resolveRead({title:'Otro título',text:'No sobrescribir',characters:15});assert.equal(await pending,false);assert.equal(nodes.studioWrittenText.value,'Mi edición manual.');
 const source=fs.readFileSync('scripts/discover.js','utf8'),expression=source.match(/const (?:readerAccess|studioAccess)=([^\n]+);/)[1];
 for(const field of ['facelessProductionPasscode','facelessImagePasscode','facelessVoicePassword']){const context={$id:()=>({value:''}),state:{pass:''},window:{}};if(field==='facelessProductionPasscode')context.window[field]='fixture-shared-code';else context[field]='fixture-shared-code';assert.equal(vm.runInNewContext('('+expression+')',context)(),'fixture-shared-code');}
 console.log('PASS: missing-code recovery, shared in-session credentials, retry, secret-field clearing and preservation of manual edits');
})().catch(error=>{console.error(error);process.exitCode=1;});
