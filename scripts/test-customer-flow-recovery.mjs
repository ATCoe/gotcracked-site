import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=file=>readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
class Node {
  constructor(){this.listeners={};this.dataset={};this.hidden=false;this.disabled=false;this.value='';this.textContent='';this.innerHTML='';this.attributes={};this.classes=new Set();this.classList={add:name=>this.classes.add(name),remove:name=>this.classes.delete(name),toggle:(name,on)=>on?this.classes.add(name):this.classes.delete(name),contains:name=>this.classes.has(name)};}
  addEventListener(name,fn){this.listeners[name]=fn;}
  setAttribute(name,value){this.attributes[name]=value;}
  removeAttribute(name){delete this.attributes[name];}
  focus(){this.focused=true;}
  scrollIntoView(){}
}
function pcHarness({failure=null,pending=false}={}){
  const form=new Node(),submit=new Node(),gaming=new Node(),research=new Node(),result=new Node(),error=new Node();
  const steps=Array.from({length:4},(_,i)=>{const step=new Node();step.classList.toggle('active',i===0);return step;});
  const progress=steps.map(()=>new Node()),next=steps.slice(0,3).map(()=>new Node()),back=steps.slice(1).map(()=>new Node()),startOver=new Node();
  const fields=Object.fromEntries([['primaryUse',0],['gamingIncluded',0],['games',0],['resolution',0],['targetFps',0],['imageQuality',0],['budget',1],['rgb',2],['customerName',3],['customerEmail',3],['customerPhone',3],['consent',3],['formStartedAt',-1]].map(([name,step])=>{const field=new Node();field.name=name;field.step=step;field.valid=true;field.required=step>=0;field.checkValidity=()=>!field.required||field.valid;field.closest=()=>['games','resolution','targetFps','imageQuality'].includes(name)&&gaming.hidden?gaming:null;return[name,field];}));
  fields.gamingIncluded.value='no';form.elements=fields;
  for(let index=0;index<steps.length;index++)steps[index].querySelectorAll=()=>Object.values(fields).filter(field=>field.step===index&&field.required);
  form.querySelectorAll=selector=>selector==='.pc-step'?steps:selector==='.pc-progress span'?progress:selector==='[data-next]'?next:selector==='[data-back]'?back:selector==='.invalid,[aria-invalid]'?Object.values(fields).filter(field=>field.classes.has('invalid')||Object.hasOwn(field.attributes,'aria-invalid')):[];
  form.querySelector=()=>submit;form.reset=()=>{fields.gamingIncluded.value='no';};result.querySelector=()=>startOver;
  const nodes={'pc-build-form':form,'pc-research':research,'pc-result':result,'pc-build-error':error};
  const calls=[];let resolve;
  const invoke=async(_endpoint,options)=>{calls.push(options.body);if(pending)await new Promise(done=>{resolve=done;});if(failure==='network')throw new Error('Network Failed');if(failure==='validation')return {error:{context:{status:400,json:async()=>({error:'Choose a valid budget.'})}}};return {data:{ok:true,status:'research_unavailable',reference:'PC-TEST-ONLY'}};};
  vm.runInNewContext(read('pc-build.js'),{document:{getElementById:id=>nodes[id],querySelector:selector=>selector==='.pc-gaming-fields'?gaming:new Node()},window:{supabaseClient:{functions:{invoke}}},Date,Intl,matchMedia:()=>({matches:true}),scrollTo(){},setInterval:()=>1,clearInterval(){},FormData:class{constructor(){return Object.entries(fields).map(([name,field])=>[name,field.value]);}}});
  return {fields,submit,result,error,startOver,calls,steps,finish:()=>resolve(),send:()=>form.listeners.submit({preventDefault(){}}),current:()=>steps.findIndex(step=>step.classes.has('active'))};
}
const pc=pcHarness({pending:true});
await pc.send();assert.equal(pc.current(),1);await pc.send();assert.equal(pc.current(),2);await pc.send();assert.equal(pc.current(),3);assert.equal(pc.calls.length,0,'Enter on each early survey step must not send a build');
pc.fields.budget.valid=false;await pc.send();assert.equal(pc.current(),1);assert.equal(pc.fields.budget.focused,true);assert.equal(pc.fields.budget.attributes['aria-invalid'],'true');assert.equal(pc.calls.length,0,'final submit must revalidate hidden earlier steps');
pc.fields.budget.valid=true;await pc.send();await pc.send();
const sending=pc.send();await pc.send();assert.equal(pc.calls.length,1,'in-flight keyboard submits must be ignored');assert.equal(pc.submit.disabled,true);assert.equal(Object.hasOwn(pc.calls[0],'clientRequestId'),false,'frontend must not invent a backend idempotency contract');pc.finish();await sending;
assert.equal(pc.result.classes.has('active'),true);assert.equal(pc.submit.disabled,false);pc.startOver.listeners.click();assert.equal(pc.current(),0);assert.equal(pc.fields.budget.attributes['aria-invalid'],undefined);
for(const [failure,message] of [['validation',/valid budget/],['network',/could not confirm whether.*saved.*call.*before sending it again/i]]){
  const page=pcHarness({failure});for(let i=0;i<4;i++)await page.send();assert.match(page.error.textContent,message);assert.equal(page.calls.length,1,'failed requests must not auto-retry');assert.equal(page.error.focused,true);
}
const pcHtml=read('pc-build.html');assert.equal((pcHtml.match(/id="pc-build-error"/g)||[]).length,1);assert.ok(pcHtml.indexOf('id="pc-build-error"')<pcHtml.indexOf('<section class="pc-step'),'survey validation status must be visible on every step');assert.match(pcHtml,/RGB Lighting/);

const accountSource=read('customer-account.js');
const helper=accountSource.split('\n').find(line=>line.startsWith('function hideRepairRecords()'));
const logout=accountSource.slice(accountSource.indexOf("SIGNOUT?.addEventListener('click'"),accountSource.indexOf("\ndocument.addEventListener('click'"));
async function logoutCase(response,reject=false){
  const button=new Node(),lookup=new Node(),dashboard=new Node(),records=new Map(['#active-repairs','#repair-history','#account-metrics','#customer-greeting','#customer-subtitle'].map(selector=>{const node=new Node();node.textContent='Private Repair';return[selector,node];}));
  let calls=0;const removed=[],toasts=[];
  const context={SIGNOUT:button,bundle:{private:true},accountViewRevision:0,DIALOG_CONTENT:new Node(),closeDialog(){},SESSION_KEY:'test-session',legacyToken:'old-session',$:selector=>selector==='#lookup-form'?lookup:records.get(selector),api:async()=>{calls++;if(reject)throw new Error('Offline');return response;},localStorage:{removeItem:key=>removed.push(key)},showAuth(){dashboard.hidden=true;button.hidden=true;},showLookup(){},busy(node,on){node.disabled=on;},toast:message=>toasts.push(message),setStatus(_form,message){lookup.textContent=message;}};
  vm.runInNewContext(helper+'\n'+logout,context);await button.listeners.click();return{button,lookup,dashboard,records,removed,toasts,calls,context};
}
const cleared=await logoutCase({ok:true,localSessionCleared:true,upstreamRevoked:true});assert.equal(cleared.button.hidden,true);assert.equal(cleared.context.bundle,null);assert.equal(cleared.removed.length,1);assert.equal(cleared.toasts[0],'Signed Out.');
const localOnly=await logoutCase({ok:true,localSessionCleared:true,upstreamRevoked:false});assert.match(localOnly.toasts[0],/on This Device.*Could Not Be Confirmed/);
assert.equal(cleared.context.accountViewRevision,1,'sign-out must invalidate any profile read already in flight');
for(const [response,reject] of [[{},true],[{ok:true},false]]){
  const failed=await logoutCase(response,reject);assert.equal(failed.button.hidden,false);assert.equal(failed.button.textContent,'Retry Sign-Out');assert.equal(failed.dashboard.hidden,true);assert.equal(failed.context.bundle,null);assert.equal(failed.toasts.length,0,'failure must not claim signed out');assert.match(failed.lookup.textContent,/could not be confirmed.*Retry Sign-Out/);assert.ok([...failed.records.values()].every(node=>node.textContent===''));
}
const cancellation=accountSource.split('\n').find(line=>line.startsWith('async function handlePaymentReturn()'));
const notices=[];vm.runInNewContext(cancellation+'\nhandlePaymentReturn();',{paymentReturnHandled:false,PAYMENT_RETURN:'cancelled',history:{replaceState(){}},location:{pathname:'/account',hash:''},toast:message=>notices.push(message)});
assert.match(notices[0],/Checkout Was Closed/);assert.doesNotMatch(notices[0],/no payment|unpaid|charged|recorded|paid/i);
let finishProfile,rendered=0;
const profileContext={accountViewRevision:0,bundle:null,api:()=>new Promise(resolve=>{finishProfile=resolve;}),render(){rendered++;},toast(){}};
vm.runInNewContext(accountSource.split('\n').find(line=>line.startsWith('async function loadProfile(')),profileContext);
const lateProfile=profileContext.loadProfile({quiet:true});profileContext.accountViewRevision++;finishProfile({repairs:[{private:true}]});assert.equal(await lateProfile,false);assert.equal(rendered,0,'an old profile response must never restore repairs after sign-out');assert.equal(profileContext.bundle,null);
console.log(JSON.stringify({ok:true,pcRecoveryScenarios:6,logoutScenarios:4,cancellationCopyCases:1,backend:'mocked',realLeads:0,realMessages:0,realPayments:0}));
