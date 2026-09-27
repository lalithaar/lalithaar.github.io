import { classify, normalizeCountry, normalizePage, referrerHost } from './parse.js';
import { writeHit } from './store.js';

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

function hitFrom(request, env, url, now = new Date()) {
	const cf = request.cf ?? {};
	const { kind, device, os, browser, bot, isBot } = classify(
		request.headers.get('user-agent') ?? '',
		request.headers,
		cf,
	);

	return {
		day: now.toISOString().slice(0, 10),
		hour: now.getUTCHours(),
		page: normalizePage(url.searchParams.get('p')),
		ref: referrerHost(request.headers.get('referer'), env.SELF_HOST),
		country: normalizeCountry(cf.country),
		device,
		os,
		browser,
		region: cf.region ?? '',
		kind,
		bot,
		isBot,
	};
}

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);

		if (request.method !== 'GET' && request.method !== 'HEAD') {
			return new Response('method not allowed', { status: 405, headers: { allow: 'GET, HEAD' } });
		}

		if (url.pathname !== PIXEL_PATH) {
			return new Response('not found', { status: 404 });
		}

		// HEAD is what link checkers and prefetchers send, not a reader looking at
		// the page, so it gets the headers and nothing else.
		if (request.method === 'HEAD') {
			return new Response(null, { headers: PIXEL_HEADERS });
		}

		// Respond first, write after. A reader should never wait on the database,
		// and a slow or failing write must not turn into a broken image - which
		// is also why the daily budget refusing a write leaves the reader with
		// their pixel either way. The cap exists because the endpoint is
		// unauthenticated: without it, a loop against /px.gif exhausts the D1
		// write allowance and takes the whole database, dashboard included, down
		// until the 00:00 UTC reset.
		ctx.waitUntil(
			writeHit(env.DB, hitFrom(request, env, url))
				.then((result) => {
					if (result && result.written === false) {
						console.warn(
							`daily cap reached (${result.used}/${result.cap}); hit not counted`,
						);
					}
				})
				.catch((error) => {
					console.error('write failed', error);
				}),
		);

		return pixel();
	},
};
