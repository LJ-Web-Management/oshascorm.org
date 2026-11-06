// Page shell + shared UI components (pure functions returning HTML strings).
import { esc, money, srcsetOf, clean } from './util.mjs';

// ------------------------------------------------------------------ icons --
const I = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"${extra}>${d}</svg>`;
export const icon = {
  check: I('<path d="M20 6 9 17l-5-5"/>'),
  arrow: I('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  chevron: I('<path d="m6 9 6 6 6-6"/>'),
  search: I('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  cart: I('<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6"/>'),
  menu: I('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  phone: I('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>'),
  mail: I('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'),
  clock: I('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  shield: I('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>'),
  globe: I('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'),
  award: I('<circle cx="12" cy="8" r="6"/><path d="M15.5 13.5 17 22l-5-3-5 3 1.5-8.5"/>'),
  download: I('<path d="M12 3v12m0 0 5-5m-5 5-5-5M5 21h14"/>'),
  store: I('<path d="M3 9 5 4h14l2 5M4 9v11h16V9M9 20v-6h6v6M3 9h18"/>'),
  users: I('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6"/>'),
  layers: I('<path d="m12 2 10 5-10 5L2 7l10-5z"/><path d="m2 12 10 5 10-5M2 17l10 5 10-5"/>'),
  rocket: I('<path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2M14 4c3-1 6-1 6-1s0 3-1 6l-7 7-5-5 7-7z"/><circle cx="15" cy="9" r="1.5"/>'),
  badge: I('<path d="M12 2 4 6v6c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10V6l-8-4z"/><path d="M9 12l2 2 4-4"/>'),
  plug: I('<path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0V8zM12 18v4"/>'),
  file: I('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6z"/><path d="M14 3v6h6"/>'),
};
const social = {
  linkedin: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9 9h3.8v1.7h.1c.5-1 1.8-2 3.8-2 4 0 4.8 2.7 4.8 6.1V21h-4v-5.4c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9V21H9z"/></svg>',
  youtube: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8zM9.8 15.1V8.9L15.5 12z"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 8.5V6.8c0-.8.2-1.3 1.4-1.3H17V2.2C16.7 2.1 15.7 2 14.6 2 12.2 2 10.6 3.4 10.6 6.1v2.4H8v3.4h2.6V22H14V11.9h2.7l.4-3.4z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
};
export const logoMark = `<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff8a1f"/><stop offset="1" stop-color="#ffb066"/></linearGradient></defs><rect width="40" height="40" rx="11" fill="#0b2545"/><path d="M20 7.5 30 11v8.2c0 6.3-4.2 11-10 13.3-5.8-2.3-10-7-10-13.3V11z" fill="url(#lg)"/><path d="m15.2 19.8 3.4 3.4 6.4-6.6" fill="none" stroke="#0b2545" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// Cards accepted by the Stripe card form used at checkout.
export const PAYMENTS = ['Visa', 'Mastercard', 'American Express', 'Discover', 'Diners Club', 'JCB'];

// Trust band: verifiable credentials and guarantees, each linked to proof.
export function trustBand(cfg) {
  const items = [
    { icon: 'award', title: 'IACET accredited', text: 'Accredited continuing-education provider', href: cfg.trust.iacet, link: 'View IACET listing' },
    { icon: 'shield', title: 'Secure Stripe checkout', text: 'PCI DSS Level 1 card payments, or invoice by PO', href: '/pages/about-us#security', link: 'How we protect you' },
    { icon: 'check', title: '30-day money-back', text: '360° Guarantee® on every order', href: '/policies/refund-policy', link: 'Read the guarantee' },
    { icon: 'phone', title: 'Free LMS support', text: 'Installation help for 1 year after purchase', href: '/pages/contact', link: 'Talk to support' },
  ];
  return `<section class="trustband" aria-label="Why organizations trust us"><div class="wrap"><ul>${items.map((t) => `<li><span class="icon-tile">${icon[t.icon]}</span><div><b>${esc(t.title)}</b><span>${esc(t.text)}</span><a href="${esc(t.href)}"${/^https?:/.test(t.href) ? ' rel="noopener"' : ''}>${esc(t.link)}</a></div></li>`).join('')}</ul></div></section>`;
}

// ------------------------------------------------------------ components --
export function breadcrumbs(items, { light = false } = {}) {
  return `<nav class="crumbs" aria-label="Breadcrumb"><ol>${items
    .map((c, i) => (i === items.length - 1 ? `<li><span aria-current="page">${esc(c.name)}</span></li>` : `<li><a href="${esc(c.url)}">${esc(c.name)}</a></li>`))
    .join('')}</ol></nav>`;
}

export function faqList(faqs, { center = false } = {}) {
  if (!faqs?.length) return '';
  return `<div class="faq${center ? ' faq--center' : ''}">${faqs
    .map((f, i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(f.q)}</summary><div class="faq__a">${f.a}</div></details>`)
    .join('')}</div>`;
}

export function courseCard(c, { eager = false } = {}) {
  const media = c.media
    ? `<div class="course__media"><img src="${esc(c.media[480])}" srcset="${esc(srcsetOf(c.media))}" sizes="(min-width:1200px) 280px, (min-width:700px) 45vw, 92vw" width="480" height="320" alt="${esc(c.imageAlt || c.title)}" loading="${eager ? 'eager' : 'lazy'}" decoding="async"></div>`
    : '';
  return `<article class="card card--link course">${media}<div class="course__body"><div class="course__meta">${c.duration ? `<span class="chip">${icon.clock.replace('<svg', '<svg width="14" height="14"')} ${esc(c.duration)}</span>` : ''}${c.languages?.some((l) => /espa/i.test(l)) ? '<span class="chip chip--green">EN · ES</span>' : ''}</div><h3><a href="${esc(c.url)}">${esc(c.title)}</a></h3><div class="course__price">${c.price ? `<span>12-month license</span><b>${money(c.price)}<span> /seat</span></b>` : '<span>SCORM 1.2 &amp; 2004</span>'}</div></div></article>`;
}

export function courseRow(c) {
  const from = c.price || null;
  // data-q holds only what isn't visible (the citation); the filter adds the
  // row's own text lazily, which keeps the 780-row directory HTML small.
  return `<li data-q="${esc((c.citation || '').toLowerCase())}"><a href="${esc(c.url)}">${esc(c.title)}</a><span>${[c.duration, from ? `${money(from)}/seat` : ''].filter(Boolean).join(' · ')}</span></li>`;
}

export function pricingTable(c) {
  const rows = c.tiers.map((t) => `<tr><td>${t.seats} seats</td><td>${money(t.perSeat)}</td><td><b>${money(t.subtotal)}</b></td></tr>`).join('');
  return `<div class="table-scroll"><table class="ptable"><caption class="sr-only">Pricing for ${esc(c.title)} (12-month license per learner seat, USD)</caption><thead><tr><th scope="col">Seats</th><th scope="col">Per seat</th><th scope="col">Total</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

// Seat picker + live total. "Buy now" goes to /checkout, which charges through
// the LMS (card) when the course has an LMS id, otherwise sends an order request.
export function buyBox(c, cfg) {
  const min = cfg.minSeats;
  const cardReady = Boolean(c.lmsId);
  const presets = cfg.seatPresets.map((s, i) => `<button type="button" class="seat-chip${i === 0 ? ' is-on' : ''}" data-seats="${s}" aria-pressed="${i === 0}">${s}</button>`).join('');
  const checkoutHref = `/checkout?item=${encodeURIComponent(c.handle)}&seats=${min}`;
  return `<form class="buybox" id="buy" data-buybox data-handle="${esc(c.handle)}" data-title="${esc(c.title)}" data-price="${c.price}" data-url="${esc(c.url)}" data-min="${min}" onsubmit="return false">
<fieldset><legend>Number of learner seats <span class="muted small nowrap">(12-month license)</span></legend>
<div class="seatpick"><div class="seat-chips" role="group" aria-label="Quick seat counts">${presets}</div><label class="seat-input"><span>or enter</span><input type="number" name="seats" inputmode="numeric" min="${min}" max="100000" step="1" value="${min}" aria-describedby="seat-help-${esc(c.handle)}"></label></div>
<p class="small muted mt-0" id="seat-help-${esc(c.handle)}">Minimum ${min} seats. Every seat is ${money(c.price)} — no tiers, no surprises.</p></fieldset>
<div class="price" aria-live="polite"><div><div class="price__per">${money(c.price)} <small>/ seat</small></div></div><div class="price__total"><span class="small muted"><span data-out="seats">${min}</span> seats</span><b data-out="total">${money(c.price * min)}</b></div></div>
<div class="buybox__ctas"><a class="btn btn--primary btn--block" data-buy href="${esc(checkoutHref)}" rel="nofollow">${cardReady ? 'Buy now — secure checkout' : 'Request this order'} ${icon.arrow}</a><button type="button" class="btn btn--ghost btn--block" data-add>Add to cart</button></div>
<ul class="assure"><li>${icon.check}<span>SCORM 1.2 &amp; SCORM 2004 ZIP emailed within 24 hours</span></li><li>${icon.check}<span>Works with Moodle, Cornerstone, TalentLMS, Canvas &amp; any SCORM LMS</span></li><li>${icon.check}<span>30-day money-back guarantee · free install support for 1 year</span></li></ul>
<p class="secure">${icon.shield}<span>${cardReady ? `<b>Secure card checkout by Stripe</b> (PCI DSS Level 1). We accept ${PAYMENTS.slice(0, 4).join(', ')} and more.` : '<b>Order by request:</b> submit your order and we’ll confirm and invoice within one business day. Purchase orders welcome.'}</span></p>
${c.smallTeamUrl ? `<p class="buybox__note">Training fewer than 10 people? <a href="${esc(c.smallTeamUrl)}" rel="noopener">Enroll individual learners online</a></p>` : ''}
</form>`;
}

export function detailsList(items) {
  if (!items?.length) return '';
  return `<ul class="details">${items.map((d) => `<li><b>${esc(d.label)}</b><span>${esc(d.value)}</span></li>`).join('')}</ul>`;
}

// ------------------------------------------------------------ page shell --
export function page(ctx, { title, description, path, body, jsonld = [], ogImage, ogType = 'website', noindex = false, mdPath = null, preloadImage = null, head = '' }) {
  const { cfg, css, nav, assetsVersion } = ctx;
  const url = cfg.siteUrl + path;
  const og = ogImage || `${cfg.siteUrl}/assets/img/brand/og-default.jpg`;
  const graph = jsonld.length ? `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': jsonld }).replace(/</g, '\\u003c')}</script>` : '';
  const siteCfg = { base: cfg.basePath || '', site: cfg.siteUrl, email: cfg.contact.email, phone: cfg.contact.phone, minSeats: cfg.minSeats, ga4: cfg.ga4Id || '' };
  if (cfg.basePath) noindex = true; // preview builds are never indexed
  return `<!doctype html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(url)}">
${noindex ? '<meta name="robots" content="noindex,follow">' : '<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">'}
<meta name="theme-color" content="#0b2545">
<meta property="og:site_name" content="${esc(cfg.legalName)}">
<meta property="og:type" content="${ogType}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(og)}">
<meta property="og:locale" content="en_US">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(og)}">
${cfg.googleSiteVerification ? `<meta name="google-site-verification" content="${esc(cfg.googleSiteVerification)}">` : ''}
<link rel="preload" href="/assets/fonts/inter-latin-wght.woff2" as="font" type="font/woff2" crossorigin>
${preloadImage ? `<link rel="preload" as="image" href="${esc(preloadImage.href)}" imagesrcset="${esc(preloadImage.srcset)}" imagesizes="${esc(preloadImage.sizes)}" fetchpriority="high">` : ''}
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
${mdPath ? `<link rel="alternate" type="text/markdown" href="${esc(mdPath)}" title="Markdown version for AI agents">` : ''}
<link rel="alternate" type="text/plain" href="/llms.txt" title="LLM index">
<link rel="sitemap" type="application/xml" href="/sitemap.xml">
<style>${css}</style>
${head}
${graph}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="topbar"><div class="wrap"><span class="topbar__msg">Instant-quote SCORM licensing for 10–200+ learners · Delivered within 24 hours</span><span class="topbar__links"><a href="tel:${cfg.contact.phoneE164}">${esc(cfg.contact.phone)}</a><a href="mailto:${cfg.contact.email}">${esc(cfg.contact.email)}</a></span></div></div>
<header class="header"><div class="wrap">
<a class="logo" href="/" aria-label="${esc(cfg.legalName)} home">${logoMark}<span>OSHA SCORM<small>Safety training for your LMS</small></span></a>
<nav class="nav" aria-label="Main">
<details class="mega"><summary>Courses ${icon.chevron}</summary><div class="mega__panel"><div><p class="mega__title">Training series</p><div class="mega__grid">${nav.collections.map((c) => `<a href="${esc(c.url)}">${esc(c.title)} <span>(${c.count})</span></a>`).join('')}</div></div><div class="mega__side"><p class="mega__title">Browse</p><a href="/collections/all"><b>All SCORM courses</b></a><a href="/pages/courses-directory"><b>Course directory A–Z</b></a><a href="/collections/best-selling-courses">Best sellers</a><a href="/collections/osha-safety-training-in-spanish">Spanish-language courses</a><a href="/collections">All training series</a></div></div></details>
<a href="/pages/courses-directory">Directory</a>
<a href="/pages/what-is-scorm">SCORM guide</a>
<a href="/pages/faq">FAQ</a>
<a href="/pages/about-us">About</a>
<a href="/pages/contact">Contact</a>
</nav>
<div class="header__actions">
<a class="icon-btn" href="/search" aria-label="Search courses">${icon.search}</a>
<a class="icon-btn" href="/cart" aria-label="Cart">${icon.cart}<span class="cart-count" hidden>0</span></a>
<a class="btn btn--dark header__cta" href="/collections/all">Browse courses</a>
<button class="icon-btn menu-btn" type="button" aria-label="Menu" aria-expanded="false">${icon.menu}</button>
</div>
</div></header>
<main id="main">
${body}
</main>
${footer(ctx)}
<script>window.__SITE__=${JSON.stringify(siteCfg)}</script>
<script src="/assets/js/app.js?v=${assetsVersion}" defer></script>
</body>
</html>
`;
}

function footer({ cfg, nav }) {
  const year = new Date().getFullYear();
  const top = nav.collections.slice(0, 10);
  return `<footer class="footer"><div class="wrap">
<div class="footer__grid">
<div class="footer__brand"><a class="logo" href="/" aria-label="${esc(cfg.legalName)} home">${logoMark}<span>OSHA SCORM<small>Safety training for your LMS</small></span></a>
<p>OSHA-compliant SCORM 1.2 and SCORM 2004 safety training packages for corporate LMS platforms, training providers and EHS teams.</p>
<ul><li><a href="tel:${cfg.contact.phoneE164}">${esc(cfg.contact.phone)}</a></li><li><a href="mailto:${cfg.contact.email}">${esc(cfg.contact.email)}</a></li><li>Los Angeles, CA</li></ul>
<div class="socials">${Object.entries(cfg.social).map(([k, u]) => `<a href="${esc(u)}" rel="noopener" aria-label="${k[0].toUpperCase() + k.slice(1)}">${social[k]}</a>`).join('')}</div></div>
<div><h2>Popular training</h2><ul>${top.map((c) => `<li><a href="${esc(c.url)}">${esc(c.title)}</a></li>`).join('')}</ul></div>
<div><h2>Catalog</h2><ul><li><a href="/collections/all">All SCORM courses</a></li><li><a href="/pages/courses-directory">Course directory A–Z</a></li><li><a href="/collections">Training series</a></li><li><a href="/collections/best-selling-courses">Best sellers</a></li><li><a href="/collections/osha-safety-training-in-spanish">Courses in Spanish</a></li><li><a href="/search">Search</a></li></ul>
<h2 class="mt-2">Resources</h2><ul><li><a href="/pages/what-is-scorm">What is SCORM?</a></li><li><a href="/pages/faq">FAQ</a></li><li><a href="/llms.txt">llms.txt (AI index)</a></li></ul></div>
<div><h2>Company</h2><ul><li><a href="/pages/about-us">About us</a></li><li><a href="/pages/contact">Contact us</a></li><li><a href="/pages/return-policy">Return policy</a></li><li><a href="/policies/refund-policy">Refund policy</a></li><li><a href="/pages/terms-of-service">Terms of service</a></li><li><a href="/policies/shipping-policy">Delivery policy</a></li></ul>
<div class="trust"><a class="chip chip--dark" href="${esc(cfg.trust.iacet)}" rel="noopener">IACET Accredited Provider</a><a class="chip chip--dark" href="${esc(cfg.trust.bbb)}" rel="noopener">BBB profile</a></div></div>
</div>
<div class="footer__legal">
<p><b>Disclaimer:</b> OSHASCORM.org is a private company offering OSHA safety training courses in SCORM format. Our courses are compatible with SCORM-supported learning management systems, but we are not affiliated with the U.S. Occupational Safety and Health Administration (<a href="https://www.osha.gov/laws-regs" rel="noopener">osha.gov</a>).</p>
<p><b>Subsidiary partnership:</b> OSHASCORM.org operates as a subsidiary of <a href="${esc(cfg.parentOrg.url)}" rel="noopener">${esc(cfg.parentOrg.name)}</a>, a company specializing in workplace safety training, and partners with <a href="${esc(cfg.partnerOrg.url)}" rel="noopener">${esc(cfg.partnerOrg.name)}</a> to provide a comprehensive selection of OSHA compliance courses.</p>
<p>Secure card checkout by Stripe (PCI DSS Level 1) — we accept ${PAYMENTS.join(', ')}. Purchase-order and invoice billing available on request.</p>
<p>© ${year} ${esc(cfg.legalName)}. All rights reserved.</p>
</div>
</div></footer>`;
}
