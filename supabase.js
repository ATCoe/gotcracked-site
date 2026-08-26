const SUPABASE_URL = 'https://uvpmmbioerejeyybfntb.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_CmcUD2ze8lhj4HvlMfoYiQ_DGG_xabb';
window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
import('./analytics-loader.js?v=20260826-production1').catch(error => console.warn('Analytics loader unavailable:', error));
