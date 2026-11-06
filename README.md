# oshascorm.org

Fast, modern static website for **OSHASCORM.org**: OSHA-compliant SCORM 1.2 / 2004 safety training packages for corporate LMS platforms. It's built for search engines and AI assistants and hosted on GitHub Pages.

**It has no Shopify dependency.** The catalog lives in this repo, images are self-hosted, and orders go straight to the **HAZWOPER-OSHA LMS**, the same way hazwoperosha.org and datacentertraining.us do.

```
data/*.json + src/ ──npm run build──▶ docs/ (GitHub Pages) ──▶ https://oshascorm.org
                                         │
             /checkout ──Stripe.js──▶ card token
                       ──POST──▶ hazwoper-osha.com/api/add_new_user
                       ──POST──▶ hazwoper-osha.com/api/add_order   (LMS computes amount: price × seats)
                       ──Stripe──▶ confirmCardPayment               (only if amount == total shown)
```

## Commands

```bash
npm ci
```

```bash
npm run build          # data/ + src/ → docs/ (production, oshascorm.org)
```

```bash
npm run verify         # links, one H1, titles, canonicals, JSON-LD, "no Shopify / no chat" guard
```

```bash
npm run build:preview  # same site under /oshascorm.org/preview/ → ./preview (GitHub Pages preview)
```

```bash
npm run serve          # local preview of docs/ at http://localhost:4173
```

## Where things live

| Path | What it is |
| --- | --- |
| `data/products.json`, `data/courses.json` | The catalog: 776 courses, with content, durations, citations and languages |
| `data/lms.json` | **Price per seat and LMS course id for every course** (edit this to change prices or enable card checkout) |
| `data/collections.json`, `pages.json`, `policies.json` | Training series, FAQ, contact text, policies |
| `data/img/` | Self-hosted WebP images (product heroes, covers, brand/OG images) |
| `site.config.mjs` | Domain, LMS API, Stripe publishable key, seat presets, contact info |
| `src/content/content.mjs` | Hand-written copy: homepage, collection SEO copy, SCORM guide |
| `src/assets/js/checkout.js` | The LMS checkout (Stripe + add_new_user + add_order) |
| `scripts/build.mjs` | Renders every page, Markdown twin, JSON-LD and AI/SEO file |

## Checkout and pricing

- **Every seat costs the course's LMS list price**, and total = price × seats (minimum 10). There are no volume tiers, because the LMS charges list price × quantity. Prices came from the HAZWOPER-OSHA master course catalog and the sister sites' LMS configs.
- **Card checkout** happens when every course in the order has an `lmsId` in `data/lms.json`. That's 73 courses today, including the 40-hour and 24-hour HAZWOPER flagships.
  - The payload is identical to the sister sites, with `order_from: "oshascorm.org"`.
  - **Price guard:** before confirming payment, the page reads the PaymentIntent the LMS created and charges only if the amount equals the total shown. If the LMS asks for more, the card is **not** charged and the buyer is asked to call.
- **Order request:** for courses without an `lmsId` (and mixed carts), checkout composes an email with the full order to `info@oshascorm.org`, which the team invoices. That's the same fallback the sister sites use for bundles.
- **To enable card checkout for more courses,** add each course's LMS id to `data/lms.json` (`"lmsId": 123`), make sure `price` matches the LMS list price, then run `npm run build`.

## Preview on GitHub Pages (before go-live)

GitHub Pages currently serves this branch's root, so:
- `index.html` forwards `https://lj-web-management.github.io/oshascorm.org/` to `/oshascorm.org/preview/`.
- `preview/` holds the full site built with `npm run build:preview`. It's marked `noindex`, so it never competes with the real domain in search.
- Root `404.html` and `.nojekyll` make deep links and Markdown files work.

Card checkout, order requests, search, cart and filters all work on the preview link; the LMS API allows any origin. After changing templates or data, run `npm run build:preview` and copy `preview/404.html` to `404.html` before committing.

## Go-live (oshascorm.org → GitHub Pages)

1. **Merge to `main`, then point Pages at the production build.** In **Settings → Pages**, choose *Deploy from a branch*, then **main** and **/docs**, and set the custom domain to `oshascorm.org`.
2. **Move DNS from Shopify to GitHub Pages.**
   - `A` records for `@`: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `AAAA` records for `@`: `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`
   - `CNAME` record: `www` → `lj-web-management.github.io`

   Once the certificate is issued, tick **Enforce HTTPS**.
3. **Smoke-test.**
   - A card purchase on one LMS-enabled course.
   - An order request on one other course.
   - The contact form, `/llms.txt` and `/sitemap.xml`.
4. **Search engines.**
   - **Google Search Console:** the verification tag is kept. Submit `https://oshascorm.org/sitemap.xml` and request indexing for the home page, `/collections/all`, `/pages/courses-directory` and `/pages/what-is-scorm`.
   - **Bing Webmaster Tools:** import from GSC. Optionally set an `INDEXNOW_KEY` repo variable.
5. Once live, you can delete `preview/`, the root `index.html` and the root `404.html` from `main`.

All existing URLs (`/products/…`, `/collections/…`, `/pages/courses/…`, `/pages/…`, `/policies/…`) are preserved, so rankings carry over. 68 duplicate or legacy URLs are consolidated with redirect stubs.

## SEO & AI discoverability

- Unique title, description and canonical on every page, plus Open Graph tags.
- A JSON-LD `@graph` on every page: EducationalOrganization, WebSite with SearchAction, BreadcrumbList, Product + Course with an Offer per seat, FAQPage, ItemList, HowTo, TechArticle and AboutPage.
- `sitemap.xml`, plus a `robots.txt` that welcomes GPTBot, ClaudeBot, PerplexityBot, Google-Extended and others, with `Content-Signal`.
- `llms.txt`, `llms-full.txt`, `agents.md`, and a **Markdown twin of every page** (append `.md`).
- `/api/catalog.json` with an OpenAPI description and an RFC 9727 `/.well-known/api-catalog`.
- WebMCP tools (`search_courses`, `get_course_pricing`, `open_checkout`) for AI browser agents.
- No chat widgets and no third-party scripts on public pages. Stripe.js loads only on `/checkout`.

## Limits of static hosting

GitHub Pages can't set HTTP headers or do content negotiation, so redirects use meta-refresh stubs and Markdown is offered via `rel="alternate"` links. The contact form opens the visitor's email app, since there's no form backend.
