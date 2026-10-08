const SUPABASE_URL = 'https://uvpmmbioerejeyybfntb.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_CmcUD2ze8lhj4HvlMfoYiQ_DGG_xabb';
window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
// Retry only callers that explicitly identify an operation as safe to repeat.
// Customer requests and account actions must never be replayed automatically.
window.GotCrackedSupabaseResilience = (() => {
  const failures = new Map(), threshold = 3, cooldown = 30000;
  const retryable = error => { const status=Number(error?.status||error?.context?.status||0); return !status||status===408||status===429||status>=500||/network|fetch|timeout|temporar/i.test(String(error?.message||error)); };
  async function run(name, operation, {attempts=3}={}) {
    const prior=failures.get(name);
    if(prior?.openUntil>Date.now()){const error=new Error('This service is temporarily unavailable. Please try again shortly.');error.code='GC_SUPABASE_CIRCUIT_OPEN';throw error;}
    let last;
    for(let attempt=0;attempt<attempts;attempt++){try{const result=await operation();if(result?.error)throw result.error;failures.delete(name);return result;}catch(error){last=error;if(!retryable(error)||attempt+1===attempts)break;await new Promise(resolve=>setTimeout(resolve,220*(2**attempt)));}}
    const count=(prior?.count||0)+1;failures.set(name,{count,openUntil:count>=threshold?Date.now()+cooldown:0});throw last;
  }
  return {run,retryable,version:'1.0.0'};
})();
// Public, non-personal settings share one request per page and refresh after a minute.
window.GotCrackedPublicMedia = (() => {
  let pending = null, cached = null, expiresAt = 0;
  async function load() {
    if (cached && Date.now() < expiresAt) return cached;
    if (pending) return pending;
    pending = window.GotCrackedSupabaseResilience.run('public-media',
      () => window.supabaseClient.functions.invoke('public-media', { method: 'GET' }),
      { attempts: 2 }
    ).then(result => {
      cached = result;
      expiresAt = Date.now() + 60000;
      return result;
    }).finally(() => { pending = null; });
    return pending;
  }
  return { load };
})();
import('./analytics-loader.js?v=20261008-production1').catch(error => console.warn('Analytics loader unavailable:', error));
