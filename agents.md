## Multi‑Agent SEO & AEO System — Agent Catalog

Each agent below includes its purpose, role, and an OSS‑first toolset. Free web validators are listed where useful.

### Agent 1: Crawlability & Indexing Agent
- **Purpose**: Ensure bots can crawl and render key pages (especially PDPs).
- **Role**: Audit and fix `robots.txt`, meta robots, HTTP headers, `sitemap.xml`; verify crawl access across environments.
- **Proposed tools**:
  - OSS: `robotstxt` (npm), `robots-txt-parse` (Python), `sitemap` (npm), `httpx`/`curl`.
  - Free services: Google Search Console URL Inspection API (quota/approval), Bing Webmaster Tools.

### Agent 2: No‑JavaScript Content Audit Agent
- **Purpose**: Confirm important content is present in raw HTML without requiring JS.
- **Role**: Render PDPs with JavaScript disabled; diff DOM vs. hydrated DOM; flag fields loaded via JS (descriptions, price, images, schema).
- **Proposed tools**:
  - OSS: Playwright (MIT) with `javascriptEnabled: false`, Readability.js, `cheerio`/`BeautifulSoup` for HTML diff.
  - Optional: Wappalyzer core (AGPL‑3.0) for tech detection.

### Agent 3: Structured Data (Schema) Agent
- **Purpose**: Generate, inject, and validate JSON‑LD for products, categories, blog, reviews, FAQs.
- **Role**: Produce Product schema with GTIN/SKU/MPN, Brand, Offers, AggregateRating/Review; keep markup in sync with reality; validate.
- **Proposed tools**:
  - OSS: `schema-dts` (TS types), `structured-data-testing-tool` (ISC) CLI/API, `ajv` (JSON Schema), `jsonschema` (Python).
  - Free validators: Schema.org Validator (`https://validator.schema.org/`), Google Rich Results Test (`https://search.google.com/test/rich-results`).

### Agent 4: Product Feed Agent (Perplexity + Merchants)
- **Purpose**: Build/share optimized product feeds for the Perplexity Merchant Program and similar.
- **Role**: Export CSV/JSON/Atom feeds with required/bonus fields; harmonize taxonomy; schedule uploads.
- **Proposed tools**:
  - OSS: `feed` (npm) or `rss` (npm) for XML/RSS; `pandas` (Python) for CSV; `fast-csv` (Node).
  - Platform SDKs: Shopify API (Node/Python), WooCommerce REST API (Node/Python), Magento REST (OpenAPI).
  - Reference: Perplexity Merchant Program overview (see PRD link).

### Agent 5: Content Refinement & Generation Agent
- **Purpose**: Rewrite/expand PDP copy and related content using customer language and intent layers.
- **Role**: Mine reviews/support/search queries; generate variants by need/persona/situation/problem; propose edits and new content pieces.
- **Proposed tools**:
  - OSS LLM stack: Ollama (runner) with models like Llama 3.1, Mistral; LangChain/LangGraph for pipelines; spaCy for NLP; KeyBERT for keywords.
  - Storage/Search: Elasticsearch/OpenSearch for corpus queries.

### Agent 6: Reference Seeding & Community Engagement Agent
- **Purpose**: Discover relevant discussions and reply subtly with value‑first references.
- **Role**: Monitor forums/social; draft compliant replies; queue for human approval or auto‑post with guardrails.
- **Proposed tools**:
  - OSS/Free APIs: PRAW (Reddit), Mastodon.py (Mastodon), Discourse API (`discourse_api`), RSS + `feedparser`.
  - Safety: `profanity-filter`, policy checkers via rule lists.

### Agent 7: LLMs.txt Authoring Agent
- **Purpose**: Generate and maintain `llms.txt` and `llms-full.txt` with crawler and usage directives.
- **Role**: Templatize brand policies; manage per‑crawler rules (GPTBot, PerplexityAI, Gemini); auto‑sync to site root.
- **Proposed tools**:
  - OSS: Jinja2 (Python) or Mustache/Handlebars (Node) for templating; `prettier`/`black` for formatting; CI to deploy.
  - Free helper: Daydream Journal LLMs.txt generator (referenced in PRD).

### Agent 8: Platform Integration & Change Execution Agent
- **Purpose**: Apply approved edits to code/settings via APIs or theme code.
- **Role**: Update Liquid/Theme files (Shopify), templates/plugins (WooCommerce), site CMS content; manage secrets and rollbacks.
- **Proposed tools**:
  - OSS: Git CLI; Shopify Theme Kit or `shopify-theme-sync` alternatives; WP‑CLI (WordPress/WooCommerce); `jq`/`yq` for config edits.
  - SDKs: Shopify (Node/Python), WooCommerce REST (Node/Python).

### Agent 9: Performance, Accessibility & Best‑Practices Agent
- **Purpose**: Enforce CWV, accessibility, SEO technical checks, and budgets.
- **Role**: Run audits on target URLs; gate deployments on thresholds; attach reports to PRs.
- **Proposed tools**:
  - OSS: Lighthouse CI (`@lhci/cli`) (Apache‑2.0), axe‑core (MPL‑2.0), Pa11y (MIT), webhint (MIT).
  - CI: GitHub Actions/GitLab CI templates; self‑hosted LHCI server (OSS).

### Agent 10: PDP Focus Agent
- **Purpose**: Dedicated attention to product pages end‑to‑end.
- **Role**: Ensure above requirements (1–3, 5) are pristine on PDPs: raw HTML content, complete schema, robust images/alt text, internal linking.
- **Proposed tools**:
  - OSS: Playwright, `structured-data-testing-tool`, axe‑core, image optim tools (`sharp`).

### Agent 11: Data Collection & Signals Agent
- **Purpose**: Aggregate reviews, support tickets, on‑site search, analytics for language mining.
- **Role**: Pull and normalize data; anonymize/PII‑strip; expose datasets to Content Agent.
- **Proposed tools**:
  - OSS: Airbyte Community (connectors), Singer Taps, Meltano; dbt Core for transforms; DuckDB/Parquet storage.

### Agent 12: Orchestration & Audit Trail Agent
- **Purpose**: Coordinate workflows, retries, approvals, and logging across agents.
- **Role**: Define DAGs/state machines; enforce manual approval where needed; track provenance and diffs.
- **Proposed tools**:
  - OSS: LangGraph (Apache‑2.0) or Temporal (Apache‑2.0), Prefect OSS, Dagster OSS; OpenTelemetry + Prometheus/Grafana for metrics.

### Agent 13: QA & Rollback Agent
- **Purpose**: Validate changes in staging and production and enable safe rollback.
- **Role**: Run Playwright checks, diff HTML and schema before/after, verify status codes/canonicals; revert on failure.
- **Proposed tools**:
  - OSS: Playwright, `diffhtml`/`diff` libs, `git` for revert, `sentry-cli` alternative self‑host (getsentry/onpremise) optional.

### Agent 14: Compliance & Policy Guardrails Agent
- **Purpose**: Ensure engagement and content comply with platform policies and brand rules.
- **Role**: Check auto‑replies for disclosure/tone; robots/llms.txt for legal intent; maintain suppression lists.
- **Proposed tools**:
  - OSS: Rule‑based filters, OpenPolicyAgent (OPA) for policy as code; unit tests in CI.

### Notes on Platform Coverage
- Shopify: Prefer theme edits via Git + Theme tools; avoid JS‑only schema/apps.
- WooCommerce: Use WP‑CLI and child themes; audit plugin JS injections.
- Custom stacks (React/Vue): Prefer SSR/SSG for PDPs or ensure server‑rendered critical fields.

### CI/CD Integration (recommended)
- Run Agents 1–3, 9–13 on each PR against preview URLs; block merges on failing thresholds.
- Nightly: Agents 2–5 to re‑audit and refresh feeds/content.
- Weekly: Agent 6 to propose/community replies for review.