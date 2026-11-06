/* oshascorm.org — progressive enhancement. Everything works without JS;
   this adds live seat pricing, a lightweight cart, search, filters and
   WebMCP tools for browser-based AI agents. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const CFG = window.__SITE__ || {};
  const BASE = CFG.base || ''; // non-empty only on sub-path preview builds
  const fmt = (n) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  /* ------------------------------------------------------------ nav */
  const header = $('.header');
  const menuBtn = $('.menu-btn');
  if (menuBtn && header) {
    menuBtn.addEventListener('click', () => {
      const open = header.classList.toggle('is-open');
      menuBtn.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('nav-open', open);
    });
  }
  // Close the mega menu on outside click / Escape.
  document.addEventListener('click', (e) => {
    $$('.mega[open]').forEach((d) => { if (!d.contains(e.target)) d.removeAttribute('open'); });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    $$('.mega[open]').forEach((d) => { d.removeAttribute('open'); $('summary', d)?.focus(); });
    if (header?.classList.contains('is-open')) menuBtn?.click();
  });

  /* ----------------------------------------------------------- cart */
  // Cart lines: { handle, title, price (per seat), seats, url }. Shared with
  // /checkout (checkout.js reads the same key).
  const KEY = 'oshascorm-cart-v2';
  const store = {
    get() { try { const v = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(v) ? v : []; } catch { return []; } },
    set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* private mode */ } paintCount(); },
  };
  function paintCount() {
    const n = store.get().length;
    $$('.cart-count').forEach((el) => { el.textContent = String(n); el.hidden = n === 0; });
  }
  paintCount();
  const MIN = Number(CFG.minSeats) || 10;
  const clampSeats = (v) => Math.max(MIN, Math.min(100000, Math.round(Number(v) || MIN)));

  /* -------------------------------------------------- seat picker */
  // Every seat costs the same LMS list price: total = price × seats.
  $$('[data-buybox]').forEach((box) => {
    const price = Number(box.dataset.price);
    const input = $('input[name="seats"]', box);
    const chips = $$('[data-seats]', box);
    const buy = $('[data-buy]', box);
    const add = $('[data-add]', box);
    const outTotal = $('[data-out="total"]', box);
    const outSeats = $('[data-out="seats"]', box);

    function paint() {
      const seats = clampSeats(input.value);
      if (outTotal) outTotal.textContent = fmt(Math.round(price * seats * 100) / 100);
      if (outSeats) outSeats.textContent = String(seats);
      chips.forEach((c) => { const on = Number(c.dataset.seats) === seats; c.classList.toggle('is-on', on); c.setAttribute('aria-pressed', String(on)); });
      if (buy) buy.href = `${BASE}/checkout?item=${encodeURIComponent(box.dataset.handle)}&seats=${seats}`;
    }
    chips.forEach((c) => c.addEventListener('click', () => { input.value = c.dataset.seats; paint(); }));
    input.addEventListener('input', paint);
    input.addEventListener('change', () => { input.value = clampSeats(input.value); paint(); });
    paint();

    if (add) {
      add.addEventListener('click', () => {
        const seats = clampSeats(input.value);
        const items = store.get().filter((i) => i.handle !== box.dataset.handle);
        items.push({ handle: box.dataset.handle, title: box.dataset.title, price, seats, url: box.dataset.url });
        store.set(items);
        add.textContent = 'Added — view cart';
        add.onclick = () => { location.href = BASE + '/cart'; };
      });
    }
  });

  /* ------------------------------------------------------- cart page */
  const cartRoot = $('[data-cart]');
  if (cartRoot) {
    const render = () => {
      const items = store.get();
      const list = $('.cart-list', cartRoot);
      const sum = $('.cart-summary', cartRoot);
      const empty = $('.empty', cartRoot);
      list.innerHTML = '';
      empty.hidden = items.length > 0;
      sum.hidden = items.length === 0;
      let total = 0;
      items.forEach((i, idx) => {
        const line = Math.round(i.price * i.seats * 100) / 100;
        total += line;
        const li = document.createElement('li');
        li.className = 'cart-item';
        li.innerHTML = '<div><a></a><div class="small muted"></div></div><b></b><button type="button">Remove</button>';
        const a = li.querySelector('a'); a.href = BASE + i.url; a.textContent = i.title;
        li.querySelector('.small').textContent = `${i.seats} seats × ${fmt(i.price)} · 12-month license`;
        li.querySelector('b').textContent = fmt(line);
        li.querySelector('button').addEventListener('click', () => { const v = store.get(); v.splice(idx, 1); store.set(v); render(); });
        list.appendChild(li);
      });
      $('[data-cart-total]', cartRoot).textContent = fmt(total);
    };
    render();
  }

  /* --------------------------------------------------- list filtering */
  $$('[data-filter]').forEach((input) => {
    const scope = $(input.dataset.filter);
    if (!scope) return;
    const items = $$('[data-q]', scope);
    const groups = $$('[data-group]', scope);
    const count = $('[data-count]');
    let hay;
    const run = () => {
      const q = input.value.trim().toLowerCase();
      hay ||= items.map((el) => `${el.textContent} ${el.dataset.q} ${el.closest('[data-group]')?.querySelector('h2')?.textContent || ''}`.toLowerCase());
      let shown = 0;
      items.forEach((el, i) => { const hit = !q || hay[i].includes(q); el.classList.toggle('is-hidden', !hit); if (hit) shown++; });
      groups.forEach((g) => g.classList.toggle('is-hidden', !$$('[data-q]:not(.is-hidden)', g).length));
      if (count) count.textContent = `${shown} course${shown === 1 ? '' : 's'}`;
    };
    input.addEventListener('input', run);
    if (input.value) run();
  });

  /* ---------------------------------------------------------- search */
  let indexPromise;
  const loadIndex = () => (indexPromise ||= fetch(BASE + '/api/search.json').then((r) => r.json()));
  function searchIndex(idx, q, limit = 50) {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    return idx
      .map((d) => {
        const hay = d.s;
        let score = 0;
        for (const t of terms) {
          if (!hay.includes(t)) return null;
          score += d.t.toLowerCase().includes(t) ? 3 : 1;
        }
        if (d.t.toLowerCase().startsWith(terms[0])) score += 2;
        return { d, score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score || a.d.t.localeCompare(b.d.t))
      .slice(0, limit)
      .map((x) => x.d);
  }
  const searchRoot = $('[data-search]');
  if (searchRoot) {
    const input = $('input[type="search"]', searchRoot);
    const out = $('[data-results]', searchRoot);
    const status = $('[data-status]', searchRoot);
    const params = new URLSearchParams(location.search);
    input.value = params.get('q') || '';
    const run = async () => {
      const q = input.value.trim();
      const url = new URL(location.href);
      if (q) url.searchParams.set('q', q); else url.searchParams.delete('q');
      history.replaceState(null, '', url);
      if (!q) { out.innerHTML = ''; status.textContent = 'Type a topic, regulation (e.g. 1910.120) or job role.'; return; }
      const res = searchIndex(await loadIndex(), q);
      status.textContent = `${res.length}${res.length === 50 ? '+' : ''} result${res.length === 1 ? '' : 's'} for “${q}”`;
      out.innerHTML = '';
      res.forEach((d) => {
        const li = document.createElement('li');
        li.innerHTML = '<a></a><span></span>';
        li.querySelector('a').href = BASE + d.u; li.querySelector('a').textContent = d.t;
        li.querySelector('span').textContent = [d.c, d.d, d.p ? `${fmt(d.p)}/seat` : ''].filter(Boolean).join(' · ');
        out.appendChild(li);
      });
    };
    let t;
    input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(run, 120); });
    run();
  }

  /* ------------------------------------------------- contact form */
  // Static hosting has no form backend: compose an email to the team.
  const contact = $('form[data-contact]');
  if (contact) {
    contact.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(contact);
      const body = ['Name: ' + f.get('name'), 'Email: ' + f.get('email'), 'Phone: ' + (f.get('phone') || '-'), '', String(f.get('message') || '')].join('\n');
      location.href = 'mailto:' + CFG.email + '?subject=' + encodeURIComponent('Website enquiry from ' + f.get('name')) + '&body=' + encodeURIComponent(body);
      $('[data-contact-ok]')?.removeAttribute('hidden');
    });
  }

  /* ------------------------------------------- WebMCP (AI agents) */
  // Registers read-only discovery tools plus a checkout hand-off for agents
  // running in WebMCP-capable browsers. The buyer always completes payment.
  const mc = navigator.modelContext;
  if (mc && typeof mc.registerTool === 'function') {
    const catalog = () => fetch(BASE + '/api/catalog.json').then((r) => r.json());
    const text = (v) => ({ content: [{ type: 'text', text: typeof v === 'string' ? v : JSON.stringify(v) }] });
    const tools = [
      {
        name: 'search_courses',
        description: 'Search the OSHA SCORM course catalog (hundreds of LMS-ready SCORM 1.2/2004 safety training courses) by topic, regulation or job role. Returns titles, URLs, durations and per-seat prices (USD, 12-month license).',
        inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'e.g. "HAZWOPER 40 hour", "1910.146", "forklift"' }, limit: { type: 'number', default: 10 } }, required: ['query'] },
        async execute({ query, limit = 10 }) { return text(searchIndex(await loadIndex(), String(query), Math.min(Number(limit) || 10, 50)).map((d) => ({ title: d.t, url: new URL(BASE + d.u, location.origin).href, category: d.c, duration: d.d, pricePerSeat: d.p }))); },
      },
      {
        name: 'get_course_pricing',
        description: 'Get the per-seat price (12-month license; total = price x seats, minimum 10 seats), payment method and course details for a course URL or handle.',
        inputSchema: { type: 'object', properties: { course: { type: 'string', description: 'Course URL or handle' } }, required: ['course'] },
        async execute({ course }) {
          const h = String(course).replace(/\/$/, '').split('/').pop().replace(/\.(md|html)$/, '');
          const c = (await catalog()).courses.find((x) => x.handle === h);
          return text(c || `No course found for "${course}". Use search_courses first.`);
        },
      },
      {
        name: 'open_checkout',
        description: 'Navigate the buyer to secure checkout for a course and seat count. The buyer reviews and pays on the checkout page; this tool never submits payment.',
        inputSchema: { type: 'object', properties: { course: { type: 'string' }, seats: { type: 'number' } }, required: ['course', 'seats'] },
        async execute({ course, seats }) {
          const h = String(course).replace(/\/$/, '').split('/').pop().replace(/\.(md|html)$/, '');
          const c = (await catalog()).courses.find((x) => x.handle === h);
          if (!c) return text('Course not found.');
          const n = clampSeats(seats);
          location.href = `${BASE}/checkout?item=${encodeURIComponent(c.handle)}&seats=${n}`;
          return text(`Opened checkout for ${c.title} (${n} seats). Ask the buyer to enter their details and confirm payment.`);
        },
      },
    ];
    tools.forEach((t) => { try { mc.registerTool(t); } catch { /* ignore */ } });
  }

  // Preselect seats from ?seats= (used by agent hand-off links).
  const qsSeats = new URLSearchParams(location.search).get('seats');
  if (qsSeats) { const r = $('[data-buybox] input[name="seats"]'); if (r) { r.value = clampSeats(qsSeats); r.dispatchEvent(new Event('change', { bubbles: true })); } }

  /* ----------------------------------------- deferred analytics */
  if (CFG.ga4) {
    const load = () => {
      ['scroll', 'pointerdown', 'keydown', 'touchstart'].forEach((ev) => removeEventListener(ev, load));
      const s = document.createElement('script'); s.async = true; s.src = `https://www.googletagmanager.com/gtag/js?id=${CFG.ga4}`; document.head.appendChild(s);
      window.dataLayer = window.dataLayer || []; window.gtag = function () { dataLayer.push(arguments); }; gtag('js', new Date()); gtag('config', CFG.ga4);
    };
    ['scroll', 'pointerdown', 'keydown', 'touchstart'].forEach((ev) => addEventListener(ev, load, { once: true, passive: true }));
  }
})();
