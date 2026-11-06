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
  const KEY = 'oshascorm-cart-v1';
  const store = {
    get() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } },
    set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* private mode */ } paintCount(); },
  };
  function paintCount() {
    const n = store.get().length;
    $$('.cart-count').forEach((el) => { el.textContent = String(n); el.hidden = n === 0; });
  }
  paintCount();
  const permalink = (items) => `${CFG.checkout}/cart/${items.map((i) => `${i.variantId}:1`).join(',')}`;

  /* -------------------------------------------------- seat picker */
  $$('[data-buybox]').forEach((box) => {
    const kind = box.dataset.kind; // "product" | "course"
    const out = {
      per: $('[data-out="per"]', box), total: $('[data-out="total"]', box),
      regular: $('[data-out="regular"]', box), save: $('[data-out="save"]', box),
      seats: $$('[data-out="seats"]', box),
    };
    const buy = $('[data-buy]', box);
    const add = $('[data-add]', box);
    const err = $('.buybox__err', box);
    const current = () => $('input[name="seats"]:checked', box) || $('input[name="seats"]', box);

    function paint() {
      const r = current();
      if (!r) return;
      const d = r.dataset;
      if (out.per) out.per.textContent = fmt(d.per);
      if (out.total) out.total.textContent = fmt(d.total);
      if (out.regular) { out.regular.textContent = d.regular ? fmt(d.regular) : ''; out.regular.hidden = !d.regular; }
      if (out.save) out.save.textContent = Number(d.save) > 0 ? `You save ${fmt(d.save)} vs. list price` : '';
      out.seats.forEach((el) => { el.textContent = r.value; });
      if (kind === 'product' && buy) buy.href = permalink([{ variantId: d.variant }]);
    }
    box.addEventListener('change', (e) => { if (e.target.name === 'seats') paint(); });
    paint();

    if (kind === 'course' && buy) {
      buy.addEventListener('click', async (e) => {
        e.preventDefault();
        const r = current();
        // Sub-path preview (e.g. *.github.io): the checkout service only
        // accepts requests from the real domain, so hand off to the same
        // course page there with the chosen seat count.
        if (BASE) { location.href = `${CFG.site}${location.pathname.slice(BASE.length)}?seats=${r.value}`; return; }
        if (err) err.classList.remove('is-on');
        buy.disabled = true;
        const label = buy.textContent;
        buy.textContent = 'Redirecting to secure checkout…';
        try {
          const res = await fetch(CFG.courseCheckout, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ courseName: box.dataset.title, seats: Number(r.value), pricePerSeat: Number(r.dataset.per).toFixed(2), store: CFG.store, currency: 'USD' }),
          });
          const data = await res.json();
          if (data.checkoutUrl) { location.href = data.checkoutUrl; return; }
          throw new Error(data.details?.[0]?.message || data.error || 'Could not start checkout.');
        } catch (ex) {
          if (err) { err.textContent = `${ex.message || 'Network error.'} Please try again, or email ${CFG.email}.`; err.classList.add('is-on'); }
          buy.disabled = false;
          buy.textContent = label;
        }
      });
    }

    if (add) {
      add.addEventListener('click', () => {
        const r = current();
        const items = store.get().filter((i) => i.handle !== box.dataset.handle);
        items.push({ variantId: r.dataset.variant, handle: box.dataset.handle, title: box.dataset.title, seats: Number(r.value), price: Number(r.dataset.total), url: location.pathname });
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
        total += i.price;
        const li = document.createElement('li');
        li.className = 'cart-item';
        li.innerHTML = `<div><a></a><div class="small muted"></div></div><b></b><button type="button">Remove</button>`;
        const a = li.querySelector('a'); a.href = i.url; a.textContent = i.title;
        li.querySelector('.small').textContent = `${i.seats} seats · 12-month license`;
        li.querySelector('b').textContent = fmt(i.price);
        li.querySelector('button').addEventListener('click', () => { const v = store.get(); v.splice(idx, 1); store.set(v); render(); });
        list.appendChild(li);
      });
      $('[data-cart-total]', cartRoot).textContent = fmt(total);
      const go = $('[data-checkout]', cartRoot);
      if (go) go.href = items.length ? permalink(items) : '#';
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
        li.querySelector('span').textContent = [d.c, d.d, d.p ? `from ${fmt(d.p)}/seat` : ''].filter(Boolean).join(' · ');
        out.appendChild(li);
      });
    };
    let t;
    input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(run, 120); });
    run();
  }

  /* ------------------------------------------------- contact form */
  if (/contact_posted=true/.test(location.search)) $('[data-contact-ok]')?.removeAttribute('hidden');

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
        description: 'Search the OSHA SCORM course catalog (hundreds of LMS-ready SCORM 1.2/2004 safety training courses) by topic, regulation or job role. Returns titles, URLs, durations and starting per-seat prices.',
        inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'e.g. "HAZWOPER 40 hour", "1910.146", "forklift"' }, limit: { type: 'number', default: 10 } }, required: ['query'] },
        async execute({ query, limit = 10 }) { return text(searchIndex(await loadIndex(), String(query), Math.min(Number(limit) || 10, 50)).map((d) => ({ title: d.t, url: new URL(BASE + d.u, location.origin).href, category: d.c, duration: d.d, fromPerSeat: d.p }))); },
      },
      {
        name: 'get_course_pricing',
        description: 'Get seat-tier pricing (10–200+ seats, 12-month license) and course details for a course URL or handle.',
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
          const tier = c.tiers.find((t) => t.seats === Number(seats)) || c.tiers[0];
          if (c.type === 'product') { location.href = `${CFG.checkout}/cart/${tier.variantId}:1`; return text(`Opening checkout for ${c.title} (${tier.seats} seats).`); }
          location.href = `${c.url}?seats=${tier.seats}#buy`;
          return text(`Opened ${c.title}. Ask the buyer to press "Buy now" to continue to checkout.`);
        },
      },
    ];
    tools.forEach((t) => { try { mc.registerTool(t); } catch { /* ignore */ } });
  }

  // Preselect seats from ?seats= (used by agent hand-off links).
  const qsSeats = new URLSearchParams(location.search).get('seats');
  if (qsSeats) { const r = $(`input[name="seats"][value="${CSS.escape(qsSeats)}"]`); if (r) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); } }

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
