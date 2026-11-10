// Local review-only server. Serves this asset folder and the two approved references.
// No API integration, writes, account access or external network requests.
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const docs = path.resolve(root, '../..');
const refs = path.join(docs, 'design-references', '2026-10-23');
const mime = { '.html':'text/html; charset=utf-8', '.png':'image/png', '.json':'application/json', '.md':'text/plain; charset=utf-8' };
http.createServer(async(req,res)=>{
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    const file = rel.startsWith('design-references/') ? path.resolve(docs, rel) : path.resolve(root, rel || 'REVIEW.html');
    const inside = (base) => file.startsWith(base + path.sep);
    if(!(inside(root) || inside(refs))) { res.writeHead(403); res.end('Forbidden'); return; }
    const stat = await fs.stat(file); if(!stat.isFile()) throw new Error('not a file');
    res.writeHead(200, {'Content-Type':mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff'});
    res.end(await fs.readFile(file));
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(5410,'127.0.0.1',()=>process.stdout.write('Asset review: http://127.0.0.1:5410/\n'));
