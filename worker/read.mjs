import { queryAnalyticsEngine } from './src/rollup.js';

const DATASET = 'isrl_reads';
const RANGE = "timestamp >= now() - INTERVAL '90' DAY";

const PRESETS = {
	top: `SELECT blob1 AS page, sum(_sample_interval) AS reads
		FROM ${DATASET} WHERE ${RANGE} AND double1 = 0
		GROUP BY page ORDER BY reads DESC LIMIT 25`,

	refs: `SELECT blob2 AS ref, sum(_sample_interval) AS reads
		FROM ${DATASET} WHERE ${RANGE} AND double1 = 0
		GROUP BY ref ORDER BY reads DESC LIMIT 25`,

	countries: `SELECT blob3 AS country, sum(_sample_interval) AS reads
		FROM ${DATASET} WHERE ${RANGE} AND double1 = 0
		GROUP BY country ORDER BY reads DESC LIMIT 30`,

	devices: `SELECT blob5 AS device, sum(_sample_interval) AS reads
		FROM ${DATASET} WHERE ${RANGE} AND double1 = 0
		GROUP BY device ORDER BY reads DESC`,

	os: `SELECT blob6 AS os, sum(_sample_interval) AS reads
		FROM ${DATASET} WHERE ${RANGE} AND double1 = 0
		GROUP BY os ORDER BY reads DESC`,

	browsers: `SELECT blob7 AS browser, sum(_sample_interval) AS reads
		FROM ${DATASET} WHERE ${RANGE} AND double1 = 0
		GROUP BY browser ORDER BY reads DESC`,

	bots: `SELECT blob8 AS kind, blob9 AS bot, count() AS hits
		FROM ${DATASET} WHERE ${RANGE} AND double1 = 1
		GROUP BY kind, bot ORDER BY hits DESC LIMIT 30`,

	kinds: `SELECT blob8 AS kind,
		sumIf(_sample_interval, double1 = 0) AS humans,
		sumIf(_sample_interval, double2 = 1) AS ai,
		sumIf(_sample_interval, double1 = 1) AS bots
		FROM ${DATASET} WHERE ${RANGE}
		GROUP BY kind ORDER BY humans DESC, ai DESC`,

	ai: `SELECT blob9 AS agent, blob1 AS page, blob2 AS ref, blob3 AS country,
		count() AS fetches
		FROM ${DATASET} WHERE ${RANGE} AND double2 = 1
		GROUP BY agent, page, ref, country ORDER BY fetches DESC LIMIT 40`,

	ai_agents: `SELECT blob8 AS kind, blob9 AS agent, count() AS fetches,
		count(DISTINCT blob1) AS pages
		FROM ${DATASET} WHERE ${RANGE} AND double2 = 1
		GROUP BY kind, agent ORDER BY fetches DESC`,

	ai_pages: `SELECT blob1 AS page, count() AS fetches,
		count(DISTINCT blob9) AS agents
		FROM ${DATASET} WHERE ${RANGE} AND double2 = 1
		GROUP BY page ORDER BY fetches DESC LIMIT 25`,

	regions: `SELECT blob3 AS country, blob4 AS region, sum(_sample_interval) AS reads
		FROM ${DATASET} WHERE ${RANGE} AND double1 = 0 AND blob4 != ''
		GROUP BY country, region ORDER BY reads DESC LIMIT 25`,

	hours: `SELECT toHour(timestamp) AS hour_utc, sum(_sample_interval) AS reads
		FROM ${DATASET} WHERE ${RANGE} AND double1 = 0
		GROUP BY hour_utc ORDER BY hour_utc`,

	daily: `SELECT formatDateTime(timestamp, '%Y-%m-%d') AS day,
		sumIf(_sample_interval, double1 = 1) AS bots,
		sumIf(_sample_interval, double2 = 1) AS ai,
		sumIf(_sample_interval, double1 = 0) AS humans
		FROM ${DATASET} WHERE ${RANGE}
		GROUP BY day ORDER BY day DESC LIMIT 30`,

	split: `SELECT blob1 AS page, blob2 AS ref, blob3 AS country,
		sumIf(_sample_interval, double1 = 1) AS bots,
		sumIf(_sample_interval, double1 = 0) AS humans
		FROM ${DATASET} WHERE ${RANGE}
		GROUP BY page, ref, country ORDER BY humans DESC LIMIT 40`,
};

function render(rows) {
	if (!rows.length) return console.log('(no rows in the last 90 days)');
	const columns = Object.keys(rows[0]);
	const widths = columns.map((c) => Math.max(c.length, ...rows.map((r) => String(r[c] ?? '').length)));
	const line = (cells) => cells.map((cell, i) => String(cell ?? '').padEnd(widths[i])).join('  ');
	console.log(line(columns));
	console.log(widths.map((w) => '-'.repeat(w)).join('  '));
	for (const row of rows) console.log(line(columns.map((c) => row[c])));
	console.log(`\n${rows.length} rows`);
}

const input = process.argv[2] ?? 'top';
const accountId = process.env.CF_ACCOUNT_ID;
const token = process.env.CF_API_TOKEN;

if (!accountId || !token) {
	console.error('Set CF_ACCOUNT_ID and CF_API_TOKEN (Account | Account Analytics | Read).');
	console.error(`Presets: ${Object.keys(PRESETS).join(', ')}`);
	process.exit(1);
}

const sql = PRESETS[input] ?? input;
if (!PRESETS[input] && !/^\s*(select|show)\b/i.test(sql)) {
	console.error(`Unknown preset "${input}". Try: ${Object.keys(PRESETS).join(', ')}`);
	process.exit(1);
}

try {
	render(await queryAnalyticsEngine(accountId, token, sql));
} catch (error) {
	console.error(error.message);
	process.exit(1);
}
