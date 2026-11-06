// schema.org JSON-LD builders. Every page emits one connected @graph so
// search engines and AI systems can resolve entities by @id.
import { plainText, truncate, parseDuration } from './util.mjs';

export function base(cfg) {
  const S = cfg.siteUrl;
  const org = {
    '@type': 'EducationalOrganization',
    '@id': `${S}/#org`,
    name: cfg.legalName,
    alternateName: ['OSHA SCORM', 'OSHASCORM', 'oshascorm.org'],
    url: `${S}/`,
    logo: { '@type': 'ImageObject', '@id': `${S}/#logo`, url: `${S}/assets/img/brand/logo.png`, width: 500, height: 500, caption: cfg.legalName },
    image: { '@id': `${S}/#logo` },
    description: 'OSHASCORM.org develops and sells OSHA-compliant, IACET-accredited safety training courses as SCORM 1.2 and SCORM 2004 packages for corporate learning management systems (LMS), training providers and EHS teams.',
    email: cfg.contact.email,
    telephone: cfg.contact.phoneE164,
    address: { '@type': 'PostalAddress', addressLocality: 'Los Angeles', addressRegion: 'CA', addressCountry: 'US' },
    contactPoint: [
      { '@type': 'ContactPoint', contactType: 'sales', telephone: cfg.contact.phoneE164, email: cfg.contact.email, areaServed: 'Worldwide', availableLanguage: ['English', 'Spanish'] },
      { '@type': 'ContactPoint', contactType: 'technical support', telephone: cfg.contact.phoneE164, email: cfg.contact.email, availableLanguage: ['English'] },
    ],
    sameAs: Object.values(cfg.social),
    parentOrganization: { '@type': 'Organization', name: cfg.parentOrg.name, url: cfg.parentOrg.url },
    knowsAbout: ['SCORM 1.2', 'SCORM 2004', 'OSHA compliance training', 'HAZWOPER', 'NFPA 70E', 'DOT hazmat training', 'RCRA', 'EM 385-1-1', 'Learning management systems'],
    hasMerchantReturnPolicy: returnPolicy(cfg),
  };
  const website = {
    '@type': 'WebSite',
    '@id': `${S}/#website`,
    url: `${S}/`,
    name: cfg.legalName,
    alternateName: 'OSHA SCORM',
    publisher: { '@id': `${S}/#org` },
    inLanguage: 'en-US',
    potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: `${S}/search?q={search_term_string}` }, 'query-input': 'required name=search_term_string' },
  };
  return { org, website };
}

export function returnPolicy(cfg) {
  return {
    '@type': 'MerchantReturnPolicy',
    applicableCountry: 'US',
    returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
    merchantReturnDays: 30,
    returnMethod: 'https://schema.org/ReturnByMail',
    returnFees: 'https://schema.org/FreeReturn',
    merchantReturnLink: `${cfg.siteUrl}/policies/refund-policy`,
  };
}

export function webPage(cfg, { path, name, description, type = 'WebPage', crumbs, image, dateModified, extra = {} }) {
  const url = cfg.siteUrl + path;
  const nodes = [
    {
      '@type': type,
      '@id': `${url}#webpage`,
      url,
      name,
      description,
      isPartOf: { '@id': `${cfg.siteUrl}/#website` },
      about: { '@id': `${cfg.siteUrl}/#org` },
      inLanguage: 'en-US',
      ...(image ? { primaryImageOfPage: { '@type': 'ImageObject', url: image } } : {}),
      ...(dateModified ? { dateModified } : {}),
      ...(crumbs ? { breadcrumb: { '@id': `${url}#breadcrumb` } } : {}),
      ...extra,
    },
  ];
  if (crumbs) {
    nodes.push({
      '@type': 'BreadcrumbList',
      '@id': `${url}#breadcrumb`,
      itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: cfg.siteUrl + c.url })),
    });
  }
  return nodes;
}

export function faqPage(cfg, path, faqs) {
  if (!faqs?.length) return [];
  return [{
    '@type': 'FAQPage',
    '@id': `${cfg.siteUrl}${path}#faq`,
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: plainText(f.a) } })),
  }];
}

export function itemList(cfg, path, name, items) {
  return [{
    '@type': 'ItemList',
    '@id': `${cfg.siteUrl}${path}#list`,
    name,
    numberOfItems: items.length,
    itemListOrder: 'https://schema.org/ItemListUnordered',
    itemListElement: items.map((c, i) => ({ '@type': 'ListItem', position: i + 1, url: cfg.siteUrl + c.url, name: c.title })),
  }];
}

// Product + Course for a sellable course (flagship or directory course).
export function courseEntities(cfg, c, { validUntil }) {
  const url = cfg.siteUrl + c.url;
  const dur = parseDuration(c.duration);
  const desc = truncate(c.descriptionText, 4900);
  const image = c.ogImage ? [c.ogImage] : undefined;
  // One offer: the per-seat LMS list price (orders are price x seats, 10+ seats).
  const offer = {
    '@type': 'Offer',
    name: '12-month SCORM license, per learner seat',
    price: c.price.toFixed(2),
    priceCurrency: 'USD',
    availability: 'https://schema.org/InStock',
    itemCondition: 'https://schema.org/NewCondition',
    url: `${url}#buy`,
    priceValidUntil: validUntil,
    eligibleQuantity: { '@type': 'QuantitativeValue', minValue: cfg.minSeats, unitText: 'learner seats' },
    priceSpecification: { '@type': 'UnitPriceSpecification', price: c.price.toFixed(2), priceCurrency: 'USD', referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitText: 'seat' } },
    ...(c.sku ? { sku: c.sku } : {}),
    seller: { '@id': `${cfg.siteUrl}/#org` },
    hasMerchantReturnPolicy: returnPolicy(cfg),
    shippingDetails: {
      '@type': 'OfferShippingDetails',
      shippingRate: { '@type': 'MonetaryAmount', value: '0', currency: 'USD' },
      shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'US' },
      deliveryTime: {
        '@type': 'ShippingDeliveryTime',
        handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 1, unitCode: 'DAY' },
        transitTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 0, unitCode: 'DAY' },
      },
    },
  };
  const props = [
    { '@type': 'PropertyValue', name: 'Format', value: 'SCORM 1.2 and SCORM 2004 (ZIP package)' },
    dur && { '@type': 'PropertyValue', name: 'Course duration', value: dur.label },
    c.citation && { '@type': 'PropertyValue', name: 'Regulatory citation', value: c.citation },
    { '@type': 'PropertyValue', name: 'License term', value: '12 months (365 days) per learner seat' },
    c.languages?.length && { '@type': 'PropertyValue', name: 'Languages', value: c.languages.join(', ') },
  ].filter(Boolean);
  const product = {
    '@type': 'Product',
    '@id': `${url}#product`,
    name: c.title,
    url,
    description: desc,
    ...(image ? { image } : {}),
    brand: { '@type': 'Brand', name: 'OSHA SCORM' },
    ...(c.sku ? { sku: c.sku, mpn: c.sku } : { sku: `OSC-${c.handle}`.slice(0, 50) }),
    category: c.category || 'Safety training courses',
    audience: { '@type': 'BusinessAudience', audienceType: 'Employers, training providers and LMS administrators' },
    additionalProperty: props,
    offers: offer,
    subjectOf: { '@id': `${url}#course` },
    mainEntityOfPage: { '@id': `${url}#webpage` },
  };
  const course = {
    '@type': 'Course',
    '@id': `${url}#course`,
    name: c.title,
    url,
    description: truncate(c.descriptionText, 1000),
    provider: { '@id': `${cfg.siteUrl}/#org` },
    ...(image ? { image } : {}),
    inLanguage: (c.languages || ['English']).map((l) => (/espa|spanish/i.test(l) ? 'es' : 'en')),
    educationalCredentialAwarded: 'Certificate of completion',
    ...(c.citation ? { teaches: c.citation } : {}),
    isAccessibleForFree: false,
    offers: { '@type': 'Offer', category: 'Paid', price: c.price.toFixed(2), priceCurrency: 'USD', url, availability: 'https://schema.org/InStock' },
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'Online',
      ...(dur?.iso ? { courseWorkload: dur.iso } : {}),
    },
  };
  return [product, course];
}

export function howTo(cfg, path, name, steps) {
  return [{
    '@type': 'HowTo',
    '@id': `${cfg.siteUrl}${path}#howto`,
    name,
    step: steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, name: s.title, text: s.text })),
  }];
}
