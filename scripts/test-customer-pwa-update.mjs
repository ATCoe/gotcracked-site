import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const file=process.argv[2]||new URL('../customer-pwa.js',import.meta.url);
const code=readFileSync(file,'utf8');let checks=0;
async function scenario({secure=true,available=true,controlled=false}={}){
 const pageEvents={},workerEvents={},registrations=[];let reloads=0,updates=0;
 const context={navigator:available?{serviceWorker:{controller:controlled?{}:null,addEventListener(name,fn){workerEvents[name]=fn;},register:async(path,options)=>{registrations.push({path,options});return{update(){updates++;return Promise.resolve();}};}}}:{},window:{isSecureContext:secure,location:{reload(){reloads++;}},addEventListener(name,fn){pageEvents[name]=fn;}}};
 vm.runInNewContext(code,context);pageEvents.load?.();await Promise.resolve();await Promise.resolve();
 // A visitor can already be typing in the repair form when initial claiming,
 // or a later update, transfers control to the service worker.
 workerEvents.controllerchange?.();workerEvents.controllerchange?.();
 return{reloads,updates,registrations,pageEvents};
}
for(const controlled of[false,true]){const result=await scenario({controlled});assert.equal(result.reloads,0,'Service Worker Control Changes Must Not Reload And Discard An In-Progress Form');checks++;assert.equal(result.updates,1);checks++;assert.equal(result.registrations.length,1);checks++;assert.equal(result.registrations[0].path,'/customer-sw.js');checks++;assert.equal(result.registrations[0].options.scope,'/');checks++;}
for(const options of[{secure:false},{available:false}]){const result=await scenario(options);assert.equal(result.registrations.length,0);checks++;assert.equal(result.reloads,0);checks++;}
console.log(JSON.stringify({ok:true,checks,scope:'Actual PWA Module, Initial Install/Upgrade And Unsupported Contexts; No Browser Or Network Requests'}));
