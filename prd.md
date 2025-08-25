# Product Requirements: Multi-Agent SEO & AEO Optimization System

## Purpose and Scope

This document specifies a multi-agent system that can enhance the Search Engine Optimization readiness and Answer Engine Optimization readiness of any ecommerce website.

The system will have access to either the source code of that website or API credentials for the platform used to build the website (like shopify, woocommerce etc) and will be able to edit the code / settings. To edit the settings the system will be able to use APIs of the respective platforms.

The system should sequentially check for the following and fix it. The team may choose to create a digital marketing expert agent to add on to this list / review this list. The team may choose to design a separate agent (or multi agents) for each.

### Terminology

- **Developer (the team)**: owns the site and configures/operates the system
- **System**: the multi-agent product described in this document
- **Agent**: an autonomous component created and orchestrated by the system

See [agent-architecture.md](agent-architecture.md) for Agent Design and Orchestration and the Architecture Overview.

## Functional Requirements

### 1. Make PDPs Crawlable and Renderable

The system should check the `robots.txt` file and see if bots/crawlers are allowed. If not, the system should make edits to allow them.

### 2. Don't Serve Important Content Using JavaScript

Right now, bots from the likes of ChatGPT and Perplexity do not appear to process JavaScript (although Google’s Gemini can). If site content is being loaded dynamically, they’re likely missing it completely.

That includes:

- Product descriptions
- Pricing
- Images
- Schema markup

If it's not in the raw HTML, LLMs like these can't see it. And if they can't see it, you won't show up in AI-generated product recommendations.

To ensure crawling issues are avoided, first understand how the ecommerce platform handles JavaScript. Every platform is different:

- **Shopify**: Generally fine, but watch out for third-party apps injecting schema or content via JS.
- **WooCommerce**: Depends heavily on the site's theme. Many use plugins that load parts of the page with JS.
- **Custom stacks**: If you're using React, Vue, or similar frameworks, check whether product pages render server-side or after load.

System agents can check PDPs manually. This can be done by using browser developer tools by right-clicking and selecting "Inspect" in the browser.

Using the tools, an agent can, in the Command Menu, start typing "javascript" and then select "Disable JavaScript" and then reload the page. That is how LLMs would see the page while searching.

This will help to create a plan on how to edit the code / settings.

### 3. Add Structured Schema Markup


Structured data — specifically Schema.org markup in JSON-LD format — helps systems like ChatGPT, Perplexity, and Google understand what the product is, how much it costs, whether it’s in stock, and more.

For LLM visibility, schema helps the AI tools understand key details about the products. Which makes it easier for them to pull in the products when they’re making recommendations for users.

While the agents should do this for all types of pages like category pages, blogs, reviews, FAQs, special focus should be on the product page; if needed there could be a dedicated agent for it.

Here are the fields to include for the product page:

- `@type`: Product
- GTIN, SKU, MPN
- Brand
- Description
- Offer block (price, currency, availability, URL)
- Review/rating info if available

Use the schema to reflect reality, not just fill fields. But also add as much context as you can.

**Schema Validation Tools:**
- [Google Rich Results Test](https://search.google.com/test/rich-results)
- [Schema.org Validator](https://validator.schema.org/)

### 4. Create Product Feeds for Perplexity

Perplexity has launched a Merchant Program accepting feed uploads, called the Perplexity Merchant Program. This lets ecommerce sellers have even more control over how their products can appear in AI responses.

The system should support sharing these feeds.

**Reference**: [Shop Like a Pro - Perplexity Blog](https://www.perplexity.ai/hub/blog/shop-like-a-pro)

To optimize product feeds for AI, start with the essentials:

- Product title
- Description
- Price
- Availability
- Product URL
- GTIN or MPN + Brand
- Image URL

After you've added the basics, layer in high-value fields like:

- Category or taxonomy
- Color, material, and size variants
- Shipping cost and speed
- Review count and star rating
- Custom labels for campaigns or segmentation

Use the same language customers use.

This means writing product information the way customers actually talk and search, not how internal teams or suppliers describe things. For example:

**Instead of:**
> "Athletic footwear with moisture-wicking synthetic upper"

**Write:**
> "Running shoes that keep your feet dry"

#### How do you find out how they talk?

Look at customer reviews, support tickets, and search queries that already drive traffic to the store.

For example, they might search for "cozy sweater" not "knitted pullover." This can inform your title and description choices.

### 5. Refine Website/Listing Content & Generate New Content

As people become more savvy with how AI tools work, more and more shoppers are going beyond just typing in “best bed sheets.” They’re asking:

**Medium-length prompts:**
- "Best cooling sheets for hot sleepers"
- "Softest bed sheets under $100"
- "What kind of sheets stay on the bed all night?"

**Longer, context-rich prompts:**
- "I'm a side sleeper who gets hot at night. What bed sheets will stay cool and not cling to my skin?"
- "Looking for breathable, hypoallergenic sheets that work well in humid climates"
- "I have sensitive skin and eczema. What's a good sheet material that won't irritate me?"

The goal is to build context around products that lines up with this kind of language and framing.

#### Think in layers:

- **By need**: cooling, breathable, wrinkle-resistant, organic
- **By persona**: hot sleeper, allergy sufferer, luxury buyer, college student
- **By situation**: new apartment, guest bedroom, summer refresh, wedding registry
- **By problem**: sheets come loose, feel scratchy, trap heat, shrink in the wash

This is how you start to think of items like answers and solutions, not just products.

Let this prompt structure inform:

- Product page copy and comparison points
- Blog posts and videos
- Social media posts
- FAQs and Help Center content
- Category names and filters
- Product feed descriptions and attributes

LLMs can pull from all of it — so make sure the team is using the kind of language real customers use everywhere.


### 6. Seeding References

AI agents should search online posts / discussion threads relevant to the product and auto reply.

The reference to product must be subtly built and it should not look like a marketing push.

### 7. Creating llms.txt

A typical `llms.txt` file looks like this:

```
# llms.txt for https://yourdomain.com

User-agent: GPTBot
Allow: /blog/
Allow: /docs/
Disallow: /user-data/
Disallow: /internal/

User-agent: PerplexityAI
Allow: /
Crawl-delay: 5
Attribution: required
Preferred-URL: https://yourdomain.com/

User-agent: Gemini
Allow: /knowledge-base/
Disallow: /staging/

# Policies
Training: disallow
Summarization: allow
Embeddings: allow
Attribution: must
```

#### Important Directives

- **User-agent** → Name of the crawler (GPTBot, PerplexityAI, ClaudeBot, Gemini).
- **Allow / Disallow** → Which sections of the site the crawler can use.
- **Crawl-delay** → How frequently they can hit the site.
- **Preferred-URL** → Canonical source to cite.
- **Attribution** → State that answer engines must credit the brand.
- **Training / Summarization / Embeddings** → Clarify what uses are OK.

#### Answer Engine Optimization (AEO) Strategy

##### For ChatGPT / GPTBot

- Explicitly allow blog/docs/case studies.
- Disallow internal, staging, or user-generated pages.
- Add preferred brand description in comments for consistency.

##### For Perplexity

Since it's citation-first, make sure you:

- Mark `attribution: required`
- Add preferred URL so it links to the site's canonical pages

##### For Gemini (Google)

- Gemini heavily integrates with Google Search.
- Ensure structured data + schema on the site.
- Use `llms.txt` to restrict training but allow summarization.

##### Implementation Notes

For most complex sites, use both:

- **llms.txt** — manageable overview for AI navigation.
- **llms-full.txt** — deep content ready for detailed consumption.

Automate the build processes to keep both files in sync, so they always reflect the latest site structure and content.

**Tools:**
- LLMs.txt Generator: daydream journal

Ensure both are accessible from the site's root (`/`), with proper MIME types and a link to `llms-full.txt` in `llms.txt`.