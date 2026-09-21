import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('../pc-build.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../pc-build.js',import.meta.url),'utf8');

for(const copy of [
  'Submit Build Request',
  'Where should we send updates?',
  'Any verified estimate will include',
  'If automated verification is unavailable',
  'If compatibility is verified, you may see',
  'Saving your build request.',
  'checking whether verified automated research is available'
]) assert.match(html,new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i'),`Missing truthful planner copy: ${copy}`);

for(const stale of [
  'The estimate shown later',
  'Where should we send the build plan?',
  'Research my build',
  'Building your recommendation.',
  'You see the recommended components and one estimated total'
]) assert.doesNotMatch(html,new RegExp(stale.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i'),`Misleading planner promise returned: ${stale}`);

for(const simulated of [
  'Cross-checking the proposed configuration in PCPartPicker',
  'Running the proposed parts through Newegg PC Builder',
  'Checking PSU headroom against the verified wattage estimate',
  'Preparing your build estimate'
]) assert.doesNotMatch(app,new RegExp(simulated,'i'),`Unverified progress claim returned: ${simulated}`);

for(const safeStatus of [
  'Saving your build request',
  'Checking automated research availability',
  'Preparing the next step for your request'
]) assert.match(app,new RegExp(safeStatus,'i'),`Missing honest request status: ${safeStatus}`);

for(const verifiedResultGuard of [
  'Estimated build total',
  'Compatibility verified before pricing',
  "if(data.status==='estimated')renderEstimated(data)",
  "else if(data.status==='research_unavailable')renderResearchUnavailable(data)",
  'No automated estimate was released'
]) assert.match(app,new RegExp(verifiedResultGuard.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),`Verified or fail-closed result handling changed: ${verifiedResultGuard}`);

console.log('PASS truthful custom-PC request copy and verified-result boundary.');
