#!/usr/bin/env node
// Sync catalog content from the Shopify store into ./data/*.json.
//
// Shopify stays the single source of truth (products, prices, seat tiers,
// metaobject course pages, collections, policies). This script snapshots it so
// the static build is reproducible and diffable. Run: `npm run sync`.
//
// Flags:
//   --offline   re-parse cached HTML in .cache/ without hitting the network
//   --no-images skip image download/optimisation

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import * as cheerio from 'cheerio';
import config from '../site.config.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DATA = path.join(ROOT, 'data');
const CACHE = path.join(ROOT, '.cache', 'html');
const OFFLINE = process.argv.includes('--offline');
const NO_IMAGES = process.argv.includes('--no-images');
const ORIGIN = config.sourceOrigin.replace(/\/$/, '');
const UA = 'oshascorm-static-sync/1.0 (+https://oshascorm.org)';

await fs.mkdir(DATA, { recursive: true });
await fs.mkdir(CACHE, { recursive: true });

// ---------------------------------------------------------------- fetching --
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Cached responses younger than this are reused (keeps re-runs polite).
const CACHE_TTL_MS = Number(process.env.SYNC_CACHE_TTL_HOURS ?? 6) * 3600e3;
const CONCURRENCY = Number(process.env.SYNC_CONCURRENCY ?? 3);

async function get(url, { json = false, cache = true, tries = 7 } = {}) {
  const key = crypto.createHash('sha1').update(url).digest('hex');
  const file = path.join(CACHE, key + (json ? '.json' : '.html'));
  const missing = file + '.404';
  if (OFFLINE) {
    if (await fs.stat(missing).catch(() => null)) return null;
    const txt = await fs.readFile(file, 'utf8');
    return json ? JSON.parse(txt) : txt;
  }
  if (cache) {
    for (const f of [file, missing]) {
      const st = await fs.stat(f).catch(() => null);
      if (st && Date.now() - st.mtimeMs < CACHE_TTL_MS) {
        if (f === missing) return null;
        const txt = await fs.readFile(file, 'utf8');
        return json ? JSON.parse(txt) : txt;
      }
    }
  }
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': UA, accept: json ? 'application/json' : 'text/html' } });
      if (res.status === 429 || res.status >= 500) {
        const ra = Number(res.headers.get('retry-after'));
        const err = new Error(`HTTP ${res.status}`);
        err.wait = Number.isFinite(ra) && ra > 0 ? ra * 1000 : 0;
        throw err;
      }
      if (res.status === 404) {
        if (cache) await fs.writeFile(missing, '');
        return null;
      }
      const txt = await res.text();
      if (cache) await fs.writeFile(file, txt);
      return json ? JSON.parse(txt) : txt;
    } catch (e) {
      lastErr = e;
      await sleep(Math.max(e.wait || 0, 2000 * 2 ** i));
    }
  }
  throw new Error(`GET ${url} failed: ${lastErr?.message}`);
}

async function pool(items, size, fn) {
  const out = new Array(items.length);
  let i = 0;
  let done = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
      done++;
      if (done % 50 === 0) console.log(`  … ${done}/${items.length}`);
    }
  }
  await Promise.all(Array.from({ length: size }, worker));
  return out;
}

// ----------------------------------------------------------------- helpers --
const clean = (s = '') => s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const stripSuffix = (t = '') => clean(t).replace(/\s*[–-]\s*OSHASCORM\.ORG\s*$/i, '');

function absUrl(src) {
  if (!src) return null;
  if (src.startsWith('//')) return 'https:' + src;
  if (src.startsWith('/')) return ORIGIN + src;
  return src;
}

// Rewrite store-relative /cdn/shop URLs to the permanent cdn.shopify.com host.
// (oshascorm.org/cdn/... stops working once the apex moves to GitHub Pages.)
function cdn(src) {
  const u = absUrl(src);
  if (!u) return null;
  return u.replace(/^https?:\/\/(?:oshascorm\.org|scorm-online\.myshopify\.com)\/cdn\/shop\//, 'https://cdn.shopify.com/s/files/1/0644/3211/1782/');
}

// Sanitise Shopify rich text: drop scripts/styles/inline styles, keep semantics.
function sanitize(html = '') {
  if (!html) return '';
  const $ = cheerio.load(`<div id="__r">${html}</div>`, null, false);
  const r = $('#__r');
  r.find('script,style,iframe,noscript,form,input,button,svg,link,meta').remove();
  r.find('*').each((_, el) => {
    const keep = { a: ['href', 'title'], img: ['src', 'alt', 'width', 'height'], td: ['colspan', 'rowspan'], th: ['colspan', 'rowspan', 'scope'], ol: ['start'] };
    const allowed = keep[el.tagName] || [];
    for (const name of Object.keys(el.attribs || {})) if (!allowed.includes(name)) $(el).removeAttr(name);
    if (el.tagName === 'img') $(el).attr('src', cdn($(el).attr('src')));
    if (el.tagName === 'a') {
      const href = $(el).attr('href') || '';
      $(el).attr('href', href.replace(/^https?:\/\/(?:www\.)?oshascorm\.org/i, '') || '/');
    }
    // Unwrap presentational wrappers.
    if (['span', 'font', 'section', 'article'].includes(el.tagName)) $(el).replaceWith($(el).contents());
  });
  r.find('p').each((_, el) => { if (!clean($(el).text()) && !$(el).find('img').length) $(el).remove(); });
  return r.html().replace(/\n{2,}/g, '\n').trim();
}

function keyDetails($, scope) {
  const out = [];
  $(scope).find('.key-details-list li').each((_, li) => {
    const label = clean($(li).find('strong').first().text()).replace(/:$/, '');
    const value = clean($(li).find('.detail-text').first().text());
    if (label && value && !out.some((d) => d.label === label)) out.push({ label, value });
  });
  return out;
}

function languages($, scope) {
  const langs = [];
  $(scope).find('.lang-availability .lang').each((_, el) => { const t = clean($(el).text()); if (t && !langs.includes(t)) langs.push(t); });
  return langs;
}

// ---------------------------------------------------------------- products --
console.log('→ products.json');
let rawProducts = [];
for (let page = 1; page < 20; page++) {
  const d = await get(`${ORIGIN}/products.json?limit=250&page=${page}`, { json: true });
  if (!d?.products?.length) break;
  rawProducts.push(...d.products);
}
console.log(`  ${rawProducts.length} products`);

console.log('→ collections.json');
const rawCollections = (await get(`${ORIGIN}/collections.json?limit=250`, { json: true })).collections;
console.log(`  ${rawCollections.length} collections`);

const membership = {};
await pool(rawCollections, CONCURRENCY, async (c) => {
  const handles = [];
  for (let page = 1; page < 10; page++) {
    const d = await get(`${ORIGIN}/collections/${c.handle}/products.json?limit=250&page=${page}`, { json: true });
    if (!d?.products?.length) break;
    handles.push(...d.products.map((p) => p.handle));
  }
  membership[c.handle] = handles;
});

console.log('→ product pages');
const products = await pool(rawProducts, CONCURRENCY, async (p) => {
  const html = await get(`${ORIGIN}/products/${p.handle}`);
  const $ = cheerio.load(html || '');
  const main = $('main');
  const tabs = [];
  main.find('.ss-product_tabs .prod-tabs_header .tab_btn').each((i, b) => {
    const content = main.find('.ss-product_tabs .prod-tabs_content .tab').eq(i).html();
    const title = clean($(b).text());
    const body = sanitize(content);
    if (title && body) tabs.push({ title, html: body });
  });
  let smallTeamUrl = null;
  main.find('a').each((_, a) => {
    if (/click here/i.test($(a).text()) && /less than 10 seats/i.test($(a).parent().text())) smallTeamUrl = $(a).attr('href');
  });
  const sample = main.find('.key-details-block .product__description a, .product__description a').filter((_, a) => /sample/i.test($(a).text())).first().attr('href') || null;
  const crumbs = main.find('nav.breadcrumb a, .breadcrumb a, .breadcrumbs a').map((_, a) => ({ name: clean($(a).text()), href: $(a).attr('href') })).get();
  const rating = parseFloat((main.find('.rating-text, .rating [aria-hidden]').first().text().match(/\d\.\d/) || [])[0]) || null;
  return {
    id: p.id,
    handle: p.handle,
    title: clean(p.title),
    vendor: p.vendor,
    tags: p.tags,
    created_at: p.created_at,
    updated_at: p.updated_at,
    published_at: p.published_at,
    body_html: sanitize(p.body_html),
    images: p.images.map((im) => ({ src: im.src, width: im.width, height: im.height, alt: im.alt })),
    options: p.options.map((o) => o.name),
    variants: p.variants.map((v) => ({
      id: v.id,
      title: v.title,
      seats: parseInt(v.option1, 10) || null,
      price: Number(v.price),
      compare_at_price: v.compare_at_price ? Number(v.compare_at_price) : null,
      sku: v.sku,
      available: v.available,
    })),
    seo: {
      title: stripSuffix($('title').first().text()) || clean(p.title),
      description: clean($('meta[name="description"]').attr('content') || ''),
    },
    duration: clean(main.find('.duration').first().text()).replace(/^Course Duration:\s*/i, '') || null,
    languages: languages($, main),
    keyDetails: keyDetails($, main),
    tabs,
    sampleUrl: sample,
    smallTeamUrl,
    breadcrumbs: crumbs,
    rating,
    collections: Object.entries(membership).filter(([, hs]) => hs.includes(p.handle)).map(([h]) => h),
  };
});

// ------------------------------------------------------------- collections --
console.log('→ collection pages');
const collections = await pool(rawCollections, CONCURRENCY, async (c) => {
  const html = await get(`${ORIGIN}/collections/${c.handle}`);
  const $ = cheerio.load(html || '');
  const main = $('main');
  const sections = [];
  main.children('[id^="shopify-section-template"]').each((_, s) => {
    const id = $(s).attr('id');
    if (/product-grid/.test(id)) return;
    const sec = $(s);
    if (/image_banner/.test(id)) {
      sections.push({
        type: 'hero',
        heading: clean(sec.find('.banner__heading').first().text()),
        text: clean(sec.find('.banner__text').first().text()),
      });
    } else if (/image_with_text/.test(id)) {
      sections.push({
        type: 'intro',
        heading: clean(sec.find('.image-with-text__heading').first().text()),
        html: sanitize(sec.find('.image-with-text__text').first().html()),
        image: cdn(sec.find('img').first().attr('src')),
      });
    } else if (/multicolumn/.test(id)) {
      const cols = [];
      sec.find('.multicolumn-card').each((_, card) => {
        cols.push({ title: clean($(card).find('h3').first().text()), html: sanitize($(card).find('.rte').first().html()) });
      });
      sections.push({ type: 'audience', heading: clean(sec.find('.title, h2').first().text()), columns: cols.filter((x) => x.title || x.html) });
    } else if (/banner/.test(id)) {
      sections.push({ type: 'banner', heading: clean(sec.find('h1').first().text()), html: sanitize(sec.find('.collection-hero__description, .rte').first().html()) });
    }
  });
  return {
    id: c.id,
    handle: c.handle,
    title: clean(c.title),
    description_html: sanitize(c.description),
    image: c.image ? { src: c.image.src, width: c.image.width, height: c.image.height, alt: c.image.alt } : null,
    updated_at: c.updated_at,
    seo: {
      title: stripSuffix($('title').first().text()) || clean(c.title),
      description: clean($('meta[name="description"]').attr('content') || ''),
    },
    sections,
    products: membership[c.handle] || [],
  };
});

// ----------------------------------------------- metaobject directory courses --
console.log('→ metaobject course pages');
const moSitemap = await get(`${ORIGIN}/sitemap_metaobject_pages_1.xml`);
const moUrls = [...(moSitemap || '').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).filter((u) => /\/pages\/courses\//.test(u));
const moLastmod = Object.fromEntries([...(moSitemap || '').matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)].map((m) => [m[1], m[2]]));
console.log(`  ${moUrls.length} course pages`);

const courses = (await pool(moUrls, CONCURRENCY, async (u) => {
  const handle = u.split('/pages/courses/')[1].replace(/\/$/, '');
  const html = await get(`${ORIGIN}/pages/courses/${handle}`);
  if (!html) return null;
  const $ = cheerio.load(html);
  const main = $('main');
  if (/404/.test($('title').text())) return null;
  const crumbs = main.find('nav a, .breadcrumb a, .breadcrumbs a, [class*="breadcrumb"] a').map((_, a) => clean($(a).text())).get();
  let category = null;
  const crumbText = clean(main.find('[class*="breadcrumb"]').first().text());
  if (crumbText) {
    const parts = crumbText.split('›').map(clean).filter(Boolean);
    if (parts.length >= 3) category = parts[parts.length - 2];
  }
  const slider = main.find('#course-seats-picker');
  const seats = (slider.attr('data-seats') || '10,25,50,75,100,150,200').split(',').map((n) => parseInt(n, 10)).filter(Boolean);
  const basePrice = parseFloat(slider.attr('data-base-price')) || null;
  // Overview: the first tab panel, or the description block.
  let overview = '';
  const tabPanel = main.find('.prod-tabs_content .tab').first();
  if (tabPanel.length) overview = tabPanel.html();
  if (!overview) overview = main.find('.course-overview, .rte').last().html() || '';
  const ovText = clean(cheerio.load(overview || '').text());
  const bullets = ovText.includes('•') ? ovText.split('•').map(clean).filter(Boolean) : [];
  const ogImage = $('meta[property="og:image:secure_url"]').attr('content') || $('meta[property="og:image"]').attr('content');
  const mainImg = main.find('img').first().attr('src');
  return {
    handle,
    title: clean(main.find('h1').first().text()) || stripSuffix($('title').text()),
    category,
    breadcrumbs: crumbs,
    seo: { title: stripSuffix($('title').first().text()), description: clean($('meta[name="description"]').attr('content') || '') },
    duration: clean(main.find('.duration').first().text()).replace(/^Course Duration:\s*/i, '') || null,
    languages: languages($, main),
    keyDetails: keyDetails($, main),
    basePrice,
    seats,
    overviewHeading: clean(tabPanel.find('h2,h3').first().text()) || null,
    overviewBullets: bullets,
    overviewHtml: bullets.length ? '' : sanitize(overview),
    image: cdn(mainImg || ogImage),
    lastmod: moLastmod[u] || null,
  };
})).filter(Boolean);

// ------------------------------------------------------ pages & policies --
console.log('→ pages + policies');
const pageHandles = ['contact', 'faq', 'return-policy', 'terms-of-service'];
const pages = (await pool(pageHandles, 2, async (h) => {
  const html = await get(`${ORIGIN}/pages/${h}`);
  if (!html) return null;
  const $ = cheerio.load(html);
  const main = $('main');
  // FAQ pages use collapsible rows: capture Q/A pairs explicitly.
  const faqs = [];
  main.find('details').each((_, d) => {
    const q = clean($(d).find('summary').first().text());
    const a = sanitize($(d).find('summary').first().nextAll().map((_, n) => $.html(n)).get().join(''));
    if (q && a) faqs.push({ q, a });
  });
  const body = main.find('.rte').map((_, el) => $(el).html()).get().join('\n');
  return {
    handle: h,
    title: clean(main.find('h1').first().text()) || stripSuffix($('title').text()),
    seo: { title: stripSuffix($('title').first().text()), description: clean($('meta[name="description"]').attr('content') || '') },
    html: sanitize(body),
    faqs,
  };
})).filter(Boolean);

const policyHandles = ['refund-policy', 'terms-of-service', 'privacy-policy', 'shipping-policy', 'contact-information'];
const policies = (await pool(policyHandles, 2, async (h) => {
  const html = await get(`${ORIGIN}/policies/${h}`);
  if (!html) return null;
  const $ = cheerio.load(html);
  const body = $('.shopify-policy__body').html() || $('main .rte').html() || '';
  if (!clean(cheerio.load(body).text())) return null;
  return { handle: h, title: clean($('.shopify-policy__title h1, h1').first().text()), html: sanitize(body) };
})).filter(Boolean);

// Homepage FAQ (collapsible content section) for reuse on / and /pages/faq.
const homeHtml = await get(`${ORIGIN}/`);
const $h = cheerio.load(homeHtml || '');
const homeFaqs = [];
$h('main details').each((_, d) => {
  const q = clean($h(d).find('summary').first().text());
  const a = sanitize($h(d).find('summary').first().nextAll().map((_, n) => $h.html(n)).get().join(''));
  if (q && a) homeFaqs.push({ q, a });
});

// Natural dimensions of images embedded in Shopify rich text, so the build can
// emit width/height (no layout shift) and size them for high-DPI screens.
const contentHtml = [
  ...products.flatMap((p) => [p.body_html, ...p.tabs.map((t) => t.html)]),
  ...pages.map((p) => p.html), ...policies.map((p) => p.html),
  ...collections.flatMap((c) => c.sections.map((s) => s.html || '')),
].join('\n');
const contentImgs = [...new Set([...contentHtml.matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => m[1].split('?')[0]))];
const imgDims = {};
if (!OFFLINE) {
  const sharp = (await import('sharp')).default;
  for (const src of contentImgs) {
    try {
      const res = await fetch(src, { headers: { 'user-agent': UA } });
      const meta = await sharp(Buffer.from(await res.arrayBuffer())).metadata();
      imgDims[src] = { w: meta.width, h: meta.height };
    } catch { /* leave unknown */ }
  }
} else {
  Object.assign(imgDims, JSON.parse(await fs.readFile(path.join(DATA, 'img-dims.json'), 'utf8').catch(() => '{}')));
}

// UCP profile (endpoints live on the myshopify domain, so it is portable).
let ucp = null;
try { ucp = await get(`https://${config.shopifyStore}/.well-known/ucp`, { json: true }); } catch { /* optional */ }

const productByHandle = Object.fromEntries(products.map((p) => [p.handle, p]));

// ------------------------------------------------------------------ images --
// Each product's hero image is self-hosted as responsive WebP: it is the LCP
// element on product pages, and serving it same-origin avoids a second TLS
// connection. Card thumbnails keep using cdn.shopify.com (resized on the fly).
const IMG_DIR = path.join(DATA, 'img');
const HERO_WIDTHS = [480, 720, 960];
if (!NO_IMAGES && !OFFLINE) {
  const sharp = (await import('sharp')).default;
  await fs.mkdir(IMG_DIR, { recursive: true });
  const manifestFile = path.join(IMG_DIR, 'manifest.json');
  const manifest = JSON.parse(await fs.readFile(manifestFile, 'utf8').catch(() => '{}'));
  const wanted = new Set();
  await pool(products.filter((p) => p.images[0]), CONCURRENCY, async (p) => {
    const src = p.images[0].src;
    const base = p.handle.slice(0, 80);
    HERO_WIDTHS.forEach((w) => wanted.add(`${base}-${w}.webp`));
    if (manifest[p.handle]?.src === src && HERO_WIDTHS.every((w) => manifest[p.handle].files.includes(`${base}-${w}.webp`))) return;
    const u = new URL(src);
    u.searchParams.set('width', '1200');
    const res = await fetch(u, { headers: { 'user-agent': UA } });
    if (!res.ok) return;
    const buf = Buffer.from(await res.arrayBuffer());
    const files = [];
    for (const w of HERO_WIDTHS) {
      const out = `${base}-${w}.webp`;
      await sharp(buf).resize({ width: w, height: Math.round(w * 2 / 3), fit: 'cover' }).webp({ quality: 72, effort: 5 }).toFile(path.join(IMG_DIR, out));
      files.push(out);
    }
    manifest[p.handle] = { src, files };
  });
  // Drop images for products that no longer exist.
  for (const f of await fs.readdir(IMG_DIR)) if (f.endsWith('.webp') && !wanted.has(f)) await fs.rm(path.join(IMG_DIR, f));
  for (const h of Object.keys(manifest)) if (!productByHandle[h]) delete manifest[h];
  await fs.writeFile(manifestFile, JSON.stringify(manifest, null, 1) + '\n');
  console.log(`  hero images: ${Object.keys(manifest).length}`);
}

// ------------------------------------------------------------------- write --
const write = (name, data) => fs.writeFile(path.join(DATA, name), JSON.stringify(data, null, 1) + '\n');
await write('products.json', products);
await write('collections.json', collections);
await write('courses.json', courses);
await write('pages.json', pages);
await write('policies.json', policies);
await write('home-faqs.json', homeFaqs);
await write('img-dims.json', imgDims);
if (ucp) await write('ucp.json', ucp);
// Keep the previous timestamp when nothing changed, so no-op syncs produce
// no git diff.
const digest = crypto.createHash('sha1').update(JSON.stringify([products, collections, courses, pages, policies, homeFaqs, ucp])).digest('hex');
const prevMeta = JSON.parse(await fs.readFile(path.join(DATA, 'meta.json'), 'utf8').catch(() => '{}'));
await write('meta.json', {
  syncedAt: prevMeta.digest === digest ? prevMeta.syncedAt : new Date().toISOString(),
  digest,
  source: ORIGIN,
  counts: { products: products.length, collections: collections.length, courses: courses.length, pages: pages.length, policies: policies.length },
});

console.log(`✓ synced ${products.length} products, ${collections.length} collections, ${courses.length} directory courses, ${pages.length} pages, ${policies.length} policies`);
if (NO_IMAGES) console.log('  (images skipped)');
