/**
 * Local-only analytics dashboard.
 *
 *   npm run dash          http://127.0.0.1:8787
 *
 * Binds to the loopback interface only and holds no data: every request is
 * answered by querying D1 through the same wrangler login that deploys the
 * Worker. Nothing is cached to disk, no credential is read from the repo, and
 * there is no network-accessible endpoint anywhere in this design.
 *
 * Kept out of src/pages on purpose - anything there gets built into dist/ and
 * published to the open web.
 */

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { query } from './d1.mjs';
import { PRESETS, RANGES, preset } from './queries.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.DASH_PORT ?? 8787);
const HOST = '127.0.0.1';

// One round trip per view. These are the panels the dashboard renders.
const PANELS = [
	'summary',
	'daily',
	'uniques',
	'pages',
	'refs',
	'countries',
	'devices',
	'os',
	'browsers',
	'regions',
	'hours',
	'kinds',
	'ai_agents',
	'ai_refs',
	'ai_pages',
	'crawlers',
];

function send(res, status, body, type = 'application/json') {
	res.writeHead(status, {
		'content-type': `${type}; charset=utf-8`,
		'cache-control': 'no-store',
		// Deliberately no CORS header. A page on another origin can reach this
		// server but cannot read the response, which is what keeps a hostile
		// page from exfiltrating anything.
		'x-content-type-options': 'nosniff',
	});
	res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

function parseDays(value) {
	if (value === 'all' || value === undefined || value === null || value === '') return 'all';
	const n = Number(value);
	return Number.isInteger(n) && n > 0 && n <= 3650 ? n : 'all';
}

const server = createServer(async (req, res) => {
	const url = new URL(req.url, `http://${HOST}:${PORT}`);

	if (req.method !== 'GET' && req.method !== 'HEAD') {
		return send(res, 405, { error: 'method not allowed' });
	}

	try {
		if (url.pathname === '/' || url.pathname === '/index.html') {
			const html = await readFile(join(HERE, 'public', 'index.html'));
			return send(res, 200, html, 'text/html');
		}

		if (url.pathname === '/api/overview') {
			const days = parseDays(url.searchParams.get('days'));
			const results = await Promise.all(
				PANELS.map(async (name) => {
					try {
						return [name, await query(preset(name, days))];
					} catch (error) {
						return [name, { error: error.message }];
					}
				}),
			);
			return send(res, 200, { days, data: Object.fromEntries(results) });
		}

		const single = url.pathname.match(/^\/api\/([a-z_]+)$/);
		if (single) {
			const name = single[1];
			if (!PRESETS[name]) {
				return send(res, 404, { error: `unknown preset "${name}"` });
			}
			const days = parseDays(url.searchParams.get('days'));
			return send(res, 200, await query(preset(name, days)));
		}

		return send(res, 404, { error: 'not found' });
	} catch (error) {
		return send(res, 500, { error: error.message });
	}
});

server.listen(PORT, HOST, () => {
	console.log(`isrl reads  ->  http://${HOST}:${PORT}`);
	console.log(`ranges: ${RANGES.join(' / ')} / all   (ctrl-c to stop)`);
});
