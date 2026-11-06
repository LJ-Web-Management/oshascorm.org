#!/usr/bin/env node
// SEO / integrity checks over ./docs. Exits non-zero on errors so CI blocks
// a broken deploy. Run: `npm run verify`.
import fs from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';
import cfg from '../site.config.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'docs');
const errors = [];
const warns = [];
const err = (f, m) => errors.push(`${f}: ${m}`);
const warn = (f, m) => warns.push(`${f}: ${m}`);

async function walk(dir) {
  const out = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}
const all = await walk(ROOT);
const rel = (f) => '/' + path.relative(ROOT, f).split(path.sep).join('/');
const exists = new Set(all.map(rel));
const resolves = (p) => {
  p = decodeURIComponent(p.split('#')[0].split('?')[0]);
  if (!p || p === '/') return exists.has('/index.html');
  if (p.endsWith('/')) return exists.has(p + 'index.html');
  return exists.has(p) || exists.has(p + '.html') || exists.has(p + '/index.html');
};

const html = all.filter((f) => f.endsWith('.html'));
const titles = new Map();
const descs = new Map();
let jsonldBlocks = 0;
let redirects = 0;
const types = {};

for (const f of html) {
  const r = rel(f);
  const $ = cheerio.load(await fs.readFile(f, 'utf8'));
  const noindex = /noindex/.test($('meta[name="robots"]').attr('content') || '');
  if (r === '/404.html') continue;
  const refresh = $('meta[http-equiv="refresh"]').attr('content');
  if (refresh) {
    const target = refresh.split('url=')[1];
    if (!target || !resolves(target)) err(r, `redirect target missing ${target}`);
    redirects++;
    continue;
  }

  // Links
  $('a[href]').each((_, a) => {
    const h = $(a).attr('href');
    if (h.startsWith('/') && !h.startsWith('//') && !resolves(h)) err(r, `broken link ${h}`);
    if (/^(click here|read more|learn more|here|more)$/i.test($(a).text().trim())) err(r, `non-descriptive link text "${$(a).text().trim()}"`);
  });
  $('img').each((_, i) => { if ($(i).attr('alt') === undefined) err(r, `img without alt ${$(i).attr('src')}`); });

  // Head
  const title = $('title').text();
  const desc = $('meta[name="description"]').attr('content') || '';
  const canon = $('link[rel="canonical"]').attr('href') || '';
  const h1s = $('h1').length;
  if (h1s !== 1) err(r, `${h1s} <h1> elements`);
  if (!title) err(r, 'missing <title>');
  if (!desc) err(r, 'missing meta description');
  if (!noindex) {
    if (title.length > 70) warn(r, `title ${title.length} chars`);
    if (desc.length < 70 || desc.length > 160) warn(r, `description ${desc.length} chars`);
    const expected = cfg.siteUrl + (r === '/index.html' ? '/' : r.replace(/index\.html$/, '').replace(/\.html$/, ''));
    if (canon !== expected) err(r, `canonical ${canon} != ${expected}`);
    if (titles.has(title)) err(r, `duplicate title with ${titles.get(title)}`); else titles.set(title, r);
    if (descs.has(desc)) warn(r, `duplicate description with ${descs.get(desc)}`); else descs.set(desc, r);
    const md = $('link[rel="alternate"][type="text/markdown"]').attr('href');
    if (md && !exists.has(md)) err(r, `markdown twin missing ${md}`);
  }

  // JSON-LD
  $('script[type="application/ld+json"]').each((_, s) => {
    jsonldBlocks++;
    let data;
    try { data = JSON.parse($(s).html()); } catch (e) { err(r, `invalid JSON-LD: ${e.message}`); return; }
    const nodes = data['@graph'] || [data];
    for (const n of nodes) {
      const t = [].concat(n['@type']).join(',');
      types[t] = (types[t] || 0) + 1;
      if (t === 'Product') {
        if (!n.name) err(r, 'Product.name missing');
        if (!n.image) warn(r, 'Product.image missing');
        const offers = n.offers?.offers || (n.offers ? [n.offers] : []);
        if (!offers.length) err(r, 'Product has no offers');
        for (const o of offers) if (!(Number(o.price) > 0) || o.priceCurrency !== 'USD' || !o.availability) err(r, `bad offer ${JSON.stringify(o).slice(0, 80)}`);
      }
      if (t === 'FAQPage' && !n.mainEntity?.length) err(r, 'empty FAQPage');
      if (t === 'BreadcrumbList') for (const li of n.itemListElement) if (!resolves(li.item.replace(cfg.siteUrl, ''))) err(r, `breadcrumb target missing ${li.item}`);
    }
  });
}

// The site must not depend on, link to, or embed the former Shopify store or
// any chat widget (text files only; images are binary).
for (const f of all.filter((x) => /\.(html|md|txt|json|js|xml|webmanifest)$/.test(x) || /\.well-known/.test(x))) {
  const t = await fs.readFile(f, 'utf8');
  if (/shopify|myshopify/i.test(t)) err(rel(f), 'references Shopify');
  if (/<(shopify|chat)-[a-z-]+|embed\.tawk\.to|widget\.intercom|code\.tidio|client\.crisp\.chat|zopim|livechatinc/i.test(t)) err(rel(f), 'contains a chat widget');
}

// Sitemap ⊆ existing pages
const sm = await fs.readFile(path.join(ROOT, 'sitemap.xml'), 'utf8');
const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
for (const l of locs) if (!resolves(l.replace(cfg.siteUrl, ''))) err('/sitemap.xml', `missing page ${l}`);
for (const req of ['/robots.txt', '/llms.txt', '/llms-full.txt', '/agents.md', '/sitemap.xml', '/api/catalog.json', '/.well-known/api-catalog', '/CNAME', '/.nojekyll', '/404.html']) if (!exists.has(req)) err('site', `missing ${req}`);

console.log(`Checked ${html.length} HTML files (${redirects} redirect stubs), ${jsonldBlocks} JSON-LD blocks, ${locs.length} sitemap URLs.`);
console.log('Schema types:', Object.entries(types).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}×${v}`).join(', '));
if (warns.length) console.log(`\n${warns.length} warning(s):\n  ` + warns.slice(0, Number(process.env.VERIFY_WARN_LIMIT || 25)).join('\n  ') + (warns.length > 25 ? `\n  …and ${warns.length - 25} more` : ''));
if (errors.length) {
  console.error(`\n${errors.length} error(s):\n  ` + errors.slice(0, 50).join('\n  '));
  process.exit(1);
}
console.log('\n✓ verify passed');
