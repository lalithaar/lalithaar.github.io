const DATASET = 'isrl_reads';
const API = 'https://api.cloudflare.com/client/v4';

const DAILY_COLUMNS = 'day, page, ref, country, device, humans, bots';
const BY_HOUR_COLUMNS = 'day, hour, humans, bots';
const CRAWLER_COLUMNS = 'day, kind, bot, page, reads';

const DAILY_UPSERT = `INSERT INTO reads_daily (${DAILY_COLUMNS})
VALUES (?, ?, ?, ?, ?, ?, ?)
ON CONFLICT (day, page, ref, country, device) DO UPDATE SET
	humans = excluded.humans,
	bots = excluded.bots`;

const BY_HOUR_UPSERT = `INSERT INTO reads_by_hour (${BY_HOUR_COLUMNS})
VALUES (?, ?, ?, ?)
ON CONFLICT (day, hour) DO UPDATE SET
	humans = excluded.humans,
	bots = excluded.bots`;

const CRAWLER_UPSERT = `INSERT INTO reads_crawlers (${CRAWLER_COLUMNS})
VALUES (?, ?, ?, ?, ?)
ON CONFLICT (day, kind, bot, page) DO UPDATE SET
	reads = excluded.reads`;

const DAILY_SELECT = `SELECT
	formatDateTime(timestamp, '%Y-%m-%d') AS day,
	blob1 AS page,
	blob2 AS ref,
	blob3 AS country,
	blob5 AS device,
	sumIf(_sample_interval, double1 = 1) AS bots,
	sumIf(_sample_interval, double1 = 0) AS humans
FROM ${DATASET}
WHERE %RANGE%
GROUP BY day, page, ref, country, device
LIMIT ALL`;

const BY_HOUR_SELECT = `SELECT
	formatDateTime(timestamp, '%Y-%m-%d') AS day,
	toHour(timestamp) AS hour,
	sumIf(_sample_interval, double1 = 1) AS bots,
	sumIf(_sample_interval, double1 = 0) AS humans
FROM ${DATASET}
WHERE %RANGE%
GROUP BY day, hour
LIMIT ALL`;

const CRAWLER_SELECT = `SELECT
	formatDateTime(timestamp, '%Y-%m-%d') AS day,
	blob8 AS kind,
	blob9 AS bot,
	blob1 AS page,
	sum(_sample_interval) AS reads
FROM ${DATASET}
WHERE %RANGE% AND double1 = 1
GROUP BY day, kind, bot, page
LIMIT ALL`;

const STAMP = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

function range(from, to) {
	if (!STAMP.test(from) || !STAMP.test(to)) {
		throw new Error(`unsafe timestamp range: ${from} .. ${to}`);
	}
	return `timestamp >= toDateTime('${from}') AND timestamp < toDateTime('${to}')`;
}

function findRows(body) {
	if (Array.isArray(body)) return body;
	if (!body || typeof body !== 'object') return [];
	for (const key of ['data', 'result']) {
		const nested = findRows(body[key]);
		if (nested.length) return nested;
	}
	return [];
}

export function unwrap(text) {
	const trimmed = text.trim();
	if (!trimmed) return [];
	let body;
	try {
		body = JSON.parse(trimmed);
	} catch {
		return trimmed
			.split('\n')
			.filter(Boolean)
			.map((line) => JSON.parse(line));
	}
	return findRows(body);
}

export async function queryAnalyticsEngine(accountId, token, sql) {
	const response = await fetch(`${API}/accounts/${accountId}/analytics_engine/sql`, {
		method: 'POST',
		headers: { authorization: `Bearer ${token}`, 'content-type': 'text/plain' },
		body: sql,
	});

	const text = await response.text();
	if (!response.ok) {
		throw new Error(`analytics_engine/sql ${response.status}: ${text.slice(0, 400)}`);
	}
	return unwrap(text);
}

function toInt(value) {
	const n = Number(value);
	return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function chunks(rows, size) {
	const out = [];
	for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
	return out;
}

async function writeAll(db, sql, rows) {
	for (const chunk of chunks(rows, 14)) {
		await db.batch(chunk.map((row) => db.prepare(sql).bind(...row)));
	}
}

function sum(rows, column) {
	return rows.reduce((total, row) => total + toInt(row[column]), 0);
}

export function dayBounds(day) {
	const end = new Date(`${day}T00:00:00Z`);
	end.setUTCDate(end.getUTCDate() + 1);
	const start = new Date(`${day}T00:00:00Z`);
	const pad = (n) => String(n).padStart(2, '0');
	const stamp = (d) =>
		`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
		`${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
	return { from: stamp(start), to: stamp(end), day };
}

export async function rollupDay(env, day) {
	const { from, to } = dayBounds(day);
	const where = range(from, to);

	const [daily, hourly, crawlers] = await Promise.all([
		queryAnalyticsEngine(env.CF_ACCOUNT_ID, env.CF_API_TOKEN, DAILY_SELECT.replace('%RANGE%', where)),
		queryAnalyticsEngine(env.CF_ACCOUNT_ID, env.CF_API_TOKEN, BY_HOUR_SELECT.replace('%RANGE%', where)),
		queryAnalyticsEngine(env.CF_ACCOUNT_ID, env.CF_API_TOKEN, CRAWLER_SELECT.replace('%RANGE%', where)),
	]);

	if (!daily.length && !hourly.length && !crawlers.length) {
		return { day, rows: 0, humans: 0, bots: 0, ai: 0, crawlers: 0 };
	}

	await writeAll(
		env.DB,
		DAILY_UPSERT,
		daily.map((r) => [r.day, r.page, r.ref, r.country, r.device, toInt(r.humans), toInt(r.bots)]),
	);
	await writeAll(
		env.DB,
		BY_HOUR_UPSERT,
		hourly.map((r) => [r.day, toInt(r.hour), toInt(r.humans), toInt(r.bots)]),
	);
	await writeAll(
		env.DB,
		CRAWLER_UPSERT,
		crawlers.map((r) => [r.day, r.kind, r.bot, r.page, toInt(r.reads)]),
	);

	return {
		day,
		rows: daily.length,
		humans: sum(daily, 'humans'),
		bots: sum(daily, 'bots'),
		ai: sum(crawlers.filter((r) => r.kind === 'ai' || r.kind === 'ai-user'), 'reads'),
		crawlers: crawlers.length,
	};
}

export function recentDays(count, from = new Date()) {
	const days = [];
	for (let i = 1; i <= count; i++) {
		const d = new Date(from);
		d.setUTCDate(d.getUTCDate() - i);
		days.push(d.toISOString().slice(0, 10));
	}
	return days;
}
