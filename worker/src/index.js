import { classify, normalizeCountry, normalizePage, referrerHost } from './parse.js';
import { recentDays, rollupDay } from './rollup.js';

const PIXEL_PATH = '/px.gif';

const PIXEL = Uint8Array.from([
	0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00,
	0xff, 0xff, 0xff, 0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00,
	0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x01, 0x44, 0x00, 0x3b,
]);

const PIXEL_HEADERS = {
	'content-type': 'image/gif',
	'content-length': String(PIXEL.length),
	'cache-control': 'no-store',
	'cross-origin-resource-policy': 'cross-origin',
};

function pixel() {
	return new Response(PIXEL, { headers: PIXEL_HEADERS });
}

function record(request, env, url) {
	const ua = request.headers.get('user-agent') ?? '';
	const cf = request.cf ?? {};
	const { kind, device, os, browser, bot, isBot, isAi } = classify(ua, request.headers, cf);

	env.READS.writeDataPoint({
		blobs: [
			normalizePage(url.searchParams.get('p')),
			referrerHost(request.headers.get('referer'), env.SELF_HOST),
			normalizeCountry(cf.country),
			cf.region ?? '',
			device,
			os,
			browser,
			kind,
			bot,
		],
		doubles: [isBot ? 1 : 0, isAi ? 1 : 0],
	});
}

function backfillDays(url) {
	const requested = url.searchParams.get('rollup');
	if (!requested) return null;
	if (!/^\d{4}-\d{2}-\d{2}$/.test(requested)) return null;
	return [requested];
}

export default {
	async fetch(request, env) {
		const url = new URL(request.url);

		if (request.method !== 'GET' && request.method !== 'HEAD') {
			return new Response('method not allowed', { status: 405, headers: { allow: 'GET, HEAD' } });
		}

		const days = backfillDays(url);
		if (days) {
			if (!env.CF_API_TOKEN) return new Response('no CF_API_TOKEN secret', { status: 503 });
			return Response.json(await Promise.all(days.map((day) => rollupDay(env, day))));
		}

		if (url.pathname !== PIXEL_PATH) {
			return new Response('not found', { status: 404 });
		}

		record(request, env, url);
		return pixel();
	},

	async scheduled(event, env) {
		const days = recentDays(2, event.scheduledTime ? new Date(event.scheduledTime) : new Date());
		if (!env.CF_API_TOKEN) throw new Error('CF_API_TOKEN secret is not set');
		const results = await Promise.all(days.map((day) => rollupDay(env, day)));
		for (const result of results) {
			console.log(
				`rollup ${result.day}: ${result.humans} human, ${result.bots} bot ` +
					`(${result.ai} ai across ${result.crawlers} crawlers), ${result.rows} rows`,
			);
		}
	},
};
