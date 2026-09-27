/**
 * Query the read log from the terminal.
 *
 *   node read.mjs top            all history
 *   node read.mjs top 30         last 30 days
 *   node read.mjs "SELECT ..."   any SELECT / WITH statement
 *
 * Presets live in queries.js and are shared with dashboard.mjs.
 */

import { query } from './d1.mjs';
import { PRESETS, RANGES, preset } from './queries.js';

/**
 * Guard for hand-written SQL. Starting with SELECT is not enough on its own:
 * SQLite allows a mutating statement to hide behind a CTE, so
 * `WITH doomed AS (...) DELETE FROM reads_daily` also begins with a keyword
 * that looks read-only. Strip comments and literals first, then refuse any
 * statement that still contains a writing keyword.
 *
 * This is defence in depth, not the real boundary - the real one is a Cloudflare
 * API token scoped to read-only on this database. See .dev.vars.example.
 */
const MUTATING = /\b(insert|update|delete|drop|alter|create|truncate|pragma|attach|detach|vacuum|reindex|begin|commit|rollback|savepoint|release)\b/i;

function stripLiterals(sql) {
	return sql
		.replace(/--[^\n]*/g, ' ')
		.replace(/\/\*[\s\S]*?\*\//g, ' ')
		.replace(/'(?:[^']|'')*'/g, "''")
		.replace(/"(?:[^"]|"")*"/g, '""')
		.replace(/`[^`]*`/g, '``');
}

export function isReadOnly(sql) {
	// Strip before deciding anything, so a leading comment does not hide the
	// statement's real first keyword.
	const bare = stripLiterals(sql.trim());
	if (!/^\s*(select|with|explain)\b/i.test(bare)) return false;
	// `replace` is deliberately absent: SQLite spells the statement
	// `INSERT OR REPLACE`, which `insert` already catches, while `replace(a,b,c)`
	// is an ordinary scalar function.
	return !MUTATING.test(bare);
}

function render(rows) {
	if (!rows.length) return console.log('(no reads recorded in this range)');
	const columns = Object.keys(rows[0]);
	const cell = (row, key) => String(row[key] ?? '');
	const widths = columns.map((c) => Math.max(c.length, ...rows.map((r) => cell(r, c).length)));
	const line = (cells) => cells.map((v, i) => String(v ?? '').padEnd(widths[i])).join('  ');
	console.log(line(columns));
	console.log(widths.map((w) => '-'.repeat(w)).join('  '));
	for (const row of rows) console.log(line(columns.map((c) => cell(row, c))));
	console.log(`\n${rows.length} rows`);
}

const [input = 'summary', rangeArg] = process.argv.slice(2);
const days = /^\d+$/.test(rangeArg ?? '') ? Number(rangeArg) : 'all';
const sql = preset(input, days) ?? input;

if (!PRESETS[input] && !isReadOnly(sql)) {
	console.error(`Refusing to run that. It is not a preset, and it is not a read-only statement.`);
	console.error(`Presets: ${Object.keys(PRESETS).join(', ')}`);
	console.error(`Optional second arg is a day count: ${RANGES.join(', ')}, or omit for all history.`);
	process.exit(1);
}

try {
	render(await query(sql));
} catch (error) {
	console.error(error.message);
	process.exit(1);
}
