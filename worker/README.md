# isrl-pixel

A 1x1 tracking pixel for [isrl.in](https://isrl.in). It records **reading** signals only —
what got read, who read it, from where, when — and nothing else. No cookies, no
fingerprinting, no IP storage, no cross-site identifier, no ad tech.

The site ships zero JavaScript and this keeps it that way: the only thing added to the
page is an `<img>` tag rendered by `src/components/Pixel.astro`.

## How it works

```
browser ──<img>──▶ isrl-pixel.arlalithablogs.workers.dev/px.gif?p=/the-post/   (42 byte GIF)
                         │
                         └─▶ one D1 batch: 4 counter upserts, no API token, no cron
```

Every hit is written straight to D1 as a counter increment, so a read is durable the moment
it lands. There is no hot/cold split, no nightly rollup, and nothing to retry or
double count. One pageview costs exactly four row writes, for a reader and a bot alike:
`reads_daily`, `reads_by_hour`, `reads_kinds`, and then either `reads_crawlers` (bots) or
`reads_env` (people). That puts the ceiling around 25k pageviews a day against D1's free
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

## Hostname

The Worker answers on its `workers.dev` hostname:

```
https://isrl-pixel.arlalithablogs.workers.dev/px.gif
```

That is what `Pixel.astro` points at, and it is the whole setup. There is no DNS work.

The obvious upgrade is `px.isrl.in`, and it is worth knowing why it is not simply a
CNAME. `isrl.in` is on GitHub Pages with DNS at Zoho, and a Worker custom domain must
sit inside a Cloudflare zone in the same account as the Worker. So:

- **Pages** allows an external CNAME for a subdomain explicitly, which is why
  `askbox.isrl.in CNAME askbox-eyx.pages.dev` works from Zoho.
- **Workers** does not. The docs are blunt: a custom domain cannot be created "on a
  hostname with an existing CNAME DNS record or on a zone you do not own."
- Delegating `px.isrl.in` as its own zone is **Enterprise-only**, and keeping the apex
  elsewhere while proxying one subdomain is **Business+**. Neither is on a free plan.

Two ways to get `px.isrl.in` later, in order of effort:

1. **Move the apex `isrl.in` to Cloudflare** (free). Change the nameservers at Zoho,
   import the existing records, then add a `routes` entry with `"custom_domain": true`
   and deploy. Nothing else in the repo changes.
2. Keep the `workers.dev` hostname. It works indefinitely and costs nothing.

`Pixel.astro` takes the endpoint as a prop, so it can be overridden per-clone:

```astro
<Pixel endpoint="https://px.isrl.in/px.gif" />
```

## Secrets

None. The pixel endpoint is deliberately unauthenticated, so there is no key to leak and
no key to rotate. It is not an account: there is no cookie, no identifier, and no
cross-site state, so a hit from someone else is just an anonymous count of one.

`wrangler.jsonc` contains only resource **identifiers** (the D1 database id), which are
not credentials and are fine in a public repo. Nothing here needs a GitHub secret unless
you later add a CI deploy workflow — in that case put the token in a repository secret
called `CLOUDFLARE_API_TOKEN`, never a variable or a file.

## Reading the data

Two ways in, both read-only and both local to your machine. The SQL lives in
`queries.js` and is shared by both, so a preset means the same thing in each.

### Dashboard

```bash
npm run dash        # http://127.0.0.1:8787
```

Opens a local analytics view with the shape you would expect from a hosted tool: headline
totals, a reads-over-time chart, and per-dimension tables for pages, referrers, countries,
devices, operating systems, browsers, regions, hour of day, AI agents, AI referrers, and all
automated traffic. Ranges are 7 / 14 / 30 / 90 days or all time.

It binds to `127.0.0.1` only, so nothing on your network can reach it. It holds no data:
every request is answered by querying D1 live. Nothing is cached to disk, so there is no
local copy of your readership to protect or accidentally commit.

The chart library is **vendored** into `public/vendor/`, not loaded from a CDN. That is
deliberate: a third-party script executes with this page's origin, so it could call
`/api/overview`, read your entire readership record, and post it anywhere — which would
defeat the point of keeping the dashboard local. The page is also served with
`content-security-policy: default-src 'self'`, so no injected or swapped asset can do that
either. If the library ever fails to load, every number is still present in the tables.

It lives in `worker/`, **not** in `src/pages/`. Anything in `src/pages/` gets built into
`dist/` and published to the open web, which would put your readership data on the internet.

### Terminal

```bash
node read.mjs summary      # humans, ai, bots, total, days, avg/day
node read.mjs pages        # per page
node read.mjs uniques      # approximate unique readers, per day
node read.mjs refs         # referrers
node read.mjs countries    # edge geo
node read.mjs devices      # desktop / mobile / tablet
node read.mjs os           # operating systems
node read.mjs browsers     # browsers
node read.mjs regions      # region, when the plan reports it
node read.mjs hours        # UTC hour of day
node read.mjs kinds        # human / ai / ai-user / search / social / seo / tool / other
node read.mjs daily        # per day
node read.mjs ai_agents    # AI agents, by fetches
node read.mjs ai_refs      # which surfaces sent AI traffic
node read.mjs ai_pages     # which pages AI agents read
node read.mjs crawlers     # every automated agent
node read.mjs split        # page x referrer x country
```

Add a day count to limit any preset to a recent range, or pass SQL directly:

```bash
node read.mjs pages 30
node read.mjs "SELECT page, sum(humans) FROM reads_daily GROUP BY page ORDER BY 2 DESC"
```

`read.mjs` accepts `SELECT`/`WITH` only, so it cannot be used to alter the data.

### Credentials for reading

None required. Both tools reuse the `npx wrangler login` session that deploys the Worker.
The stored OAuth access token can go stale, because wrangler refreshes its own copy in
memory and does not rewrite the file — so `d1.mjs` falls back automatically to shelling out
to `wrangler d1 execute`, which refreshes for itself. If you ever see an authentication
error, run `npx wrangler login`.

To use a dedicated token instead, set `D1_API_TOKEN` in `.dev.vars` (gitignored): token type
"API Token", permission read-only on D1, scoped to this account. That survives OAuth expiry,
and a leak would be limited to this one analytics database.

### A note on "unique" readers

There is no true unique-visitor count, and adding one would mean storing a cookie, an IP, or
a fingerprint — all of which this design deliberately refuses. The `uniques` query instead
counts distinct client combinations (country x OS x browser x region) per day. Treat it as
a shape, not a headcount: it under-counts one person reading on two devices, and over-counts
two people on identical setups.

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

Detection is a heuristic and always will be. A scraper spoofing a complete Chrome user agent is
indistinguishable from a person without bot signals. Treat the human/bot line as approximate.

Known agent signatures are matched **before** Cloudflare's verified-bot flag, which is only a
fallback. The order matters: the flag is also true for GPTBot, ClaudeBot and Googlebot, so
checking it first would quietly file every AI and search crawler under `other` and destroy the
breakdowns this exists to produce. The flag is only consulted for traffic that matches no
known signature.

## Abuse and quota

The pixel is unauthenticated by design, so anyone can request it. An isolated hit is harmless
— it just counts as one read — but the endpoint has no rate limit of its own, and each request
costs four D1 writes. Roughly 25k requests would exhaust the free 100k rows-written/day
allowance, at which point *legitimate* reads stop recording and the analytics quietly go
blank. That is the real failure mode here: not a leaked secret, but lost data.

For a personal blog, natural traffic is orders of magnitude below that. If you want a hard
floor anyway, add a rate-limit rule in the Cloudflare dashboard:

**Security → WAF → Rate limiting rules**, matching host `isrl-pixel.arlalithablogs.workers.dev`,
path `/px.gif`, e.g. 60 requests/minute per IP. Bot crawlers fetch in bursts, so pick a limit
generous enough not to throw away the AI traffic the whole thing is for.

## Privacy

Nothing identifying is stored. No IP (only the country and region Cloudflare derives from
it), no user agent string (only the parsed `device` / `os` / `browser`), no referrer path
(cross-origin referrers arrive as origin-only per the default
`strict-origin-when-cross-origin` policy, and that is left alone deliberately).

`region` is a column with a Business-plan caveat: `request.cf.region` has historically
been gated behind a higher tier, so on a free account it will be an empty string and the
`regions` preset returns nothing. `country` works on every plan. The column is wired up
regardless, so it starts reporting if the account is ever upgraded.
