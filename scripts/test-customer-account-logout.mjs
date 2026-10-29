import assert from 'node:assert/strict';
import {onRequestPost,onRequest} from '../functions/api/customer-account.js';
const COOKIE='__Host-gc_customer_session';
let checks=0,calls=[];
const equal=(a,b,message)=>{assert.deepEqual(a,b,message);checks++;};
const match=(value,re)=>{assert.match(value,re);checks++;};
const request=(action,headers={},raw)=>new Request('https://gotcracked.co/api/customer-account',{
  method:'POST',headers:{Origin:'https://gotcracked.co','Content-Type':'application/json',...headers},body:raw??JSON.stringify({action})
});
const run=async(action,headers={},raw)=>onRequestPost({request:request(action,headers,raw)});
function provider(fn){calls=[];globalThis.fetch=async(url,init)=>{calls.push({url,init});assert.equal(url,'https://uvpmmbioerejeyybfntb.supabase.co/functions/v1/customer-account');return fn(url,init);};}
async function cleared(response,revoked){
  equal(response.status,200);
  const data=await response.json();equal(data.ok,true);equal(data.localSessionCleared,true);equal(data.upstreamRevoked,revoked);
  const cookie=response.headers.get('Set-Cookie');match(cookie,/^__Host-gc_customer_session=; Path=\/; Max-Age=0; Secure; HttpOnly; SameSite=Strict$/);
  equal(response.headers.get('Cache-Control'),'no-store, max-age=0');
  if(revoked)equal('warning' in data,false);else match(data.warning,/Signed Out On This Browser.*Revocation Could Not Be Confirmed/);
}
const token='synthetic-customer-session-token-0000000000001';
for(const [name,fn]of[
 ['network failure',async()=>{throw new Error('Network unavailable');}],
 ['provider unavailable',async()=>Response.json({error:'Unavailable'},{status:503})],
 ['invalid JSON',async()=>new Response('<html>bad</html>',{status:200})],
 ['empty response',async()=>new Response('',{status:200})],
 ['body read failure',async()=>({ok:true,json:async()=>{throw new Error('Body read failed');}})],
 ['upstream failure despite ok payload',async()=>Response.json({ok:true},{status:400})],
 ['unconfirmed false',async()=>Response.json({ok:false})],
 ['null payload',async()=>Response.json(null)],
 ['string payload',async()=>Response.json('ok')]
]){
 provider(fn);await cleared(await run('logout',{Cookie:`${COOKIE}=${token}`}),false);
 equal(calls.length,1,name);equal(calls[0].init.headers['x-customer-session'],token);
 equal(calls[0].init.body,JSON.stringify({action:'logout'}));
}
provider(async()=>Response.json({ok:true}));await cleared(await run('logout',{Cookie:`${COOKIE}=${token}`}),true);
provider(async()=>Response.json({ok:true}));await cleared(await run('logout',{Cookie:`${COOKIE}=%E0%A4%A`}),true);
equal(calls[0].init.headers['x-customer-session'],undefined,'malformed cookie cannot prevent clearing');
provider(async()=>Response.json({ok:true}));await cleared(await run('logout',{'x-legacy-customer-session':token}),true);
equal(calls[0].init.headers['x-customer-session'],token);
provider(async()=>Response.json({ok:true}));await cleared(await run('logout'),true);
equal(calls[0].init.headers['x-customer-session'],undefined);
// Bound both response-header and response-body waits, even if a fetch mock
// ignores its AbortSignal. No real timers longer than 15ms run in this test.
const originalSetTimeout=globalThis.setTimeout;
try{
 globalThis.setTimeout=(fn,ms,...args)=>originalSetTimeout(fn,Math.min(ms,15),...args);
 for(const fn of[async()=>new Promise(()=>{}),async()=>({ok:true,json:async()=>new Promise(()=>{})})]){
  provider(fn);await cleared(await run('logout',{Cookie:`${COOKIE}=${token}`}),false);equal(calls[0].init.signal.aborted,true);
 }
}finally{globalThis.setTimeout=originalSetTimeout;}
provider(async()=>{throw new Error('Must not call upstream');});
for(const [headers,raw,status]of[
 [{Origin:'https://evil.example'},undefined,403],
 [{'Content-Type':'text/plain'},undefined,415],
 [{},'{invalid-json',400],
 [{},JSON.stringify({action:'unknown'}),400]
]){
 const response=await run('logout',headers,raw);equal(response.status,status);equal(response.headers.get('Set-Cookie'),null);
}
equal(calls.length,0,'origin/content/action checks run before any signout operation');
equal(onRequest().status,405);
provider(async()=>Response.json({ok:true,sessionToken:token,expiresAt:'2099-01-01'}));
{
 const response=await run('verify_code');equal(response.status,200);const data=await response.json();equal(data.sessionToken,undefined);equal(data.expiresAt,'2099-01-01');
 match(response.headers.get('Set-Cookie'),/^__Host-gc_customer_session=synthetic-customer-session-token-0000000000001; Path=\/; Max-Age=604800; Secure; HttpOnly; SameSite=Strict$/);
}
provider(async()=>Response.json({ok:true}));equal((await run('verify_code')).status,502);
provider(async()=>Response.json({customer:{firstName:'Synthetic'},repairs:[]}));
{
 const response=await run('profile',{Cookie:`${COOKIE}=${token}`});equal(response.status,200);equal(response.headers.get('Set-Cookie'),null);equal((await response.json()).customer.firstName,'Synthetic');
}
provider(async()=>Response.json({customer:{firstName:'Synthetic'},repairs:[]}));
{
 const response=await run('profile',{'x-legacy-customer-session':token});equal(response.status,200);equal(response.headers.get('X-GotCracked-Session-Migrated'),'1');match(response.headers.get('Set-Cookie'),/Max-Age=604800/);
}
provider(async()=>Response.json({error:'Expired'},{status:401}));
{
 const response=await run('profile',{Cookie:`${COOKIE}=${token}`});equal(response.status,401);match(response.headers.get('Set-Cookie'),/Max-Age=0/);
}
provider(async()=>{throw new Error('Network unavailable');});
{
 const response=await run('profile',{Cookie:`${COOKIE}=${token}`});equal(response.status,503);equal(response.headers.get('Set-Cookie'),null);
}
console.log(`PASS ${checks} customer-account proxy logout and preserved-session checks; mocked upstream only.`);
