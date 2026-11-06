# oshascorm.org remake — audit report (2026-11-06)

## 1. PageSpeed / Lighthouse

Measured with Lighthouse 13.6 (the engine behind PageSpeed Insights). The public PSI API's keyless daily quota was exhausted, so tests ran locally against the old live site and against the new build served the way GitHub Pages serves it. Re-check with [PageSpeed Insights](https://pagespeed.web.dev/) once DNS points at GitHub Pages.

**Before — live Shopify site (Dawn theme)**

| Page | Device | Perf | A11y | Best pr. | SEO | LCP | TBT | Page weight |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Home | mobile | 61 | 91 | 65 | 92 | 3.3 s | 2,890 ms | 3.3 MB |
| Home | desktop | 76 | 95 | 65 | 92 | 1.4 s | 250 ms | 3.8 MB |
| Product | mobile | 54 | 87 | 69 | 92 | 4.4 s | 2,020 ms | 3.4 MB |
| Product | desktop | 83 | 89 | 73 | 92 | 1.4 s | 210 ms | 3.5 MB |
| Collection | mobile | 45 | 95 | 69 | 100 | 8.2 s | 1,700 ms | 3.5 MB |
| Collection | desktop | 69 | 99 | 73 | 100 | 1.9 s | 380 ms | 3.9 MB |

**After — this build**

| Page | Device | Performance | Accessibility | Best practices | SEO | LCP | TBT | CLS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Home | mobile | 100 | 100 | 100 | 100 | 0.8 s | 0 ms | 0 |
| Home | desktop | 100 | 100 | 100 | 100 | 0.3 s | 0 ms | 0 |
| Product (flagship) | mobile | 100 | 100 | 100 | 100 | 1.7 s | 0 ms | 0 |
| Product (flagship) | desktop | 100 | 100 | 100 | 100 | 0.4 s | 0 ms | 0 |
| Directory course | mobile | 100 | 100 | 100 | 100 | 0.8 s | 0 ms | 0 |
| Directory course | desktop | 100 | 100 | 100 | 100 | 0.3 s | 0 ms | 0 |
| Collection | mobile | 100 | 100 | 100 | 100 | 0.8 s | 20 ms | 0 |
| Collection | desktop | 100 | 100 | 100 | 100 | 0.2 s | 0 ms | 0 |
| Industry hub | mobile | 100 | 100 | 100 | 100 | 0.8 s | 0 ms | 0 |
| Industry hub | desktop | 100 | 100 | 100 | 100 | 0.3 s | 0 ms | 0 |
| Course directory A–Z | mobile | 99–100* | 100 | 100 | 100 | 0.9 s | 30–120 ms | 0 |
| Course directory A–Z | desktop | 100 | 100 | 100 | 100 | 0.3 s | 0 ms | 0 |
| SCORM guide | mobile | 100 | 100 | 100 | 100 | 0.8 s | 0 ms | 0 |
| SCORM guide | desktop | 100 | 100 | 100 | 100 | 0.2 s | 0 ms | 0 |
| Policy | mobile | 100 | 100 | 100 | 100 | 0.6 s | 40 ms | 0 |
| Policy | desktop | 100 | 100 | 100 | 100 | 0.2 s | 0 ms | 0 |

\* The A–Z directory lists all ~780 courses on one page. Across six runs it scored 100 four times and 99 twice (run-to-run variance in simulated blocking time).

Typical page weight is **15–25 KB gzipped** (vs. ~3.5 MB), with one 3.7 KB deferred script and no third-party JavaScript.

`npm run verify` currently checks 942 HTML files, 875 JSON-LD graphs and 873 sitemap URLs, with **0 errors and 0 warnings**. It covers internal links, one H1 per page, unique titles, description lengths, canonicals, Markdown twins, breadcrumb targets, and Product offer fields.

## 2. Google Search Console

oshascorm.org has **no Search Console–connected project in Ahrefs**, so query-level GSC data wasn't available here. The existing `google-site-verification` tag is preserved. After cutover:
1. Submit `https://oshascorm.org/sitemap.xml`.
2. Request indexing for the home page, `/collections/all`, `/pages/courses-directory` and `/pages/what-is-scorm`.
3. Watch *Pages → Indexing* for the 65 consolidated duplicate URLs, which should report as "Page with redirect".

What Ahrefs shows the domain ranking for today (all low volume): "oc certification", "boom certification", "racking inspection training courses", "competent person confined space training", "dot/iata certification", "mold certification cost". Every one of those URLs is preserved.

## 3. Keyword targeting (Ahrefs Keywords Explorer, US)

| Keyword | Volume | KD | Target page |
| --- | --- | --- | --- |
| scorm courses / scorm compliant training courses / scorm compliant courses | 200 / 200 / 150 | 40 / – / 12 | Home (H1 + title), `/collections/all` |
| scorm safety training | 30 | – | Home H1 |
| what is scorm / scorm file / scorm package | 1,600 / 1,100 / 350 | 56 / 38 / 39 | `/pages/what-is-scorm` (new guide) |
| scorm 1.2 vs 2004 | 200 | 0 | Guide section + home FAQ |
| xapi vs scorm | 200 | 4 | Guide section |
| scorm compliant lms / what does scorm compliant mean | 400 / 150 | 5 / 6 | Guide sections + home "Works with" strip |
| confined space training | 2,400 | 5 | `/collections/confined-space-trainings` |
| nfpa 70e training / arc flash training | 1,800 / 1,400 | 3 / 0 | `/collections/nfpa-70e-electrical-arc-flash-safety` |
| dot hazmat training | 1,100 | 15 | `/collections/hazmat-training-dot-iata-imdg-transportation`, `/training/dot-hazmat-transportation` |
| hazcom training | 800 | 1 | `/collections/hazard-communication-hazcom-ghs` |
| 40 hour hazwoper / hazwoper training online | 700 / 200 | 12 / 33 | `/collections/hazwoper-training-29-cfr-1910-120`, 40-hour product |
| rcra training | 700 | 0 | `/collections/rcra-hazardous-waste-management` |
| competent person training | 400 | 0 | `/collections/competent-person-training` |
| ergonomics training | 400 | 17 | `/collections/ergonomics-training` |
| mold remediation certification | 350 | 2 | `/collections/mold-inspection-remediation-certification` |
| h2s training | 250 | 1 | `/collections/hydrogen-sulfide-h2s-training` |
| swppp training | 150 | 1 | `/collections/stormwater-planning-for-construction` |
| em 385-1-1 training | 100 | 1 | `/collections/em385-trainings` |
| eldt theory training | 100 | 18 | `/collections/cdl-entry-level-driver-training-eldt` |
| ammonia refrigeration training | 100 | 2 | `/collections/ammonia-refrigeration-training` |
| lithium battery shipping training | 70 | 0 | `/collections/lithium-battery-shipping-training` |
| OSHA training in Spanish | – | – | `/collections/osha-safety-training-in-spanish` (was empty; now lists every bilingual course) |

Each collection page carries the keyword in its title, H1, intro and FAQ, along with the regulation citations and live course count and price. 60 new `/training/{industry}` hubs cover long-tail industry terms, and every course page uses `{course} – SCORM Course for LMS` titles. Ranking still depends on links and time; on-page targeting is complete, but no site can guarantee positions.

## 4. AI / agent discoverability

"ai-agentic.com" is a parked domain for sale, so there's no tool there. The site was checked instead against the criteria used by Cloudflare's [isitagentready.com](https://isitagentready.com/), Search Engine Land's checker and similar scanners.

| Check | Status |
| --- | --- |
| robots.txt with explicit AI-bot rules (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, …) | ✅ |
| Content Signals in robots.txt | ✅ `search=yes, ai-input=yes, ai-train=yes` |
| sitemap.xml with lastmod | ✅ 873 URLs |
| llms.txt + llms-full.txt | ✅ (full catalog with every price) |
| Markdown versions of pages | ✅ `.md` twin for every page + `rel="alternate" type="text/markdown"` |
| Markdown via `Accept:` negotiation / `Link:` headers | ⚠️ Not possible on GitHub Pages (no custom headers); provided as HTML `<link>` tags instead |
| Schema.org structured data | ✅ Organization, WebSite+SearchAction, BreadcrumbList, Product+Course+AggregateOffer, FAQPage, ItemList, HowTo, TechArticle |
| API catalog (RFC 9727) | ✅ `/.well-known/api-catalog` → `/api/catalog.json` + OpenAPI |
| Agent instructions | ✅ `/agents.md` |
| WebMCP tools | ✅ `search_courses`, `get_course_pricing`, `open_checkout` |
| Agentic checkout | ✅ Agents open `/checkout?item={handle}&seats={N}` (listed in the JSON catalog and agents.md); the buyer pays |
| MCP Server Card | — Not published: this site doesn't run its own MCP server |

## 5. Findings worth your attention

1. **Duplicate content (fixed).** 61 courses existed both as `/products/x` and `/pages/courses/x` on the live site. Those directory URLs, plus `/policies/terms-of-service` (identical to `/pages/terms-of-service`), are now redirect stubs pointing at the canonical page.
2. **Shopify removed (2026-11-06 update).** The site no longer depends on, links to or embeds the former Shopify store. The catalog was migrated into `data/`, all images are self-hosted, and the Shopify Inbox chat tags that were embedded in 8 course descriptions (`<shopify-chat>`, `<shopify-store>`) were stripped. `npm run verify` fails the build if "shopify" or a chat widget ever reappears in the output.
3. **Checkout now goes straight to the HAZWOPER-OSHA LMS** (Stripe + `add_new_user` + `add_order`), like hazwoperosha.org. The LMS charges list price × seats, so oshascorm.org now shows LMS list prices (e.g. 40-hr HAZWOPER 49.99/seat) instead of the old discounted tiers. A price guard confirms payment only when the LMS amount equals the page total. The checkout flow was tested end to end with Stripe and the LMS stubbed out; no real orders were placed.
4. **LMS course IDs.** 73 courses have known LMS IDs and take card payment. The other 703 go to an order request (email + invoice) until their LMS IDs are added to `data/lms.json`. The authoritative list is the `lms-ids.json` behind hazwoperosha.org.
5. **Stale course URLs.** Some URLs Ahrefs still has indexed (e.g. `/pages/courses/chemical-agent-oc-spray-safety-and-certification-training`) already return 404 on the live site. On the new site, `404.html` pre-fills a search with the old slug.
