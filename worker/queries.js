/**
 * Every read the dashboard and the CLI share, so the SQL exists in one place.
 *
 * `%SINCE%` is a bare day expression, so a filter reads `WHERE day >= %SINCE%`.
 * Substituting the whole comparison instead would produce `day >= day >= ...`,
 * which SQLite evaluates as false on every row.
 *
 * Naming follows the analytics convention people already know: humans are reads
 * by people, bots are everything automated, and "ai" is the subset of bots that
 * is a model rather than a search index or a link checker.
 */

const human = `CASE WHEN kind = 'human' THEN reads ELSE 0 END`;
const ai = `CASE WHEN kind IN ('ai', 'ai-user') THEN reads ELSE 0 END`;
const bot = `CASE WHEN kind <> 'human' THEN reads ELSE 0 END`;

export const PRESETS = {
	summary: `SELECT
			sum(${human}) AS humans,
			sum(${ai}) AS ai,
			sum(${bot}) AS bots,
			sum(reads) AS total,
			count(DISTINCT day) AS days,
			round(coalesce(sum(reads), 0) * 1.0 / max(count(DISTINCT day), 1), 1) AS avg_per_day
		FROM reads_kinds WHERE day >= %SINCE%`,

	daily: `SELECT day,
			sum(${human}) AS humans,
			sum(${ai}) AS ai,
			sum(${bot}) AS bots,
			sum(reads) AS total
		FROM reads_kinds WHERE day >= %SINCE%
		GROUP BY day ORDER BY day`,

	// Not a true unique-visitor count. We deliberately store no cookie, no IP
	// and no identifier, so there is nothing to count people by. This counts
	// distinct client fingerprints (country x os x browser x region) per day,
	// which is the closest honest proxy. It under-counts one person on two
	// devices and over-counts two people on identical setups.
	uniques: `SELECT day, count(*) AS approx_users FROM (
			SELECT DISTINCT day, country, os, browser, region
			FROM reads_env WHERE day >= %SINCE% AND humans > 0
		) GROUP BY day ORDER BY day`,

	pages: `SELECT d.page,
			sum(d.humans) AS humans,
			sum(d.bots) AS bots,
			coalesce((SELECT sum(c.reads) FROM reads_crawlers c
				WHERE c.page = d.page AND c.day >= %SINCE%
				AND c.kind IN ('ai', 'ai-user')), 0) AS ai
		FROM reads_daily d WHERE d.day >= %SINCE%
		GROUP BY d.page ORDER BY humans DESC, ai DESC LIMIT 100`,

	refs: `SELECT ref, sum(humans) AS humans
		FROM reads_daily WHERE day >= %SINCE% AND ref != ''
		GROUP BY ref ORDER BY humans DESC LIMIT 50`,

	countries: `SELECT country, sum(humans) AS humans
		FROM reads_daily WHERE day >= %SINCE%
		GROUP BY country ORDER BY humans DESC LIMIT 60`,

	devices: `SELECT device, sum(humans) AS humans
		FROM reads_daily WHERE day >= %SINCE%
		GROUP BY device ORDER BY humans DESC`,

	os: `SELECT os, sum(humans) AS humans
		FROM reads_env WHERE day >= %SINCE%
		GROUP BY os ORDER BY humans DESC`,

	browsers: `SELECT browser, sum(humans) AS humans
		FROM reads_env WHERE day >= %SINCE%
		GROUP BY browser ORDER BY humans DESC`,

	regions: `SELECT country, region, sum(humans) AS humans
		FROM reads_env WHERE day >= %SINCE% AND region != ''
		GROUP BY country, region ORDER BY humans DESC LIMIT 50`,

	hours: `SELECT hour, sum(humans) AS humans, sum(bots) AS bots
		FROM reads_by_hour WHERE day >= %SINCE%
		GROUP BY hour ORDER BY hour`,

	kinds: `SELECT kind, sum(reads) AS reads
		FROM reads_kinds WHERE day >= %SINCE%
		GROUP BY kind ORDER BY reads DESC`,

	ai_agents: `SELECT kind, bot AS agent, sum(reads) AS fetches,
			count(DISTINCT page) AS pages, max(ref) AS example_ref
		FROM reads_crawlers WHERE day >= %SINCE% AND kind IN ('ai', 'ai-user')
		GROUP BY kind, bot ORDER BY fetches DESC LIMIT 50`,

	ai_refs: `SELECT kind, ref, sum(reads) AS fetches, count(DISTINCT bot) AS agents
		FROM reads_crawlers WHERE day >= %SINCE% AND kind IN ('ai', 'ai-user') AND ref != ''
		GROUP BY kind, ref ORDER BY fetches DESC LIMIT 50`,

	ai_pages: `SELECT page, sum(reads) AS fetches, count(DISTINCT bot) AS agents
		FROM reads_crawlers WHERE day >= %SINCE% AND kind IN ('ai', 'ai-user')
		GROUP BY page ORDER BY fetches DESC LIMIT 50`,

	crawlers: `SELECT kind, bot, sum(reads) AS fetches, count(DISTINCT page) AS pages
		FROM reads_crawlers WHERE day >= %SINCE%
		GROUP BY kind, bot ORDER BY fetches DESC LIMIT 100`,

	split: `SELECT page, ref, country, sum(humans) AS humans, sum(bots) AS bots
		FROM reads_daily WHERE day >= %SINCE%
		GROUP BY page, ref, country ORDER BY humans DESC, bots DESC LIMIT 100`,
};

export const RANGES = [7, 14, 30, 90];

export function fillSince(sql, days) {
	// `date('now', '-7 days')` is inclusive of both ends, which spans eight
	// calendar dates - the UI says "7 days", so step back one less.
	const bound =
		days === 'all' || days === undefined || days === null
			? "'1970-01-01'"
			: `date('now', '-${Math.max(Number(days) - 1, 0)} days')`;
	return sql.replaceAll('%SINCE%', bound);
}

export function preset(name, days) {
	const sql = PRESETS[name];
	if (!sql) return null;
	return fillSince(sql, days);
}
