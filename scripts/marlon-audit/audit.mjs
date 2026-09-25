#!/usr/bin/env node
// Playwright's official CI pattern: clean Chromium context, read-only navigation,
// desktop/mobile captures, browser errors, and an uploaded report per scheduled run.
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {assessPage,coverageSummary,PUBLIC_SITE_ROUTES,VIEWPORTS} from './audit-core.mjs';

const out=path.resolve(process.env.MARLON_AUDIT_OUT||'marlon-audit-artifacts');
const siteBase=process.env.MARLON_SITE_URL||'https://gotcracked.co/';
const portalBase=process.env.MARLON_PORTAL_URL||'https://portal.gotcracked.co/';
const siteRoutes=process.env.MARLON_AUDIT_ROUTES
  ? process.env.MARLON_AUDIT_ROUTES.split(',').map(s=>s.trim()).filter(Boolean)
  : PUBLIC_SITE_ROUTES;
const auditSurface=process.env.MARLON_AUDIT_SURFACE||'both';
if(!['both','customer_site','portal'].includes(auditSurface))throw new Error('Unsupported Marlon audit surface.');
const originOf=url=>new URL(url).origin;
const safeName=value=>value.replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'')||'home';
const target=(base,route)=>new URL(route.replace(/^\//,''),base.endsWith('/')?base:`${base}/`).href;
const allowedBases=[siteBase,portalBase];
for(const base of allowedBases){
  const url=new URL(base);
  if(!['https:','http:'].includes(url.protocol))throw new Error('Audit URLs must use HTTP or HTTPS.');
  if(url.protocol==='http:'&&!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw new Error('Plain HTTP is allowed only for loopback previews.');
}
await fs.mkdir(out,{recursive:true,mode:0o700});

const startedAt=new Date().toISOString();
const pages=[];
const failures=[];
const launch={headless:true};
if(process.env.MARLON_CHROME_BIN)launch.executablePath=process.env.MARLON_CHROME_BIN;
let browser;
try{
  browser=await chromium.launch(launch);
  for(const [surface,base,routes] of [
    ['customer_site',siteBase,siteRoutes],
    ['portal',portalBase,['/']]
  ].filter(([surface])=>auditSurface==='both'||auditSurface===surface)){
    for(const route of routes){
      for(const viewport of VIEWPORTS){
        const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},serviceWorkers:'block'});
        const page=await context.newPage();
        let pageErrors=0,failedFirstPartyRequests=0,firstPartyHttpErrors=0;
        const firstParty=originOf(base);
        page.on('pageerror',()=>pageErrors++);
        page.on('requestfailed',request=>{if(new URL(request.url()).origin===firstParty)failedFirstPartyRequests++;});
        page.on('response',response=>{const responseUrl=new URL(response.url());if(response.status()>=400&&responseUrl.origin===firstParty&&!(route==='/404.html'&&response.status()===404&&responseUrl.pathname.endsWith('/404.html')))firstPartyHttpErrors++;});
        const url=target(base,route);
        const screenshot=`${surface}-${safeName(route)}-${viewport.name}.png`;
        const screenshotFull=`${surface}-${safeName(route)}-${viewport.name}-full.png`;
        try{
          const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
          await page.waitForTimeout(350);
          const dom=await page.evaluate(()=>{
            const visible=el=>{const style=getComputedStyle(el),rect=el.getBoundingClientRect();return style.display!=='none'&&style.visibility!=='hidden'&&rect.width>0&&rect.height>0;};
            const images=[...document.images].filter(visible);
            const links=[...document.querySelectorAll('a[href^="#"]')].filter(visible);
            const buttons=[...document.querySelectorAll('button,[role="button"]')].filter(visible);
            const name=el=>el.getAttribute('aria-label')||el.getAttribute('title')||el.innerText||el.textContent||el.querySelector('img')?.alt||'';
            const bodyWidth=Math.max(document.documentElement.scrollWidth,document.body?.scrollWidth||0);
            return {
              title:document.title.slice(0,180),hasMain:!!document.querySelector('main,[role="main"]'),
              horizontalOverflowPx:Math.max(0,bodyWidth-innerWidth),
              brokenImages:images.filter(img=>img.complete&&img.naturalWidth===0).length,
              deadAnchors:links.filter(link=>{let id='';try{id=decodeURIComponent(link.hash.slice(1));}catch{return true;}return id&&!document.getElementById(id)&&!document.getElementsByName(id).length;}).length,
              unlabeledButtons:buttons.filter(button=>!name(button).trim()).length,
              visibleImages:images.length,visibleButtons:buttons.length,visibleLinks:[...document.querySelectorAll('a[href]')].filter(visible).length
            };
          });
          await page.screenshot({path:path.join(out,screenshot),animations:'disabled'});
          await page.screenshot({path:path.join(out,screenshotFull),fullPage:true,animations:'disabled'});
          let mobileMenuWorks=null;
          if(surface==='customer_site'&&route==='/'&&viewport.name==='mobile'){
            const menu=page.locator('.menu-button');
            if(await menu.count()&&await menu.isVisible()){
              await menu.click();
              mobileMenuWorks=await menu.getAttribute('aria-expanded')==='true';
            }
          }
          const result={surface,route,viewport:viewport.name,url,status:response?.status()||0,finalPath:new URL(page.url()).pathname,
            ...dom,pageErrors,failedFirstPartyRequests,firstPartyHttpErrors,mobileMenuWorks,screenshot,screenshotFull};
          pages.push(result);
        }catch(error){
          failures.push({surface,route,viewport:viewport.name,error:String(error?.message||error).slice(0,400)});
        }finally{await context.close();}
      }
    }
  }
}catch(error){failures.push({surface:'runner',error:String(error?.message||error).slice(0,400)});}
finally{await browser?.close();}

const findings=[...pages.flatMap(assessPage),...failures.map(failure=>({surface:failure.surface,route:failure.route||'',viewport:failure.viewport||'',code:'audit_failed',severity:'high',detail:failure.error}))];
const report={schema:1,scope:auditSurface,startedAt,finishedAt:new Date().toISOString(),browser:'Playwright Chromium 1.63.0',
  coverage:coverageSummary(pages),pages,findings,ok:failures.length===0};
await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n',{mode:0o600});
console.log(JSON.stringify({ok:report.ok,coverage:report.coverage,findings:findings.length,report:path.join(out,'report.json')}));
if(!report.ok)process.exitCode=1;
