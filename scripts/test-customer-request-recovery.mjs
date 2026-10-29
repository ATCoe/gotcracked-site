import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const block = source.slice(source.indexOf('  const bookingForm ='), source.indexOf('  const appointmentForm ='));
class Node {
  constructor() { this.listeners = {}; this.style = {}; this.dataset = {}; this.value = ''; this.innerHTML = ''; this.textContent = ''; this.disabled = false; this.classes = new Set(); this.classList = { add: name => this.classes.add(name), remove: name => this.classes.delete(name), toggle: (name, on) => on ? this.classes.add(name) : this.classes.delete(name), contains: name => this.classes.has(name) }; }
  addEventListener(name, fn) { this.listeners[name] = fn; }
  scrollIntoView() {}
  focus() { this.focused = true; }
}
function harness({ fail = false, pending = false } = {}) {
  const form = new Node(), submit = new Node(), success = new Node(), error = new Node(), reset = new Node();
  submit.innerHTML = '<span data-submit-label>Submit Repair Request</span> <span class="flow-action-icon" aria-hidden="true"></span>';
  const originalMarkup = submit.innerHTML;
  const steps = [1,2,3].map(step => { const node = new Node(); node.dataset.step = String(step); node.classList.toggle('active', step === 1); return node; });
  const progress = [new Node(), new Node(), new Node()];
  const fields = Object.fromEntries([
    ['serviceMode',1],['deviceType',1],['model',1],['issue',1],['email',2],['firstName',2],['lastName',2],['phone',2],['date',3],['time',3],['consent',3],['address1',3],['city',3],['state',3],['postalCode',3],['formStartedAt',0]
  ].map(([name,step]) => { const node = new Node(); node.name = name; node.step = step; node.required = step > 0; node.valid = true; node.type = name === 'consent' ? 'checkbox' : name === 'email' ? 'email' : 'text'; node.checked = true; node.checkValidity = () => !node.required || node.valid; node.error = new Node(); node.closest = () => ({querySelector: () => node.error}); return [name,node]; }));
  fields.serviceMode.value = 'walk_in'; fields.deviceType.options = [{value:'Phone'}]; form.elements = fields;
  const next = [new Node(),new Node()], back = [new Node(),new Node()];
  const shared = {'#booking-form':form,'#new-request':reset,'#step-three-title':new Node(),'[data-submit-label]':new Node(),'.request-submit-error':error,'.form-success':success,'#request-number':new Node(),'[data-walk-in-fields]':new Node(),'[data-mail-in-fields]':new Node()};
  function one(selector) {
    if (selector === '[type="submit"]') return submit;
    const step = /data-step="(\d)"/.exec(selector)?.[1];
    if (step) return selector.endsWith('.invalid') ? Object.values(fields).find(field => field.step === Number(step) && field.classes.has('invalid')) : steps[Number(step)-1];
    return shared[selector] || null;
  }
  function all(selector) {
    const step = /data-step="(\d)"/.exec(selector)?.[1];
    if (step) return Object.values(fields).filter(field => field.step === Number(step) && field.required);
    if (selector === '.form-next') return next;
    if (selector === '.button-back') return back;
    if (selector === '.form-step') return steps;
    if (selector === '.form-progress span') return progress;
    if (selector === '.form-step, .form-progress') return [...steps,...progress];
    if (selector === '.invalid') return Object.values(fields).filter(field => field.classes.has('invalid'));
    if (selector === '.field-error') return Object.values(fields).map(field => field.error);
    return [];
  }
  form.querySelector = one; form.querySelectorAll = all;
  form.reset = () => { fields.serviceMode.value='walk_in'; };
  const calls = []; let resolve;
  const invoke = async (_endpoint, options) => { calls.push(options.body); if (pending) await new Promise(done => { resolve = done; }); return fail ? {error:{},data:{}} : {data:{reference:'TEST-ONLY'}}; };
  vm.runInNewContext(block, { $:one, $$:all, reducedMotion:true, crypto:{randomUUID:()=> 'mock-request-id'}, window:{location:{search:''},matchMedia:()=>({matches:true}),supabaseClient:{functions:{invoke}}}, URLSearchParams, Date, FormData:class { constructor() { return Object.entries(fields).map(([name,field])=>[name,field.value]); } }, intakeFailure:async()=> 'Request Failed', showToast() {} });
  return { fields, steps, submit, originalMarkup, calls, success, error, reset, finish:()=>resolve(), send:()=>form.listeners.submit({preventDefault(){}}), current:()=>steps.find(step=>step.classes.has('active'))?.dataset.step };
}

const page = harness({pending:true});
await page.send(); assert.equal(page.current(),'2'); assert.equal(page.calls.length,0,'Enter on Step 1 must not send a lead');
page.fields.email.valid=false;
await page.send(); assert.equal(page.current(),'2'); assert.equal(page.fields.email.focused,true); assert.equal(page.calls.length,0);
page.fields.email.valid=true;
await page.send(); assert.equal(page.current(),'3'); assert.equal(page.calls.length,0,'Enter on Step 2 must only advance');
page.fields.model.valid=false;
await page.send(); assert.equal(page.current(),'1','final submission must return to an invalid earlier step'); assert.equal(page.calls.length,0);
page.fields.model.valid=true;
await page.send(); await page.send();
const sending=page.send();
assert.equal(page.submit.disabled,true);
await page.send(); assert.equal(page.calls.length,1,'repeat Enter while pending must not duplicate the request');
page.finish(); await sending;
assert.equal(page.success.classes.has('active'),true); assert.equal(page.submit.innerHTML,page.originalMarkup);

const failure=harness({fail:true});
await failure.send(); await failure.send(); await failure.send();
assert.equal(failure.error.textContent,'Request Failed'); assert.equal(failure.submit.disabled,false); assert.equal(failure.submit.innerHTML,failure.originalMarkup,'error recovery must preserve the designed action label and icon');
failure.fields.model.classes.add('invalid'); failure.fields.model.error.textContent='Old Error';
failure.reset.listeners.click();
assert.equal(failure.error.textContent,''); assert.equal(failure.fields.model.classes.has('invalid'),false); assert.equal(failure.fields.model.error.textContent,'');
assert.equal(failure.current(),'1');

function appointmentHarness({ fail=false, pending=false }={}) {
  const form=new Node(), button=new Node(), error=new Node(), success=new Node();
  button.innerHTML='Request My Appointment <span class="flow-action-icon" aria-hidden="true"></span>';
  form.elements={formStartedAt:new Node()}; form.checkValidity=()=>true;
  const nodes={'#appointment-form':form,'[type="submit"]':button,'.request-submit-error':error,'.form-step':new Node(),'.form-success':success,'#appointment-reference':new Node(),'#appointment-guidance':new Node()};
  form.querySelector=selector=>nodes[selector]||null;
  const calls=[]; let resolve;
  const invoke=async(_endpoint,options)=>{calls.push(options.body);if(pending)await new Promise(done=>{resolve=done});return fail?{error:{}}:{data:{reference:'TEST-ONLY'}};};
  const appointment=source.slice(source.indexOf('  const appointmentForm ='),source.indexOf('  const tracker ='));
  vm.runInNewContext(appointment,{$:selector=>nodes[selector]||null,crypto:{randomUUID:()=> 'mock-appointment-id'},Date,FormData:class{constructor(){return [['name','Test Customer'],['email','test@example.invalid'],['consent','on']];}},window:{supabaseClient:{functions:{invoke}}},intakeFailure:async()=> 'Request Failed'});
  return {button,error,success,calls,send:()=>form.listeners.submit({preventDefault(){}}),finish:()=>resolve()};
}
const appointment=appointmentHarness({pending:true});
const appointmentMarkup=appointment.button.innerHTML;
const appointmentSending=appointment.send();
await appointment.send(); assert.equal(appointment.calls.length,1,'repeat appointment submit while pending must not create another request');
appointment.finish(); await appointmentSending;
assert.equal(appointment.success.classes.has('active'),true); assert.equal(appointment.button.innerHTML,appointmentMarkup);
const appointmentFailure=appointmentHarness({fail:true});
const failedAppointmentMarkup=appointmentFailure.button.innerHTML;
await appointmentFailure.send();
assert.equal(appointmentFailure.error.textContent,'Request Failed'); assert.equal(appointmentFailure.button.innerHTML,failedAppointmentMarkup); assert.equal(appointmentFailure.button.disabled,false);
console.log(JSON.stringify({ok:true, scenarios:9, backend:'mocked', realLeads:0, realMessages:0}));
