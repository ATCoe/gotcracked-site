// Shared safe-read transport; canonical source: gotcracked-portal/supabase-resilience.js.
(() => {
  'use strict';
  if (window.GotCrackedSupabaseResilience) return;
  const failures=new Map(),threshold=3,cooldown=30000;
  let generation=0,installedOrigin='';
  const canceled=error=>error?.name==='AbortError'&&!/timed?\s*out/i.test(String(error?.message||''));
  const retryable=error=>{
    if(canceled(error))return false;
    const status=Number(error?.status||error?.context?.status||0);
    if(status)return status===408||status===429||status>=500;
    if(/^(?:[0-9A-Z]{5}|PGRST\d+)$/i.test(String(error?.code||'')))return false;
    return error instanceof TypeError||error?.name==='TypeError'||/failed to fetch|fetch failed|network|timed?\s*out|timeout|temporarily unavailable|connection reset/i.test(String(error?.message||error));
  };
  function abortError(){const error=new Error('Request canceled.');error.name='AbortError';return error;}
  function circuitError(){const error=new Error('This service is temporarily unavailable. Please try again shortly.');error.code='GC_SUPABASE_CIRCUIT_OPEN';return error;}
  function pause(ms,signal){
    return new Promise((resolve,reject)=>{
      if(signal?.aborted){reject(signal.reason||abortError());return;}
      const done=()=>{signal?.removeEventListener?.('abort',abort);resolve();};
      const timer=setTimeout(done,ms);
      const abort=()=>{clearTimeout(timer);signal?.removeEventListener?.('abort',abort);reject(signal.reason||abortError());};
      signal?.addEventListener?.('abort',abort,{once:true});
    });
  }
  async function run(name,operation,{attempts=3,signal}={}){
    const key=String(name),started=generation,max=Math.max(1,Math.min(3,Math.floor(Number(attempts)||1)));
    const prior=failures.get(key),probe=Boolean(prior?.openUntil);
    if(prior?.openUntil>Date.now()||prior?.probing)throw circuitError();
    if(probe)prior.probing=true;
    let last;
    try{
      for(let attempt=0;attempt<max;attempt++){
        if(started!==generation)throw abortError();
        if(signal?.aborted)throw signal.reason||abortError();
        try{
          const result=await operation(attempt);
          if(result?.error)throw result.error;
          if(started===generation)failures.delete(key);
          return result;
        }catch(error){
          last=error;
          if(!retryable(error)||attempt+1===max||started!==generation||signal?.aborted)break;
          await pause(Math.round(220*(2**attempt)*(0.75+Math.random()*0.5)),signal);
        }
      }
      if(started===generation&&!signal?.aborted&&retryable(last)){
        const count=(failures.get(key)?.count||0)+1;
        if(failures.size>=100&&!failures.has(key))failures.delete(failures.keys().next().value);
        failures.set(key,{count,openUntil:count>=threshold?Date.now()+cooldown:0});
        if(count>=threshold&&typeof CustomEvent!=='undefined')window.dispatchEvent?.(new CustomEvent('gotcracked:supabase-circuit',{detail:{name:key,open:true}}));
      }else if(started===generation&&!retryable(last))failures.delete(key);
      throw last;
    }finally{if(prior)prior.probing=false;}
  }
  const readRpcs=new Set(['has_permission','get_warranty_policy','get_time_clock_state','get_sales_day_summary','get_business_day_state','get_schedule_management_summary','get_schedule_employee_summary','get_schedule_actuals','list_trusted_workstations']);
  function eligible(input,init,origin){
    let url;try{url=new URL(typeof input==='string'?input:input?.url||String(input),location.href);}catch{return null;}
    if(url.origin!==origin)return null;
    const method=String(init?.method||input?.method||'GET').toUpperCase();
    if(['GET','HEAD'].includes(method)&&url.pathname.startsWith('/rest/v1/'))return {url,method};
    if(method==='POST'&&url.pathname.startsWith('/rest/v1/rpc/')&&readRpcs.has(url.pathname.slice('/rest/v1/rpc/'.length)))return {url,method};
    return null;
  }
  function createFetch(raw,origin){
    return async function resilientReadFetch(input,init){
      const read=eligible(input,init,origin);
      if(!read)return raw(input,init);
      const signal=init?.signal||input?.signal,key=read.method+' '+read.url.origin+read.url.pathname;
      try{
        return await run(key,async attempt=>{
          const response=await raw(input,init);
          if(!retryable({status:response.status}))return response;
          const error=new Error('HTTP '+response.status);error.status=response.status;error.response=response;
          if(attempt<2)try{await response.body?.cancel();}catch{}
          throw error;
        },{attempts:3,signal});
      }catch(error){if(error?.response)return error.response;throw error;}
    };
  }
  function installFetch(origin){
    const allowed=new URL(origin).origin;
    if(installedOrigin){if(installedOrigin!==allowed)throw new Error('The resilience client is already configured.');return;}
    if(typeof window.fetch!=='function')return;
    window.fetch=createFetch(window.fetch.bind(window),allowed);installedOrigin=allowed;
  }
  const clear=()=>{generation++;failures.clear();};
  if(typeof document!=='undefined')for(const name of ['gc-staff-profile-updated','gc-workstation-operator-changed','gc-store-mode-changed','gc-portal-signed-out'])document.addEventListener?.(name,clear);
  window.GotCrackedSupabaseResilience=Object.freeze({run,retryable,createFetch,installFetch,clear,version:'20261104-safe-read-retries1'});
})();

const SUPABASE_URL = 'https://uvpmmbioerejeyybfntb.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_CmcUD2ze8lhj4HvlMfoYiQ_DGG_xabb';
window.GotCrackedSupabaseResilience.installFetch(SUPABASE_URL);
window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {db:{retry:false}});
import('./analytics-loader.js?v=20260826-production1').catch(error => console.warn('Analytics loader unavailable:', error));
