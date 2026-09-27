import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Execute the real account module, including fetch, refresh, and re-render. Only
// browser primitives are synthetic; no approval or rendering logic is copied.
const source = fs.readFileSync(new URL('../customer-account.js', import.meta.url), 'utf8');
const close = source.lastIndexOf('})();');
assert.ok(close > 0, 'account module closure is present');
const executable = source.slice(0, close) + '\nglobalThis.accountTest = {estimateMarkup,repairCard,recordEstimateDecision,loadProfile};\n' + source.slice(close);
const flush = async () => { for (let n = 0; n < 20; n++) await Promise.resolve(); };
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return {promise, resolve}; };
const repair = (changes = {}) => ({
  id:'repair-1', ticket:'GC-000017', status:'awaiting_approval', device:{manufacturer:'Samsung',model:'Galaxy S24 Ultra'},
  issue:'Display damage', diagnosis:'Replace cracked display; retain existing mainboard.', estimateRevision:'revision-1',
  estimateItems:[{description:'Display assembly',quantity:1,lineTotalCents:15000},{description:'Repair labor',quantity:1,lineTotalCents:5000}],
  estimateSubtotalCents:20000, estimateTaxCents:1060, estimateCents:21060,
  subtotalCents:999999, taxCents:999999, totalCents:0, amountPaidCents:0, balanceDueCents:0,
  actions:{canApprove:true,canPay:false}, ...changes,
});

class Element {
  constructor() {
    this.dataset={}; this.hidden=false; this.disabled=false; this.textContent=''; this.style={};
    this.listeners=new Map(); this.values=new Set(); this.children=[];
    this.classList={add:name=>this.values.add(name),remove:name=>this.values.delete(name),contains:name=>this.values.has(name)};
  }
  addEventListener(name,handler) { this.listeners.set(name,handler); }
  appendChild(child) { this.children.push(child); }
  querySelector(selector) { return selector === '[data-estimate-status]' ? this.status : null; }
  querySelectorAll(selector) { return selector === '[data-account-action]' ? this.buttons || [] : []; }
  focus() {}
  set innerHTML(value) { this.markup=value; this.onMarkup?.(value); }
  get innerHTML() { return this.markup || ''; }
}

async function harness(initialRepair=repair()) {
  const elements=new Map(), cardSets=new Map(), calls=[], confirms=[], timers=new Map();
  let profile={customer:{firstName:'Austin'},repairs:[initialRepair]}, confirmResult=true, reply={status:200,data:{message:'Decision saved.'}}, decisionHandler=null, timerId=0;
  const el=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
  for(const id of ['account-auth','account-dashboard','account-signout','lookup-step','verify-step','account-dialog','account-dialog-content','account-toast','account-metrics','customer-greeting','customer-subtitle','active-repairs','repair-history','customer-code'])el(id);
  for(const id of ['active-repairs','repair-history'])el(id).onMarkup=markup=>{
    const cards=[];
    for(const match of markup.matchAll(/<article class="repair-card" data-ticket-id="([^"]+)">([\s\S]*?)<\/article>/g)) {
      const card=new Element(); card.dataset.ticketId=match[1]; card.status=new Element(); card.buttons=[];
      for(const buttonMarkup of match[2].matchAll(/<button\b([^>]*data-account-action="[^"]+"[^>]*)>/g)) {
        const button=new Element();
        for(const [attribute,key] of [['data-account-action','accountAction'],['data-ticket','ticket'],['data-estimate-revision','estimateRevision']]) button.dataset[key]=buttonMarkup[1].match(new RegExp(attribute+'="([^"]*)"'))?.[1];
        card.buttons.push(button);
      }
      cards.push(card);
    }
    cardSets.set(id,cards);
  };
  const allCards=()=>[...cardSets.values()].flat();
  const document={
    head:new Element(), createElement:()=>new Element(), addEventListener(){},
    querySelector:selector=>selector.startsWith('#') ? elements.get(selector.slice(1)) || null : null,
    querySelectorAll:selector=>selector === '.repair-card' ? allCards() : [],
  };
  const context=vm.createContext({document,Element,console,Intl,URL,URLSearchParams,
    localStorage:{getItem:()=>null,removeItem(){}},location:{search:'',pathname:'/account',hash:''},history:{replaceState(){}},matchMedia:()=>({matches:false}),
    setTimeout:fn=>{timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id),
    confirm:message=>{confirms.push(message);return confirmResult;},
    fetch:async(url,options)=>{
      const payload=JSON.parse(options.body); calls.push({url,options,payload});
      const response=payload.action==='profile' ? {status:200,data:structuredClone(profile)} : decisionHandler ? await decisionHandler(payload) : reply;
      return {ok:response.status>=200&&response.status<300,status:response.status,headers:{get:()=>null},json:async()=>response.data};
    },
  });
  vm.runInContext(executable,context,{filename:'customer-account.js'});
  await flush();
  assert.equal(el('account-dashboard').hidden,false,'real initial profile load reaches dashboard');
  return {api:context.accountTest,calls,confirms,el,card:()=>allCards()[0],button:(action='approve')=>allCards()[0]?.buttons.find(button=>button.dataset.accountAction===action),
    setProfile:value=>{profile={customer:{firstName:'Austin'},repairs:[value]};},setConfirm:value=>{confirmResult=value;},
    setReply:value=>{reply=value;},setDecisionHandler:handler=>{decisionHandler=handler;},
    expireToasts:()=>{for(const fn of timers.values())fn();timers.clear();},
  };
}
let scenarios=0;
async function check(label,run) { await run(); scenarios++; console.log(`PASS ${label}`); }

await check('render exact quote scope, line items, subtotal, tax, total and consent; escape customer text',async()=>{
  const h=await harness();
  const scope='<img src=x onerror="steal()"> & customer\'s scope';
  const html=h.api.estimateMarkup(repair({diagnosis:scope,estimateItems:[{description:'<script>alert(1)</script> & display',quantity:'<2>',lineTotalCents:20000}]}));
  assert.match(html,/&lt;img src=x onerror=&quot;steal\(\)&quot;&gt; &amp; customer&#39;s scope/);
  assert.match(html,/&lt;script&gt;alert\(1\)&lt;\/script&gt; &amp; display/);
  assert.match(html,/Quantity: &lt;2&gt;/);
  assert.doesNotMatch(html,/<img|<script/);
  assert.match(html,/<dt>Subtotal<\/dt><dd>\$200\.00<\/dd>/);
  assert.match(html,/<dt>Tax<\/dt><dd>\$10\.60<\/dd>/);
  assert.match(html,/<dt>Estimate total<\/dt><dd>\$210\.60<\/dd>/);
  assert.match(html,/Changes to the quoted work or price will require a new approval/);
  assert.doesNotMatch(html,/9,999\.99/,'unrelated totals do not replace the saved quote');
  assert.equal(h.api.estimateMarkup(repair({status:'in_repair',actions:{canApprove:false,canDecline:false}})),'');
  const stale=h.api.repairCard(repair({estimateRevision:null}));
  assert.match(stale,/Estimate being updated/);
  assert.doesNotMatch(stale,/data-account-action=/,'unrevisioned estimates cannot expose approval buttons');
  const attributes=h.api.repairCard(repair({id:'x"<y',estimateRevision:'q"<v'}));
  assert.match(attributes,/data-ticket="x&quot;&lt;y"/);
  assert.match(attributes,/data-estimate-revision="q&quot;&lt;v"/);
});

await check('every server-authorized decision includes the exact quote while parts or diagnosis are pending',async()=>{
  const h=await harness();
  for(const status of ['awaiting_approval','need_to_order_parts','awaiting_parts','awaiting_repair','awaiting_diagnostic','diagnostic_in_progress','testing_in_progress','checked_in','awaiting_callback','waiting_on_parts','in_diagnosis']){
    const html=h.api.repairCard(repair({status,actions:{canApprove:true,canDecline:true}}));
    assert.match(html,/Review your repair estimate/,status);
    assert.match(html,/<dt>Estimate total<\/dt><dd>\$210\.60<\/dd>/,status);
    assert.match(html,/data-estimate-revision="revision-1"/,status);
    assert.ok(html.indexOf('Review your repair estimate')<html.indexOf('data-account-action='),status+' shows the scope before decisions');
  }
  assert.equal(h.api.estimateMarkup(repair({status:'awaiting_parts',approvedAt:'2026-09-27T12:00:00Z',actions:{canApprove:false,canDecline:false}})),'');
});

for(const action of ['approve','decline'])await check(`${action} sends only displayed revision and ticket using same-origin API`,async()=>{
  const h=await harness(), button=h.button(action);
  h.setProfile(repair({status:action==='approve'?'need_to_order_parts':'customer_declined',actions:{canApprove:false}}));
  await h.api.recordEstimateDecision(button);
  const request=h.calls.find(call=>call.payload.action===`${action}_estimate`);
  assert.deepEqual(request.payload,{action:`${action}_estimate`,ticketId:'repair-1',estimateRevision:'revision-1'});
  assert.equal(request.url,'/api/customer-account');
  assert.equal(request.options.credentials,'same-origin');
  assert.equal(h.calls.filter(call=>call.payload.action==='profile').length,2,'saved decision refreshes profile');
  assert.equal(h.card().buttons.length,0,'authoritative refresh removes obsolete decision controls');
  assert.equal(h.confirms.length,1);
  if(action==='approve')assert.match(h.confirms[0],/\$210\.60.*Galaxy S24 Ultra/);
});

for(const revision of [undefined,'older-revision'])await check(`${revision?'old':'missing'} button revision refreshes without confirmation or decision`,async()=>{
  const h=await harness(), button=h.button(); button.dataset.estimateRevision=revision;
  h.setProfile(repair({estimateRevision:'revision-2',estimateCents:25000}));
  await h.api.recordEstimateDecision(button);
  assert.deepEqual(h.calls.map(call=>call.payload.action),['profile','profile']);
  assert.equal(h.confirms.length,0);
  assert.equal(h.button().dataset.estimateRevision,'revision-2');
  assert.match(h.card().status.textContent,/Review the refreshed estimate/);
});

await check('cancelled confirmation sends no request and leaves both choices enabled',async()=>{
  const h=await harness(); h.setConfirm(false);
  await h.api.recordEstimateDecision(h.button());
  assert.deepEqual(h.calls.map(call=>call.payload.action),['profile']);
  assert.equal(h.confirms.length,1);
  assert.ok(h.card().buttons.every(button=>!button.disabled));
});

await check('concurrent approve/decline and rerendered buttons cannot submit a second decision',async()=>{
  const h=await harness(), gate=deferred(), original=h.card();
  h.setDecisionHandler(()=>gate.promise);
  const first=h.api.recordEstimateDecision(h.button());
  await flush();
  assert.ok(original.buttons.every(button=>button.disabled));
  await h.api.recordEstimateDecision(original.buttons[1]);
  await h.api.loadProfile({quiet:true});
  assert.notEqual(h.card(),original,'refresh replaces the card while the request is pending');
  await h.api.recordEstimateDecision(h.button('decline'));
  assert.equal(h.calls.filter(call=>call.payload.action.endsWith('_estimate')).length,1);
  assert.equal(h.confirms.length,1,'duplicate calls do not repeat confirmation');
  h.setProfile(repair({status:'need_to_order_parts',actions:{canApprove:false}}));
  gate.resolve({status:200,data:{message:'Approved.'}}); await first;
  assert.ok(original.buttons.every(button=>!button.disabled),'cleanup releases old button references');
});

await check('HTTP409 refreshes the quote and keeps a visible warning after toast expires',async()=>{
  const h=await harness(), original=h.card();
  h.setReply({status:409,data:{error:'This estimate changed. Review the latest quote before deciding.'}});
  h.setProfile(repair({estimateRevision:'revision-2',estimateCents:25000}));
  await h.api.recordEstimateDecision(h.button());
  assert.notEqual(h.card(),original);
  assert.equal(h.button().dataset.estimateRevision,'revision-2');
  assert.match(h.el('active-repairs').innerHTML,/\$250\.00/);
  assert.equal(h.calls.filter(call=>call.payload.action==='profile').length,2);
  h.expireToasts();
  assert.equal(h.el('account-toast').classList.contains('show'),false);
  assert.match(h.card().status.textContent,/Review the latest quote/,'warning must live on the refreshed card, not only in transient toast');
  h.setReply({status:200,data:{message:'Saved.'}});
  await h.api.recordEstimateDecision(h.button());
  const requests=h.calls.filter(call=>call.payload.action==='approve_estimate');
  assert.deepEqual(requests.map(call=>call.payload.estimateRevision),['revision-1','revision-2']);
});

await check('request failure retains an inline error and allows a deliberate retry',async()=>{
  const h=await harness(); h.setReply({status:503,data:{error:'Service temporarily unavailable.'}});
  await h.api.recordEstimateDecision(h.button()); h.expireToasts();
  assert.match(h.card().status.textContent,/temporarily unavailable/);
  assert.ok(h.card().buttons.every(button=>!button.disabled));
  h.setReply({status:200,data:{message:'Saved.'}}); await h.api.recordEstimateDecision(h.button());
  assert.equal(h.calls.filter(call=>call.payload.action==='approve_estimate').length,2);
});

console.log(`Customer estimate decisions: ${scenarios} runtime scenarios passed (synthetic browser/network only).`);
