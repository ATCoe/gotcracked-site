import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};

// Three independent consumers share one read; expiry refreshes and failed reads do not poison the cache.
{
  let calls=0,now=1000,resolve;
  const response={data:{settings:{store_hours:{mon:['10:00','20:00']}}}};
  const client={functions:{invoke(){calls++;return new Promise(r=>{resolve=r;});}}};
  const window={};
  vm.runInNewContext(read('supabase.js').replace(/^import\(.+$/m,''),{
    window,supabase:{createClient:()=>client},Date:{now:()=>now},setTimeout:fn=>fn(),console
  });
  const load=window.GotCrackedPublicMedia.load;
  const results=[load(),load(),load()];
  assert.equal(calls,1,'concurrent media consumers must share one request');
  resolve(response);assert.deepEqual(await Promise.all(results),[response,response,response]);
  assert.equal(await load(),response);assert.equal(calls,1);
  now+=60001;const next=load();assert.equal(calls,2);resolve(response);await next;
  now+=60001;const failed=load();resolve({error:{status:400,message:'bad request'}});
  await assert.rejects(failed);
  const recovered=load();assert.equal(calls,4,'failure must permit a fresh attempt');resolve(response);await recovered;
}

// Exercise the production scheduler against deferred requests, visibility, close, and server throttling.
{
  const source=read('customer-chat.js');
  const block=source.slice(source.indexOf('  let pollInFlight='),source.indexOf('  const launcher='));
  const timers=new Map(),events={},pageEvents={};let nextTimer=0,calls=0,resolve;
  const context={
    session:{sessionId:'audit-session',token:'audit-token'},panel:{hidden:false},document:{hidden:false,addEventListener:(n,f)=>events[n]=f},
    window:{addEventListener:(n,f)=>pageEvents[n]=f},client:{functions:{invoke(){calls++;return new Promise(r=>resolve=r);}}},
    pollTimer:null,handoffPending:false,status:{textContent:''},render(){},markHandoffReady(){},showContact(){},
    resetSession(){context.session=null;},setTimeout(fn,ms){const id=++nextTimer;timers.set(id,{fn,ms});return id;},clearTimeout(id){timers.delete(id);}
  };
  vm.createContext(context);vm.runInContext(block+'\nglobalThis.runPoll=poll;',context);
  const pending=context.runPoll();await context.runPoll();assert.equal(calls,1,'polls must never overlap');
  context.panel.hidden=true;resolve({data:{ok:true,messages:[]}});await pending;
  assert.equal(timers.size,0,'closing during an in-flight request must prevent rescheduling');
  context.panel.hidden=false;context.document.hidden=true;await context.runPoll();assert.equal(calls,1);
  context.document.hidden=false;events.visibilitychange();assert.equal(calls,2,'returning to the visible tab must resume');
  resolve({data:{ok:true,messages:[]}});await flush();assert.equal(timers.size,1);
  assert.ok([...timers.values()][0].ms>=12000);
  context.document.hidden=true;events.visibilitychange();assert.equal(timers.size,0);
  context.document.hidden=false;const failing=context.runPoll();resolve({error:{status:429,message:'rate limited'}});await failing;
  assert.equal([...timers.values()][0].ms,30000,'throttling backs off instead of hammering the service');
  const expired=context.runPoll();resolve({error:{status:410,message:'expired'}});await expired;
  assert.equal(context.session,null);assert.equal(timers.size,0,'expired sessions stop all polls');
}

// Cached assets stay usable offline; private account/API routes never enter the public offline fallback.
{
  const handlers={},saved=[];
  const cached={kind:'cached'},offlinePage={kind:'request-shell'};
  const cache={match:async key=>key==='/request.html'?offlinePage:undefined,put:async()=>{}};
  const context={
    self:{location:{origin:'https://gotcracked.co'},addEventListener:(name,fn)=>handlers[name]=fn},
    URL,fetch:async()=>{throw new Error('offline');},
    caches:{match:async()=>cached,open:async()=>cache}
  };
  vm.runInNewContext(read('customer-sw.js'),context);
  function event(url,mode='navigate',destination='document'){
    return {request:{url:'https://gotcracked.co'+url,method:'GET',mode,destination},
      respondWith(value){this.response=value;},waitUntil(value){saved.push(value);}};
  }
  for(const route of ['/account','/account.html','/account/','/api/customer-account']){
    const e=event(route);handlers.fetch(e);assert.equal(e.response,undefined,route+' must be network-only');
  }
  const asset=event('/app.js','same-origin','script');handlers.fetch(asset);assert.equal(await asset.response,cached);
  await Promise.all(saved);
  const page=event('/request');handlers.fetch(page);assert.equal(await page.response,offlinePage,'offline route must use its own cached shell');
  const networkResponse={ok:true,type:'basic',clone:()=>({})};
  context.caches.match=async()=>undefined;
  context.caches.open=async()=>({put:async()=>{throw new Error('storage unavailable');}});
  context.fetch=async()=>networkResponse;
  const uncached=event('/new.js','same-origin','script');handlers.fetch(uncached);
  assert.equal(await uncached.response,networkResponse,'cache storage failure must not break a successful network response');
}
console.log('PASS public settings coalescing, chat lifecycle/backoff, and private-route/offline service-worker behavior.');
