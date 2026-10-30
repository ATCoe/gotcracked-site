import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const sourceDirectory=process.env.GC_ACCOUNT_TEST_SOURCE?path.resolve(process.env.GC_ACCOUNT_TEST_SOURCE):fileURLToPath(new URL('../',import.meta.url));
const source=fs.readFileSync(path.join(sourceDirectory,'customer-account.js'),'utf8'),html=fs.readFileSync(path.join(sourceDirectory,'account.html'),'utf8');
const close=source.lastIndexOf('})();'),executable=source.slice(0,close)+'\nglobalThis.accountLifecycleTest={recordEstimateDecision,loadProfile,hideRepairRecords,getBundle:()=>bundle,isClosing:()=>typeof accountSessionClosing!=="undefined"&&accountSessionClosing,getChallenge:()=>challengeId};\n'+source.slice(close);
const flush=async()=>{for(let n=0;n<25;n++)await Promise.resolve();};
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return{promise,resolve};};
const repair={id:'synthetic-repair',ticket:'GC-TEST',status:'awaiting_approval',estimateRevision:'synthetic-quote',estimateCents:10000,balanceDueCents:10000,paymentStatus:'unpaid',device:{model:'Test Device'},actions:{canApprove:true,canPay:true}};
class Element{
 constructor(){this.dataset={};this.hidden=false;this.disabled=false;this.textContent='';this.value='';this.style={};this.listeners=new Map();this.children=[];this.classes=new Set();this.classList={add:n=>this.classes.add(n),remove:n=>this.classes.delete(n),contains:n=>this.classes.has(n)};}
 addEventListener(name,fn){this.listeners.set(name,fn);}appendChild(child){this.children.push(child);}insertAdjacentHTML(){}focus(){}close(){this.open=false;}showModal(){this.open=true;}
 querySelector(s){return s==='button[type="submit"]'?this.submit:s==='.account-form-status'?this.status:s==='[data-estimate-status]'?this.status:null;}
 querySelectorAll(s){return s==='[data-account-action]'?this.buttons||[]:[];}closest(){return null;}
 set innerHTML(v){this.markup=v;this.onMarkup?.(v);}get innerHTML(){return this.markup||'';}
}
async function harness({signedIn=true,search='',initialProfileGate=null}={}){
 const elements=new Map(),cards=new Map(),documentHandlers=new Map(),timers=new Map(),calls=[],toasts=[],redirects=[],cookieEvents=[];let timerId=0,cookie='initial-cookie';
 const element=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
 for(const id of ['account-auth','account-dashboard','account-signout','account-session-actions','lookup-step','verify-step','lookup-form','verify-form','customer-code','customer-identifier','verify-channel','verify-instructions','verify-back','resend-code','refresh-account','account-dialog','account-dialog-content','account-toast','active-repairs','repair-history','account-metrics','customer-greeting','customer-subtitle'])element(id);
 for(const id of ['lookup-form','verify-form']){element(id).submit=new Element();element(id).status=new Element();}
 element('verify-step').hidden=true;element('account-signout').parentElement=element('account-session-actions');element('account-session-actions').parentElement=element('main');element('account-dashboard').parentElement=element('main');
 for(const id of ['active-repairs','repair-history'])element(id).onMarkup=markup=>{
  const list=[];for(const match of markup.matchAll(/<article class="repair-card" data-ticket-id="([^"]+)">([\s\S]*?)<\/article>/g)){
   const card=new Element();card.dataset.ticketId=match[1];card.status=new Element();card.buttons=[];
   for(const buttonMarkup of match[2].matchAll(/<button\b([^>]*data-account-action="[^"]+"[^>]*)>/g)){const button=new Element();for(const [attribute,key]of[['data-account-action','accountAction'],['data-ticket','ticket'],['data-estimate-revision','estimateRevision']])button.dataset[key]=buttonMarkup[1].match(new RegExp(attribute+'="([^"]*)"'))?.[1];card.buttons.push(button);}list.push(card);
  }cards.set(id,list);
 };
 const handlers=new Map();handlers.set('profile',async()=>initialProfileGate?initialProfileGate.promise:signedIn?{status:200,data:{customer:{firstName:'Synthetic'},repairs:[structuredClone(repair)]}}:{status:401,data:{error:'Sign In'}});handlers.set('logout',async()=>({status:503,data:{error:'Connection Lost'}}));handlers.set('request_code',async()=>({status:200,data:{challengeId:'synthetic-challenge'}}));handlers.set('verify_code',async()=>({status:200,data:{ok:true}}));handlers.set('approve_estimate',async()=>({status:200,data:{message:'Decision Saved'}}));
 const context=vm.createContext({document:{head:new Element(),createElement:()=>new Element(),querySelector:s=>s.startsWith('#')?elements.get(s.slice(1))||null:null,querySelectorAll:s=>s==='.repair-card'?[...cards.values()].flat():[],addEventListener:(name,fn)=>documentHandlers.set(name,fn)},Element,console,Intl,URL,URLSearchParams,localStorage:{getItem:()=>null,removeItem(){}},location:{search,pathname:'/account',hash:'',assign:url=>redirects.push(url)},history:{replaceState(){}},matchMedia:()=>({matches:false}),setTimeout:fn=>{timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id),confirm:()=>true,fetch:async(_url,options)=>{const request=JSON.parse(options.body);calls.push(request);const response=await handlers.get(request.action)?.(request);if(!response)throw Error('Unexpected Mock Action '+request.action);if(Object.hasOwn(response,'cookie')){cookie=response.cookie;cookieEvents.push({action:request.action,cookie});}return{ok:response.status>=200&&response.status<300,status:response.status,headers:{get:()=>null},json:async()=>response.data};}});
 vm.runInContext(executable,context);await flush();
 const action=id=>elements.get(id).listeners.get('click')({currentTarget:elements.get(id)}),submit=id=>elements.get(id).listeners.get('submit')({preventDefault(){},currentTarget:elements.get(id)});
 return{api:context.accountLifecycleTest,element,handlers,calls,toasts,redirects,timers,cookieEvents,getCookie:()=>cookie,action,submit,click:target=>documentHandlers.get('click')({target}),decisionButton:()=>[...cards.values()].flat()[0]?.buttons[0],runTimer(){const [id,fn]=[...timers].at(-1)||[];if(fn){timers.delete(id);fn();}},visible(id){for(let n=element(id);n;n=n.parentElement)if(n.hidden)return false;return true;}};
}
let checks=0;async function check(label,run){await run();checks++;console.log('PASS '+label);}
for(const outcome of ['success','409','401'])await check('Old Estimate '+outcome+' Cannot Restore Hidden Records',async()=>{
 const h=await harness(),gate=deferred();h.handlers.set('approve_estimate',()=>gate.promise);const pending=h.api.recordEstimateDecision(h.decisionButton());await flush();const signingOut=h.action('account-signout');await flush();assert.equal(h.element('account-dashboard').hidden,true,'records must hide immediately, before pending request settles');
 gate.resolve(outcome==='success'?{status:200,data:{message:'Decision Saved'}}:{status:Number(outcome),data:{error:'Decision Refused'}});await Promise.all([pending,signingOut]);
 assert.equal(h.calls.filter(r=>r.action==='profile').length,1);assert.equal(h.api.getBundle(),null);assert.equal(h.element('account-dashboard').hidden,true);assert.notEqual(h.element('account-toast').textContent,'Decision Saved');
});
await check('Old Payment Return Poll Stops Before Another Profile Read',async()=>{
 const h=await harness({search:'?payment=returned&repair=synthetic-repair'});assert.equal(h.calls.filter(r=>r.action==='profile').length,2);await h.action('account-signout');for(const fn of [...h.timers.values()])fn();await flush();assert.equal(h.calls.filter(r=>r.action==='profile').length,2);assert.equal(h.element('account-dashboard').hidden,true);assert.equal(h.api.getBundle(),null);
});
await check('Old Checkout URL Cannot Redirect After Sign Out Starts',async()=>{
 const h=await harness(),gate=deferred();h.handlers.set('create_payment_checkout',()=>gate.promise);const target=new Element(),button=new Element();button.dataset.accountStartPayment=repair.id;target.closest=s=>s==='[data-account-start-payment]'?button:null;const pending=h.click(target);await flush();const signingOut=h.action('account-signout');gate.resolve({status:200,data:{checkoutUrl:'https://example.invalid/synthetic-checkout'}});await Promise.all([pending,signingOut]);assert.equal(h.redirects.length,0);
});
await check('Failed Sign Out Retry Is Reachable While Records Stay Hidden',async()=>{
 const h=await harness(),gate=deferred();h.handlers.set('logout',()=>gate.promise);const pending=h.action('account-signout');assert.equal(h.element('account-dashboard').hidden,true,'records hide before logout response');assert.equal(h.api.isClosing(),true);assert.equal(h.visible('account-signout'),true);
 gate.resolve({status:503,data:{error:'Connection Lost'}});await pending;assert.equal(h.element('account-signout').textContent,'Retry Sign-Out');assert.equal(h.visible('account-signout'),true);assert.equal(h.element('account-auth').hidden,false);assert.equal(h.element('account-dashboard').hidden,true);
 h.handlers.set('logout',async()=>({status:200,data:{ok:true,localSessionCleared:true,upstreamRevoked:false}}));await h.action('account-signout');assert.equal(h.api.isClosing(),false);assert.equal(h.visible('account-signout'),false);assert.match(h.element('account-toast').textContent,/on This Device.*Could Not Be Confirmed/);
});
await check('Private Reads And Authentication Requests Wait For Pending Or Failed Sign Out',async()=>{
 const h=await harness(),gate=deferred();h.handlers.set('logout',()=>gate.promise);const pending=h.action('account-signout'),before=h.calls.length;assert.equal(await h.api.loadProfile({quiet:true}),false);h.element('customer-identifier').value='synthetic@example.invalid';await h.submit('lookup-form');await h.submit('verify-form');await h.action('resend-code');await h.action('refresh-account');assert.equal(h.calls.length,before);
 gate.resolve({status:503,data:{error:'Connection Lost'}});await pending;await h.submit('lookup-form');assert.equal(h.calls.length,before);
});
await check('Returned Successful Decision Still Refreshes Current Account',async()=>{
 const h=await harness();await h.api.recordEstimateDecision(h.decisionButton());assert.equal(h.calls.filter(r=>r.action==='approve_estimate').length,1);assert.equal(h.calls.filter(r=>r.action==='profile').length,2);assert.equal(h.element('account-dashboard').hidden,false);assert.equal(h.element('account-toast').textContent,'Decision Saved');
});
await check('Duplicate Code Requests Are Serialized',async()=>{
 const h=await harness({signedIn:false}),gate=deferred();h.handlers.set('request_code',()=>gate.promise);h.element('customer-identifier').value='synthetic@example.invalid';const pending=h.submit('lookup-form');await h.submit('lookup-form');assert.equal(h.calls.filter(r=>r.action==='request_code').length,1);gate.resolve({status:200,data:{challengeId:'challenge-new'}});await pending;assert.equal(h.api.getChallenge(),'challenge-new');
});
await check('Back To Another Identifier Settles The Older Resend Before Starting New Authentication',async()=>{
 const h=await harness({signedIn:false});h.element('customer-identifier').value='first@example.invalid';await h.submit('lookup-form');const gate=deferred();h.handlers.set('request_code',()=>gate.promise);const pending=h.action('resend-code');await h.action('verify-back');assert.equal(h.element('verify-step').hidden,true);
 h.handlers.set('request_code',async()=>({status:200,data:{challengeId:'second-challenge'}}));h.element('customer-identifier').value='second@example.invalid';const newLookup=h.submit('lookup-form');await flush();assert.equal(h.calls.filter(r=>r.action==='request_code').length,2,'new authentication waits for the old response');gate.resolve({status:200,data:{challengeId:'obsolete-challenge'}});await Promise.all([pending,newLookup]);h.element('customer-code').value='123456';
 assert.equal(h.api.getChallenge(),'second-challenge');assert.equal(h.element('customer-code').value,'123456');assert.equal(h.element('verify-step').hidden,false);
});
await check('Verification Locks Identifier Switching And Resend Until It Returns',async()=>{
 const h=await harness({signedIn:false});h.element('customer-identifier').value='synthetic@example.invalid';await h.submit('lookup-form');const gate=deferred();h.handlers.set('verify_code',()=>gate.promise);const pending=h.submit('verify-form');await h.submit('verify-form');await h.action('verify-back');await h.action('resend-code');assert.equal(h.calls.filter(r=>r.action==='verify_code').length,1);assert.equal(h.element('verify-step').hidden,false);assert.equal(h.element('verify-back').disabled,true);assert.equal(h.element('resend-code').disabled,true);
 gate.resolve({status:400,data:{error:'Incorrect Code'}});await pending;assert.equal(h.element('verify-back').disabled,false);assert.equal(h.element('resend-code').disabled,false);assert.match(h.element('verify-form').status.textContent,/Incorrect Code/);
});
await check('Sign Out Control Is Outside Both Hidden Account Sections In Actual HTML',async()=>{
 const control=html.indexOf('id="account-signout"'),auth=html.indexOf('<section id="account-auth"'),dashboard=html.indexOf('<section id="account-dashboard"');assert.ok(control>0&&control<auth&&control<dashboard);assert.equal((html.match(/id="account-signout"/g)||[]).length,1);assert.match(html,/id="account-session-actions"[^>]+hidden/);
});
for(const kind of ['profile','verify_code'])await check('Final Cookie Clear Follows Pending '+kind+' Response',async()=>{
 const h=await harness({signedIn:kind==='profile'}),gate=deferred();let pending;
 if(kind==='verify_code'){h.element('customer-identifier').value='synthetic@example.invalid';await h.submit('lookup-form');h.handlers.set(kind,()=>gate.promise);pending=h.submit('verify-form');}
 else{h.handlers.set(kind,()=>gate.promise);pending=h.api.loadProfile({quiet:true});}
 h.handlers.set('logout',async()=>({status:200,data:{ok:true,localSessionCleared:true,upstreamRevoked:true},cookie:''}));
 const signingOut=h.action('account-signout');await flush();
 assert.equal(h.element('account-dashboard').hidden,true);assert.equal(h.element('account-signout').disabled,true);assert.equal(h.element('account-signout').textContent,'Signing Out.');assert.equal(h.calls.filter(r=>r.action==='logout').length,0,'logout must wait for a pending Set-Cookie response');
 gate.resolve({status:200,data:kind==='profile'?{repairs:[repair]}:{ok:true},cookie:'synthetic-late-cookie'});await Promise.all([pending,signingOut]);
 assert.deepEqual(h.cookieEvents.map(e=>e.action),[kind,'logout']);assert.equal(h.getCookie(),'');assert.equal(h.api.getBundle(),null);assert.equal(h.api.isClosing(),false);assert.equal(h.calls.filter(r=>r.action==='logout').length,1);assert.equal(h.calls.filter(r=>r.action==='profile').length,kind==='profile'?2:1,'obsolete verify may not start a profile request');
});
await check('Rejected Existing Request Settles Before One Logout Without Replay',async()=>{
 const h=await harness(),gate=deferred();h.handlers.set('profile',()=>gate.promise);const pending=h.api.loadProfile({quiet:true});h.handlers.set('logout',async()=>({status:200,data:{ok:true,localSessionCleared:true},cookie:''}));const signingOut=h.action('account-signout');await flush();assert.equal(h.calls.filter(r=>r.action==='logout').length,0);gate.resolve({status:503,data:{error:'Synthetic Network Failure'}});await Promise.all([pending,signingOut]);assert.equal(h.calls.filter(r=>r.action==='profile').length,2);assert.equal(h.calls.filter(r=>r.action==='logout').length,1);assert.equal(h.getCookie(),'');assert.equal(h.element('account-dashboard').hidden,true);
});
await check('New Lookup Supersedes A Pending Old Profile Before New Verification',async()=>{
 const gate=deferred(),h=await harness({initialProfileGate:gate});h.element('customer-identifier').value='second@example.invalid';const newLookup=h.submit('lookup-form');await flush();assert.equal(h.element('account-dashboard').hidden,true);assert.equal(h.calls.filter(r=>r.action==='request_code').length,0,'old migration settles before new authentication begins');
 gate.resolve({status:200,data:{customer:{firstName:'Old'},repairs:[repair]},cookie:'old-account-cookie'});await newLookup;await flush();assert.equal(h.element('customer-greeting').textContent,'');assert.equal(h.element('account-dashboard').hidden,true);assert.equal(h.element('verify-step').hidden,false);assert.equal(h.api.getChallenge(),'synthetic-challenge');
 h.handlers.set('verify_code',async()=>({status:200,data:{ok:true},cookie:'new-account-cookie'}));h.handlers.set('profile',async()=>({status:200,data:{customer:{firstName:'New'},repairs:[repair]}}));h.element('customer-code').value='123456';await h.submit('verify-form');assert.equal(h.getCookie(),'new-account-cookie');assert.equal(h.element('customer-greeting').textContent,'Hi, New.');assert.equal(h.element('account-dashboard').hidden,false);assert.equal(h.calls.filter(r=>r.action==='request_code').length,1);assert.equal(h.calls.filter(r=>r.action==='verify_code').length,1);
});
console.log(JSON.stringify({ok:true,scenarios:checks,source:'Candidate Actual Account Module And HTML',network:'Synthetic Fetch Only',liveMessages:0,livePayments:0}));
