import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assessPage,coverageSummary,PUBLIC_SITE_ROUTES,VIEWPORTS} from './marlon-audit/audit-core.mjs';

assert.equal(PUBLIC_SITE_ROUTES.length,9);
assert.deepEqual(VIEWPORTS.map(viewport=>viewport.name),['desktop','mobile']);
const findings=assessPage({surface:'customer_site',route:'/',viewport:'mobile',status:200,hasMain:true,
  horizontalOverflowPx:15,brokenImages:1,deadAnchors:1,unlabeledButtons:1,pageErrors:1,
  failedFirstPartyRequests:1,firstPartyHttpErrors:1,mobileMenuWorks:false});
assert.deepEqual(findings.map(item=>item.code),['horizontal_overflow','broken_images','dead_anchors',
  'unlabeled_buttons','page_errors','failed_requests','request_http_errors','mobile_menu']);
assert.equal(assessPage({surface:'customer_site',route:'/404.html',viewport:'desktop',status:404,hasMain:true}).length,0);
const coverage=coverageSummary(PUBLIC_SITE_ROUTES.flatMap(route=>VIEWPORTS.map(viewport=>({surface:'customer_site',route,viewport:viewport.name}))));
assert.equal(coverage.customerSite.routes,9);
assert.equal(coverage.customerSite.viewports,18);
assert.equal(coverage.portal.authenticatedViews,0);
const workflow=fs.readFileSync(new URL('../.github/workflows/marlon-executor.yml',import.meta.url),'utf8');
assert.match(workflow,/MARLON_AUDIT_SURFACE: customer_site/);
assert.match(workflow,/marlon-audit\/audit\.mjs/);
assert.match(workflow,/upload-artifact@v4/);
console.log('PASS Marlon website browser findings, route coverage, and candidate QA gate');
