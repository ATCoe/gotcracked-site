import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const design = read('customer-design.css'), forms = read('customer-forms-design.css'), secondary=read('customer-secondary-design.css');
// Resolve declarations in source order for each exact selector. These targeted rules
// own the enabled action states; disabled controls are intentionally outside this check.
function declarations(css, selector) {
  const result = {};
  for (const [,selectors,body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (selectors.trim() !== selector && !selectors.trim().split(',').map(value=>value.trim()).includes(selector)) continue;
    for (const declaration of body.split(';')) {
      const colon=declaration.indexOf(':');
      if(colon>=0)result[declaration.slice(0,colon).trim()]=declaration.slice(colon+1).trim();
    }
  }
  return result;
}
const rgb=hex=>hex.slice(1).match(/../g).map(value=>parseInt(value,16));
const luminance=channels=>channels.map(value=>value/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4).reduce((sum,value,index)=>sum+value*[.2126,.7152,.0722][index],0);
const contrast=(a,b)=>(Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
const generic=declarations(design,'html body.gc-product .button');
const genericHover={...generic,...declarations(design,'html body.gc-product .button:hover')};
const booking=declarations(forms,'html body.customer-flow-page .booking-form .button');
const bookingHover={...booking,...declarations(forms,'html body.customer-flow-page .booking-form .button:hover')};
const account=declarations(forms,'.customer-account-page .account-primary');
const accountHover={...account,...declarations(forms,'.customer-account-page .account-primary:hover')};
const secondarySelector='body.gc-product:is(.pc-build-page,.learn-page,.privacy-page,.credits-page) main .button';
const secondaryAction=declarations(secondary,secondarySelector);
const secondaryHover={...secondaryAction,...declarations(secondary,secondarySelector+':hover')};
const states={generic,genericHover,booking,bookingHover,account,accountHover,secondaryAction,secondaryHover};
const ratios={};
for(const [name,state] of Object.entries(states)) {
  const foreground=state.color==='#fff'?'#ffffff':state.color;
  assert.match(foreground,/^#[0-9a-f]{6}$/i,`${name}: explicit normal-text foreground`);
  const endpoints=(state.background.match(/#[0-9a-f]{6}\b/gi)||[]).map(rgb);
  assert.ok(endpoints.length>=1 && endpoints.length<=2,`${name}: supported solid or two-stop gradient`);
  const start=endpoints[0],end=endpoints.at(-1);
  const samples=Array.from({length:101},(_,i)=>start.map((value,channel)=>value+(end[channel]-value)*i/100));
  const minimum=Math.min(...samples.map(sample=>contrast(rgb(foreground),sample)));
  ratios[name]=Number(minimum.toFixed(3));
  assert.ok(minimum>=4.5,`${name}: normal action text contrast ${minimum.toFixed(3)} must reach 4.5:1 throughout the gradient`);
}

const handlers={}; let network=0,cached=0;
const response={ok:true,type:'basic',clone(){return this;}};
vm.runInNewContext(read('customer-sw.js'),{
  self:{location:{origin:'https://gotcracked.co'},addEventListener(name,fn){handlers[name]=fn;}},URL,
  fetch:async()=>{network++;return response;},
  caches:{match:async()=>{cached++;return null;},open:async()=>{cached++;return {put(){},match:async()=>response};}}
});
const privatePaths=['/account','/account/','/account.html','/account.html/','/account?repair=example','/api/customer-account','/api','/functions/v1/customer-account','/functions'];
for(const path of privatePaths) {
  let intercepted=false;
  handlers.fetch({request:{method:'GET',url:'https://gotcracked.co'+path,mode:'navigate',destination:'document',get body(){throw new Error('Private body must not be read');}},respondWith(){intercepted=true;}});
  assert.equal(intercepted,false,`${path}: private route must remain network-only`);
}
handlers.fetch({request:{method:'POST',url:'https://gotcracked.co/request',get body(){throw new Error('Submission body must not be read');}},respondWith(){throw new Error('Submission must not be intercepted');}});
assert.equal(cached,0,'private and non-GET requests must never touch a cache');
assert.equal(network,0,'the worker must leave private/non-GET requests to the browser');
let publicResponse;
handlers.fetch({request:{method:'GET',url:'https://gotcracked.co/request',mode:'navigate',destination:'document'},respondWith(promise){publicResponse=promise;}});
assert.equal(await publicResponse,response,'public navigation must retain network-first behavior');
assert.equal(network,1);

for(const page of ['index.html','request.html','appointment.html','account.html','pc-build.html','learn.html','privacy.html','credits.html','404.html']) {
  assert.match(read(page),/customer-design\.css\?v=20261029-accessibility1/,`${page}: latest primary-action styles`);
  if(['request.html','appointment.html','account.html'].includes(page))assert.match(read(page),/customer-forms-design\.css\?v=20261029-accessibility1/,`${page}: latest form-action styles`);
}
assert.match(read('privacy.html'),/AI-Assisted Custom PC Research/);
assert.doesNotMatch(read('privacy.html'),/Ai-Assisted/);
assert.match(read('customer-sw.js'),/shell-v14-customer-flows/);
console.log(JSON.stringify({ok:true,enabledActionContrastMinimum:ratios,privateRouteCases:privatePaths.length,backend:'mocked',realRequests:0}));
