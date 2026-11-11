import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const terms=JSON.parse(read('service-authorization-terms.json'));
assert.ok(read('authorization.html').includes(terms.text),'exact terms are visible before signing');
assert.ok(read('authorization.html').includes('value="'+terms.version+'"'));
assert.match(read('app.js'),/const visit = serviceMode.value === 'walk_in'/);
assert.match(read('app.js'),/window.GotCrackedAuthorization.validate/);
assert.match(read('app.js'),/review.replaceChildren/);
assert.doesNotMatch(read('service-authorization.js'),/localStorage|sessionStorage/);
for(const page of ['pickup.html','authorization.html']){assert.match(read(page),/name="consent"/);assert.doesNotMatch(read(page),/name="date"|name="time"/);}
assert.match(read('customer-sw.js'),/route === '\/authorization'/);
console.log('Customer experience page and privacy checks passed.');
