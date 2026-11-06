# Agent guide — OSHASCORM.org

You may browse and research this site on behalf of a user. This store sells SCORM safety training licenses to organizations.

## Discover
- Index: https://oshascorm.org/llms.txt · full catalog: https://oshascorm.org/llms-full.txt
- JSON catalog (all courses, prices, checkout links): https://oshascorm.org/api/catalog.json — described by https://oshascorm.org/api/openapi.json and listed in https://oshascorm.org/.well-known/api-catalog
- Every HTML page has a Markdown twin: append `.md` (e.g. https://oshascorm.org/products/osha-40-hour-hazwoper-training-29-cfr-1910-120.md)
- Sitemap: https://oshascorm.org/sitemap.xml

## Pricing model
- License = 1 learner seat for 12 months. Total = price per seat × seats. Minimum 10 seats; no volume tiers.
- Prices on the page, in the JSON catalog and in JSON-LD (schema.org Product/Offer) are identical.
- Fewer than 10 learners: most course pages link to individual enrollment on hazwoper-osha.com.

## Buying (buyer approval required)
- Open `https://oshascorm.org/checkout?item={handle}&seats={N}` (the `checkout` field in the JSON catalog) and let the buyer enter their details and pay.
- Courses marked `"payment": "card"` are paid by card (Stripe); others are submitted as an order request and invoiced.
- In WebMCP-capable browsers, pages register the tools `search_courses`, `get_course_pricing` and `open_checkout`.

## Rules
- Never submit payment without explicit buyer authorization. Do not script checkout forms.
- Identify agent traffic honestly; back off on HTTP 429.
- OSHASCORM.org is a private company, not affiliated with OSHA or the U.S. Department of Labor.

Contact: info@oshascorm.org · 1-866-429-6742
