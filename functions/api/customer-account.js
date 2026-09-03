const UPSTREAM = 'https://uvpmmbioerejeyybfntb.supabase.co/functions/v1/customer-account';
const PUBLISHABLE_KEY = 'sb_publishable_CmcUD2ze8lhj4HvlMfoYiQ_DGG_xabb';
const COOKIE = '__Host-gc_customer_session';
const SESSION_SECONDS = 7 * 24 * 60 * 60;
const ALLOWED_ACTIONS = new Set([
  'request_code',
  'verify_code',
  'profile',
  'create_payment_checkout',
  'approve_estimate',
  'decline_estimate',
  'logout'
]);

const json = (body, status = 200, extraHeaders = {}) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'",
    ...extraHeaders
  }
});

function cookieValue(request, name) {
  const prefix = `${name}=`;
  for (const part of (request.headers.get('Cookie') || '').split(';')) {
    const value = part.trim();
    if (value.startsWith(prefix)) return decodeURIComponent(value.slice(prefix.length));
  }
  return '';
}

function sessionCookie(token) {
  return `${COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${SESSION_SECONDS}; Secure; HttpOnly; SameSite=Strict`;
}

function expiredCookie() {
  return `${COOKIE}=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Strict`;
}

export async function onRequestPost({ request }) {
  const origin = request.headers.get('Origin');
  if (origin !== 'https://gotcracked.co') return json({ error: 'Origin not allowed.' }, 403);
  if (!(request.headers.get('Content-Type') || '').toLowerCase().startsWith('application/json')) {
    return json({ error: 'Content type must be application/json.' }, 415);
  }

  const raw = await request.text();
  if (!raw || raw.length > 64 * 1024) return json({ error: 'Invalid request body.' }, 400);

  let body;
  try { body = JSON.parse(raw); }
  catch { return json({ error: 'Invalid JSON.' }, 400); }

  const action = String(body?.action || '').trim();
  if (!ALLOWED_ACTIONS.has(action)) return json({ error: 'Unknown action.' }, 400);

  const cookieToken = cookieValue(request, COOKIE);
  const legacyToken = String(request.headers.get('x-legacy-customer-session') || '').trim();
  const sessionToken = cookieToken || (legacyToken.length >= 30 && legacyToken.length <= 512 ? legacyToken : '');
  const upstreamHeaders = {
    apikey: PUBLISHABLE_KEY,
    'Content-Type': 'application/json',
    Origin: 'https://gotcracked.co'
  };
  if (sessionToken) upstreamHeaders['x-customer-session'] = sessionToken;

  let upstream;
  try {
    upstream = await fetch(UPSTREAM, { method: 'POST', headers: upstreamHeaders, body: raw });
  } catch {
    return json({ error: 'The GotCracked customer account is temporarily unavailable. Please try again.' }, 503);
  }

  const text = await upstream.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; }
  catch { data = { error: 'The customer account returned an invalid response.' }; }

  const responseHeaders = {};
  if (action === 'verify_code' && upstream.ok) {
    const issued = String(data?.sessionToken || '');
    if (issued.length < 30 || issued.length > 512) return json({ error: 'Unable to establish a secure customer session.' }, 502);
    responseHeaders['Set-Cookie'] = sessionCookie(issued);
    delete data.sessionToken;
  } else if (legacyToken && upstream.ok && action === 'profile') {
    responseHeaders['Set-Cookie'] = sessionCookie(legacyToken);
    responseHeaders['X-GotCracked-Session-Migrated'] = '1';
  }

  if (action === 'logout' || upstream.status === 401) responseHeaders['Set-Cookie'] = expiredCookie();
  return json(data, upstream.status, responseHeaders);
}

export function onRequest() {
  return json({ error: 'Method not allowed.' }, 405, { Allow: 'POST' });
}

