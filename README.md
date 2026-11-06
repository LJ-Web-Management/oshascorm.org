# oshascorm.org

Fast, modern static storefront for **OSHASCORM.org**: OSHA-compliant SCORM 1.2 / 2004 safety training packages for corporate LMS platforms. It's built for search engines and AI assistants.

- **Shopify stays the back office.** Products, prices, seat tiers, the 700+ directory courses, collections and policies are still edited in Shopify admin, and checkout still runs on Shopify.
- **This repo is the public website.** A sync script snapshots the catalog into `data/`, and a build script renders `docs/`, which GitHub Pages serves at `https://oshascorm.org`.

```
Shopify admin ──sync──▶ data/*.json ──build──▶ docs/ (GitHub Pages) ──▶ https://oshascorm.org
                                                   │
                       "Buy now" ──────────────────┴──▶ Shopify checkout (shop.oshascorm.org)
```

## Commands

```bash
npm ci
```

```bash
npm run sync      # pull catalog from Shopify → data/ (polite: cached, rate-limited)
```

```bash
npm run build     # data/ + src/ → docs/  (~5 s, deterministic output)
```

```bash
npm run verify    # links, one H1, unique titles, canonicals, sitemap, JSON-LD
```

```bash
npm run serve     # local preview that mimics GitHub Pages → http://localhost:4173
```

`sync --offline` re-parses cached HTML without network; `sync --no-images` skips hero-image processing.

## What's in the box

| Path | Purpose |
| --- | --- |
| `site.config.mjs` | Domains, checkout origins, contact info, analytics IDs (all overridable by env vars) |
| `scripts/sync.mjs` | Shopify `products.json`, collections, product pages, 700+ metaobject course pages, policies, UCP profile, hero images |
| `scripts/build.mjs` | Renders every page + Markdown twin + JSON-LD + AI/SEO files |
| `scripts/lib/` | Layout/components, schema.org builders, pricing + Markdown helpers |
| `src/content/content.mjs` | Hand-written copy: homepage, per-collection SEO copy, SCORM guide |
| `src/assets/` | Design system CSS (inlined at build) and ~6 KB of progressive-enhancement JS |
| `shopify/storefront-redirect.liquid` | Snippet for the Shopify theme after cutover (see below) |
| `.github/workflows/sync-and-deploy.yml` | Daily sync → build → verify → commit |

### URLs (identical to the old Shopify site, so rankings carry over)

`/products/{handle}`, `/collections/{handle}`, `/collections/all`, `/pages/courses/{handle}`, `/pages/courses-directory`, `/pages/faq`, `/pages/contact`, `/pages/return-policy`, `/pages/terms-of-service`, `/policies/*`.

New: `/training/{industry}` (60 industry hubs), `/pages/what-is-scorm` (guide), `/search`, `/cart`.

61 courses existed twice on the old site, as a Shopify product and as a `/pages/courses/…` page. They are now consolidated: the old directory URL is an instant-redirect stub to the product page (canonical), so the two no longer compete. `404.html` also forwards old Shopify patterns (e.g. `/collections/x/products/y`, `/account`).

### Buying

- **Shopify products** (`/products/…`): each seat tier links to a Shopify cart permalink, `https://scorm-online.myshopify.com/cart/{variantId}:1`. The `myshopify.com` domain always forwards to the store's primary domain, so this works before and after the cutover. A small localStorage cart combines several products into one permalink.
- **Directory courses** (`/pages/courses/…`): "Buy now" calls the existing checkout service (`oshascorm-alt-automation-seven.vercel.app`) with the same payload and pricing formula as the old theme. Its CORS policy only allows `https://oshascorm.org`, so test it on the live domain, not on localhost.

### SEO & AI discoverability

- Per-page `<title>`, meta description, canonical, Open Graph and Twitter tags. `npm run verify` enforces one H1 and unique titles.
- One connected JSON-LD `@graph` per page: EducationalOrganization, WebSite with SearchAction, WebPage, BreadcrumbList, Product + Course with AggregateOffer (one Offer per seat tier, with unit price per seat), FAQPage, ItemList, HowTo and TechArticle.
- `sitemap.xml` (with `lastmod`), plus a `robots.txt` that explicitly allows GPTBot, ClaudeBot, PerplexityBot, Google-Extended and other AI crawlers and declares `Content-Signal`.
- `llms.txt`, `llms-full.txt` (every course and price), `agents.md`, and a **Markdown twin of every page** (append `.md`, linked via `rel="alternate"`).
- `/api/catalog.json` and `/api/openapi.json`, listed in `/.well-known/api-catalog` (RFC 9727). `/.well-known/ucp` mirrors Shopify's Universal Commerce Protocol profile, so agentic checkout still works.
- WebMCP: in supporting browsers, pages register `search_courses`, `get_course_pricing` and `open_checkout` tools. Feature-detected, so there's zero cost otherwise.
- Performance: inline CSS, one deferred script, self-hosted Inter (metric-matched fallback, no layout shift), self-hosted WebP hero images, lazy-loaded thumbnails. Lighthouse scores are in [REPORT.md](REPORT.md).

## Cutover runbook (Shopify → GitHub Pages)

Do these in order. Until step 4 the live site is untouched.

1. **Enable Pages.** Go to repo **Settings → Pages → Build and deployment**.
   - Choose *Deploy from a branch*, then pick the branch and the **/docs** folder. Use `main` once this work is merged; until then, use the branch it was pushed to (`claude/cool-lovelace-vy6wii`).
   - Set the custom domain to `oshascorm.org`. (The `docs/CNAME` file already contains it.)
   - The live site doesn't change yet, because DNS still points at Shopify. To review before cutover, run `npm run serve` locally. The `*.github.io/oshascorm.org/` URL redirects to the custom domain, so it can't be used as a preview.
2. **Give Shopify its own subdomain.**
   1. At your DNS host, add a `CNAME` record: `shop` → `shops.myshopify.com`.
   2. In **Shopify admin → Settings → Domains**, connect `shop.oshascorm.org` and **set it as the primary domain**. Checkout, order emails and the Vercel checkout service then use it.
   3. Remove `oshascorm.org` and `www.oshascorm.org` from Shopify's domain list.
3. **Install the storefront hand-off.** Paste [`shopify/storefront-redirect.liquid`](shopify/storefront-redirect.liquid) right after `<head>` in the live theme's `layout/theme.liquid`. The Shopify storefront then stops competing with the static site as duplicate content.
4. **Point the apex domain at GitHub Pages.**
   - `A` records for `@`: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `AAAA` records for `@`: `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`
   - `CNAME` record: `www` → `lj-web-management.github.io`

   Once GitHub issues the certificate, tick **Enforce HTTPS**.
5. **Smoke-test on the live domain.**
   - Buy flow on one `/products/…` page and one `/pages/courses/…` page; stop at the payment step.
   - The contact form.
   - `https://oshascorm.org/llms.txt` and `/sitemap.xml`.
6. **Search engines.**
   - **Google Search Console** (the `google-site-verification` tag is kept): submit `https://oshascorm.org/sitemap.xml`, then use *URL Inspection → Request indexing* for `/`, `/collections/all`, `/pages/courses-directory` and `/pages/what-is-scorm`.
   - **Bing Webmaster Tools**: import from GSC and submit the sitemap. Optionally set a repo variable `INDEXNOW_KEY` (any 32-character hex string) to enable IndexNow pings.
7. **If you use the Shopify Google & YouTube channel (Merchant Center):** product links in the feed will now use `shop.oshascorm.org`. Review Merchant Center's landing-page and domain settings after the switch.

Optional: set repo variable `GA4_ID` to load Google Analytics after the first user interaction, so it never affects Core Web Vitals.

## Editing content

- Prices, courses, collections and policies: edit in **Shopify admin**. The daily workflow picks them up, or you can run it manually from **Actions → Sync catalog & build site → Run workflow**.
- Marketing copy, collection SEO copy and the SCORM guide: edit `src/content/content.mjs`. Push to `main` and the workflow rebuilds `docs/`.
- Design: edit `src/assets/css/site.css`, which uses design tokens defined at the top.

## Limits of static hosting

GitHub Pages can't set custom HTTP headers or do content negotiation. That leaves three gaps:
- Agent-readiness checks for `Link:` response headers and `Accept: text/markdown` negotiation can't pass. The site provides `<link rel="alternate">` tags and `.md` twins instead.
- Cache lifetime is fixed at 10 minutes.
- Old-URL redirects use meta-refresh stubs and `404.html` instead of HTTP 301s.

Putting Cloudflare (free plan) in front of GitHub Pages would close all three if needed.
