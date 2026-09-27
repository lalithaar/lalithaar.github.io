/**
 * Write path: one pageview -> a batch of D1 upserts.
 *
 * Every counter here is written as an increment (`col = table.col + excluded.col`)
 * rather than a nightly recompute, so a hit is durable the moment it lands and
 * there is no rollup step that can be missed, retried, or double counted.
 *
 * D1 free tier is 5M rows read / 100k rows written per day. Every hit costs
 * exactly four writes - the three shared statements below plus one of
 * reads_crawlers / reads_env - for a reader and a bot alike, putting the
 * ceiling near 25k pageviews a day. The endpoint is unauthenticated, so that
 * ceiling is reachable by anyone with a loop, and blowing it does not degrade
 * gracefully: the database stops answering queries entirely, taking the
 * dashboard down until the 00:00 UTC reset.
 *
 * So every hit passes the budget check first. Once the day's cap is reached
 * the write is skipped and the reader still gets their pixel - the pixel has
 * to keep working, it just stops being counted. Over-budget traffic then costs
 * one row read instead of four row writes, and reads have 50x the headroom.
 */

/**
 * Ceiling on hits accepted per UTC day. Four writes per hit, so 18k leaves
 * roughly 28k rows of the 100k daily write allowance as headroom.
 */
export const DAILY_HIT_CAP = 18000;

const BUDGET_SELECT = 'SELECT hits FROM write_budget WHERE day = ?';
const BUDGET_BUMP = `INSERT INTO write_budget (day, hits) VALUES (?, 1)
ON CONFLICT (day) DO UPDATE SET hits = write_budget.hits + 1`;

const DAILY_COLUMNS = 'day, page, ref, country, device, humans, bots';
const BY_HOUR_COLUMNS = 'day, hour, humans, bots';
const KINDS_COLUMNS = 'day, kind, reads';
const CRAWLER_COLUMNS = 'day, kind, bot, page, ref, reads';
const ENV_COLUMNS = 'day, country, os, browser, region, humans';

const DAILY_UPSERT = `INSERT INTO reads_daily (${DAILY_COLUMNS})
VALUES (?, ?, ?, ?, ?, ?, ?)
ON CONFLICT (day, page, ref, country, device) DO UPDATE SET
	humans = reads_daily.humans + excluded.humans,
	bots = reads_daily.bots + excluded.bots`;

const BY_HOUR_UPSERT = `INSERT INTO reads_by_hour (${BY_HOUR_COLUMNS})
VALUES (?, ?, ?, ?)
ON CONFLICT (day, hour) DO UPDATE SET
	humans = reads_by_hour.humans + excluded.humans,
	bots = reads_by_hour.bots + excluded.bots`;

const KINDS_UPSERT = `INSERT INTO reads_kinds (${KINDS_COLUMNS})
VALUES (?, ?, ?)
ON CONFLICT (day, kind) DO UPDATE SET
	reads = reads_kinds.reads + excluded.reads`;

const CRAWLER_UPSERT = `INSERT INTO reads_crawlers (${CRAWLER_COLUMNS})
VALUES (?, ?, ?, ?, ?, ?)
ON CONFLICT (day, kind, bot, page, ref) DO UPDATE SET
	reads = reads_crawlers.reads + excluded.reads`;

const ENV_UPSERT = `INSERT INTO reads_env (${ENV_COLUMNS})
VALUES (?, ?, ?, ?, ?, ?)
ON CONFLICT (day, country, os, browser, region) DO UPDATE SET
	humans = reads_env.humans + excluded.humans`;

/**
 * Turn one classified hit into the exact statements to run. Pure, so the plan
 * can be asserted in tests without a database.
 */
export function buildStatements(hit) {
	const { day, hour, page, ref, country, device, os, browser, region, kind, bot, isBot } = hit;
	const humans = isBot ? 0 : 1;
	const bots = isBot ? 1 : 0;

	const statements = [
		{ sql: DAILY_UPSERT, params: [day, page, ref, country, device, humans, bots] },
		{ sql: BY_HOUR_UPSERT, params: [day, hour, humans, bots] },
		{ sql: KINDS_UPSERT, params: [day, kind, 1] },
	];

	if (isBot) {
		statements.push({ sql: CRAWLER_UPSERT, params: [day, kind, bot, page, ref, 1] });
	} else {
		statements.push({ sql: ENV_UPSERT, params: [day, country, os, browser, region, 1] });
	}

	return statements;
}

export async function writeHit(db, hit) {
	// Read first, then decide. These cannot share one batch: db.batch runs every
	// statement in it unconditionally, so putting the budget SELECT alongside
	// the upserts would measure the cap and spend the writes anyway.
	//
	// That leaves a small window between the read and the write, so concurrent
	// requests can overshoot the cap slightly. Acceptable for a safety valve -
	// the headroom below absorbs the overshoot, and the alternative is paying a
	// round trip to make a soft limit exact.
	const row = await db.prepare(BUDGET_SELECT).bind(hit.day).first();
	const used = row?.hits ?? 0;

	if (used >= DAILY_HIT_CAP) {
		return { written: false, used, cap: DAILY_HIT_CAP };
	}

	// The bump rides in the same batch as the counters, so the budget and the
	// analytics can never disagree about whether a hit was accepted.
	await db.batch([
		...buildStatements(hit).map(({ sql, params }) => db.prepare(sql).bind(...params)),
		db.prepare(BUDGET_BUMP).bind(hit.day),
	]);

	return { written: true, used: used + 1, cap: DAILY_HIT_CAP };
}
