import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../store-hours.js',import.meta.url),'utf8');
const note={textContent:''};
const date={value:'',dataset:{},validity:'',addEventListener(name,handler){this[name]=handler;},setCustomValidity(value){this.validity=value;}};
const time={value:'',disabled:false,validity:'',options:[],parentElement:{querySelector:()=>note},addEventListener(name,handler){this[name]=handler;},setCustomValidity(value){this.validity=value;},replaceChildren(...options){this.options=options;this.value='';},get selectedOptions(){return this.options.filter(option=>option.value===this.value);}};
const form={elements:{date,time}};
const footer={innerHTML:''};
const document={
  readyState:'complete',
  querySelectorAll(selector){if(selector==='#booking-form,#appointment-form')return [form];if(selector==='#store-hours')return [footer];return [];},
  createElement(tag){return {tagName:tag.toUpperCase(),value:'',textContent:'',dataset:{},className:'',insertAdjacentElement(){}};}
};
const liveHours={mon:['10:00','20:00'],tue:['10:30','20:15'],wed:['99:99','20:00'],thu:['10:00','20:00','unexpected'],fri:['10:00','20:00'],sat:['10:00','18:00'],sun:null};
const window={supabaseClient:{functions:{async invoke(){return {data:{settings:{store_hours:liveHours}}};}}}};

vm.runInNewContext(source,{window,document,console,setTimeout:callback=>{callback();return 1;}});
for(let attempt=0;attempt<20&&!footer.innerHTML.includes('10:30 AM');attempt+=1)await Promise.resolve();

assert.match(footer.innerHTML,/Monday<\/span><strong>10 AM–8 PM/,'footer must use live weekday hours');
assert.match(footer.innerHTML,/Tuesday<\/span><strong>10:30 AM–8:15 PM/,'footer must preserve configured minute boundaries');
assert.match(footer.innerHTML,/Saturday<\/span><strong>10 AM–6 PM/,'footer must use live Saturday hours');
assert.equal(time.disabled,true,'time choice must wait for a selected day');
assert.equal(time.options[0].textContent,'Choose a day first');

date.value='2026-10-05';
date.change();
assert.equal(time.disabled,false);
assert.deepEqual(time.options.map(option=>option.textContent),['Choose a window','10 AM–1 PM','1 PM–4 PM','4 PM–7 PM','7 PM–8 PM']);
assert.doesNotMatch(time.options.map(option=>option.textContent).join(' '),/9 AM/,'no pre-opening slot may be offered');
assert.match(note.textContent,/10 AM–8 PM/);

time.value='7 PM–8 PM';
date.value='2026-10-03';
date.change();
assert.equal(time.value,'','a window unavailable on the new day must not remain selected');
assert.deepEqual(time.options.map(option=>option.textContent),['Choose a window','10 AM–1 PM','1 PM–4 PM','4 PM–6 PM']);

date.value='2026-10-04';
date.change();
assert.equal(time.disabled,true,'closed days must disable appointment windows');
assert.equal(time.options[0].textContent,'Closed that day');
assert.match(date.validity,/closed on Sunday/);

date.value='2026-10-06';
date.change();
assert.equal(date.validity,'','switching away from a closed day must clear the date error');
assert.equal(time.disabled,false);
assert.deepEqual(time.options.map(option=>option.textContent),['Choose a window','10:30 AM–1:30 PM','1:30 PM–4:30 PM','4:30 PM–7:30 PM','7:30 PM–8:15 PM']);

date.value='2026-10-07';
date.change();
assert.equal(time.disabled,true,'malformed hours must fail closed');
assert.match(date.validity,/closed on Wednesday/);
assert.match(footer.innerHTML,/Wednesday<\/span><strong>Closed/,'malformed hours must not render as opening hours');

date.value='2026-10-08';
date.change();
assert.equal(time.disabled,true,'ranges with extra values must fail closed');
assert.match(date.validity,/closed on Thursday/);

const footerPages=['index.html','learn.html','pc-build.html','request.html','appointment.html'];
for(const file of footerPages){
  const html=fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
  assert.doesNotMatch(html,/Morning \(9 AM–12 PM\)|Late afternoon \(4–6 PM\)/,`${file} must not ship stale fixed windows`);
  assert.match(html,/store-hours\.js\?v=20260921-shared-hours1/,`${file} must load the shared settings-driven hours runtime`);
  assert.ok(html.indexOf('customer-chat.js')<html.indexOf('store-hours.js'),`${file} must create the footer hours host before the shared runtime starts`);
}

const chat=fs.readFileSync(new URL('../customer-chat.js',import.meta.url),'utf8');
assert.doesNotMatch(chat,/9 AM–6 PM|10 AM–4 PM/,'the synchronous footer fallback must not use retired hours');
assert.match(chat,/Monday–Friday<\/span> <strong>10 AM–8 PM/);
assert.match(chat,/Saturday<\/span> <strong>10 AM–6 PM/);

console.log('PASS shared live footer hours and complete, opening-safe appointment windows with safe date switching.');
