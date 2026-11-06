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

// Responsive srcset from a local media map ({ 480: url, 720: url, 960: url }).
export const srcsetOf = (media) => (media ? Object.entries(media).map(([w, u]) => `${u} ${w}w`).join(", ") : "");

// --------------------------------------------------------------- pricing --
// Every seat costs the course's LMS list price (the HAZWOPER-OSHA LMS charges
// price x seats with no volume discounts), so tiers are simple multiples.
export function priceTiers(price, presets = [10, 25, 50, 100, 200]) {
  return presets.map((seats) => ({ seats, perSeat: price, subtotal: Math.round(price * seats * 100) / 100, saved: 0, regular: null, available: true }));
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
