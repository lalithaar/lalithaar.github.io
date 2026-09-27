/**
 * Query the D1 read log. Plain SQLite via the D1 REST API, so any SQL works -
 * pass a preset name as argv[2], or a full statement.
 *
 *   node read.mjs top
 *   node read.mjs "SELECT page, sum(humans) FROM reads_daily GROUP BY page"
 *
 * Auth comes from the same wrangler login that deploys the Worker, so there is
 * no second token to manage. Set D1_DATABASE_ID to override the default.
 */

const ACCOUNT_ID = '252fa1a6a585d7f784df3811dd3dc0ce';
const DATABASE_ID = process.env.D1_DATABASE_ID ?? '6a9dce0c-6f06-4fcb-91b9-d96e79d40068';
const API = 'https://api.cloudflare.com/client/v4';

const PRESETS = {
	summary: `SELECT
			sum(humans) AS humans,
			sum(bots) AS bots,
			sum(humans) + sum(bots) AS total,
			count(DISTINCT day) AS days
		FROM reads_daily`,

	top: `SELECT page, sum(humans) AS humans, sum(bots) AS bots
		FROM reads_daily GROUP BY page ORDER BY humans DESC, bots DESC LIMIT 25`,

	refs: `SELECT ref, sum(humans) AS humans
		FROM reads_daily WHERE ref != '' GROUP BY ref ORDER BY humans DESC LIMIT 25`,

	countries: `SELECT country, sum(humans) AS humans
		FROM reads_daily GROUP BY country ORDER BY humans DESC LIMIT 30`,

	devices: `SELECT device, sum(humans) AS humans
		FROM reads_daily GROUP BY device ORDER BY humans DESC`,

	os: `SELECT os, sum(humans) AS humans
		FROM reads_env GROUP BY os ORDER BY humans DESC`,

	browsers: `SELECT browser, sum(humans) AS humans
		FROM reads_env GROUP BY browser ORDER BY humans DESC`,

	regions: `SELECT country, region, sum(humans) AS humans
		FROM reads_env WHERE region != ''
		GROUP BY country, region ORDER BY humans DESC LIMIT 25`,

	env: `SELECT country, os, browser, sum(humans) AS humans
		FROM reads_env GROUP BY country, os, browser ORDER BY humans DESC LIMIT 30`,

	kinds: `SELECT kind, sum(reads) AS reads
		FROM reads_kinds GROUP BY kind ORDER BY reads DESC`,

	daily: `SELECT day,
			sum(humans) AS humans,
			sum(bots) AS bots
		FROM reads_daily GROUP BY day ORDER BY day DESC LIMIT 30`,

	hours: `SELECT hour, sum(humans) AS humans, sum(bots) AS bots
		FROM reads_by_hour GROUP BY hour ORDER BY hour`,

	bots: `SELECT kind, bot, sum(reads) AS reads, count(DISTINCT page) AS pages
		FROM reads_crawlers GROUP BY kind, bot ORDER BY reads DESC LIMIT 30`,

	ai: `SELECT kind, bot AS agent, page, ref, sum(reads) AS fetches
		FROM reads_crawlers WHERE kind IN ('ai', 'ai-user')
		GROUP BY kind, bot, page, ref ORDER BY fetches DESC LIMIT 40`,

	ai_pages: `SELECT page, sum(reads) AS fetches, count(DISTINCT bot) AS agents
		FROM reads_crawlers WHERE kind IN ('ai', 'ai-user')
		GROUP BY page ORDER BY fetches DESC LIMIT 25`,

	ai_refs: `SELECT kind, ref, sum(reads) AS fetches, count(DISTINCT bot) AS agents
		FROM reads_crawlers WHERE kind IN ('ai', 'ai-user') AND ref != ''
		GROUP BY kind, ref ORDER BY fetches DESC`,

	split: `SELECT page, ref, country,
			sum(humans) AS humans,
			sum(bots) AS bots
		FROM reads_daily GROUP BY page, ref, country
		ORDER BY humans DESC, bots DESC LIMIT 40`,
};

async function loadToken() {
	const config =
		process.env.WRANGLER_CONFIG ??
		`${process.env.APPDATA ?? ''}${process.env.APPDATA ? '\\' : ''}xdg.config\\.wrangler\\config\\default.toml`;

	const { readFile } = await import('node:fs/promises');
	const text = await readFile(config, 'utf8');
	const match = text.match(/^oauth_token\s*=\s*"(.+)"$/m);
	if (!match) throw new Error(`no oauth_token in ${config} - run: npx wrangler login`);
	return match[1];
}

async function query(sql) {
	const token = await loadToken();
	const response = await fetch(`${API}/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`, {
		method: 'POST',
		headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
		body: JSON.stringify({ sql }),
	});

	const body = await response.json();
	if (!response.ok || body.success === false) {
		const detail = JSON.stringify(body.errors ?? body).slice(0, 400);
		throw new Error(`D1 query ${response.status}: ${detail}`);
	}
	return body.result?.[0]?.results ?? [];
}

function render(rows) {
	if (!rows.length) return console.log('(no reads recorded yet)');
	const columns = Object.keys(rows[0]);
	const cell = (row, key) => String(row[key] ?? '');
	const widths = columns.map((c) => Math.max(c.length, ...rows.map((r) => cell(r, c).length)));
	const line = (cells) => cells.map((v, i) => String(v ?? '').padEnd(widths[i])).join('  ');
	console.log(line(columns));
	console.log(widths.map((w) => '-'.repeat(w)).join('  '));
	for (const row of rows) console.log(line(columns.map((c) => cell(row, c))));
	console.log(`\n${rows.length} rows`);
}

const input = process.argv[2] ?? 'summary';
if (!PRESETS[input] && !/^\s*(select|with)\b/i.test(input)) {
	console.error(`Unknown preset "${input}". Try: ${Object.keys(PRESETS).join(', ')}`);
	process.exit(1);
}

try {
	render(await query(PRESETS[input] ?? input));
} catch (error) {
	console.error(error.message);
	process.exit(1);
}
