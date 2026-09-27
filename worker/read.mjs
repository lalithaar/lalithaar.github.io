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

if (!PRESETS[input] && !/^\s*(select|with)\b/i.test(sql)) {
	console.error(`Unknown preset "${input}". Try: ${Object.keys(PRESETS).join(', ')}`);
	console.error(`Optional second arg is a day count: ${RANGES.join(', ')}, or omit for all history.`);
	process.exit(1);
}

try {
	render(await query(sql));
} catch (error) {
	console.error(error.message);
	process.exit(1);
}
