// Deterministic format conversion only. No design edits, resizing or application changes.
// Usage: node export-lossless.mjs <absolute bundled node_modules/sharp path>
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
if (!process.argv[2]) throw new Error('Pass the bundled sharp module path; no project dependencies are installed.');
const sharp = require(process.argv[2]);
const root = path.dirname(fileURLToPath(import.meta.url));
const output = path.join(root, 'exports-lossless-v1');
try { await fs.access(output); throw new Error('Export folder already exists; refusing overwrite.'); }
catch (e) { if (e.code !== 'ENOENT') throw e; }
const manifest = JSON.parse(await fs.readFile(path.join(root, 'ASSET_MANIFEST.json'), 'utf8'));
const selected = manifest.medals.flatMap(a => Object.entries(a.states).map(([state,s]) => ({...s,id:a.id,state})));
selected.push(...manifest.landing.map(a => ({...a,state:'layer'})));
await fs.mkdir(output);
let cursor = 0;
const results = [];
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
async function worker() {
  while(cursor < selected.length) {
    const s = selected[cursor++];
    const source = await fs.readFile(path.join(root, s.file));
    if(hash(source) !== s.sha256) throw new Error('Reviewed master checksum changed: '+s.file);
    const target = s.file.replace(/\.png$/, '.webp');
    const dest = path.join(output, target);
    await fs.mkdir(path.dirname(dest), {recursive:true});
    const encoded = await sharp(source).webp({lossless:true,effort:6,alphaQuality:100}).toBuffer();
    const [a,b] = await Promise.all([
      sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true}),
      sharp(encoded).ensureAlpha().raw().toBuffer({resolveWithObject:true})
    ]);
    if(a.info.width!==b.info.width || a.info.height!==b.info.height || a.info.channels!==4 || b.info.channels!==4)
      throw new Error('Dimensions/channels changed: '+s.file);
    let alphaDifferences=0, visibleRgbDifferences=0, hiddenRgbDifferences=0;
    for(let i=0;i<a.data.length;i+=4){
      if(a.data[i+3]!==b.data[i+3]) alphaDifferences++;
      for(let c=0;c<3;c++) if(a.data[i+c]!==b.data[i+c]){
        if(a.data[i+3]===0 && b.data[i+3]===0) hiddenRgbDifferences++;
        else visibleRgbDifferences++;
      }
    }
    if(alphaDifferences || visibleRgbDifferences) throw new Error('Visible/alpha pixels changed: '+s.file);
    await fs.writeFile(dest, encoded, {flag:'wx'});
    if(hash(await fs.readFile(path.join(root,s.file))) !== s.sha256) throw new Error('Master modified: '+s.file);
    results.push({id:s.id,state:s.state,source:s.file,sourceSha256:s.sha256,sourceBytes:source.length,
      file:'exports-lossless-v1/'+target,bytes:encoded.length,sha256:hash(encoded),
      width:a.info.width,height:a.info.height,alphaDifferences,visibleRgbDifferences,hiddenRgbDifferences});
  }
}
await Promise.all([worker(),worker()]);
results.sort((a,b)=>a.file.localeCompare(b.file));
const sourceBytes=results.reduce((n,r)=>n+r.sourceBytes,0), exportBytes=results.reduce((n,r)=>n+r.bytes,0);
const report={date:'2026-10-23',status:'Technical export verified; browser/integration acceptance pending',
  visualApproval:'Owner said I love it after the presented designs; recorded separately in APPROVAL_AND_VERIFICATION.md.',
  encoding:'WebP lossless at original dimensions. No resizing/cropping/recoloring. Fully transparent hidden RGB may differ.',
  tools:{sharp:sharp.versions.sharp,webp:sharp.versions.webp},
  selectedFiles:results.length,sourceBytes,exportBytes,savedPercent:Number((100*(1-exportBytes/sourceBytes)).toFixed(2)),
  allAlphaAndVisibleRgbExact:results.every(r=>r.alphaDifferences===0&&r.visibleRgbDifferences===0),results};
await fs.writeFile(path.join(root,'LOSSLESS_EXPORT_MANIFEST.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({selectedFiles:results.length,sourceBytes,exportBytes,savedPercent:report.savedPercent,allAlphaAndVisibleRgbExact:report.allAlphaAndVisibleRgbExact}));
