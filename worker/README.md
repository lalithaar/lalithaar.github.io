# isrl-pixel

A 1x1 tracking pixel for [isrl.in](https://isrl.in). It records **reading** signals only —
what got read, who read it, from where, when — and nothing else. No cookies, no
fingerprinting, no IP storage, no cross-site identifier, no ad tech.

The site ships zero JavaScript and this keeps it that way: the only thing added to the
page is an `<img>` tag rendered by `src/components/Pixel.astro`.

## How it works

```
browser ──<img>──▶ px.isrl.in/px.gif?p=/the-post/   (Cloudflare Worker, 42 byte GIF reply)
                         │
                         └─▶ one D1 batch: 4 counter upserts, no API token, no cron
```

Every hit is written straight to D1 as a counter increment, so a read is durable the moment
it lands. There is no hot/cold split, no nightly rollup, and nothing to retry or
double count. One pageview costs one row write per populated table — four for a reader,
three for a bot — which puts the ceiling around 25k pageviews a day against D1's free
100k rows written/day. For a personal blog that is a lot of headroom.

`HEAD` is answered with headers only and is never recorded; link checkers and prefetchers
are not readers.

## Setup

**1. Install and create the database**

```bash
cd worker
npm install
npx wrangler d1 create isrl-reads
```

Paste the returned `database_id` into `wrangler.jsonc`, then:

```bash
npx wrangler d1 migrations apply isrl-reads --remote
npx wrangler deploy
```

**2. Point `px.isrl.in` at the Worker.**

`isrl.in` is served from GitHub Pages and its DNS is on Zoho, so the pixel lives on its
own Cloudflare zone delegated from the parent — the same trick `askbox.isrl.in` already
uses (`askbox` is a Cloudflare Pages project with its own NS records inside a Zoho zone).

1. Add a `px.isrl.in` zone in the **same Cloudflare account as this Worker** and note the
   two nameservers Cloudflare assigns it.
2. At your Zoho DNS host, delegate `px.isrl.in` with those two nameservers.
3. Wait for the zone to go active, then `npx wrangler deploy`. The `routes` entry in
   `wrangler.jsonc` claims `px.isrl.in` as a Worker custom domain and the cert is issued
   automatically.

Nothing about the apex zone changes. If you would rather not do this, set
`"workers_dev": true` and drop the `routes` block — the Worker will answer on a
`*.workers.dev` hostname instead, and you can flip back later.

## Secrets

None. The pixel endpoint is deliberately unauthenticated, so there is no key to leak and
no key to rotate. It is not an account: there is no cookie, no identifier, and no
cross-site state, so a hit from someone else is just an anonymous count of one.

`wrangler.jsonc` contains only resource **identifiers** (the D1 database id), which are
not credentials and are fine in a public repo. Nothing here needs a GitHub secret unless
you later add a CI deploy workflow — in that case put the token in a repository secret
called `CLOUDFLARE_API_TOKEN`, never a variable or a file.

## Reading the data

`read.mjs` queries D1 over the REST API using the same `wrangler login` that deploys, so
there is no second token to manage.

```bash
node read.mjs summary      # humans, bots, total, days
node read.mjs top          # per page
node read.mjs refs         # referrers
node read.mjs countries    # edge geo
node read.mjs devices      # desktop / mobile / bot
node read.mjs os           # operating systems
node read.mjs browsers     # browsers
node read.mjs env          # country x os x browser
node read.mjs regions      # region, when the plan reports it
node read.mjs kinds        # human / ai / ai-user / search / social / seo / tool / other
node read.mjs daily        # per day
node read.mjs hours        # UTC hour of day
node read.mjs bots         # every crawler, by agent
node read.mjs ai           # AI fetches with page and referrer
node read.mjs ai_pages     # which pages AI agents read
node read.mjs ai_refs      # which surfaces sent AI traffic
node read.mjs split        # page x referrer x country
```

Anything else, pass SQL directly:

```bash
node read.mjs "SELECT page, sum(humans) FROM reads_daily GROUP BY page ORDER BY 2 DESC"
```

## Schema

| table | key | holds |
| --- | --- | --- |
| `reads_daily` | day, page, ref, country, device | `humans`, `bots` |
| `reads_by_hour` | day, hour | `humans`, `bots` |
| `reads_kinds` | day, kind | `reads` |
| `reads_crawlers` | day, kind, bot, page, ref | `reads` |
| `reads_env` | day, country, os, browser, region | `humans` |

`ref` and `country` are part of the crawler and env keys rather than plain columns on
purpose. Two AI fetches of the same page can arrive from different referrers, and
`ai-user` traffic is exactly where the referrer carries the most signal — without it in
the key the first referrer to land would stick and the rest would be miscounted.

## Human, AI, and bot

A read is classified into one `kind` at request time:

| kind | what it is |
| --- | --- |
| `human` | a real browser, proven by Fetch Metadata |
| `ai` | a model fetching to train or answer, e.g. GPTBot, ClaudeBot, PerplexityBot |
| `ai-user` | an agent acting for a person, e.g. ChatGPT-User, Claude-User |
| `search` | Googlebot, Bingbot, DuckDuckBot |
| `social` | Twitterbot, facebookexternalhit, LinkedInBot |
| `seo` | SEO crawlers like AhrefsBot and SemrushBot |
| `tool` | link checkers and fetch APIs like curl and UptimeRobot |
| `other` | everything unrecognised |

`ai` and `ai-user` are kept apart because they mean different things. An `ai` fetch is a
crawler costing you bandwidth. An `ai-user` fetch is a person who asked something and was
shown your page, and it usually arrives carrying a real referrer like `chatgpt.com`. The
edit is one list in `src/parse.js` if you want to move an agent between categories.

Detection is a heuristic and always will be. Cloudflare's verified-bot data is used when
the account has Bot Management, and a scraper spoofing a complete Chrome user agent is
indistinguishable from a person without it. Treat the human/bot line as approximate.

## Privacy

Nothing identifying is stored. No IP (only the country and region Cloudflare derives from
it), no user agent string (only the parsed `device` / `os` / `browser`), no referrer path
(cross-origin referrers arrive as origin-only per the default
`strict-origin-when-cross-origin` policy, and that is left alone deliberately).

`region` is a column with a Business-plan caveat: `request.cf.region` has historically
been gated behind a higher tier, so on a free account it will be an empty string and the
`regions` preset returns nothing. `country` works on every plan. The column is wired up
regardless, so it starts reporting if the account is ever upgraded.
