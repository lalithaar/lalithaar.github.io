// Smoke test for the KaTeX side of the built site.
// Run: node scripts/katex-check.mjs
//
// The reason this exists at all: a build can finish with exit code 0 and drop
// every stylesheet. .gitattributes documents the incident - a CRLF checkout
// breaks Vite's inlining of katex.min.css, the CSS never lands, and the only
// symptom is pages with no <style> and no .css assets. Nothing errors. So the
// assertions here check for the files being present and internally consistent
// rather than trusting the build to have failed.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const results = [];
const check = (name, pass, detail = '') => results.push({ pass, name, detail });

const walk = (dir, out = []) => {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) walk(full, out);
		else out.push(full);
	}
	return out;
};

const all = walk(DIST);
const htmlPages = all.filter((f) => f.endsWith('.html'));
const cssFiles = all.filter((f) => f.endsWith('.css'));
const fonts = all.filter((f) => /\.(woff2?|ttf|eot|otf)$/i.test(f));

check('build produced pages', htmlPages.length > 0, `${htmlPages.length} pages`);

// --- the page that actually uses KaTeX ---
const mathPages = htmlPages.filter((f) => readFileSync(f, 'utf8').includes('katex'));
check('a KaTeX page exists', mathPages.length > 0, `${mathPages.length} page(s) use KaTeX`);

for (const page of mathPages) {
	const rel = '/' + path.relative(DIST, page).replace(/\\/g, '/');
	const html = readFileSync(page, 'utf8');
	const href = /href="(\/[^"]*katex[^"]*\.css)"/.exec(html)?.[1];
	check(`${rel}: references a katex stylesheet`, Boolean(href), href ?? 'no katex css found');
	if (!href) continue;

	// The stylesheet is preloaded and swapped in on load, so it is a real file
	// rather than an inline <style>. If it is missing the page renders unstyled
	// maths with no error anywhere.
	const cssPath = path.join(DIST, href.replace(/^\//, ''));
	check(`${rel}: the referenced stylesheet exists`, existsSync(cssPath), href);
	if (!existsSync(cssPath)) continue;

	const css = readFileSync(cssPath, 'utf8');
	const faces = [...css.matchAll(/@font-face/g)].length;
	check(`${rel}: stylesheet carries @font-face rules`, faces > 0, `${faces} rules, ${css.length} bytes`);

	// Every font the CSS points at has to exist, or maths renders as blank boxes.
	// This is the assertion that would have caught a stylesheet going missing.
	const refs = [...new Set([...css.matchAll(/url\((\/[^)]+\.(?:woff2?|ttf|eot|otf))\)/g)].map((m) => m[1]))];
	const dangling = refs.filter((r) => !existsSync(path.join(DIST, r.replace(/^\//, ''))));
	check(`${rel}: every font url resolves to a file`, dangling.length === 0,
		dangling.length ? `dangling: ${dangling.slice(0, 3).join(', ')}` : `${refs.length} refs, all present`);
}

// woff2 only, on purpose: woff and ttf doubles the font payload for browsers that
// do not need them, and every current browser reads woff2.
const notWoff2 = fonts.filter((f) => !f.endsWith('.woff2'));
check('fonts are woff2 only', notWoff2.length === 0,
	notWoff2.length ? notWoff2.map((f) => path.basename(f)).join(', ') : `${fonts.length} woff2, no legacy formats`);

const pass = results.filter((r) => r.pass).length;
const fail = results.length - pass;
for (const r of results) {
	const tag = r.pass ? 'ok  ' : 'FAIL';
	console.log(`${tag} ${r.name}${r.detail ? `  (${r.detail})` : ''}`);
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
