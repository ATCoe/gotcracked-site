/*
 * The production kiosk is served from https://gotcracked.co/kiosk/ and uses
 * the same public-intake Edge Function as the customer repair form.  That
 * function owns validation, rate limiting, staff notifications, and the
 * shared Portal records. No secret belongs in this file.
 *
 * A deployed kiosk needs the parent site's public Supabase client, loaded in
 * index.html. `?demo=1` is intentionally the only way to enable a local,
 * non-persistent QA receipt.
 */
window.GOTCRACKED_KIOSK_CONFIG = window.GOTCRACKED_KIOSK_CONFIG || {
  intakeFunction: 'public-intake',
  requestTimeoutMs: 9000,
  timezone: 'America/New_York'
};

