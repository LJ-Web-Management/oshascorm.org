/* oshascorm.org checkout — connects directly to the HAZWOPER-OSHA LMS, the
   same way hazwoperosha.org and datacentertraining.us do:

     1. Stripe.js tokenizes the card (card data never touches this site)
     2. POST {api}/add_new_user  → LMS customer id
     3. POST {api}/add_order     → LMS order + Stripe PaymentIntent clientSecret
                                    (the LMS computes the amount: list price × seats)
     4. stripe.confirmCardPayment(clientSecret)

   Safety guard: before step 4 we read the PaymentIntent back and only confirm
   it if the amount equals the total shown on this page. If the LMS asks for
   more, nothing is charged and the buyer is told to contact us.

   Orders that include a course without an LMS id are sent as an order
   request by email instead (same fallback the sister sites use). */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const SITE = window.__SITE__ || {};
  const LMS = window.__LMS__ || {};
  const BASE = SITE.base || '';
  const MIN = Number(SITE.minSeats) || 10;
  const root = $('[data-checkout-root]');
  if (!root) return;

  const form = $('#checkout-form', root);
  const submit = $('[data-submit]', root);
  const errBox = $('[data-err]', root);
  const fmt = (n) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const cents = (n) => Math.round(Number(n) * 100);
  const val = (id) => ($('#' + id, root)?.value || '').trim();
  const showErr = (msg) => { errBox.textContent = msg; errBox.classList.add('is-on'); errBox.scrollIntoView({ block: 'center', behavior: 'smooth' }); };
  const clearErr = () => { errBox.textContent = ''; errBox.classList.remove('is-on'); };

  const CART_KEY = 'oshascorm-cart-v2';
  const readCart = () => { try { const v = JSON.parse(localStorage.getItem(CART_KEY)); return Array.isArray(v) ? v : []; } catch { return []; } };
  const clampSeats = (v) => Math.max(MIN, Math.min(100000, Math.round(Number(v) || MIN)));

  let stripe = null;
  let card = null;
  let lines = [];
  let total = 0;
  let cardMode = false;
  const params = new URLSearchParams(location.search);
  const fromCart = params.has('cart');

  function loadStripe() {
    return new Promise((resolve, reject) => {
      if (window.Stripe) return resolve();
      const s = document.createElement('script');
      s.src = 'https://js.stripe.com/v3/';
      s.onload = resolve;
      s.onerror = () => reject(new Error('Could not load the secure payment form. Check your connection or ad-blocker and refresh.'));
      document.head.appendChild(s);
    });
  }

  function render() {
    const ul = $('[data-lines]', root);
    ul.innerHTML = '';
    lines.forEach((l) => {
      const li = document.createElement('li');
      li.innerHTML = '<div><a></a><span class="small muted"></span></div><b></b>';
      const a = li.querySelector('a'); a.href = BASE + l.url; a.textContent = l.title;
      li.querySelector('span').textContent = `${l.seats} seats × ${fmt(l.price)} / seat`;
      li.querySelector('b').textContent = fmt(l.total);
      ul.appendChild(li);
    });
    $('[data-total]', root).textContent = fmt(total);
    $('[data-card-only]', root).hidden = !cardMode;
    $('[data-request-only]', root).hidden = cardMode;
    submit.textContent = cardMode ? `Pay ${fmt(total)} securely` : 'Send order request';
  }

  async function init() {
    let data;
    try {
      data = await fetch(BASE + '/api/checkout-data.json').then((r) => r.json());
    } catch {
      showErr(`We couldn’t load the course catalog. Please refresh, or call ${SITE.phone} to order.`);
      return;
    }
    const wanted = fromCart
      ? readCart().map((i) => ({ handle: i.handle, seats: i.seats }))
      : params.get('item') ? [{ handle: params.get('item'), seats: params.get('seats') }] : [];
    lines = wanted
      .filter((w) => data[w.handle])
      .map((w) => {
        const [title, price, lmsId, url] = data[w.handle];
        const seats = clampSeats(w.seats);
        return { handle: w.handle, title, price, lmsId, url, seats, total: Math.round(price * seats * 100) / 100 };
      });
    if (!lines.length) {
      form.hidden = true;
      $('.order-summary', root).hidden = true;
      const done = $('[data-done]', root);
      $('[data-done-title]', root).textContent = 'Your order is empty';
      $('[data-done-text]', root).textContent = 'Choose a course and seat count to start checkout.';
      done.hidden = false;
      return;
    }
    total = Math.round(lines.reduce((s, l) => s + l.total, 0) * 100) / 100;
    cardMode = lines.every((l) => l.lmsId) && Boolean(LMS.stripeKey) && Boolean(LMS.apiBase);
    render();
    if (cardMode) {
      try {
        await loadStripe();
        stripe = window.Stripe(LMS.stripeKey);
        card = stripe.elements().create('card', { hidePostalCode: true, style: { base: { fontSize: '16px', color: '#0b1220', fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', '::placeholder': { color: '#64748b' } }, invalid: { color: '#b91c1c' } } });
        card.mount('#card-element');
        card.on('change', (e) => { if (e.error) showErr(e.error.message); else clearErr(); });
      } catch (e) {
        showErr(e.message);
        return;
      }
    }
    submit.disabled = false;
  }

  function buyer() {
    return {
      first: val('billingFirstName'), last: val('billingLastName'), company: val('billingCompany'),
      email: val('billingEmail'), phone: val('billingPhone'), address1: val('billingAddress'), address2: val('billingAddress2'),
      city: val('billingCity'), state: val('billingState'), zip: val('billingZip'), country: val('billingCountry') || 'US',
    };
  }

  function finish(title, text) {
    form.hidden = true;
    $('.order-summary', root).hidden = true;
    const done = $('[data-done]', root);
    $('[data-done-title]', root).textContent = title;
    $('[data-done-text]', root).textContent = text;
    done.hidden = false;
    done.focus();
    if (fromCart) { try { localStorage.removeItem(CART_KEY); } catch {} document.querySelectorAll('.cart-count').forEach((el) => { el.hidden = true; }); }
  }

  function sendRequest(b) {
    const body = [
      'ORDER REQUEST — oshascorm.org', '',
      ...lines.map((l) => `• ${l.title} — ${l.seats} seats × ${fmt(l.price)} = ${fmt(l.total)} (${location.origin}${BASE}${l.url})`),
      '', `Total: ${fmt(total)} USD (12-month license per seat)`, '',
      `Name: ${b.first} ${b.last}`, `Company: ${b.company || '-'}`, `Email: ${b.email}`, `Phone: ${b.phone}`,
      `Address: ${[b.address1, b.address2, b.city, b.state, b.zip, b.country].filter(Boolean).join(', ')}`,
    ].join('\n');
    const subject = `Order request: ${lines.length === 1 ? lines[0].title : lines.length + ' courses'} (${fmt(total)})`;
    location.href = `mailto:${LMS.requestEmail || SITE.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    if (window.gtag) window.gtag('event', 'generate_lead', { currency: 'USD', value: total });
    finish('Your order request is ready to send', `Your email app should now be open with the order details addressed to ${LMS.requestEmail || SITE.email}. Press send and we’ll confirm and invoice within one business day. If nothing opened, email us or call ${SITE.phone}.`);
  }

  async function payByCard(b) {
    // 1. Tokenize the card with Stripe.
    const pm = await stripe.createPaymentMethod({
      type: 'card', card,
      billing_details: { name: `${b.first} ${b.last}`, email: b.email, phone: b.phone, address: { line1: b.address1, line2: b.address2, city: b.city, state: b.state, postal_code: b.zip, country: b.country } },
    });
    if (pm.error) throw new Error(pm.error.message);
    const paymentMethodId = pm.paymentMethod.id;

    // 2. Create (or find) the LMS customer.
    let customerId = 0;
    try {
      const r = await fetch(LMS.apiBase + '/add_new_user', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_name: b.first, last_name: b.last, email: b.email, user_name: `${b.first} ${b.last}`, user_role_id: 2, phone: b.phone }),
      });
      if (r.ok) {
        const u = await r.json();
        customerId = u.user_id || u.data?.user_id || u.success?.user_id || u.user?.user_id || (u.is_duplicate && Number(u.existing_email)) || 0;
      }
    } catch { /* the LMS can still attach the order by email */ }

    // 3. Create the LMS order (the LMS returns a PaymentIntent for its amount).
    const r = await fetch(LMS.apiBase + '/add_order', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: customerId,
        payment_method: 'stripe', payment_method_id: paymentMethodId,
        order_type: 'normal', order_status: 'pending', order_from: LMS.orderFrom || 'oshascorm.org',
        billing_first_name: b.first, billing_last_name: b.last, billing_name: `${b.first} ${b.last}`, billing_email: b.email, billing_phone: b.phone,
        billing_company: b.company, reg_company: b.company,
        billing_address_1: b.address1, billing_address_2: b.address2, billing_city: b.city, billing_state: b.state, billing_postcode: b.zip, billing_country: b.country,
        shipping_address_1: b.address1, shipping_address_2: b.address2, shipping_city: b.city, shipping_state: b.state, shipping_postcode: b.zip, shipping_country: b.country,
        courses: lines.map((l) => ({ course_id: l.lmsId, quantity: l.seats, users: [{ first_name: b.first, last_name: b.last, email: b.email, user_name: '' }] })),
      }),
    });
    let order = {};
    try { order = await r.json(); } catch {}
    if (!r.ok || order.success === false || order.error) throw new Error(typeof order.error === 'string' ? order.error : order.message || 'We couldn’t create your order. Please try again.');
    const orderId = order.order_id || order.id || '';

    // 4. Verify the amount, then confirm the payment.
    if (order.clientSecret) {
      const got = await stripe.retrievePaymentIntent(order.clientSecret);
      const pi = got.paymentIntent;
      if (got.error || !pi) throw new Error(`We couldn’t verify the payment amount, so your card was not charged. Please call ${SITE.phone} and quote order ${orderId || '(pending)'}.`);
      if (String(pi.currency).toLowerCase() !== 'usd' || pi.amount > cents(total) + 1) {
        throw new Error(`Price check: our system calculated ${fmt(pi.amount / 100)} but this page shows ${fmt(total)}. Your card was NOT charged. Please call ${SITE.phone} or email ${SITE.email} and quote order ${orderId || '(pending)'} — we’ll honor the price shown.`);
      }
      const confirm = await stripe.confirmCardPayment(order.clientSecret, { payment_method: paymentMethodId });
      if (confirm.error) throw new Error(confirm.error.message);
    }
    if (window.gtag) window.gtag('event', 'purchase', { transaction_id: String(orderId), currency: 'USD', value: total, items: lines.map((l) => ({ item_id: l.handle, item_name: l.title, price: l.price, quantity: l.seats })) });
    finish('Thank you — your order is confirmed', `Order ${orderId ? '#' + orderId : ''} for ${fmt(total)} was received. A confirmation is on its way to ${b.email}, and your SCORM package will be emailed within 24 hours.`);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErr();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const b = buyer();
    if (!cardMode) { sendRequest(b); return; }
    submit.disabled = true;
    const label = submit.textContent;
    submit.textContent = 'Processing securely…';
    try {
      await payByCard(b);
    } catch (ex) {
      showErr(ex.message || 'Payment failed. Please try again.');
      submit.disabled = false;
      submit.textContent = label;
    }
  });

  init();
})();
