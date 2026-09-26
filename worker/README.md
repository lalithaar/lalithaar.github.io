# isrl-pixel

A 1x1 tracking pixel for [isrl.in](https://isrl.in). It records **reading** signals only —
what got read, who read it, from where, when — and nothing else. No cookies, no
fingerprinting, no IP storage, no cross-site identifier, no ad tech.

The site ships zero JavaScript and this keeps it that way: the only thing added to the
page is an `<img>` tag rendered by `src/components/Pixel.astro`.

## How it works

```
browser ──<img>──▶ px.isrl.in/px.gif?p=/the-post/     (Cloudflare Worker, ~42 byte reply)
                        │
                        ├─▶ Analytics Engine   hot, full fidelity, 90 day retention
                        │
                        └─▶ cron 03:17 UTC ─▶ D1   cold, permanent, small
```

Analytics Engine is the source of truth while data is fresh. A daily cron folds each
finished UTC day into D1 so the long-term history outlives the 90 day window. Both tiers
cost nothing at this site's traffic: Analytics Engine includes 100k writes/day on the free
plan and is not currently billed at all, and D1 is a few hundred rows a year.

## Setup

```bash
cd worker
npm install
```

**1. Create the D1 database and paste the id into `wrangler.jsonc`:**

```bash
npx wrangler d1 create isrl-reads
npx wrangler d1 migrations apply isrl-reads --remote
```

**2. Create a read-only API token** at
[dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens)
→ Create Custom Token → permission **Account | Account Analytics | Read**. The cron needs
it to read Analytics Engine back out. Store it as a secret, never in the repo:

```bash
npx wrangler secret put CF_API_TOKEN
```

**3. Set your account id** in `wrangler.jsonc` under `vars.CF_ACCOUNT_ID`.

**4. Deploy.** `routes[].custom_domain` makes wrangler create the `px.isrl.in` DNS
record and TLS certificate for you, so there is no separate DNS step:

```bash
npm run deploy
```

`isrl.in` itself stays on GitHub Pages — the pixel is a fully independent Worker.

## Reading the data

Live data, 90 days, full fidelity. Needs `CF_ACCOUNT_ID` and `CF_API_TOKEN` in your shell:

```bash
node read.mjs top         # most-read pages (humans only)
node read.mjs refs        # where readers came from
node read.mjs countries   # reader geography
node read.mjs devices     # mobile / desktop / tablet
node read.mjs os
node read.mjs browsers
node read.mjs hours       # hour-of-day histogram, UTC
node read.mjs daily       # humans vs bots vs ai per day
node read.mjs kinds       # human / ai / ai-user / search / social / seo / tool
node read.mjs bots        # every crawler, bucketed
node read.mjs ai_agents   # which AI, how many fetches, how many pages
node read.mjs ai          # AI fetches by agent x page x referrer x country
node read.mjs ai_pages    # which posts AI agents keep fetching
node read.mjs regions     # sub-country region (Business plan and up only)
node read.mjs split       # page x referrer x country
```

Any other input is treated as raw SQL. Human-only reads are `WHERE double1 = 0`,
AI reads are `WHERE double2 = 1`.

Permanent history lives in D1, reachable without any token:

```bash
npx wrangler d1 execute isrl-reads --remote --command \
  "SELECT page, sum(humans) h, sum(bots) b FROM reads_daily GROUP BY page ORDER BY h DESC"

npx wrangler d1 execute isrl-reads --remote --command \
  "SELECT kind, bot, sum(reads) n FROM reads_crawlers WHERE kind IN ('ai','ai-user') GROUP BY kind, bot ORDER BY n DESC"

npx wrangler d1 execute isrl-reads --remote --command \
  "SELECT hour, sum(humans) h FROM reads_by_hour GROUP BY hour ORDER BY hour"
```

If a cron run is missed, backfill a day by hand — the rollup replaces rather than
accumulates, so re-running the same day is safe:

```bash
curl "https://px.isrl.in/?rollup=2026-09-25"
```

## Schema

### Analytics Engine — dataset `isrl_reads`

| Column | Dimension | Values |
| --- | --- | --- |
| `blob1` | page | pathname from `?p=`, or `?` if absent/malformed |
| `blob2` | ref | referrer host, or `direct` / `self` / `unparsed` |
| `blob3` | country | ISO-3166 alpha-2 from `request.cf.country`, else `??` |
| `blob4` | region | `request.cf.region` — **empty on the free plan** |
| `blob5` | device | `mobile` / `desktop` / `tablet` / `bot` / `other` |
| `blob6` | os | `android` / `ios` / `windows` / `macos` / `linux` / `chromeos` / `bot` / `other` |
| `blob7` | browser | `chrome` / `safari` / `firefox` / `edge` / `opera` / `bot` / `other` |
| `blob8` | kind | `human` / `ai` / `ai-user` / `search` / `social` / `seo` / `tool` / `other` |
| `blob9` | bot | matched agent token, or `''` for humans |
| `double1` | is_bot | 1 or 0 |
| `double2` | is_ai | 1 or 0 — true for both `ai` and `ai-user` |

Human counts must be `sumIf(_sample_interval, ...)` or `count()`, never bare `count(*)`,
so the numbers stay correct if Analytics Engine ever samples.

### D1

| Table | Grain | Holds |
| --- | --- | --- |
| `reads_daily` | day x page x ref x country x device | `humans`, `bots` |
| `reads_by_hour` | day x hour | `humans`, `bots` |
| `reads_crawlers` | day x kind x bot x page | `reads` — permanent per-agent history |

`os`, `browser` and `region` deliberately stay in Analytics Engine only. Keeping them out
of the permanent tables keeps row counts tiny and the cross-tabs that use them are short-
lived questions anyway.

## What counts as a human read

`classify()` in `src/parse.js` marks a hit non-human if any of these hold:

1. `request.cf.botManagement.verifiedBot` — authoritative, but only if the zone has Bot
   Management (a paid add-on).
2. The user-agent matches a known agent in the taxonomy — `ai`, `ai-user`, `search`,
   `social`, `seo` or `tool`.
3. The user-agent is empty.
4. The user-agent contains `bot`/`crawler`/`spider` **and** has no browser signature. The
   second half matters: it stops the CUBOT phone brand from being read as a bot.
5. The user-agent has no browser signature at all (`Mozilla/5.0`, `Gecko/`, `Trident/`).
6. The user-agent looks like a browser but the request carries no Fetch Metadata
   (`Sec-Fetch-*`, `Sec-CH-UA`). Every current browser sends these when it loads an image;
   a scraper replaying a copied Chrome string does not. Reported as `no-fetch-metadata` so
   you can audit it rather than having to trust it.

`ai` vs `ai-user`: `ai` is an agent acting on its own initiative (GPTBot, ClaudeBot,
PerplexityBot, CCBot, Google-Extended, Bytespider…). `ai-user` is an agent fetching because
a person asked it to (ChatGPT-User, Claude-User, Perplexity-User, MistralAI-User). The
latter is the closer thing to a human read, and they usually arrive with a real referrer
such as `chatgpt.com`, so `ref` tells you which one.

**Known limit:** a scraper that sends a complete Chrome user-agent *and* plausible Fetch
Metadata headers is indistinguishable at this layer. That is what Bot Management is for.

## Privacy

The IP address is never read, logged, or stored. Cloudflare resolves it to
`request.cf.country` before the Worker runs and discards it. There is no cookie, no
`localStorage`, and nothing that can follow a reader between sites. The pixel request
crosses origins, so the browser applies the default `strict-origin-when-cross-origin`
policy and sends only the referrer *origin*, never the full path — the exact page comes
from `?p=` instead.

To stop counting a page, delete the `<Pixel />` line from
`src/layouts/Layout.astro` and `src/layouts/LayoutMath.astro`. Nothing else to unwind.
