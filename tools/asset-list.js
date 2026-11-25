// node tools/asset-list.js  ->  prints the vision checklist (slug, date, title, subject) as Markdown.
// Slugs here must match main.js: date + '-' + slugify(title).
const fs=require('fs'),vm=require('vm');const ctx={window:{}};vm.runInNewContext(fs.readFileSync(__dirname+'/../data.js','utf8'),ctx);
const slugify=s=>s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48);
const K={h:'real milestone',p:'prediction',s:'their forecast',n:'real headline',f:'made-up headline'};
const items=ctx.window.WP_DATA.map(it=>Object.assign({slug:it.d+'-'+slugify(it.t)},it)).sort((a,b)=>a.d<b.d?-1:a.d>b.d?1:0);
const seen=new Set();items.forEach(it=>{if(seen.has(it.slug))throw new Error('duplicate slug '+it.slug);seen.add(it.slug);});
const groups=[['Milestones, 2012 to now','h'],['Predictions, 2027 to 2031','p'],['Other people\'s forecasts','s'],['Real headlines','n'],['Made-up future headlines','f']];
let out='';groups.forEach(([g,k])=>{out+=`\n### ${g}\n\n| # | File slug | Date | Title | What happened / what to show |\n|---|---|---|---|---|\n`;
items.filter(it=>it.k===k).forEach((it,i)=>{out+=`| ${i+1} | \`${it.slug}\` | ${it.d} | ${it.t.replace(/\|/g,'/')} | ${(it.x||'').replace(/\|/g,'/')} |\n`;});});
process.stdout.write(out);
