// Central configuration for the oshascorm.org static site.
// Every value here can be overridden by an environment variable of the same
// name in SCREAMING_SNAKE_CASE (handy for CI and preview builds).

const env = (key, fallback) => process.env[key] ?? fallback;

export default {
  // Public origin the static site is served from (GitHub Pages custom domain).
  siteUrl: env('SITE_URL', 'https://oshascorm.org'),

  brand: 'OSHA SCORM',
  legalName: 'OSHASCORM.ORG',
  parentOrg: { name: 'Industrial Certified Training, LLC', url: 'https://ictraining.us/' },
  partnerOrg: { name: 'HAZWOPER OSHA Training, LLC', url: 'https://hazwoper-osha.com/' },

  // Shopify remains the commerce back office. The permanent *.myshopify.com
  // domain always 301s to whatever the store's primary domain is, so cart
  // permalinks built on it keep working before AND after the DNS cutover
  // (as long as the Shopify primary domain becomes e.g. shop.oshascorm.org).
  shopifyStore: env('SHOPIFY_STORE', 'scorm-online.myshopify.com'),

  // Where the sync script reads catalog data from.
  sourceOrigin: env('SOURCE_ORIGIN', 'https://scorm-online.myshopify.com'),

  // Origin used for "Buy now" cart permalinks on Shopify products.
  checkoutOrigin: env('CHECKOUT_ORIGIN', 'https://scorm-online.myshopify.com'),

  // The Shopify store's PRIMARY domain after cutover (e.g. shop.oshascorm.org).
  // Used for form POSTs (contact form), which must not go through a redirect.
  shopPrimaryOrigin: env('SHOP_PRIMARY_ORIGIN', 'https://shop.oshascorm.org'),

  // Existing checkout service used by the 700+ directory courses (metaobject
  // pages). Its CORS policy allows https://oshascorm.org only.
  courseCheckoutEndpoint: env(
    'COURSE_CHECKOUT_ENDPOINT',
    'https://oshascorm-alt-automation-seven.vercel.app/api/create-checkout',
  ),

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
