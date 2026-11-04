import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../supabase.js',import.meta.url),'utf8');
let calls=0,options;
const window={fetch:async()=>{calls++;return new Response('fixture',{status:calls%2?503:200});},dispatchEvent(){}};
const ctx={window,document:{addEventListener(){}},location:{href:'https://gotcracked.co/'},URL,Response,TypeError,Math,Date,CustomEvent:class{},setTimeout:fn=>{queueMicrotask(fn);return 1;},clearTimeout(){},supabase:{createClient:(_url,_key,config)=>{options=config;return {fixture:true};}},console};
vm.runInNewContext(source.split("import('./analytics-loader.js")[0],ctx);
assert.equal(window.supabaseClient.fixture,true);
assert.equal(options.db.retry,false,'SDK must not automatically replay arbitrary POSTs');
assert.equal(window.GotCrackedSupabaseResilience.version,'20261104-safe-read-retries1');
const base='https://uvpmmbioerejeyybfntb.supabase.co';
assert.equal((await window.fetch(base+'/rest/v1/example')).status,200);assert.equal(calls,2,'safe GET recovers');
for(const path of ['/functions/v1/create-lead','/functions/v1/customer-account','/rest/v1/rpc/approve_estimate','/auth/v1/token']){
 const before=calls;await window.fetch(base+path,{method:'POST',body:'{}'});assert.equal(calls-before,1,'customer/auth mutation never replayed: '+path);
}
console.log('PASS customer-site shared transport bootstrap, safe-read retry and customer/auth write exclusions; synthetic requests only.');
