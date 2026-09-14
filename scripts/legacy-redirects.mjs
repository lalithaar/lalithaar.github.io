// @ts-check
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Legacy site redirect stubs.
 *
 * The live site at isrl.in is replaced by this repo's Astro site. Old site
 * URLs (from sitemap-for-redirect.xml) get a stub page that tells the browser
 * to redirect to <REDIRECT_BASE>/<original path>. The stubs are declared
 * here (via an Astro integration) and written straight into the build output —
 * NOT inside src/pages where the new site's posts live.
 *
 * Paths that overlap the new site (its index today) are flagged and skipped —
 * the new site must keep owning them, so no redirect stub is created.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const SITEMAP_FILE = path.join(ROOT, 'sitemap-for-redirect.xml');
const PAGES_DIR = path.join(ROOT, 'src', 'pages');

export const LEGACY_ORIGIN = 'https://isrl.in';
export const REDIRECT_BASE = 'https://isrl-research.github.io';

/** Canonical URL of an old site path so it can be compared with new routes. */
function oldPathCanonical(pathname) {
	if (pathname === '/' || pathname === '') return '/';
	let p = pathname;
	if (p.endsWith('.html')) p = p.slice(0, -'.html'.length);
	if (p === '/index') return '/';
	if (p.endsWith('/index')) return p.slice(0, -'/index'.length);
	return p;
}

/** Canonical URLs the new Astro site serves from src/pages. */
function newSiteCanonical() {
	const urls = new Set(['/']);
	if (!fs.existsSync(PAGES_DIR)) return urls;
	for (const name of fs.readdirSync(PAGES_DIR)) {
		if (name.startsWith('_') || name.startsWith('[')) continue;
		if (!/\.(md|mdx|astro)$/.test(name)) continue;
		const route = name.replace(/\.(md|mdx|astro)$/, '');
		if (route === 'index') continue;
		urls.add(`/${route}`);
	}
	return urls;
}

/**
 * @returns {{ redirects: Array<[string, string]>, skipped: Array<{ from: string, overlaps: string }> }}
 */
export function collectLegacyRedirects() {
	const xml = fs.readFileSync(SITEMAP_FILE, 'utf8');
	const locations = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1].trim());

	const newSite = newSiteCanonical();
	const redirects = [];
	const skipped = [];

	for (const loc of locations) {
		const from = new URL(loc).pathname;
		const canonical = oldPathCanonical(from);
		if (canonical === '/' || newSite.has(canonical)) {
			skipped.push({ from, overlaps: canonical });
			continue;
		}
		redirects.push([from, `${REDIRECT_BASE}${from}`]);
	}

	return { redirects, skipped };
}

function report({ redirects, skipped }) {
	if (skipped.length > 0) {
		console.warn(
			`[legacy-redirects] Skipped ${skipped.length} legacy URL(s) that overlap the new site — no stub created (the new site owns them):`,
		);
		for (const { from, overlaps } of skipped) {
			console.warn(`  ${LEGACY_ORIGIN}${from}  (overlaps new site route ${overlaps})`);
		}
	}
	console.warn(
		`[legacy-redirects] Configured ${redirects.length} redirect(s) from ${LEGACY_ORIGIN}/ to ${REDIRECT_BASE}/`,
	);
}

function stubHtml(from, to) {
	return (
		`<!doctype html><title>Redirecting to: ${to}</title>` +
		`<meta http-equiv="refresh" content="0;url=${to}">` +
		`<meta name="robots" content="noindex">` +
		`<link rel="canonical" href="${to}">` +
		`<body>\t<a href="${to}">Redirecting from <code>${from}</code> to <code>${to}</code></a></body>`
	);
}

export function legacyRedirectsIntegration() {
	return {
		name: 'legacy-redirect-integration',
		hooks: {
			'astro:config:setup'() {
				report(collectLegacyRedirects());
			},
			'astro:build:done'({ dir }) {
				const { redirects } = collectLegacyRedirects();
				for (const [from, to] of redirects) {
					const fileUrl = new URL(`.${from}`, dir);
					fs.mkdirSync(path.dirname(fileURLToPath(fileUrl)), { recursive: true });
					fs.writeFileSync(fileURLToPath(fileUrl), stubHtml(from, to), 'utf8');
				}
			},
		},
	};
}