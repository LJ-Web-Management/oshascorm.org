#!/usr/bin/env node
// Build the static site from ./data (the course catalog, the source of truth)
// + ./src into ./docs (served by GitHub Pages). Run: `npm run build`.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import * as esbuild from 'esbuild';
import sharp from 'sharp';
import cfg from '../site.config.mjs';
import { esc, clean, slugify, money, plainText, truncate, parseDuration, priceTiers, srcsetOf, toMarkdown, isoDate, iso } from './lib/util.mjs';
import { page, breadcrumbs, faqList, courseCard, courseRow, pricingTable, buyBox, detailsList, icon, logoMark, trustBand, PAYMENTS } from './lib/layout.mjs';
import * as S from './lib/schema.mjs';
import { home, collectionCopy, scormGuide, LMS } from '../src/content/content.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.resolve(ROOT, process.env.OUT_DIR || 'docs');
const read = async (f) => JSON.parse(await fs.readFile(path.join(ROOT, 'data', f), 'utf8'));
const t0 = Date.now();

// ------------------------------------------------------------------ data --
const [rawProducts, rawCollections, rawCourses, rawPages, rawPolicies, homeFaqs, meta] = await Promise.all(
  ['products.json', 'collections.json', 'courses.json', 'pages.json', 'policies.json', 'home-faqs.json', 'meta.json'].map(read),
);
const media = await read('media.json');
const lmsData = await read('lms.json'); // handle -> { price, lmsId, priceSource }
// Deterministic dates: output only changes when the catalog data changes, so
// rebuilds don't rewrite every page (keeps git history small).
const BUILD_DATE = [...rawProducts.map((p) => p.updated_at), ...rawCourses.map((c) => c.lastmod), ...rawCollections.map((c) => c.updated_at)]
  .filter(Boolean).map((d) => new Date(d).toISOString()).sort().pop() || meta.migratedAt;
const abs = (u) => (u && u.startsWith('/') ? cfg.siteUrl + u : u);
const NEXT_YEAR_END = `${new Date().getUTCFullYear() + 1}-12-31`;
const VALID_UNTIL = NEXT_YEAR_END;

// Fresh output dir (keep CNAME if someone edited it by hand).
await fs.rm(OUT, { recursive: true, force: true });
await fs.mkdir(OUT, { recursive: true });
const files = new Map(); // path -> content (string | Buffer)
const sitemap = []; // { loc, lastmod, priority }
const put = (p, content) => files.set(p.replace(/^\//, ''), content);

// --------------------------------------------------------------- helpers --
const imgDims = await read('img-dims.json').catch(() => ({}));
// Rich-text images: add intrinsic size (rendered at half natural width so they
// stay sharp on 2x screens), lazy loading and async decoding.
const fixImages = (html = '') => html.replace(/<img([^>]*?)src="([^"]+)"([^>]*)>/gi, (m, a, src, b) => {
  const d = imgDims[src.split('?')[0]];
  const attrs = `${a}${b}`.replace(/\s(width|height|loading|decoding)="[^"]*"/gi, '');
  const size = d ? ` width="${Math.round(Math.min(d.w / 2, 640))}" height="${Math.round((Math.min(d.w / 2, 640) * d.h) / d.w)}"` : '';
  return `<img${attrs} src="${src}"${size} loading="lazy" decoding="async">`;
});
const fixHeadings = (html = '') => fixImages(html.replace(/<h1(\s|>)/gi, '<h2$1').replace(/<\/h1>/gi, '</h2>'));
const stripPrefix = (s = '') => clean(s).replace(/^Collection:\s*/i, '');
const unique = (arr) => [...new Set(arr.filter(Boolean))];

function seoTitle(title, suffixes = [' – SCORM Course for LMS', ' | SCORM Course', ' – SCORM']) {
  for (const s of suffixes) if ((title + s).length <= 62) return title + s;
  return title.length <= 70 ? title : truncate(title, 68);
}
function seoDesc(...cands) {
  for (const c of cands) {
    const t = clean(c || '').replace(/^•\s*/, '').replace(/\s*•\s*/g, '; ');
    if (t.length >= 70) return truncate(t, 158);
  }
  return truncate(clean(cands.filter(Boolean).join(' ')), 158);
}
const dedupeDetails = (kd = []) => kd.filter((d, i) => kd.findIndex((x) => x.label === d.label) === i);
const citationOf = (kd = []) => kd.find((d) => /citation/i.test(d.label))?.value?.replace(/^OSHA\s*–\s*/, '') || null;

// ------------------------------------------------------- normalize items --
const collectionsByHandle = Object.fromEntries(rawCollections.map((c) => [c.handle, c]));
// LMS list price per seat (+ LMS course id when known) from data/lms.json.
const priceOf = (handle) => {
  const l = lmsData[handle];
  if (!l?.price) return { price: null };
  return { price: l.price, lmsId: l.lmsId || null, priceSource: l.priceSource, tiers: priceTiers(l.price, cfg.seatPresets) };
};

const products = rawProducts.map((p) => {
  const tabs = p.tabs.map((t) => ({ ...t, html: fixHeadings(t.html) }));
  const descText = plainText(p.body_html) || plainText(tabs[0]?.html);
  const primaryCol = p.collections.filter((h) => !['best-selling-courses', 'epa-regulated-trainings'].includes(h))[0] || p.collections[0];
  const c = {
    type: 'product',
    handle: p.handle,
    id: p.id,
    title: p.title,
    url: `/products/${p.handle}`,
    media: media.products[p.handle] || null,
    ogImage: abs(media.products[p.handle]?.[960] || media.brand.ogCourse),
    imageAlt: p.imageAlt || p.title,
    duration: parseDuration(p.duration)?.label || p.duration,
    languages: p.languages.map((l) => (/only/i.test(l) ? 'English' : l)),
    keyDetails: dedupeDetails(p.keyDetails),
    citation: null,
    category: primaryCol ? collectionsByHandle[primaryCol]?.title : 'Safety training',
    collections: p.collections,
    primaryCollection: primaryCol,
    sku: p.sku || null,
    smallTeamUrl: p.smallTeamUrl,
    sampleUrl: p.sampleUrl,
    tabs,
    bodyHtml: p.body_html,
    descriptionText: descText,
    lastmod: p.updated_at,
    seo: { title: seoTitle(p.title), description: seoDesc(p.seo.description, descText) },
  };
  Object.assign(c, priceOf(p.handle));
  return c;
}).filter((c) => c.price);

const courses = rawCourses.map((m) => {
  const bullets = m.overviewBullets.filter((b) => clean(b) !== clean(m.overviewHeading || '') && !/overview$/i.test(b));
  const citation = citationOf(m.keyDetails);
  const descText = `${m.title}: ${bullets.join('. ')}.`.replace(/\.\./g, '.');
  const pr = priceOf(m.handle);
  const c = {
    type: 'course',
    handle: m.handle,
    title: m.title,
    url: `/pages/courses/${m.handle}`,
    media: media.courses[m.handle] || null,
    ogImage: abs(media.courses[m.handle]?.[960] || media.brand.ogCourse),
    imageAlt: m.title,
    duration: parseDuration(m.duration)?.label || m.duration,
    languages: m.languages.map((l) => (/only/i.test(l) ? 'English' : l)),
    keyDetails: dedupeDetails(m.keyDetails),
    citation,
    category: m.category || 'Safety training',
    bullets,
    descriptionText: descText,
    lastmod: m.lastmod,
    seo: {
      title: seoTitle(m.title),
      description: seoDesc(
        `${m.title} SCORM course${citation ? ` (${citation})` : ''}: ${parseDuration(m.duration)?.label || ''} online training for your LMS. SCORM 1.2 & 2004, certificate of completion, ${pr.price ? money(pr.price) : ''} per seat.`,
      ),
    },
  };
  Object.assign(c, pr);
  return c;
}).filter((c) => c.price);

// De-duplicate: 60+ courses exist both as a flagship product page and as a
// directory (metaobject) page. The product is canonical; the directory URL
// becomes a redirect stub and the product inherits its category + citation.
const normTitle = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
// "OSHA 40 Hour HAZWOPER Training – 29 CFR 1910.120 (e)" is the same course as
// "OSHA 40-Hour HAZWOPER Training": compare titles without trailing CFR cites.
const stripCite = (t) => t.replace(/\s*[–-]\s*\d+\s*CFR\b.*$/i, '').trim();
const productByTitle = Object.fromEntries(products.flatMap((p) => [[normTitle(p.title), p], [normTitle(stripCite(p.title)), p]]));
const productByHandle0 = Object.fromEntries(products.map((p) => [p.handle, p]));
const duplicates = [];
const duplicatesExtra = [];
for (const c of courses) {
  const nt = normTitle(c.title);
  const p = productByHandle0[c.handle] || productByTitle[nt] || (nt.length >= 40 ? products.find((x) => normTitle(x.title).startsWith(nt)) : null);
  if (!p) continue;
  duplicates.push({ from: c.url, to: p.url, title: p.title });
  p.dirCategory ||= c.category;
  p.citation ||= c.citation;
  if (!p.lmsId && c.lmsId) Object.assign(p, { lmsId: c.lmsId, price: c.price, priceSource: c.priceSource, tiers: c.tiers });
  c.duplicateOf = p;
}
courses.splice(0, courses.length, ...courses.filter((c) => !c.duplicateOf));

const allItems = [...products, ...courses].sort((a, b) => a.title.localeCompare(b.title));
const minPer = (c) => c.price;

// Directory categories -> hub pages at /training/<slug>
const categories = {};
for (const c of courses) (categories[c.category] ||= []).push(c);
for (const p of products) if (p.dirCategory) (categories[p.dirCategory] ||= []).push(p);
const categoryList = Object.entries(categories)
  .map(([name, items]) => ({ name, slug: slugify(name), url: `/training/${slugify(name)}`, items: items.sort((a, b) => a.title.localeCompare(b.title)) }))
  .sort((a, b) => b.items.length - a.items.length);
const categoryUrl = Object.fromEntries(categoryList.map((c) => [c.name, c.url]));

// Collections (+ derived Spanish collection membership).
const NAV_ORDER = [
  'hazwoper-training-29-cfr-1910-120', 'rcra-hazardous-waste-management', 'nfpa-70e-electrical-arc-flash-safety', 'osha-construction-safety-training-series',
  'osha-general-safety-training-series', 'hazmat-training-dot-iata-imdg-transportation', 'confined-space-trainings', 'em385-trainings',
  'ammonia-refrigeration-training', 'cdl-entry-level-driver-training-eldt', 'competent-person-training', 'osha-10-30-hour-outreach-training',
  'hazard-communication-hazcom-ghs', 'healthcare-industry-training', 'hydrogen-sulfide-h2s-training', 'lithium-battery-shipping-training',
  'mold-inspection-remediation-certification', 'ergonomics-training', 'stormwater-planning-for-construction', 'radiation-series', 'epa-regulated-trainings',
  'osha-safety-training-in-spanish', 'best-selling-courses',
];
const productByHandle = Object.fromEntries(products.map((p) => [p.handle, p]));
const collections = rawCollections.map((c) => {
  const copy = collectionCopy[c.handle] || {};
  let items = c.products.map((h) => productByHandle[h]).filter(Boolean);
  if (copy.spanish && !items.length) items = products.filter((p) => p.languages.some((l) => /espa/i.test(l)));
  return { ...c, copy, items, url: `/collections/${c.handle}`, title: c.title };
}).sort((a, b) => (NAV_ORDER.indexOf(a.handle) + 1 || 99) - (NAV_ORDER.indexOf(b.handle) + 1 || 99));
const navCollections = collections
  .filter((c) => c.items.length && !['best-selling-courses', 'osha-safety-training-in-spanish', 'epa-regulated-trainings'].includes(c.handle))
  .map((c) => ({ title: c.title.replace(/ Trainings?$/i, ' Training'), url: c.url, count: c.items.length }));

const TOTAL = allItems.length;
const TOTAL_LABEL = `${Math.floor(TOTAL / 10) * 10}+`;
const fill = (str) => String(str).replaceAll('{{TOTAL}}', TOTAL_LABEL);
home.lead = fill(home.lead);
home.seoDescription = fill(home.seoDescription);

// --------------------------------------------------------- assets build --
const cssSrc = await fs.readFile(path.join(ROOT, 'src/assets/css/site.css'), 'utf8');
const css = (await esbuild.transform(cssSrc, { loader: 'css', minify: true })).code.trim();
const jsSrc = await fs.readFile(path.join(ROOT, 'src/assets/js/app.js'), 'utf8');
const js = (await esbuild.transform(jsSrc, { loader: 'js', minify: true, target: 'es2020' })).code;
const assetsVersion = crypto.createHash('sha1').update(js).digest('hex').slice(0, 10);
put('assets/js/app.js', js);
// Self-hosted images (data/img/** -> /assets/img/**).
for (const dir of await fs.readdir(path.join(ROOT, 'data/img'))) {
  for (const f of await fs.readdir(path.join(ROOT, 'data/img', dir))) put(`assets/img/${dir}/${f}`, await fs.readFile(path.join(ROOT, 'data/img', dir, f)));
}
const checkoutJs = (await esbuild.transform(await fs.readFile(path.join(ROOT, 'src/assets/js/checkout.js'), 'utf8'), { loader: 'js', minify: true, target: 'es2020' })).code;
put('assets/js/checkout.js', checkoutJs);
put('assets/fonts/inter-latin-wght.woff2', await fs.readFile(path.join(ROOT, 'node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2')));

const favSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">${logoMark.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</svg>`;
put('favicon.svg', favSvg);
put('favicon-32.png', await sharp(Buffer.from(favSvg)).resize(32, 32).png().toBuffer());
put('apple-touch-icon.png', await sharp(Buffer.from(favSvg)).resize(180, 180).flatten({ background: '#0b2545' }).png().toBuffer());
put('icon-192.png', await sharp(Buffer.from(favSvg)).resize(192, 192).png().toBuffer());
put('icon-512.png', await sharp(Buffer.from(favSvg)).resize(512, 512).png().toBuffer());
put('favicon.ico', await sharp(Buffer.from(favSvg)).resize(48, 48).png().toBuffer());
put('site.webmanifest', JSON.stringify({ name: cfg.legalName, short_name: 'OSHA SCORM', start_url: '/', display: 'browser', background_color: '#ffffff', theme_color: '#0b2545', icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }] }));

const ctx = { cfg, css, assetsVersion, nav: { collections: navCollections } };
const B = S.base(cfg);
const core = [B.org, B.website];

// Write an HTML page plus its Markdown twin, and register it in the sitemap.
function emit(urlPath, { html, md, lastmod, priority = 0.6, noindex = false }) {
  const file = urlPath === '/' ? 'index.html' : urlPath.endsWith('/') ? `${urlPath}index.html` : `${urlPath}.html`;
  put(file, html);
  if (md) put(urlPath === '/' ? 'index.md' : urlPath.endsWith('/') ? `${urlPath}index.md` : `${urlPath}.md`, md);
  if (!noindex) sitemap.push({ loc: cfg.siteUrl + urlPath, lastmod: lastmod ? isoDate(lastmod) : isoDate(BUILD_DATE), priority });
}
const mdFor = (urlPath) => (urlPath === '/' ? '/index.md' : urlPath.endsWith('/') ? `${urlPath}index.md` : `${urlPath}.md`);
const mdHeader = (title, urlPath, desc) => `---\ntitle: ${JSON.stringify(title)}\nurl: ${cfg.siteUrl + urlPath}\ndescription: ${JSON.stringify(desc)}\nupdated: ${isoDate(BUILD_DATE)}\n---\n\n# ${title}\n\n> ${desc}\n\n`;
const tierLines = (c) => c.tiers.map((t) => `| ${t.seats} | ${money(t.perSeat)} | ${money(t.subtotal)} |`).join('\n');

// =================================================================== HOME ==
{
  const best = (collections.find((c) => c.handle === 'best-selling-courses')?.items || products).slice(0, 8);
  const faqs = [...homeFaqs.map((f) => ({ q: f.q.replace(/\s+\?/, '?').replace(/(LMS\))$/, '$1?'), a: f.a })), ...home.faqs];
  const featuredCols = navCollections.slice(0, 12);
  const body = `
<section class="hero"><div class="wrap">
<div>
<p class="eyebrow" style="color:#ffb066">${esc(home.eyebrow)}</p>
<h1>${home.h1}</h1>
<p class="lead">${esc(home.lead)}</p>
<div class="hero__ctas"><a class="btn btn--primary" href="/collections/all">Browse ${TOTAL_LABEL} SCORM courses ${icon.arrow}</a><a class="btn btn--ghost-light" href="#how-it-works">How SCORM delivery works</a></div>
<ul class="hero__proof">${home.proof.map((p) => `<li>${icon.check}${esc(p)}</li>`).join('')}</ul>
</div>
<div class="lms" aria-hidden="true">
<div class="lms__bar"><i></i><i></i><i></i></div>
<div class="lms__card"><div class="lms__row"><div><div class="lms__title">OSHA 40-Hour HAZWOPER</div><div class="lms__meta">SCORM 2004 · 29 CFR 1910.120(e)</div></div><span class="chip chip--green">Passed</span></div><div class="lms__progress"><span style="width:100%"></span></div><div class="lms__meta">Final exam 92% · Certificate issued</div></div>
<div class="lms__card"><div class="lms__row"><div><div class="lms__title">NFPA 70E Arc Flash Safety</div><div class="lms__meta">SCORM 1.2 · 2024 edition</div></div><span class="chip chip--orange">In progress</span></div><div class="lms__progress"><span style="width:62%"></span></div><div class="lms__meta">Module 4 of 6 · bookmarked</div></div>
<div class="lms__card"><div class="lms__stats"><div class="lms__stat"><b>${TOTAL_LABEL}</b><span>courses</span></div><div class="lms__stat"><b>24h</b><span>delivery</span></div><div class="lms__stat"><b>1.2 · 2004</b><span>SCORM</span></div></div></div>
</div>
</div></section>
<section class="logos" aria-label="Compatible LMS platforms"><div class="wrap"><p>Works with</p><ul>${LMS.slice(0, 9).map((l) => `<li>${esc(l)}</li>`).join('')}<li>any SCORM LMS</li></ul></div></section>
${trustBand(cfg)}

<section class="section"><div class="wrap">
<div class="section-head"><p class="eyebrow">Training catalog</p><h2>SCORM safety training for every regulation you manage</h2><p class="lead">From OSHA HAZWOPER and NFPA 70E to DOT hazmat, RCRA, EM 385-1-1 and ELDT — every course is an LMS-ready SCORM package with a certificate of completion.</p></div>
<div class="grid grid--4">${featuredCols.map((c) => `<article class="card card--link cat"><h3><a href="${esc(c.url)}">${esc(c.title)}</a></h3><p class="small muted mb-0">${esc(truncate(plainText(collections.find((x) => x.url === c.url)?.copy?.intro || collections.find((x) => x.url === c.url)?.sections?.[0]?.text || '') || 'LMS-ready SCORM courses.', 110))}</p><div class="cat__count"><span>${c.count} course${c.count === 1 ? '' : 's'}</span>${icon.arrow}</div></article>`).join('')}</div>
<p class="mt-2"><a class="btn btn--ghost" href="/collections">View all training series</a> <a class="btn btn--ghost" href="/pages/courses-directory">Course directory A–Z</a></p>
</div></section>

<section class="section section--soft"><div class="wrap">
<div class="section-head"><p class="eyebrow">Best sellers</p><h2>Best-selling SCORM safety courses</h2></div>
<div class="grid grid--4">${best.map((c) => courseCard(c)).join('')}</div>
</div></section>

<section class="section"><div class="wrap">
<div class="section-head"><p class="eyebrow">Who it’s for</p><h2>Built for the teams that run compliance training</h2></div>
<div class="grid grid--3">${home.audiences.map((a) => `<div class="card"><span class="icon-tile">${icon[a.icon]}</span><h3>${esc(a.title)}</h3><p class="muted">${esc(a.text)}</p></div>`).join('')}</div>
</div></section>

<section class="section section--soft" id="how-it-works"><div class="wrap">
<div class="section-head"><p class="eyebrow">How it works</p><h2>How SCORM delivery works — LMS-ready in 5 steps</h2><p class="lead">No authoring tools, no developers. Order, upload the SCORM ZIP and assign learners the same day.</p></div>
<ol class="steps">${home.steps.map((s) => `<li><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></li>`).join('')}</ol>
</div></section>

<section class="section"><div class="wrap">
<div class="section-head"><p class="eyebrow">Why OSHASCORM.org</p><h2>Built for safety. Designed for scalability.</h2></div>
<div class="grid grid--3">${home.pillars.map((a) => `<div class="card"><span class="icon-tile">${icon[a.icon]}</span><h3>${esc(a.title)}</h3><p class="muted">${esc(a.text)}</p></div>`).join('')}</div>
<ul class="stats mt-3"><li><b>${TOTAL_LABEL}</b><span>SCORM courses</span></li><li><b>${categoryList.length + navCollections.length}</b><span>topic areas</span></li><li><b>24 hrs</b><span>standard delivery</span></li><li><b>IACET</b><span>accredited provider</span></li><li><b>EN · ES</b><span>bilingual courses</span></li></ul>
</div></section>

<section class="section section--soft"><div class="wrap">
<div class="section-head"><p class="eyebrow">360° Guarantee®</p><h2>You’re covered from every angle</h2></div>
<div class="grid grid--3">${home.guarantee.map((g) => `<div class="card"><span class="icon-tile">${icon.shield}</span><h3>${esc(g.title)}</h3><p class="muted">${esc(g.text)}</p></div>`).join('')}</div>
<p class="muted mt-2">— Kevin Taylor, General Manager · <a href="/policies/refund-policy">Read the full refund policy</a></p>
</div></section>

<section class="section"><div class="wrap">
<div class="section-head"><p class="eyebrow">Customer reviews</p><h2>Trusted by safety and HSE leaders</h2></div>
<div class="grid grid--3">${home.testimonials.map((t) => `<figure class="card quote"><div class="stars" aria-label="5 out of 5 stars">★★★★★</div><blockquote><p>${esc(t.text)}</p></blockquote><figcaption><span class="avatar" aria-hidden="true">${esc(t.name.split(' ').map((w) => w[0]).join(''))}</span><span><b>${esc(t.name)}</b><span>${esc(t.role)}</span></span></figcaption></figure>`).join('')}</div>
</div></section>

<section class="section section--soft"><div class="wrap">
<div class="section-head"><p class="eyebrow">Explore by industry</p><h2>${categoryList.length} specialized training areas</h2><p class="lead">Browse the full directory of SCORM courses by industry and hazard.</p></div>
<ul class="chips">${categoryList.map((c) => `<li><a class="chip" href="${esc(c.url)}">${esc(c.name)} · ${c.items.length}</a></li>`).join('')}</ul>
</div></section>

<section class="section" id="faq"><div class="wrap">
<div class="section-head section-head--center"><p class="eyebrow">FAQ</p><h2>SCORM training questions, answered</h2></div>
${faqList(faqs, { center: true })}
<p class="center mt-2"><a href="/pages/faq">Read all frequently asked questions</a></p>
</div></section>

<section class="section section--tight"><div class="wrap"><div class="cta"><div><h2>Ready to train your workforce?</h2><p>Pick your courses and seats, check out securely, and have your SCORM package in your LMS tomorrow.</p></div><div class="cta__actions"><a class="btn btn--primary" href="/collections/all">Browse courses ${icon.arrow}</a><a class="btn btn--ghost-light" href="/pages/contact">Get an enterprise quote</a></div></div></div></section>`;

  const desc = home.seoDescription;
  const jsonld = [
    ...core,
    ...S.webPage(cfg, { path: '/', name: home.seoTitle, description: desc, dateModified: iso(BUILD_DATE) }),
    ...S.itemList(cfg, '/', 'Training series', navCollections),
    ...S.howTo(cfg, '/', 'How SCORM delivery works', home.steps),
    ...S.faqPage(cfg, '/', faqs),
  ];
  const md = mdHeader('OSHA SCORM — SCORM-compliant safety training courses', '/', desc) +
    `${home.lead}\n\n## Key facts\n\n- ${TOTAL} SCORM courses (SCORM 1.2 and SCORM 2004 ZIP packages)\n- Licensed per learner seat for 12 months; tiers from 10 to 200 seats\n- Delivered by email within 24 hours of purchase\n- IACET accredited provider; certificate of completion included\n- Most courses available in English and Spanish\n- Works with ${LMS.join(', ')} and any SCORM-compliant LMS\n\n## Training series\n\n${navCollections.map((c) => `- [${c.title}](${cfg.siteUrl}${c.url}) — ${c.count} courses`).join('\n')}\n\n## Industry directory\n\n${categoryList.map((c) => `- [${c.name}](${cfg.siteUrl}${c.url}) — ${c.items.length} courses`).join('\n')}\n\n## How SCORM delivery works\n\n${home.steps.map((s, i) => `${i + 1}. **${s.title}** — ${s.text}`).join('\n')}\n\n## FAQ\n\n${faqs.map((f) => `### ${f.q}\n\n${toMarkdown(f.a)}`).join('\n\n')}\n`;
  emit('/', { html: page(ctx, { title: home.seoTitle, description: desc, path: '/', body, jsonld, mdPath: '/index.md' }), md, priority: 1.0 });
}

// ========================================================== PRODUCT/COURSE ==
function coursePage(c) {
  const isProduct = c.type === 'product';
  const col = isProduct ? collections.find((x) => x.handle === c.primaryCollection) : null;
  const crumbs = [{ name: 'Home', url: '/' }, isProduct ? { name: col?.title || 'All courses', url: col?.url || '/collections/all' } : { name: c.category, url: categoryUrl[c.category] }, { name: c.title, url: c.url }];
  const lo = c.tiers[0];
  const hi = c.tiers[c.tiers.length - 1];
  const hasEs = c.languages.some((l) => /espa/i.test(l));
  const faqs = [
    { q: `What format is ${c.title} delivered in?`, a: `<p>${esc(c.title)} is delivered as an LMS-ready SCORM package — you can choose SCORM 1.2 or SCORM 2004 — emailed as a ZIP file within 24 hours of purchase. Upload it to any SCORM-compliant LMS such as Moodle, Cornerstone, TalentLMS, Canvas or Absorb.</p>` },
    { q: `How much does ${c.title} cost?`, a: `<p>${money(c.price)} per learner seat for a 12-month license. Your total is the per-seat price × the number of seats — for example ${money(lo.subtotal)} for ${lo.seats} seats or ${money(hi.subtotal)} for ${hi.seats} seats. Organizations order a minimum of ${cfg.minSeats} seats.</p>` },
    c.duration && { q: `How long is the ${c.title} course?`, a: `<p>The course runs approximately ${esc(c.duration)}. It is self-paced and online, and learners receive a certificate of completion after successfully finishing the course.</p>` },
    c.citation && { q: `Which regulation does this course cover?`, a: `<p>This course is aligned with ${esc(c.citation)}.</p>` },
    { q: `Is ${c.title} available in Spanish?`, a: hasEs ? '<p>Yes. This course is available in English and Spanish (Español).</p>' : '<p>This course is currently available in English. Contact us if you need a Spanish version.</p>' },
    c.smallTeamUrl && { q: 'Can I buy this course for fewer than 10 learners?', a: `<p>SCORM licenses start at 10 seats. For individuals or small teams, you can <a href="${esc(c.smallTeamUrl)}">enroll learners directly online</a> through our partner HAZWOPER OSHA Training.</p>` },
  ].filter(Boolean);
  const related = (isProduct ? (col?.items || []) : categories[c.category] || []).filter((x) => x.handle !== c.handle).slice(0, 4);
  const sizes = '(min-width:1024px) 560px, 92vw';
  const heroSrcset = srcsetOf(c.media);
  const heroSrc = c.media?.[720] || '';
  const media = c.media
    ? `<div class="pdp__media"><img src="${esc(heroSrc)}" srcset="${esc(heroSrcset)}" sizes="${sizes}" width="720" height="480" alt="${esc(c.imageAlt)}" fetchpriority="high" decoding="async"></div>`
    : `<div class="pdp__media" style="display:flex;flex-direction:column;justify-content:flex-end;padding:28px;background:radial-gradient(600px 300px at 90% 0,rgba(255,138,31,.35),transparent 60%),linear-gradient(160deg,#0b2545,#071a33);color:#c7d3e3"><p class="eyebrow" style="color:#ffb066">${esc(c.category)}</p><p style="font-size:clamp(1.3rem,1rem + 1.4vw,2rem);font-weight:800;color:#fff;line-height:1.15;letter-spacing:-.02em;margin:0 0 14px">${esc(c.title)}</p><ul class="chips"><li class="chip chip--dark">SCORM 1.2</li><li class="chip chip--dark">SCORM 2004</li>${c.duration ? `<li class="chip chip--dark">${esc(c.duration)}</li>` : ''}${c.citation ? `<li class="chip chip--dark">${esc(truncate(c.citation, 40))}</li>` : ''}</ul></div>`;
  const overview = isProduct
    ? c.tabs.map((t) => `<section class="section--tight" id="${slugify(t.title)}">${/^\s*<h2/i.test(t.html) ? '' : `<h2>${esc(t.title === 'Overview' ? `${c.title} — overview` : t.title === 'Course Objective' ? 'Course objectives' : t.title)}</h2>`}<div class="prose">${t.html}</div></section>`).join('')
    : `<section class="section--tight" id="overview"><h2>${esc(c.title)} — course overview</h2><div class="prose"><p>${esc(c.title)} is an online safety training course delivered as an LMS-ready SCORM package${c.citation ? `, aligned with <strong>${esc(c.citation)}</strong>` : ''}. It is part of our <a href="${esc(categoryUrl[c.category])}">${esc(c.category)}</a> training library.</p><h3>What this course covers</h3><ul>${c.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul></div></section>`;
  const body = `
<div class="wrap">
<div class="pdp">
<div class="pdp__mediacol">
${breadcrumbs(crumbs)}
${media}
</div>
<div class="pdp__info">
<h1 class="pdp__title">${esc(c.title)}</h1>
<ul class="pdp__sub chips">${c.duration ? `<li class="chip">${esc(c.duration)}</li>` : ''}<li class="chip">SCORM 1.2 &amp; 2004</li><li class="chip chip--green">${hasEs ? 'English · Español' : 'English'}</li><li class="chip chip--orange">${money(c.price)}/seat</li></ul>
${buyBox(c, cfg)}
</div>
<div class="pdp__details">
${detailsList(c.keyDetails)}
${c.sampleUrl ? `<p class="small mt-2">${icon.download.replace('<svg', '<svg width="16" height="16" style="display:inline;vertical-align:-3px"')} To check compatibility, <a href="${esc(c.sampleUrl)}" rel="noopener">download our free sample SCORM 1.2 package</a> and test it in your own LMS.</p>` : ''}
</div>
</div>
${overview}
<section class="section--tight" id="pricing"><h2>${esc(c.title)} pricing</h2><p class="muted">${money(c.price)} per learner seat for a 12-month (365-day) license, in USD. Your total is simply price × seats — here are common seat counts. The SCORM package is delivered within 24 hours of payment.</p>${pricingTable(c)}</section>
<section class="section--tight" id="faq"><h2>Frequently asked questions</h2>${faqList(faqs)}</section>
${related.length ? `<section class="section--tight"><h2>Related ${isProduct ? esc(col?.title || '') : esc(c.category)} courses</h2><div class="grid grid--4">${related.map((r) => courseCard(r)).join('')}</div></section>` : ''}
<section class="section"><div class="cta"><div><h2>Be certain with our 360° Guarantee®</h2><p>Guaranteed 24-hour delivery, guaranteed value and guaranteed happiness — or your money back.</p></div><div class="cta__actions"><a class="btn btn--primary" href="#buy">Choose seats ${icon.arrow}</a><a class="btn btn--ghost-light" href="/pages/contact">Talk to us</a></div></div></section>
</div>`;
  const jsonld = [
    ...core,
    ...S.webPage(cfg, { path: c.url, name: c.seo.title, description: c.seo.description, type: 'ItemPage', crumbs, image: c.ogImage, dateModified: iso(c.lastmod || BUILD_DATE) }),
    ...S.courseEntities(cfg, c, { validUntil: VALID_UNTIL }),
    ...S.faqPage(cfg, c.url, faqs),
  ];
  const md = mdHeader(c.title, c.url, c.seo.description) +
    `- **Type:** SCORM course (SCORM 1.2 and SCORM 2004 ZIP)\n- **Category:** ${c.category}\n${c.duration ? `- **Duration:** ${c.duration}\n` : ''}${c.citation ? `- **Regulation:** ${c.citation}\n` : ''}- **Languages:** ${c.languages.join(', ')}\n- **Price:** ${money(c.price)} per learner seat (12-month license, minimum ${cfg.minSeats} seats)\n- **Delivery:** emailed within 24 hours of purchase\n- **Buy:** ${cfg.siteUrl}/checkout?item=${c.handle}&seats=${cfg.minSeats}\n\n## Key details\n\n${c.keyDetails.map((d) => `- **${d.label}:** ${d.value}`).join('\n')}\n\n## Pricing (USD)\n\n| Seats | Per seat | Total |\n| --- | --- | --- |\n${tierLines(c)}\n\n## Overview\n\n${isProduct ? c.tabs.map((t) => `### ${t.title}\n\n${toMarkdown(t.html)}`).join('\n\n') : c.bullets.map((b) => `- ${b}`).join('\n')}\n\n## FAQ\n\n${faqs.map((f) => `### ${f.q}\n\n${toMarkdown(f.a)}`).join('\n\n')}\n`;
  emit(c.url, {
    html: page(ctx, { title: c.seo.title, description: c.seo.description, path: c.url, body, jsonld, ogType: 'product', ogImage: c.ogImage, mdPath: mdFor(c.url), preloadImage: c.media ? { href: heroSrc, srcset: heroSrcset, sizes } : null }),
    md, lastmod: c.lastmod, priority: isProduct ? 0.8 : 0.7,
  });
}
products.forEach(coursePage);
courses.forEach(coursePage);

// ============================================================ COLLECTIONS ==
function collectionPage(c) {
  const copy = c.copy || {};
  const hero = c.sections.find((s) => s.type === 'hero');
  const intro = c.sections.find((s) => s.type === 'intro');
  const audienceSec = c.sections.find((s) => s.type === 'audience');
  const banner = c.sections.find((s) => s.type === 'banner');
  const h1 = copy.h1 || stripPrefix(hero?.heading || banner?.heading || c.title);
  const kw = copy.kw || c.title;
  const items = c.items;
  const per = items.length ? Math.min(...items.map(minPer)) : null;
  const lead = copy.intro || hero?.text || plainText(c.description_html) || plainText(banner?.html) || `LMS-ready ${c.title} courses delivered as SCORM 1.2 and SCORM 2004 packages.`;
  const crumbs = [{ name: 'Home', url: '/' }, { name: 'Training series', url: '/collections/' }, { name: c.title, url: c.url }];
  const faqs = [
    { q: `How are ${kw} SCORM courses delivered?`, a: `<p>Each ${esc(kw)} course is delivered as a SCORM 1.2 or SCORM 2004 ZIP package by email within 24 hours of purchase. Upload it to your LMS, assign learners and track completion and scores.</p>` },
    per && { q: `How much do ${kw} courses cost?`, a: `<p>This series includes ${items.length} course${items.length === 1 ? '' : 's'}, starting from ${money(per)} per learner seat for a 12-month license. Every course page shows exact pricing for 10 to 200 seats.</p>` },
    copy.cite?.length && { q: 'Which regulations do these courses cover?', a: `<p>Courses in this series are aligned with ${copy.cite.map(esc).join(', ')}, as listed on each course page.</p>` },
    { q: 'Which LMS platforms support these courses?', a: `<p>Any SCORM-compliant LMS, including ${LMS.slice(0, 8).join(', ')}. Download the free sample package from any course page to test compatibility first.</p>` },
  ].filter(Boolean);
  const audience = copy.audience
    ? `<div class="panel"><h2>Who needs ${esc(kw)}?</h2><ul class="assure">${copy.audience.map((a) => `<li>${icon.check}<span>${esc(a)}</span></li>`).join('')}</ul></div>`
    : audienceSec ? `<div><h2>${esc(audienceSec.heading.replace(/Training Training/, 'Training'))}</h2><div class="grid grid--3">${audienceSec.columns.map((col) => `<div class="card prose">${col.title ? `<h3>${esc(col.title)}</h3>` : ''}${col.html.replace(/<p><strong>(.*?)<\/strong><\/p>/, '<h3>$1</h3>')}</div>`).join('')}</div></div>` : '';
  const body = `
<section class="hero hero--page"><div class="wrap">
${breadcrumbs(crumbs)}
<h1>${esc(h1)}</h1>
<p class="lead">${esc(lead)}</p>
<ul class="chips kpis"><li class="chip chip--dark">${items.length} SCORM course${items.length === 1 ? '' : 's'}</li>${per ? `<li class="chip chip--dark">From ${money(per)}/seat</li>` : ''}<li class="chip chip--dark">SCORM 1.2 &amp; 2004</li>${(copy.cite || []).slice(0, 3).map((x) => `<li class="chip chip--dark">${esc(x)}</li>`).join('')}</ul>
</div></section>
<section class="section"><div class="wrap">
<div class="toolbar"><h2 class="mb-0" style="font-size:1.35rem">${items.length} ${esc(kw)} course${items.length === 1 ? '' : 's'}</h2><a href="/pages/courses-directory">Browse all ${TOTAL_LABEL} courses</a></div>
${items.length ? `<div class="grid grid--4">${items.map((x, i) => courseCard(x, { eager: i < 4 })).join('')}</div>` : `<div class="empty">New courses for this series are coming soon. <a href="/pages/courses-directory">Browse the full course directory</a>.</div>`}
</div></section>
${intro || audience ? `<section class="section section--soft"><div class="wrap stack">${intro ? `<div class="split"><div class="prose"><h2>${esc(intro.heading)}</h2>${intro.html}</div>${media.collections[c.handle] ? `<img src="${esc(media.collections[c.handle][720])}" srcset="${esc(srcsetOf(media.collections[c.handle]))}" sizes="(min-width:960px) 560px, 92vw" width="720" height="480" alt="${esc(c.title)}" loading="lazy" decoding="async" style="border-radius:22px;aspect-ratio:3/2;object-fit:cover">` : ''}</div>` : ''}${audience}</div></section>` : ''}
<section class="section"><div class="wrap"><h2>${esc(kw)} — frequently asked questions</h2>${faqList(faqs)}</div></section>`;
  const title = h1.length <= 50 ? `${h1} | OSHA SCORM` : h1.length <= 65 ? h1 : h1.replace(/\s*\(Capacitación en Español\)/, '').replace(/ — SCORM Courses?$/, ' SCORM Courses');
  const desc = seoDesc(`${kw} SCORM courses for your LMS: ${items.length} course${items.length === 1 ? '' : 's'}${per ? ` from ${money(per)}/seat` : ''}. ${lead}`);
  const jsonld = [...core, ...S.webPage(cfg, { path: c.url, name: title, description: desc, type: 'CollectionPage', crumbs, dateModified: iso(c.updated_at || BUILD_DATE) }), ...S.itemList(cfg, c.url, c.title, items), ...S.faqPage(cfg, c.url, faqs)];
  const md = mdHeader(h1, c.url, desc) + `${lead}\n\n${copy.cite?.length ? `**Regulations:** ${copy.cite.join(', ')}\n\n` : ''}## Courses\n\n${items.map((x) => `- [${x.title}](${cfg.siteUrl}${x.url}) — ${x.duration || ''}, from ${money(minPer(x))}/seat`).join('\n')}\n\n## FAQ\n\n${faqs.map((f) => `### ${f.q}\n\n${toMarkdown(f.a)}`).join('\n\n')}\n`;
  emit(c.url, { html: page(ctx, { title, description: desc, path: c.url, body, jsonld, mdPath: mdFor(c.url) }), md, lastmod: c.updated_at, priority: 0.9 });
}
collections.forEach(collectionPage);

// /collections/ index and /collections/all
{
  const crumbs = [{ name: 'Home', url: '/' }, { name: 'Training series', url: '/collections/' }];
  const list = collections.filter((c) => c.items.length);
  const body = `<section class="hero hero--page"><div class="wrap">${breadcrumbs(crumbs)}<h1>SCORM safety training series</h1><p class="lead">Browse every OSHASCORM.org training series — each one a set of LMS-ready SCORM 1.2 and SCORM 2004 courses aligned with OSHA, EPA, DOT, NFPA and USACE requirements.</p></div></section>
<section class="section"><div class="wrap"><div class="grid grid--3">${list.map((c) => `<article class="card card--link cat"><h3><a href="${esc(c.url)}">${esc(c.title)}</a></h3><p class="small muted mb-0">${esc(truncate(c.copy?.intro || c.sections.find((s) => s.type === 'hero')?.text || plainText(c.description_html) || `LMS-ready ${c.title} SCORM courses.`, 130))}</p><div class="cat__count"><span>${c.items.length} courses · from ${money(Math.min(...c.items.map(minPer)))}/seat</span>${icon.arrow}</div></article>`).join('')}</div>
<h2 class="mt-3">Industry training directory</h2><ul class="chips">${categoryList.map((c) => `<li><a class="chip" href="${esc(c.url)}">${esc(c.name)} · ${c.items.length}</a></li>`).join('')}</ul></div></section>`;
  const desc = `Browse ${list.length} SCORM safety training series and ${categoryList.length} industry categories: HAZWOPER, NFPA 70E, DOT hazmat, RCRA, construction, general industry and more.`;
  emit('/collections/', { html: page(ctx, { title: 'SCORM Safety Training Series | OSHA SCORM', description: desc, path: '/collections/', body, jsonld: [...core, ...S.webPage(cfg, { path: '/collections/', name: 'SCORM safety training series', description: desc, type: 'CollectionPage', crumbs }), ...S.itemList(cfg, '/collections/', 'Training series', list.map((c) => ({ url: c.url, title: c.title })))], mdPath: '/collections/index.md' }), md: mdHeader('SCORM safety training series', '/collections/', desc) + list.map((c) => `- [${c.title}](${cfg.siteUrl}${c.url}) — ${c.items.length} courses`).join('\n') + '\n', priority: 0.8 });

  const crumbsAll = [{ name: 'Home', url: '/' }, { name: 'All SCORM courses', url: '/collections/all' }];
  const sorted = [...products].sort((a, b) => a.title.localeCompare(b.title));
  const bodyAll = `<section class="hero hero--page"><div class="wrap">${breadcrumbs(crumbsAll)}<h1>All SCORM safety training courses</h1><p class="lead">${products.length} flagship SCORM courses below, plus ${courses.length} more in the <a href="/pages/courses-directory" style="color:#fff">course directory</a>. Every course is an LMS-ready SCORM 1.2 &amp; 2004 package licensed per seat.</p></div></section>
<section class="section"><div class="wrap"><div class="toolbar"><label class="search-input"><span class="sr-only">Filter courses</span>${icon.search}<input type="search" placeholder="Filter by topic or regulation…" data-filter="#all-grid" autocomplete="off"></label><span class="results-count" data-count>${products.length} courses</span></div>
<div class="grid grid--4" id="all-grid">${sorted.map((c, i) => courseCard(c, { eager: i < 4 }).replace('<article class="card', `<article data-q="${esc(c.category.toLowerCase())}" class="card`)).join('')}</div></div></section>`;
  const descAll = `Shop ${TOTAL_LABEL} OSHA-compliant SCORM safety courses for your LMS: HAZWOPER, NFPA 70E, DOT hazmat, RCRA, EM 385-1-1 and more. Seat pricing for 10–200 learners.`;
  emit('/collections/all', { html: page(ctx, { title: 'All SCORM Safety Training Courses | OSHA SCORM', description: descAll, path: '/collections/all', body: bodyAll, jsonld: [...core, ...S.webPage(cfg, { path: '/collections/all', name: 'All SCORM courses', description: descAll, type: 'CollectionPage', crumbs: crumbsAll }), ...S.itemList(cfg, '/collections/all', 'All SCORM courses', sorted)], mdPath: '/collections/all.md' }), md: mdHeader('All SCORM safety training courses', '/collections/all', descAll) + sorted.map((x) => `- [${x.title}](${cfg.siteUrl}${x.url}) — ${x.duration || ''}, from ${money(minPer(x))}/seat`).join('\n') + '\n', priority: 0.9 });
}

// =========================================================== DIRECTORY ==
{
  const crumbs = [{ name: 'Home', url: '/' }, { name: 'Course directory', url: '/pages/courses-directory' }];
  const groups = {};
  for (const c of allItems) (groups[c.dirCategory || c.category] ||= []).push(c);
  const ordered = Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  const body = `<section class="hero hero--page"><div class="wrap">${breadcrumbs(crumbs)}<h1>SCORM course directory (A–Z)</h1><p class="lead">All ${TOTAL} SCORM safety and compliance courses in one place, grouped by industry. Filter instantly by topic, job role or regulation number.</p></div></section>
<section class="section"><div class="wrap"><div class="toolbar"><label class="search-input"><span class="sr-only">Filter the directory</span>${icon.search}<input type="search" placeholder="e.g. forklift, 1910.146, ammonia…" data-filter="#dir" autocomplete="off"></label><span class="results-count" data-count>${TOTAL} courses</span></div>
<div class="dir" id="dir">${ordered.map(([name, items]) => `<section data-group><h2>${categoryUrl[name] ? `<a href="${esc(categoryUrl[name])}">${esc(name)}</a>` : esc(name)}<span class="muted small">${items.length}</span></h2><ul>${items.map(courseRow).join('')}</ul></section>`).join('')}</div></div></section>`;
  const desc = `A–Z directory of ${TOTAL} SCORM safety courses: OSHA, MSHA, DOT hazmat, EPA, Cal/OSHA, NFPA 70E, construction, healthcare and more. LMS-ready SCORM 1.2 & 2004.`;
  emit('/pages/courses-directory', { html: page(ctx, { title: `SCORM Course Directory A–Z | ${TOTAL_LABEL} Safety Courses`, description: desc, path: '/pages/courses-directory', body, jsonld: [...core, ...S.webPage(cfg, { path: '/pages/courses-directory', name: 'SCORM course directory', description: desc, type: 'CollectionPage', crumbs })], mdPath: '/pages/courses-directory.md' }), md: mdHeader('SCORM course directory (A–Z)', '/pages/courses-directory', desc) + ordered.map(([name, items]) => `## ${name}\n\n${items.map((x) => `- [${x.title}](${cfg.siteUrl}${x.url}) — ${x.duration || ''}, from ${money(minPer(x))}/seat`).join('\n')}`).join('\n\n') + '\n', priority: 0.8 });

  // Category hubs
  for (const cat of categoryList) {
    const crumbsC = [{ name: 'Home', url: '/' }, { name: 'Course directory', url: '/pages/courses-directory' }, { name: cat.name, url: cat.url }];
    const per = Math.min(...cat.items.map(minPer));
    const durs = cat.items.map((c) => parseDuration(c.duration)?.hours).filter(Boolean);
    const cites = unique(cat.items.map((c) => c.citation)).slice(0, 6);
    const h1 = /training|safety|compliance/i.test(cat.name) ? `${cat.name} — SCORM Courses` : `${cat.name} Training — SCORM Courses`;
    const lead = `${cat.items.length} ${cat.name} courses delivered as LMS-ready SCORM 1.2 and SCORM 2004 packages${durs.length ? `, from ${Math.min(...durs)} to ${Math.max(...durs)} hours each` : ''}, starting at ${money(per)} per learner seat.`;
    const faqs = [
      { q: `What ${cat.name} courses are available in SCORM format?`, a: `<p>${cat.items.length} courses, including ${cat.items.slice(0, 5).map((c) => esc(c.title)).join(', ')}${cat.items.length > 5 ? ' and more' : ''}.</p>` },
      { q: `How much do ${cat.name} SCORM courses cost?`, a: `<p>From ${money(per)} per learner seat for a 12-month license. Each course page shows its per-seat price and totals for common seat counts.</p>` },
      cites.length && { q: 'Which regulations and standards are covered?', a: `<p>${cites.map(esc).join('; ')}.</p>` },
    ].filter(Boolean);
    const bodyC = `<section class="hero hero--page"><div class="wrap">${breadcrumbs(crumbsC)}<h1>${esc(h1)}</h1><p class="lead">${esc(lead)}</p><ul class="chips kpis"><li class="chip chip--dark">${cat.items.length} courses</li><li class="chip chip--dark">From ${money(per)}/seat</li><li class="chip chip--dark">English · Español</li></ul></div></section>
<section class="section"><div class="wrap"><div class="toolbar"><h2 class="mb-0" style="font-size:1.35rem">${cat.items.length} ${esc(cat.name)} course${cat.items.length === 1 ? '' : 's'}</h2><a href="/pages/courses-directory">Browse all ${TOTAL_LABEL} courses</a></div><div class="grid grid--3">${cat.items.map((c) => `<article class="card card--link course course--compact"><div class="course__body"><div class="course__meta">${c.duration ? `<span class="chip">${esc(c.duration)}</span>` : ''}${c.citation ? `<span class="chip chip--orange">${esc(truncate(c.citation, 34))}</span>` : ''}</div><h3><a href="${esc(c.url)}">${esc(c.title)}</a></h3><div class="course__price"><span>From</span><b>${money(minPer(c))}<span> /seat</span></b></div></div></article>`).join('')}</div></div></section>
<section class="section section--soft"><div class="wrap"><h2>${esc(cat.name)} — FAQ</h2>${faqList(faqs)}<p class="mt-2"><a href="/pages/courses-directory">Back to the full course directory</a></p></div></section>`;
    const desc = seoDesc(`${cat.name} SCORM courses: ${lead} Certificate of completion, IACET accredited, delivered within 24 hours.`);
    emit(cat.url, { html: page(ctx, { title: seoTitle(`${cat.name} SCORM Courses`, [' | OSHA SCORM', '']), description: desc, path: cat.url, body: bodyC, jsonld: [...core, ...S.webPage(cfg, { path: cat.url, name: h1, description: desc, type: 'CollectionPage', crumbs: crumbsC }), ...S.itemList(cfg, cat.url, cat.name, cat.items), ...S.faqPage(cfg, cat.url, faqs)], mdPath: mdFor(cat.url) }), md: mdHeader(h1, cat.url, desc) + `${lead}\n\n${cat.items.map((x) => `- [${x.title}](${cfg.siteUrl}${x.url}) — ${x.duration || ''}${x.citation ? `, ${x.citation}` : ''}, from ${money(minPer(x))}/seat`).join('\n')}\n`, priority: 0.7 });
  }
}

// ================================================================ PAGES ==
function simplePage({ urlPath, title, h1, lead, html, crumbsName, type = 'WebPage', faqs = null, extraJsonld = [], priority = 0.5, aside = '' }) {
  const crumbs = [{ name: 'Home', url: '/' }, { name: crumbsName || h1, url: urlPath }];
  const body = `<section class="hero hero--page"><div class="wrap">${breadcrumbs(crumbs)}<h1>${esc(h1)}</h1>${lead ? `<p class="lead">${esc(lead)}</p>` : ''}</div></section><section class="section"><div class="wrap">${aside ? `<div class="content-grid"><div>` : ''}${html ? `<div class="prose">${html}</div>` : ''}${faqs ? faqList(faqs) : ''}${aside ? `</div><aside>${aside}</aside></div>` : ''}</div></section>`;
  const desc = seoDesc(lead, plainText(html), faqs?.map((f) => f.q).join(' '));
  emit(urlPath, {
    html: page(ctx, { title, description: desc, path: urlPath, body, jsonld: [...core, ...S.webPage(cfg, { path: urlPath, name: title, description: desc, type, crumbs }), ...(faqs ? S.faqPage(cfg, urlPath, faqs) : []), ...extraJsonld], mdPath: mdFor(urlPath) }),
    md: mdHeader(h1, urlPath, desc) + (html ? toMarkdown(html) + '\n\n' : '') + (faqs ? faqs.map((f) => `## ${f.q}\n\n${toMarkdown(f.a)}`).join('\n\n') + '\n' : ''),
    priority,
  });
}

const pageBy = Object.fromEntries(rawPages.map((p) => [p.handle, p]));
{
  const faq = pageBy.faq;
  const faqs = [...faq.faqs.map((f) => ({ q: f.q.trim().replace(/\)$/, ')?').replace(/\?\?$/, '?'), a: fixHeadings(f.a) })), ...home.faqs.filter((h) => !faq.faqs.some((f) => f.q.toLowerCase().includes(h.q.toLowerCase().slice(0, 25))))];
  simplePage({ urlPath: '/pages/faq', title: 'SCORM Training FAQ | Pricing, LMS & Delivery | OSHA SCORM', h1: 'Frequently asked questions', lead: 'Everything you need to know about buying, deploying and tracking OSHASCORM.org SCORM courses in your LMS.', faqs, crumbsName: 'FAQ', priority: 0.7 });
}
{
  const ok = `<p class="notice" data-contact-ok hidden>Your email app should now be open with your message ready to send. If it didn’t open, email <a href="mailto:${cfg.contact.email}">${esc(cfg.contact.email)}</a> or call ${esc(cfg.contact.phone)}.</p>`;
  // No form backend on static hosting: the form composes an email to the team.
  const form = `<form class="form panel" data-contact action="mailto:${esc(cfg.contact.email)}" method="post" enctype="text/plain"><label>Name<input name="name" autocomplete="name" required></label><label>Work email<input type="email" name="email" autocomplete="email" required></label><label>Phone<input type="tel" name="phone" autocomplete="tel"></label><label>How can we help?<textarea name="message" rows="5" required placeholder="Courses, seat counts, LMS, white-label needs…"></textarea></label><button class="btn btn--primary" type="submit">Email our team</button><p class="small muted mb-0">Opens your email app addressed to ${esc(cfg.contact.email)}.</p></form>`;
  const html = `${ok}<div class="split" style="align-items:start"><div>${pageBy.contact?.html || ''}<h2>Sales &amp; support hours</h2><p>Phone support 7:00 AM – 5:00 PM CST. Technical and installation support is free for one year from purchase.</p><ul class="assure"><li>${icon.phone}<span><a href="tel:${cfg.contact.phoneE164}">${esc(cfg.contact.phone)}</a></span></li><li>${icon.mail}<span><a href="mailto:${cfg.contact.email}">${esc(cfg.contact.email)}</a></span></li></ul></div>${form}</div>`;
  simplePage({ urlPath: '/pages/contact', title: 'Contact OSHA SCORM | SCORM Course Quotes & Support', h1: 'Contact us', lead: 'Questions about courses, seat counts, enterprise licensing or LMS installation? Our team is ready to help.', html, type: 'ContactPage', crumbsName: 'Contact', priority: 0.6 });
}
// About page: company facts for trust / E-E-A-T (all sourced from the store).
{
  const facts = [
    ['Company', `${cfg.legalName} — a private provider of OSHA-compliant safety training in SCORM format`],
    ['Parent company', `${cfg.parentOrg.name}`],
    ['Training partner', `${cfg.partnerOrg.name}`],
    ['Accreditation', 'IACET accredited provider'],
    ['Headquarters', 'Los Angeles, California, USA'],
    ['Catalog', `${TOTAL} SCORM 1.2 / 2004 courses across ${categoryList.length + navCollections.length} topic areas`],
    ['Phone', `${cfg.contact.phone} (7:00 AM – 5:00 PM CST)`],
    ['Email', cfg.contact.email],
  ];
  const html = `<p class="lead mt-0">OSHASCORM.org develops and licenses OSHA, EPA, DOT, NFPA and USACE-aligned safety training as ready-to-deploy SCORM packages, so employers, training providers and LMS operators can deliver compliance training without building courses from scratch.</p>
<h2>Company facts</h2><ul class="details">${facts.map(([k, v]) => `<li><b>${esc(k)}</b><span>${esc(v)}</span></li>`).join('')}</ul>
<h2>Who we are</h2><p>OSHASCORM.org operates as a subsidiary of <a href="${esc(cfg.parentOrg.url)}" rel="noopener">${esc(cfg.parentOrg.name)}</a>, a company specializing in workplace safety training, and partners with <a href="${esc(cfg.partnerOrg.url)}" rel="noopener">${esc(cfg.partnerOrg.name)}</a> to provide a comprehensive selection of OSHA compliance courses. Our training is <a href="${esc(cfg.trust.iacet)}" rel="noopener">IACET accredited</a>, and you can review our <a href="${esc(cfg.trust.bbb)}" rel="noopener">Better Business Bureau profile</a>.</p>
<h2>How courses are built and maintained</h2><ul><li>Each course page lists the regulation or standard it is aligned with (for example 29 CFR 1910.120 for HAZWOPER or NFPA 70E for electrical safety).</li><li>Courses include knowledge checks, a final exam and a certificate of completion to support recordkeeping and audits.</li><li>We regularly review OSHA, DOT, EPA and other state and federal regulations and update our courses to reflect changes. An optional annual maintenance plan delivers those updates to your LMS automatically — see the <a href="/pages/faq">FAQ</a>.</li></ul>
<h2 id="security">Security &amp; payments</h2><p>Card payments are processed by Stripe, a PCI DSS Level 1 certified payment processor, and orders are recorded directly in our learning management system. Your card details go straight from your browser to Stripe — we never see or store your full card number. We accept ${PAYMENTS.join(', ')}. Purchase-order and invoice billing are available on request.</p>
<h2>Our 360° Guarantee®</h2><ul><li><b>Guaranteed delivery</b> — SCORM package delivered within 24 hours after successful payment, or your order is free.</li><li><b>Guaranteed value</b> — find a lower price within 30 days and we’ll refund the difference and then some.</li><li><b>Guaranteed happiness</b> — not 100% satisfied? We’ll make it right or refund your money within 30 days. <a href="/policies/refund-policy">Refund policy</a></li></ul>
<h2>Independence</h2><p>OSHASCORM.org is a private company. We are not affiliated with, or endorsed by, the U.S. Occupational Safety and Health Administration (OSHA) or the U.S. Department of Labor.</p>`;
  const about = { '@type': 'AboutPage', '@id': `${cfg.siteUrl}/pages/about-us#about`, url: `${cfg.siteUrl}/pages/about-us`, mainEntity: { '@id': `${cfg.siteUrl}/#org` } };
  simplePage({ urlPath: '/pages/about-us', title: 'About OSHASCORM.org | IACET-Accredited SCORM Safety Training', h1: 'About OSHASCORM.org', lead: 'IACET-accredited, OSHA-aligned SCORM safety training for employers, training providers and LMS operators — backed by our 360° Guarantee®.', html, crumbsName: 'About us', extraJsonld: [about], priority: 0.5 });
}

for (const h of ['return-policy', 'terms-of-service']) {
  const p = pageBy[h];
  if (p) simplePage({ urlPath: `/pages/${h}`, title: `${p.title} | OSHA SCORM`, h1: p.title, lead: null, html: fixHeadings(p.html), priority: 0.3 });
}
// /policies/terms-of-service duplicates /pages/terms-of-service: redirect it.
duplicatesExtra.push({ from: '/policies/terms-of-service', to: '/pages/terms-of-service', title: 'Terms of service' });
for (const p of rawPolicies.filter((x) => x.handle !== 'terms-of-service')) simplePage({ urlPath: `/policies/${p.handle}`, title: `${p.title} | OSHA SCORM`, h1: p.title.replace(/^./, (m) => m.toUpperCase()), lead: null, html: fixHeadings(p.html), priority: 0.3 });

// SCORM guide (new evergreen content hub)
{
  const g = scormGuide;
  const urlPath = `/pages/${g.handle}`;
  const html = g.sections.map((s) => `<h2 id="${s.id}">${esc(s.h2)}</h2>${s.html}`).join('') + `<h2 id="faq">SCORM FAQ</h2>`;
  const toc = `<nav class="toc" aria-label="On this page"><h2>On this page</h2><ol>${g.sections.map((s) => `<li><a href="#${s.id}">${esc(s.h2)}</a></li>`).join('')}<li><a href="#faq">SCORM FAQ</a></li></ol><p class="mt-2 mb-0"><a class="btn btn--primary btn--block" href="/collections/all">Browse SCORM courses</a></p></nav>`;
  const article = { '@type': 'TechArticle', '@id': `${cfg.siteUrl}${urlPath}#article`, headline: g.h1, description: g.seoDescription, author: { '@id': `${cfg.siteUrl}/#org` }, publisher: { '@id': `${cfg.siteUrl}/#org` }, datePublished: g.published, dateModified: isoDate(BUILD_DATE), mainEntityOfPage: { '@id': `${cfg.siteUrl}${urlPath}#webpage` }, about: [{ '@type': 'Thing', name: 'SCORM', sameAs: 'https://en.wikipedia.org/wiki/Sharable_Content_Object_Reference_Model' }], inLanguage: 'en-US' };
  const crumbs = [{ name: 'Home', url: '/' }, { name: 'SCORM guide', url: urlPath }];
  const body = `<section class="hero hero--page"><div class="wrap">${breadcrumbs(crumbs)}<h1>${esc(g.h1)}</h1><p class="lead">${esc(g.lead)}</p></div></section><section class="section"><div class="wrap"><div class="content-grid"><article><div class="prose">${html}</div>${faqList(g.faqs)}</article><aside>${toc}</aside></div></div></section>
<section class="section section--tight"><div class="wrap"><div class="cta"><div><h2>Ready-made SCORM safety courses</h2><p>${TOTAL_LABEL} OSHA-compliant SCORM 1.2 &amp; 2004 courses, delivered within 24 hours.</p></div><div class="cta__actions"><a class="btn btn--primary" href="/collections/all">Browse courses ${icon.arrow}</a></div></div></div></section>`;
  emit(urlPath, {
    html: page(ctx, { title: g.seoTitle, description: g.seoDescription, path: urlPath, body, ogType: 'article', jsonld: [...core, ...S.webPage(cfg, { path: urlPath, name: g.seoTitle, description: g.seoDescription, crumbs }), article, ...S.faqPage(cfg, urlPath, g.faqs)], mdPath: mdFor(urlPath) }),
    md: mdHeader(g.h1, urlPath, g.seoDescription) + g.lead + '\n\n' + g.sections.map((s) => `## ${s.h2}\n\n${toMarkdown(s.html)}`).join('\n\n') + '\n\n## SCORM FAQ\n\n' + g.faqs.map((f) => `### ${f.q}\n\n${toMarkdown(f.a)}`).join('\n\n') + '\n',
    priority: 0.8,
  });
}

// Search, cart, 404, /products/ index
{
  const body = `<section class="hero hero--page"><div class="wrap">${breadcrumbs([{ name: 'Home', url: '/' }, { name: 'Search', url: '/search' }])}<h1>Search ${TOTAL_LABEL} SCORM courses</h1></div></section><section class="section"><div class="wrap" data-search><form class="toolbar" role="search" action="/search" onsubmit="return false"><label class="search-input"><span class="sr-only">Search courses</span>${icon.search}<input type="search" name="q" placeholder="Search by topic, regulation or job role" autocomplete="off" autofocus></label></form><p class="results-count" data-status aria-live="polite"></p><div class="dir" style="columns:1"><ul data-results></ul></div><noscript><p>Search needs JavaScript. Browse the <a href="/pages/courses-directory">course directory</a> instead.</p></noscript></div></section>`;
  emit('/search', { html: page(ctx, { title: 'Search SCORM Courses | OSHA SCORM', description: `Search ${TOTAL_LABEL} OSHA-compliant SCORM safety training courses by topic, regulation or job role.`, path: '/search', body, jsonld: core, noindex: true }), noindex: true });

  const cart = `<section class="hero hero--page"><div class="wrap"><h1>Your cart</h1></div></section><section class="section"><div class="wrap" data-cart><ul class="cart-list"></ul><div class="empty" hidden>Your cart is empty. <a href="/collections/all">Browse SCORM courses</a>.</div><div class="cart-summary" hidden><div><span class="muted">Total (USD, before tax)</span><div style="font-size:1.6rem;font-weight:800;color:var(--ink)" data-cart-total>$0.00</div></div><a class="btn btn--primary" data-checkout href="/checkout?cart=1" rel="nofollow">Continue to checkout ${icon.arrow}</a></div><p class="small muted mt-2">Card payments are processed securely by Stripe. Prices are per learner seat for a 12-month license.</p></div></section>`;
  emit('/cart', { html: page(ctx, { title: 'Cart | OSHA SCORM', description: 'Review your SCORM course selections and continue to secure checkout.', path: '/cart', body: cart, jsonld: core, noindex: true }), noindex: true });

  // Checkout: same LMS flow as the sister sites (see src/assets/js/checkout.js).
  const countries = [['US', 'United States'], ['CA', 'Canada'], ['GB', 'United Kingdom'], ['AU', 'Australia'], ['NZ', 'New Zealand'], ['IE', 'Ireland'], ['MX', 'Mexico'], ['PR', 'Puerto Rico'], ['AE', 'United Arab Emirates'], ['SA', 'Saudi Arabia'], ['QA', 'Qatar'], ['KW', 'Kuwait'], ['IN', 'India'], ['PK', 'Pakistan'], ['PH', 'Philippines'], ['SG', 'Singapore'], ['MY', 'Malaysia'], ['ZA', 'South Africa'], ['NG', 'Nigeria'], ['DE', 'Germany'], ['FR', 'France'], ['NL', 'Netherlands'], ['ES', 'Spain'], ['IT', 'Italy']];
  const field = (id, label, attrs = '') => `<label>${label}<input id="${id}" ${attrs}></label>`;
  const checkout = `<section class="hero hero--page"><div class="wrap">${breadcrumbs([{ name: 'Home', url: '/' }, { name: 'Checkout', url: '/checkout' }])}<h1>Secure checkout</h1><p class="lead">Complete your order and your SCORM package is emailed within 24 hours of payment.</p></div></section>
<section class="section"><div class="wrap" data-checkout-root>
<div class="checkout">
<form class="form panel" id="checkout-form" novalidate>
<h2>Billing details</h2>
<div class="form-row">${field('billingFirstName', 'First name', 'autocomplete="given-name" required')}${field('billingLastName', 'Last name', 'autocomplete="family-name" required')}</div>
${field('billingCompany', 'Company / organization', 'autocomplete="organization"')}
<div class="form-row">${field('billingEmail', 'Work email', 'type="email" autocomplete="email" required')}${field('billingPhone', 'Phone', 'type="tel" autocomplete="tel" required')}</div>
${field('billingAddress', 'Street address', 'autocomplete="address-line1" required')}
${field('billingAddress2', 'Apartment, suite, etc. (optional)', 'autocomplete="address-line2"')}
<div class="form-row form-row--3">${field('billingCity', 'City', 'autocomplete="address-level2" required')}${field('billingState', 'State / province', 'autocomplete="address-level1" required')}${field('billingZip', 'ZIP / postal code', 'autocomplete="postal-code" required')}</div>
<label>Country<select id="billingCountry" class="select" autocomplete="country">${countries.map(([c, n]) => `<option value="${c}">${esc(n)}</option>`).join('')}</select></label>
<div data-card-only hidden><h2 class="mt-2">Payment</h2><div class="card-field" id="card-element" aria-label="Card details"></div></div>
<p class="notice notice--info" data-request-only hidden>This order will be sent to our team as an order request. We’ll confirm availability and email an invoice or secure payment link within one business day — no card is charged now.</p>
<p class="buybox__err" role="alert" data-err></p>
<button class="btn btn--primary btn--block" type="submit" data-submit disabled>Loading…</button>
<p class="secure">${icon.shield}<span><b>Secure card checkout by Stripe</b> (PCI DSS Level 1). Your card details go directly to Stripe. Purchase orders: call ${esc(cfg.contact.phone)} or email ${esc(cfg.lms.requestEmail)}.</span></p>
</form>
<aside class="panel order-summary" aria-labelledby="summary-h"><h2 id="summary-h">Order summary</h2><ul class="summary-lines" data-lines></ul><div class="summary-total"><span>Total (USD)</span><b data-total>$0.00</b></div><ul class="assure"><li>${icon.check}<span>12-month license per learner seat</span></li><li>${icon.check}<span>SCORM 1.2 &amp; 2004 ZIP emailed within 24 hours</span></li><li>${icon.check}<span>30-day money-back guarantee</span></li></ul></aside>
</div>
<div class="checkout-done panel" data-done hidden tabindex="-1"><h2 data-done-title>Thank you — your order is confirmed</h2><p data-done-text></p><p><a class="btn btn--dark" href="/collections/all">Continue browsing</a></p></div>
<noscript><p class="notice">Checkout needs JavaScript. To order, email ${esc(cfg.lms.requestEmail)} or call ${esc(cfg.contact.phone)}.</p></noscript>
</div></section>
<script>window.__LMS__=${JSON.stringify({ apiBase: cfg.lms.apiBase, stripeKey: cfg.lms.stripeKey, orderFrom: cfg.lms.orderFrom, requestEmail: cfg.lms.requestEmail })}</script>
<script src="/assets/js/checkout.js?v=${crypto.createHash('sha1').update(checkoutJs).digest('hex').slice(0, 10)}" defer></script>`;
  emit('/checkout', { html: page(ctx, { title: 'Secure Checkout | OSHA SCORM', description: 'Secure checkout for OSHASCORM.org SCORM course licenses.', path: '/checkout', body: checkout, jsonld: core, noindex: true }), noindex: true });

  const nf = `<section class="section notfound"><div class="wrap"><p class="eyebrow">404</p><h1>We couldn’t find that page</h1><p class="lead" style="margin:0 auto">The course may have moved. Search the catalog or browse the directory.</p><form class="search-input" action="/search" role="search"><label><span class="sr-only">Search courses</span>${icon.search}<input type="search" name="q" placeholder="Search courses"></label></form><p class="mt-2"><a class="btn btn--dark" href="/collections/all">All courses</a> <a class="btn btn--ghost" href="/pages/courses-directory">Course directory</a></p></div></section>
<script>(function(){var B=${JSON.stringify(cfg.basePath || '')},p=location.pathname.slice(B.length).replace(/\\/+$/,''),m;
if((m=p.match(/^\\/collections\\/[^/]+\\/products\\/([^/]+)/)))return location.replace(B+'/products/'+m[1]+location.search);
if(/^\\/products$/.test(p))return location.replace(B+'/collections/all');
var q=p.split('/').pop().replace(/[-_]+/g,' ');var i=document.querySelector('.notfound input');if(i&&q)i.value=q;})();</script>`;
  put('404.html', page(ctx, { title: 'Page not found | OSHA SCORM', description: 'The page you requested could not be found.', path: '/404', body: nf, jsonld: [], noindex: true }));
  put('products/index.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>All courses</title><meta name="robots" content="noindex"><link rel="canonical" href="${cfg.siteUrl}/collections/all"><meta http-equiv="refresh" content="0;url=/collections/all"></head><body><a href="/collections/all">All courses</a></body></html>`);
}

// Redirect stubs for consolidated duplicate directory URLs (GitHub Pages has
// no server-side redirects; an instant meta refresh + canonical is treated
// as a permanent redirect by Google).
for (const d of [...duplicates, ...duplicatesExtra]) {
  put(`${d.from}.html`, `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(d.title)}</title><link rel="canonical" href="${cfg.siteUrl}${d.to}"><meta http-equiv="refresh" content="0;url=${d.to}"><meta name="robots" content="noindex,follow"></head><body><p>This course has moved to <a href="${d.to}">${esc(d.title)}</a>.</p><script>location.replace(${JSON.stringify(d.to)}+location.search+location.hash)</script></body></html>`);
}

// ======================================================= AI + SEO FILES ==
const catalogCourses = allItems.map((c) => ({
  handle: c.handle,
  type: c.type,
  title: c.title,
  url: cfg.siteUrl + c.url,
  markdown: cfg.siteUrl + mdFor(c.url),
  category: c.category,
  collections: c.collections || [],
  duration: c.duration || null,
  languages: c.languages,
  citation: c.citation,
  format: ['SCORM 1.2', 'SCORM 2004'],
  license: '12 months per learner seat',
  currency: 'USD',
  pricePerSeat: c.price,
  minSeats: cfg.minSeats,
  examples: c.tiers.map((t) => ({ seats: t.seats, total: t.subtotal })),
  checkout: `${cfg.siteUrl}/checkout?item=${c.handle}&seats=${cfg.minSeats}`,
  payment: c.lmsId ? 'card' : 'order-request',
  summary: truncate(c.descriptionText, 300),
}));
// Compact data the checkout page needs: handle -> [title, price, lmsId, url].
put('api/checkout-data.json', JSON.stringify(Object.fromEntries(allItems.map((c) => [c.handle, [c.title, c.price, c.lmsId || null, c.url]]))));
put('api/catalog.json', JSON.stringify({ generatedAt: BUILD_DATE, publisher: cfg.legalName, site: cfg.siteUrl, count: catalogCourses.length, courses: catalogCourses }));
put('api/search.json', JSON.stringify(allItems.map((c) => ({ t: c.title, u: c.url, c: c.category, d: c.duration, p: minPer(c), s: `${c.title} ${c.category} ${c.citation || ''} ${(c.collections || []).join(' ')} ${c.handle.replace(/-/g, ' ')}`.toLowerCase() }))));
put('api/openapi.json', JSON.stringify({
  openapi: '3.1.0',
  info: { title: 'OSHASCORM.org public catalog', version: '1.0.0', description: 'Read-only, static JSON describing every SCORM course, seat tier and price. Purchases happen on the linked checkout pages with buyer approval.', contact: { email: cfg.contact.email } },
  servers: [{ url: cfg.siteUrl }],
  paths: {
    '/api/catalog.json': { get: { operationId: 'getCatalog', summary: 'Full course catalog with seat-tier pricing', responses: { 200: { description: 'Catalog', content: { 'application/json': { schema: { type: 'object' } } } } } } },
    '/api/search.json': { get: { operationId: 'getSearchIndex', summary: 'Compact search index (t=title, u=path, c=category, d=duration, p=from price per seat)', responses: { 200: { description: 'Index', content: { 'application/json': { schema: { type: 'array' } } } } } } },
  },
}, null, 1));
put('.well-known/api-catalog', JSON.stringify({ linkset: [{ anchor: `${cfg.siteUrl}/api/catalog.json`, 'service-desc': [{ href: `${cfg.siteUrl}/api/openapi.json`, type: 'application/vnd.oai.openapi+json' }], 'service-doc': [{ href: `${cfg.siteUrl}/agents.md`, type: 'text/markdown' }, { href: `${cfg.siteUrl}/llms.txt`, type: 'text/plain' }] }] }, null, 1));
put('.well-known/security.txt', `Contact: mailto:${cfg.contact.email}\nExpires: ${NEXT_YEAR_END}T23:59:59.000Z\nPreferred-Languages: en\nCanonical: ${cfg.siteUrl}/.well-known/security.txt\n`);

// robots.txt — explicitly welcome search + AI assistants, declare content signals.
const aiBots = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'anthropic-ai', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'GoogleOther', 'Applebot', 'Applebot-Extended', 'Bingbot', 'DuckAssistBot', 'Amazonbot', 'meta-externalagent', 'Meta-ExternalFetcher', 'MistralAI-User', 'cohere-ai', 'YouBot', 'CCBot'];
put('robots.txt', `# oshascorm.org — search engines and AI assistants are welcome.
# AI index: ${cfg.siteUrl}/llms.txt · Full catalog: ${cfg.siteUrl}/llms-full.txt
# Agent guide: ${cfg.siteUrl}/agents.md · JSON catalog: ${cfg.siteUrl}/api/catalog.json

User-agent: *
Content-Signal: search=yes, ai-input=yes, ai-train=yes
Allow: /
Disallow: /cart
Disallow: /checkout
Disallow: /search

${aiBots.map((b) => `User-agent: ${b}`).join('\n')}
Allow: /

Sitemap: ${cfg.siteUrl}/sitemap.xml
`);

// Sitemap (single file is well under the 50k URL limit).
put('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap.map((u) => `<url><loc>${esc(u.loc)}</loc><lastmod>${u.lastmod}</lastmod><priority>${u.priority.toFixed(1)}</priority></url>`).join('\n')}\n</urlset>\n`);

// llms.txt (spec: https://llmstxt.org) and llms-full.txt
const llms = `# OSHA SCORM (oshascorm.org)

> OSHASCORM.org sells ${TOTAL} OSHA-compliant safety training courses as SCORM 1.2 and SCORM 2004 packages for corporate learning management systems (LMS). Courses are IACET accredited, priced per learner seat for a 12-month license (minimum ${cfg.minSeats} seats; total = price × seats, no volume tiers), delivered by email within 24 hours, and most are available in English and Spanish.

Key facts for assistants:
- Buyers: employers, EHS/HR/L&D teams, training providers and LMS operators. Individuals needing fewer than 10 seats can enroll via the partner site hazwoper-osha.com.
- Compatible with any SCORM-compliant LMS, including ${LMS.slice(0, 8).join(', ')}.
- Every course page lists its exact USD price per seat and has a Markdown version (append \`.md\` to the URL).
- Machine-readable catalog with all prices: ${cfg.siteUrl}/api/catalog.json (OpenAPI: ${cfg.siteUrl}/api/openapi.json).
- OSHASCORM.org is a private company, a subsidiary of ${cfg.parentOrg.name}; it is not affiliated with OSHA.
- Contact: ${cfg.contact.phone} · ${cfg.contact.email}

## Training series

${collections.filter((c) => c.items.length).map((c) => `- [${c.title}](${cfg.siteUrl}${c.url}.md): ${c.items.length} SCORM course${c.items.length === 1 ? '' : 's'}${c.copy?.cite?.length ? ` (${c.copy.cite.join(', ')})` : ''}, from ${money(Math.min(...c.items.map(minPer)))}/seat`).join('\n')}

## Industry directory

${categoryList.map((c) => `- [${c.name}](${cfg.siteUrl}${c.url}.md): ${c.items.length} course${c.items.length === 1 ? '' : 's'}, from ${money(Math.min(...c.items.map(minPer)))}/seat`).join('\n')}

## Guides

- [What is SCORM? SCORM 1.2 vs 2004, xAPI, uploading to an LMS](${cfg.siteUrl}/pages/what-is-scorm.md)
- [Frequently asked questions](${cfg.siteUrl}/pages/faq.md)
- [How to buy and agent guidelines](${cfg.siteUrl}/agents.md)

## Policies

- [Refund policy (30-day money-back guarantee)](${cfg.siteUrl}/policies/refund-policy.md)
- [Terms of service](${cfg.siteUrl}/pages/terms-of-service.md)
- [Contact](${cfg.siteUrl}/pages/contact.md)

## Optional

- [Full catalog with every course and price](${cfg.siteUrl}/llms-full.txt)
- [Course directory A–Z](${cfg.siteUrl}/pages/courses-directory.md)
`;
put('llms.txt', llms);
put('llms-full.txt', `# OSHA SCORM — full course catalog\n\n> Updated ${isoDate(BUILD_DATE)}. ${TOTAL} SCORM 1.2 / SCORM 2004 courses. Prices in USD per learner seat for a 12-month license; total = price × seats (minimum ${cfg.minSeats}).\n\n` +
  Object.entries(allItems.reduce((acc, c) => ((acc[c.category] ||= []).push(c), acc), {}))
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([cat, items]) => `## ${cat}\n\n${items.map((c) => `### ${c.title}\n\n- URL: ${cfg.siteUrl}${c.url}\n${c.duration ? `- Duration: ${c.duration}\n` : ''}${c.citation ? `- Regulation: ${c.citation}\n` : ''}- Languages: ${c.languages.join(', ')}\n- Price: ${money(c.price)} per seat (e.g. ${c.tiers.map((t) => `${t.seats} seats ${money(t.subtotal)}`).join('; ')})\n- Summary: ${truncate(c.descriptionText, 400)}\n`).join('\n')}`)
    .join('\n'));

put('agents.md', `# Agent guide — OSHASCORM.org

You may browse and research this site on behalf of a user. This store sells SCORM safety training licenses to organizations.

## Discover
- Index: ${cfg.siteUrl}/llms.txt · full catalog: ${cfg.siteUrl}/llms-full.txt
- JSON catalog (all courses, prices, checkout links): ${cfg.siteUrl}/api/catalog.json — described by ${cfg.siteUrl}/api/openapi.json and listed in ${cfg.siteUrl}/.well-known/api-catalog
- Every HTML page has a Markdown twin: append \`.md\` (e.g. ${cfg.siteUrl}/products/osha-40-hour-hazwoper-training-29-cfr-1910-120.md)
- Sitemap: ${cfg.siteUrl}/sitemap.xml

## Pricing model
- License = 1 learner seat for 12 months. Total = price per seat × seats. Minimum ${cfg.minSeats} seats; no volume tiers.
- Prices on the page, in the JSON catalog and in JSON-LD (schema.org Product/Offer) are identical.
- Fewer than 10 learners: most course pages link to individual enrollment on hazwoper-osha.com.

## Buying (buyer approval required)
- Open \`${cfg.siteUrl}/checkout?item={handle}&seats={N}\` (the \`checkout\` field in the JSON catalog) and let the buyer enter their details and pay.
- Courses marked \`"payment": "card"\` are paid by card (Stripe); others are submitted as an order request and invoiced.
- In WebMCP-capable browsers, pages register the tools \`search_courses\`, \`get_course_pricing\` and \`open_checkout\`.

## Rules
- Never submit payment without explicit buyer authorization. Do not script checkout forms.
- Identify agent traffic honestly; back off on HTTP 429.
- OSHASCORM.org is a private company, not affiliated with OSHA or the U.S. Department of Labor.

Contact: ${cfg.contact.email} · ${cfg.contact.phone}
`);

if (!cfg.basePath) put('CNAME', new URL(cfg.siteUrl).host + '\n');
put('.nojekyll', '');
if (cfg.indexNowKey) put(`${cfg.indexNowKey}.txt`, cfg.indexNowKey);

// Preview builds served from a sub-path: prefix every root-relative URL in
// the HTML (links, assets, srcsets, forms, CSS url(), redirects).
if (cfg.basePath) {
  const B = cfg.basePath;
  const pre = (u) => (u.startsWith('/') && !u.startsWith('//') ? B + u : u);
  for (const [p, content] of files) {
    if (!p.endsWith('.html')) continue;
    files.set(p, content
      .replace(/\b(href|src|action)="(\/(?!\/)[^"]*)"/g, (m, a, u) => `${a}="${pre(u)}"`)
      .replace(/\b(srcset|imagesrcset)="([^"]*)"/g, (m, a, v) => `${a}="${v.split(',').map((s) => { const t = s.trim(); return pre(t); }).join(', ')}"`)
      .replace(/url\((\/(?!\/)[^)]*)\)/g, (m, u) => `url(${B}${u})`)
      .replace(/content="0;url=(\/[^"]*)"/g, (m, u) => `content="0;url=${B}${u}"`)
      .replace(/location\.replace\("(\/[^"]*)"/g, (m, u) => `location.replace("${B}${u}"`));
  }
}

// ------------------------------------------------------------------ write --
let bytes = 0;
for (const [p, content] of files) {
  const full = path.join(OUT, p);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, content);
  bytes += Buffer.byteLength(content);
}
const htmlCount = [...files.keys()].filter((p) => p.endsWith('.html')).length;
console.log(`✓ built ${htmlCount} HTML pages, ${[...files.keys()].filter((p) => p.endsWith('.md')).length} Markdown twins, ${sitemap.length} sitemap URLs — ${(bytes / 1e6).toFixed(1)} MB in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
