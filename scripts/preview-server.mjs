/* Local-only preview of Cloudflare Pages clean URLs. No API proxy or customer writes. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.xml':'application/xml','.webmanifest':'application/manifest+json','.woff2':'font/woff2'};
http.createServer((req,res)=>{
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);return res.end();}
 let name;try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400);return res.end();}
 if(name.split('/').some(x=>x.startsWith('.'))||name.startsWith('/api/')){res.writeHead(404);return res.end();}
 name=name==='/'?'/index.html':name;
 if(name==='/supabase.js')name='/scripts/preview-transport.js';
 let file=path.resolve(root,'.'+name);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 if(!path.extname(file))file+='.html';
 const ext=path.extname(file); if(!types[ext]){res.writeHead(404);return res.end();}
 if(!fs.existsSync(file)){res.writeHead(404);return res.end('Page Not Found');}
 res.writeHead(200,{'Content-Type':types[ext],'Cache-Control':'no-store'});
 if(req.method==='HEAD')return res.end();fs.createReadStream(file).pipe(res);
}).listen(Number(process.env.PORT||4173),'0.0.0.0',()=>console.log('GotCracked local preview ready.'));
