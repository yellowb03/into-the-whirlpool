#!/usr/bin/env node
// Validates every card batch listed in the desk lists named by decks/manifest.json.
// Usage: node tools/validate-cards.js            (all batches)
//        node tools/validate-cards.js path.json  (one batch, still checks ids against the rest)
// Exit code 1 on any error. Warnings never fail the run, but read them.
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const registry = JSON.parse(fs.readFileSync(path.join(root, 'decks/decks.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'decks/manifest.json'), 'utf8'));
const decks = new Map(registry.decks.map(d => [d.id, d]));
const topics = new Set(registry.topics);

// Satire, hoax-farm, social and user-generated sites never count as a source.
const BANNED = [
  'theonion.com', 'babylonbee.com', 'clickhole.com', 'worldnewsdailyreport.com', 'thedailymash.co.uk',
  'newsthump.com', 'waterfordwhispersnews.com', 'weeklyworldnews.com', 'empirenews.net', 'huzlers.com',
  'nationalreport.net', 'thebeaverton.com', 'duffelblog.com', 'thepoke.co.uk', 'thehardtimes.net',
  'reddit.com', 'facebook.com', 'x.com', 'twitter.com', 'tiktok.com', 'instagram.com', 'pinterest.com',
  'quora.com', 'youtube.com', 'imgur.com', 'buzzfeed.com', 'boredpanda.com', 'ranker.com', 'cracked.com',
];
const DIFFICULTY = new Set(['easy', 'medium', 'hard']);
const VERDICTS = new Set(['real', 'made-up']);

const errors = [];
const warnings = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);
const words = s => (s || '').trim().split(/\s+/).filter(Boolean).length;
const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(w => w.length > 3);

const only = process.argv[2] ? path.resolve(process.argv[2]) : null;
const files = [];
for (const list of manifest.lists) {
  const lp = path.join(root, list);
  if (!fs.existsSync(lp)) { errors.push(`${list}: listed in decks/manifest.json but missing`); continue; }
  try { JSON.parse(fs.readFileSync(lp, 'utf8')).files.forEach(f => files.push(path.join(root, f))); }
  catch (e) { errors.push(`${list}: invalid JSON: ${e.message}`); }
}
if (only && !files.includes(only)) files.push(only);

const ids = new Map();
const urls = new Map();
const all = [];

for (const file of files) {
  const rel = path.relative(root, file);
  if (!fs.existsSync(file)) { err(rel, 'listed in a decks/files-*.json list but missing'); continue; }
  let batch;
  try { batch = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { err(rel, 'invalid JSON: ' + e.message); continue; }
  if (!Array.isArray(batch)) { err(rel, 'a batch must be a JSON array of cards'); continue; }

  batch.forEach((c, i) => {
    const at = `${rel} #${i} ${c && c.id ? c.id : '(no id)'}`;
    if (!c || typeof c !== 'object') return err(at, 'not an object');
    const deck = decks.get(c.deck);
    if (!deck) err(at, `unknown deck "${c.deck}"`);
    if (typeof c.id !== 'string' || !/^[a-z]{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(c.id)) err(at, 'id must be kebab-case like "fm-gator-drive-thru"');
    else if (deck && !c.id.startsWith(deck.prefix + '-')) err(at, `id must start with "${deck.prefix}-" for deck ${deck.id}`);
    if (ids.has(c.id)) err(at, `duplicate id, also in ${ids.get(c.id)}`); else ids.set(c.id, rel);
    if (!VERDICTS.has(c.verdict)) err(at, 'verdict must be "real" or "made-up"');

    const hw = words(c.headline);
    if (!c.headline) err(at, 'headline missing');
    else if (hw < 8 || hw > 34) warn(at, `headline is ${hw} words (aim for 12–30)`);
    if (/[!?]{2,}|\bLOL\b|😂/.test(c.headline || '')) warn(at, 'headline sounds like a joke; keep it deadpan');
    if (!c.reveal) err(at, 'reveal missing');
    else if (words(c.reveal) > 50) warn(at, `reveal is ${words(c.reveal)} words (max 45)`);

    if (typeof c.date !== 'string' || !/^\d{4}(-\d{2}(-\d{2})?)?$/.test(c.date)) err(at, 'date must be YYYY, YYYY-MM or YYYY-MM-DD');
    else if (parseInt(c.date, 10) > new Date().getFullYear()) err(at, 'date is in the future');
    if (typeof c.country !== 'string' || !/^[A-Z]{2}$/.test(c.country)) err(at, 'country must be an ISO 3166-1 alpha-2 code like "US"');
    if (!Array.isArray(c.topics) || !c.topics.length) err(at, 'topics must be a non-empty array');
    else c.topics.forEach(t => { if (!topics.has(t)) err(at, `unknown topic "${t}"`); });
    if (typeof c.spicy !== 'boolean') err(at, 'spicy must be true or false');
    if (!DIFFICULTY.has(c.difficulty)) err(at, 'difficulty must be easy, medium or hard');
    if (c.deck === 'florida-man' && c.region !== 'Florida') err(at, 'Florida Man cards need region "Florida"');
    if (c.deck === 'annals' && parseInt(c.date, 10) >= 1970) err(at, 'Annals cards must be dated before 1970');
    if (c.headline_original && parseInt(c.date, 10) >= 1929) err(at, 'headline_original (verbatim) is only allowed for pre-1929, public-domain headlines');
    if (c.hoax && c.verdict !== 'real') err(at, 'hoax:true is only for REAL cards whose original story was itself a hoax');

    if (c.verdict === 'real') {
      if (!Array.isArray(c.sources) || !c.sources.length) err(at, 'REAL cards need at least one source');
      else {
        const hosts = new Set();
        c.sources.forEach((s, j) => {
          const sat = `${at} source ${j}`;
          if (!s || !s.url || !/^https:\/\//.test(s.url)) return err(sat, 'url must start with https://');
          let host = '';
          try { host = new URL(s.url).hostname.replace(/^www\./, ''); } catch { return err(sat, 'unparseable url'); }
          hosts.add(host);
          if (BANNED.some(b => host === b || host.endsWith('.' + b))) err(sat, `${host} is not an allowed source`);
          if (!s.publisher) err(sat, 'publisher missing');
          if (!s.title) warn(sat, 'title missing');
          const key = s.url.replace(/[?#].*$/, '').replace(/\/$/, '');
          if (urls.has(key) && urls.get(key) !== c.id) warn(sat, `same url as ${urls.get(key)}: duplicate story?`);
          else urls.set(key, c.id);
        });
        if (hosts.size < 2 && c.deck !== 'annals') warn(at, 'only one independent source; two is better');
      }
      if (!c.verified || !/^\d{4}-\d{2}-\d{2}$/.test(c.verified)) err(at, 'REAL cards need verified: "YYYY-MM-DD" (the day you opened the source)');
    } else if (c.verdict === 'made-up') {
      if (c.sources && c.sources.length) err(at, 'MADE UP cards must not have sources');
      if (c.place) warn(at, 'MADE UP cards should not name a specific town; leave place out');
    }
    all.push(c);
  });
}

// Near-duplicate headlines across the whole library.
const bags = all.map(c => ({ id: c.id, set: new Set(norm(c.headline)) }));
for (let i = 0; i < bags.length; i++) for (let j = i + 1; j < bags.length; j++) {
  const a = bags[i].set, b = bags[j].set;
  if (a.size < 4 || b.size < 4) continue;
  let inter = 0; a.forEach(w => { if (b.has(w)) inter++; });
  const score = inter / Math.min(a.size, b.size);
  if (score >= 0.7) warn(`${bags[i].id} ~ ${bags[j].id}`, `headlines look like the same story (${Math.round(score * 100)}% overlap)`);
}

// Report.
const by = (k) => all.reduce((m, c) => (m[c[k]] = (m[c[k]] || 0) + 1, m), {});
console.log(`\n${all.length} cards in ${files.length} batch file(s)\n`);
for (const d of registry.decks) {
  const cs = all.filter(c => c.deck === d.id);
  if (!cs.length) continue;
  const r = cs.filter(c => c.verdict === 'real').length;
  const f = cs.length - r;
  const sp = cs.filter(c => c.spicy).length;
  const t = d.target;
  console.log(`  ${d.name.padEnd(26)} real ${String(r).padStart(4)}/${t.real}  made-up ${String(f).padStart(4)}/${t['made-up']}  spicy ${sp}`);
}
const countries = by('country');
const us = countries.US || 0;
console.log(`\n  countries: ${Object.keys(countries).length}  ·  US share: ${all.length ? Math.round(us / all.length * 100) : 0}%`);
console.log('  ' + Object.entries(countries).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · '));
const diff = by('difficulty');
console.log(`  difficulty: easy ${diff.easy || 0} · medium ${diff.medium || 0} · hard ${diff.hard || 0}\n`);

if (warnings.length) { console.log(`${warnings.length} warning(s):`); warnings.forEach(w => console.log('  ⚠ ' + w)); console.log(''); }
if (errors.length) { console.log(`${errors.length} error(s):`); errors.forEach(e => console.log('  ✖ ' + e)); process.exit(1); }
console.log('✔ no errors');
