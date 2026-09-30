import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../customer-account.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../account.html', import.meta.url), 'utf8');
assert.match(html, /id="verify-channel"/);
assert.match(html, /id="verify-instructions"/);
assert.match(html, /id="customer-identifier"[^>]*autocomplete="username"[^>]*inputmode="text"/);

class Element {
  constructor() {
    this.hidden = false;
    this.disabled = false;
    this.value = '';
    this.textContent = '';
    this.innerHTML = '';
    this.style = {};
    this.dataset = {};
    this.listeners = new Map();
  }
  addEventListener(name, listener) { this.listeners.set(name, listener); }
  querySelector(selector) {
    if (selector === 'button[type="submit"]') return this.submitButton;
    if (selector === '.account-form-status') return this.status;
    return null;
  }
  focus() {}
}

async function harness() {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, new Element());
    return elements.get(id);
  };
  for (const id of [
    'account-auth', 'account-dashboard', 'account-signout', 'lookup-step',
    'verify-step', 'lookup-form', 'verify-form', 'customer-identifier',
    'customer-code', 'verify-channel', 'verify-instructions'
  ]) element(id);
  element('verify-step').hidden = true;
  element('account-dashboard').hidden = true;
  for (const id of ['lookup-form', 'verify-form']) {
    element(id).submitButton = new Element();
    element(id).status = new Element();
  }
  const calls = [];
  const document = {
    head: { appendChild() {} },
    createElement: () => new Element(),
    querySelector: selector => selector.startsWith('#') ? elements.get(selector.slice(1)) || null : null,
    querySelectorAll: () => [],
    addEventListener() {}
  };
  const fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    calls.push(body);
    const status = body.action === 'profile' ? 401 : body.identifier === '2025550' ? 400 : 200;
    const payload = status === 401 ? { error: 'Sign in again.' }
      : status === 400 ? { error: 'Enter a valid email address or 10-digit US phone number.' }
      : { ok: true, challengeId: '00000000-0000-4000-8000-000000000001' };
    return { ok: status === 200, status, headers: { get: () => null }, json: async () => payload };
  };
  vm.runInNewContext(source, {
    document, Element, fetch, console, Intl, URL, URLSearchParams,
    localStorage: { getItem: () => null, removeItem() {} },
    location: { search: '', pathname: '/account', hash: '' },
    history: { replaceState() {} },
    matchMedia: () => ({ matches: false }),
    setTimeout() {}, clearTimeout() {}, confirm: () => false
  }, { filename: 'customer-account.js' });
  for (let attempt = 0; attempt < 8; attempt++) await Promise.resolve();
  return { element, calls };
}

async function submit(identifier) {
  const page = await harness();
  page.element('customer-identifier').value = identifier;
  const form = page.element('lookup-form');
  await form.listeners.get('submit')({ preventDefault() {}, currentTarget: form });
  assert.deepEqual(page.calls.map(call => call.action), ['profile', 'request_code']);
  assert.equal(page.calls[1].identifier, identifier);
  return page;
}

const phone = await submit('(202) 555-0199');
assert.equal(phone.element('customer-identifier').autocomplete, 'username');
assert.equal(phone.element('customer-identifier').inputMode, 'text');
assert.equal(phone.element('lookup-step').hidden, true);
assert.equal(phone.element('verify-step').hidden, false);
assert.equal(phone.element('verify-channel').textContent, 'Check your text messages');
assert.match(phone.element('verify-instructions').textContent, /matching profile.*text message/i);
assert.doesNotMatch(phone.element('verify-instructions').textContent, /email/i);

const email = await submit('customer@example.test');
assert.equal(email.element('verify-channel').textContent, 'Check your email');
assert.match(email.element('verify-instructions').textContent, /matching profile.*email/i);
assert.equal(email.element('verify-form').status.textContent, phone.element('verify-form').status.textContent,
  'the visible request status does not reveal whether an account exists');

const invalid = await submit('2025550');
assert.equal(invalid.element('lookup-step').hidden, false);
assert.equal(invalid.element('verify-step').hidden, true);
assert.match(invalid.element('lookup-form').status.textContent, /10-digit US phone number/);

console.log(JSON.stringify({ ok: true, scenarios: 3, backend: 'mocked', realMessages: 0 }));
