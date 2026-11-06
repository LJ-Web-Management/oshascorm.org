// Central configuration for the oshascorm.org static site.
// Every value here can be overridden by an environment variable of the same
// name in SCREAMING_SNAKE_CASE (handy for CI and preview builds).

const env = (key, fallback) => process.env[key] ?? fallback;

export default {
  // Public origin the static site is served from (GitHub Pages custom domain).
  siteUrl: env('SITE_URL', 'https://oshascorm.org'),

  // Preview builds only: serve under a sub-path (e.g. "/oshascorm.org" for
  // https://lj-web-management.github.io/oshascorm.org/). A non-empty value
  // prefixes every internal link, omits CNAME and marks all pages noindex so
  // the preview never competes with the real domain. Leave empty for prod.
  basePath: env('BASE_PATH', '').replace(/\/$/, ''),

  brand: 'OSHA SCORM',
  legalName: 'OSHASCORM.ORG',
  parentOrg: { name: 'Industrial Certified Training, LLC', url: 'https://ictraining.us/' },
  partnerOrg: { name: 'HAZWOPER OSHA Training, LLC', url: 'https://hazwoper-osha.com/' },

  // Ordering is wired straight to the HAZWOPER-OSHA LMS, exactly like
  // hazwoperosha.org and datacentertraining.us: Stripe.js tokenizes the card,
  // then add_new_user + add_order create the order, and the LMS returns a
  // Stripe PaymentIntent for the amount IT computes (list price × seats).
  // Course prices and LMS course ids live in data/lms.json.
  lms: {
    apiBase: env('LMS_API_BASE', 'https://hazwoper-osha.com/api'),
    // Publishable (public) key — the same one the sister sites ship.
    stripeKey: env('STRIPE_PUBLISHABLE_KEY', 'pk_live_doCHB0jglD5eISjEmB1vB6mb00xIg51noK'),
    orderFrom: env('LMS_ORDER_FROM', 'oshascorm.org'),
    // Courses without an LMS id (and mixed carts) are sent as an order
    // request to this inbox instead of being charged online.
    requestEmail: env('ORDER_REQUEST_EMAIL', 'info@oshascorm.org'),
  },

  // Seat counts offered as quick picks. Every seat costs the course's LMS list
  // price; there are no volume discounts. Organizations order 10+ seats.
  seatPresets: [10, 25, 50, 100, 200],
  minSeats: 10,

  contact: {
    phone: '1-866-429-6742',
    phoneE164: '+18664296742',
    email: 'info@oshascorm.org',
  },

  social: {
    linkedin: 'https://www.linkedin.com/company/hazwoper-osha',
    youtube: 'https://www.youtube.com/@hazwoper-osha',
    facebook: 'https://www.facebook.com/HazwoperOsha',
    instagram: 'https://www.instagram.com/hazwoper_osha_training/',
  },

  trust: {
    iacet: 'https://www.iacet.org/affiliates/accredited-providers-list/accredited-provider-overview/?providerID=131618',
    bbb: 'https://www.bbb.org/us/ca/los-angeles/profile/online-education/hazwoper-osha-training-1216-1424720',
  },

  googleSiteVerification: '2_2JWpSg2brm1xGOM-5xsB0xOxf46yHxrdkxAJr0JRU',

  // Optional: Bing/IndexNow key. Generate any 32-char hex string, set it here,
  // and the build will emit /<key>.txt so you can ping IndexNow after deploys.
  indexNowKey: env('INDEXNOW_KEY', ''),

  // Optional analytics (GA4 measurement ID). Loaded after user interaction so
  // it never affects Core Web Vitals. Leave empty to disable.
  ga4Id: env('GA4_ID', ''),
};
