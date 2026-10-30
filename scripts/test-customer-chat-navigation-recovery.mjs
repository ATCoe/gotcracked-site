import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=file=>readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
class Node{
  constructor(){this.hidden=false;this.disabled=false;this.required=false;this.value='';this.textContent='';this.innerHTML='';this.childNodes=[];this.listeners={};this.attributes={};this.classes=new Set();this.classList={add:name=>this.classes.add(name),remove:name=>this.classes.delete(name),contains:name=>this.classes.has(name),toggle:(name,on)=>on?this.classes.add(name):this.classes.delete(name)};}
  addEventListener(name,handler){this.listeners[name]=handler;}
  setAttribute(name,value){this.attributes[name]=value;}
  append(){}
  focus(){this.focused=true;}
  closest(){return null;}
  contains(node){return node===this.child;}
}
const settle=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
function chatHarness(){
  const form=new Node(),messages=new Node(),panel=new Node(),launcher=new Node(),name=new Node(),email=new Node(),human=new Node(),close=new Node(),submit=new Node();
  panel.hidden=true;form.elements=Object.fromEntries(['name','email','phone','message','preferredContact'].map(key=>[key,new Node()]));
  form.elements.name.required=true;form.elements.message.required=true;form.elements.message.value='A Test Question';
  form.querySelector=()=>submit;form.reset=()=>{for(const field of Object.values(form.elements))field.value='';};
  form.nativeSubmit=async()=>{if(Object.values(form.elements).some(field=>field.required&&!field.value))return false;await form.listeners.submit({preventDefault(){}});return true;};
  const selectors={'.gc-chat-panel':panel,'.gc-chat-messages':messages,'.gc-chat-form':form,'.gc-chat-status':new Node(),'.gc-chat-contact':new Node(),'.gc-chat-human':human,'.gc-chat-launcher':launcher,'.gc-chat-close':close,'.gc-chat-name':name,'.gc-chat-email':email};
  messages.parentElement={scrollTop:0,scrollHeight:100};
  const document={hidden:false,activeElement:launcher,listeners:{},body:{append(){}},createElement:()=>new Node(),querySelector:selector=>selectors[selector]||null,querySelectorAll:()=>[],getElementById:()=>null,addEventListener(name,fn){this.listeners[name]=fn;}};
  const session={sessionId:'test-session',token:'test-only-token',createdAt:Date.now()};
  const calls=[],timers=[];let resolveSend;
  const client={functions:{invoke:async(_name,{body})=>{calls.push(body);if(body.action==='send')await new Promise(done=>{resolveSend=done;});return{data:{ok:true,messages:[]}};}}};
  vm.runInNewContext(read('customer-chat.js'),{document,window:{supabaseClient:client},location:{search:'',pathname:'/'},URLSearchParams,Element:Node,Date,localStorage:{getItem:()=>JSON.stringify(session),setItem(){},removeItem(){}},setTimeout(fn){timers.push(fn);return timers.length;},clearTimeout(){},FormData:class{constructor(){return Object.entries(form.elements).map(([key,field])=>[key,field.value]);}}});
  return{form,name,email,panel,launcher,close,calls,timers,document,finishSend:()=>resolveSend()};
}
const chat=chatHarness();chat.launcher.listeners.click();await settle();
assert.equal(chat.name.hidden,true);assert.equal(chat.email.hidden,true);assert.equal(chat.form.elements.name.required,false,'an existing chat must not be blocked by an empty hidden required name');
const sending=chat.form.nativeSubmit();await settle();
assert.equal(chat.calls.filter(call=>call.action==='send').length,1,'native validation must allow a restored chat to send');
await chat.form.listeners.submit({preventDefault(){}});assert.equal(chat.calls.filter(call=>call.action==='send').length,1,'pending sends must not submit twice');
chat.finishSend();assert.equal(await sending,true);await settle();
const beforeHidden=chat.calls.filter(call=>call.action==='poll').length;
chat.document.hidden=true;await chat.timers.filter(fn=>fn.name==='poll').at(-1)();
assert.equal(chat.calls.filter(call=>call.action==='poll').length,beforeHidden,'hidden documents must not poll');
chat.document.hidden=false;chat.document.listeners.visibilitychange();await settle();
assert.equal(chat.calls.filter(call=>call.action==='poll').length,beforeHidden+1,'visible open chat must resume polling');
chat.close.listeners.click();const beforeClosed=chat.calls.length;chat.document.listeners.visibilitychange();await settle();assert.equal(chat.calls.length,beforeClosed,'minimized chat must not restart polling');
assert.match(read('customer-chat.js'),/role="dialog" aria-modal="false"/,'the non-blocking chat panel must not claim modal behavior');
for(const page of ['index.html','request.html','appointment.html','pc-build.html','learn.html'])assert.match(read(page),/customer-chat\.js\?v=20261029-chat-recovery1/,`${page}: restored-chat runtime`);
assert.match(read('learn.html'),/learn\.js\?v=20261030-unavailable-copy1/);

const learn=read('learn.js'),menu=new Node(),nav=new Node(),body=new Node(),link=new Node(),docListeners={},windowListeners={};let narrow=true;
const document={body,activeElement:null,addEventListener(name,fn){docListeners[name]=fn;}};
nav.child=link;
vm.runInNewContext(learn.slice(learn.indexOf('  const menu ='),learn.indexOf('  function renderSponsor')),{$:selector=>selector==='.menu-button'?menu:nav,$$:()=>[link],window:{matchMedia:()=>({matches:narrow}),addEventListener(name,fn){windowListeners[name]=fn;}},document,Element:Node});
menu.listeners.click();assert.equal(menu.attributes['aria-label'],'Close Menu');assert.equal(menu.attributes['aria-expanded'],'true');
document.activeElement=link;docListeners.keydown({key:'Escape'});assert.equal(menu.attributes['aria-label'],'Open Menu');assert.equal(menu.focused,true,'Escape must return focus before hiding a focused navigation link');
menu.listeners.click();docListeners.click({target:new Node()});assert.equal(menu.attributes['aria-expanded'],'false');
menu.listeners.click();narrow=false;windowListeners.resize();assert.equal(nav.classList.contains('open'),false);assert.equal(body.classList.contains('nav-open'),false);
console.log(JSON.stringify({ok:true,restoredChatCases:4,mobileMenuCases:4,backend:'mocked',realMessages:0}));
