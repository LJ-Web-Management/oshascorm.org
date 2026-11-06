// Small, dependency-free helpers shared by the build.
import * as cheerio from 'cheerio';

export const esc = (s = '') =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const clean = (s = '') => String(s ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

export const slugify = (s = '') =>
  clean(s).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export const money = (n, { cents = true } = {}) =>
  '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 });

export const plainText = (html = '') => clean(cheerio.load(`<div>${html || ''}</div>`).text());

export function truncate(s, n) {
  s = clean(s);
  if (s.length <= n) return s;
  const cut = s.slice(0, n - 1);
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), n - 20)).replace(/[,;:.\s–-]+$/, '') + '…';
}

// "40.0 Hours" -> { hours: 40, label: "40 hours", iso: "PT40H" }
export function parseDuration(d) {
  if (!d) return null;
  const m = String(d).match(/([\d.]+)\s*(hour|hr|minute|min)/i);
  if (!m) return { label: clean(d), iso: null, hours: null };
  let n = parseFloat(m[1]);
  const isMin = /^min/i.test(m[2]);
  const hours = isMin ? n / 60 : n;
  const label = isMin ? `${n} minutes` : `${+n.toFixed(2)} ${n === 1 ? 'hour' : 'hours'}`;
  const iso = isMin ? `PT${Math.round(n)}M` : Number.isInteger(n) ? `PT${n}H` : `PT${Math.round(n * 60)}M`;
  return { hours, label, iso };
}

// Shopify CDN resize helper (cdn.shopify.com honours ?width= and negotiates
// AVIF/WebP from the Accept header).
export function img(src, width) {
  if (!src) return '';
  const u = new URL(src.startsWith('//') ? 'https:' + src : src);
  u.searchParams.set('width', String(width));
  return u.toString();
}

export function srcset(src, widths = [360, 540, 720, 960, 1200]) {
  return widths.map((w) => `${img(src, w)} ${w}w`).join(', ');
}

// --------------------------------------------------------------- pricing --
// Seat-tier pricing for the metaobject "directory" courses. This mirrors the
// formula the live Shopify theme uses (and that the checkout service
// re-validates), so displayed prices match what buyers are charged.
export function directoryPricing(seats, basePrice) {
  const maxSeats = 200;
  const minSeats = 10;
  const cap = 12000;
  const startRate = basePrice >= 300 ? 0.25 : basePrice >= 150 ? 0.2 : basePrice >= 50 ? 0.15 : 0.1;
  const start = basePrice * minSeats * (1 - startRate);
  let end;
  if (basePrice * maxSeats > cap) end = cap;
  else {
    let rate = 0.4;
    if (basePrice < 20) rate = 0.25;
    else if (basePrice >= 100) rate = 0.5;
    end = basePrice * maxSeats * (1 - rate);
  }
  const slope = (end - start) / (maxSeats - minSeats);
  const subtotal = start + slope * (seats - minSeats);
  const regular = seats * basePrice;
  return {
    seats,
    perSeat: Number((subtotal / seats).toFixed(2)),
    subtotal: Number(subtotal.toFixed(2)),
    regular: Number(regular.toFixed(2)),
    saved: Number((regular - subtotal).toFixed(2)),
  };
}

// Uniform tier list for both Shopify products and directory courses.
export function tiersFor(item) {
  if (item.kind === 'product') {
    return item.variants
      .filter((v) => v.seats)
      .map((v) => ({
        seats: v.seats,
        perSeat: Number((v.price / v.seats).toFixed(2)),
        subtotal: v.price,
        regular: v.compare_at_price && v.compare_at_price > v.price ? v.compare_at_price : null,
        saved: v.compare_at_price && v.compare_at_price > v.price ? Number((v.compare_at_price - v.price).toFixed(2)) : 0,
        variantId: v.id,
        available: v.available,
        sku: v.sku,
      }))
      .sort((a, b) => a.seats - b.seats);
  }
  return (item.seats || [10, 25, 50, 75, 100, 150, 200]).map((s) => {
    const p = directoryPricing(s, item.basePrice);
    return { ...p, regular: p.regular, available: true };
  });
}

// ---------------------------------------------------- HTML -> Markdown --
// Minimal, predictable converter for the AI-facing .md twins of each page.
export function toMarkdown(html = '') {
  const $ = cheerio.load(`<div id="__md">${html}</div>`, null, false);
  const walk = (node, ctx = {}) => {
    if (node.type === 'text') return node.data.replace(/\s+/g, ' ');
    if (node.type !== 'tag') return '';
    const kids = (n = node, c = ctx) => (n.children || []).map((k) => walk(k, c)).join('');
    const t = node.tagName;
    switch (t) {
      case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6':
        return `\n\n${'#'.repeat(Math.min(6, Number(t[1]) + (ctx.shift || 0)))} ${clean(kids())}\n\n`;
      case 'p': return `\n\n${clean(kids())}\n\n`;
      case 'br': return '  \n';
      case 'strong': case 'b': { const k = clean(kids()); return k ? `**${k}**` : ''; }
      case 'em': case 'i': { const k = clean(kids()); return k ? `*${k}*` : ''; }
      case 'a': {
        const href = $(node).attr('href') || '';
        const k = clean(kids());
        if (!href || href.startsWith('#')) return k;
        return `[${k}](${href})`;
      }
      case 'ul': case 'ol': {
        const depth = (ctx.depth || 0);
        let i = 0;
        const items = (node.children || []).filter((c) => c.type === 'tag' && c.tagName === 'li').map((li) => {
          i++;
          const bullet = t === 'ol' ? `${i}.` : '-';
          return `${'  '.repeat(depth)}${bullet} ${clean(kids(li, { ...ctx, depth: depth + 1 }))}`;
        });
        return `\n\n${items.join('\n')}\n\n`;
      }
      case 'table': {
        const rows = $(node).find('tr').map((_, tr) => [$(tr).find('th,td').map((_, c) => clean($(c).text()).replace(/\|/g, '\\|')).get()]).get();
        if (!rows.length) return '';
        const head = rows[0];
        const sep = head.map(() => '---');
        return '\n\n' + [head, sep, ...rows.slice(1)].map((r) => `| ${r.join(' | ')} |`).join('\n') + '\n\n';
      }
      case 'img': return '';
      default: return kids();
    }
  };
  const out = walk($('#__md')[0]);
  return out.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

export const iso = (d) => (d ? new Date(d).toISOString() : new Date().toISOString());
export const isoDate = (d) => iso(d).slice(0, 10);
