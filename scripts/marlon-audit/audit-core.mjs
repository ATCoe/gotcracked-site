export const PUBLIC_SITE_ROUTES = Object.freeze([
  '/', '/request.html', '/appointment.html', '/pc-build.html',
  '/learn.html', '/account.html', '/privacy.html', '/credits.html', '/404.html'
]);

export const VIEWPORTS = Object.freeze([
  {name:'desktop', width:1440, height:960},
  {name:'mobile', width:390, height:844}
]);

export function assessPage(page) {
  const findings=[];
  const where={surface:page.surface, route:page.route, viewport:page.viewport};
  if ((page.status < 200 || page.status >= 400) && !(page.route==='/404.html'&&page.status===404)) findings.push({...where,code:'http_status',severity:'high',detail:`HTTP ${page.status}`});
  if (!page.hasMain) findings.push({...where,code:'missing_main',severity:'medium',detail:'No main landmark found.'});
  if (page.horizontalOverflowPx > 2) findings.push({...where,code:'horizontal_overflow',severity:'medium',detail:`Page exceeds viewport by ${page.horizontalOverflowPx}px.`});
  if (page.brokenImages) findings.push({...where,code:'broken_images',severity:'medium',detail:`${page.brokenImages} visible image(s) failed to load.`});
  if (page.deadAnchors) findings.push({...where,code:'dead_anchors',severity:'medium',detail:`${page.deadAnchors} visible in-page link(s) have no target.`});
  if (page.unlabeledButtons) findings.push({...where,code:'unlabeled_buttons',severity:'medium',detail:`${page.unlabeledButtons} visible button(s) lack an accessible name.`});
  if (page.pageErrors) findings.push({...where,code:'page_errors',severity:'high',detail:`${page.pageErrors} uncaught browser error(s).`});
  if (page.failedFirstPartyRequests) findings.push({...where,code:'failed_requests',severity:'medium',detail:`${page.failedFirstPartyRequests} first-party request(s) failed.`});
  if (page.firstPartyHttpErrors) findings.push({...where,code:'request_http_errors',severity:'medium',detail:`${page.firstPartyHttpErrors} first-party request(s) returned HTTP 400 or higher.`});
  if (page.mobileMenuWorks === false) findings.push({...where,code:'mobile_menu',severity:'high',detail:'Mobile menu did not open when clicked.'});
  return findings;
}

export function coverageSummary(pages) {
  const site=pages.filter(page=>page.surface==='customer_site');
  const portal=pages.filter(page=>page.surface==='portal');
  return {
    customerSite:{routes:new Set(site.map(page=>page.route)).size,viewports:site.length,readOnlyNavigation:true,formsSubmitted:false},
    portal:{publicShellViewports:portal.length,authenticatedViews:0,readOnlyNavigation:true,formsSubmitted:false},
    visualJudgment:'screenshots captured for human review; automated layout checks do not establish premium visual quality',
    hardware:{dymo:false,barcodeScanner:false,phoneSystem:false},
    productionMutations:0
  };
}
