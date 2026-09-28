// Smoke test against the BUILT site, mirroring the prototype's assertions.
// Run: node scripts/sidenote-check.mjs
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));

const results = [];
const check = (name, pass, detail = '') => results.push({ pass, name, detail });

const walkPages = (dir, out = []) => {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) walkPages(full, out);
		else if (entry.name === 'index.html') out.push(full);
	}
	return out;
};

const pages = walkPages(DIST);
check('build produced pages', pages.length > 0, `${pages.length} pages`);

const unitPages = [];
const plainPages = [];
for (const file of pages) {
	const html = readFileSync(file, 'utf8');
	const rel = path.relative(DIST, file).replace(/[\\/]index\.html$/, '/');
	if (html.includes('class="md-unit"')) unitPages.push({ rel, html });
	else plainPages.push({ rel, html });
}

check('pages with footnotes get the two-column unit', unitPages.length > 0, unitPages.map((p) => p.rel).join(', '));
check('pages without footnotes are left alone', plainPages.length > 0, plainPages.map((p) => p.rel).join(', '));

for (const { rel, html } of plainPages) {
	const hasUnit = html.includes('class="md-unit"');
	const hasAside = html.includes('class="notes"');
	check(`plain page untouched: ${rel}`, !hasUnit && !hasAside, 'no unit, no aside, no script');
}

for (const { rel, html } of unitPages) {
	const label = rel;
	// --- structure ---
	check(`${label}: prose precedes notes in the DOM`,
		html.indexOf('class="prose"') < html.indexOf('class="notes"'),
		'running text first, then notes — book copy order');
	check(`${label}: prose closes before notes begin (notes are a sibling)`,
		html.indexOf('</article>') < html.indexOf('class="notes"'),
		'</article> precedes <aside class="notes"> — nothing notes-related inside the prose column');
	check(`${label}: notes appear exactly once (no cloned content)`,
		(html.match(/class="notes"/g) ?? []).length === 1,
		`${(html.match(/class="notes"/g) ?? []).length} aside.notes`);

	// --- a11y ---
	check(`${label}: <ol> keeps its list role despite list-style:none`,
		/<ol role="list">/.test(html), 'role="list" present');
	check(`${label}: notes aside has an accessible name`,
		/class="notes" aria-label="Notes"/.test(html), 'aria-label="Notes"');
	check(`${label}: visible heading hidden from AT`,
		/<h2 class="visually-hidden"/.test(html), 'h2 clipped, aside carries the name');
	// Only real anchor elements — the same string also appears in the page's own
	// inlined <style> as a selector, which is not markup.
	const backs = html.match(/<a [^>]*data-footnote-backref[^>]*>/g) ?? [];
	check(`${label}: every backref removed from tab order and a11y tree`,
		backs.length > 0 && backs.every((t) => t.includes('aria-hidden="true"') && t.includes('tabindex="-1"')),
		`${backs.length} backref(s), all aria-hidden + tabindex=-1`);
	const nums = html.match(/<a class="note-num"[^>]*>/g) ?? [];
	check(`${label}: number links are named, not bare digits`,
		nums.length > 0 && nums.every((t) => /aria-label="Back to reference \d+ in the text"/.test(t)),
		`${nums.length} numbered link(s), each with a full accessible name`);

	// --- the one number per note invariant ---
	const lis = (html.match(/<li id="user-content-fn-\d+"/g) ?? []).length;
	check(`${label}: exactly one number per note`, nums.length === lis && lis > 0,
		`${nums.length} number links for ${lis} notes`);

	// --- backref target integrity ---
	const numTargets = [...html.matchAll(/class="note-num" href="#([^"]+)"/g)].map((m) => m[1]);
	const refIds = [...html.matchAll(/id="(user-content-fnref-\d+)"/g)].map((m) => m[1]);
	check(`${label}: every number links to a reference that exists`,
		numTargets.length > 0 && numTargets.every((t) => refIds.includes(t)),
		numTargets.join(', '));

	// --- runtime script present, and it is small ---
	check(`${label}: runtime script shipped`, html.includes('has-sidenotes'), 'JS owns the breakpoint');
	check(`${label}: no CSS media query duplicates the breakpoint`,
		!/@media \(min-width: 66rem\)/.test(html),
		'breakpoint defined once, in JS only — nothing to drift');
}

// --- script weight, measured across every unit page (not just the first) ---
const scriptMatch = /<script>\s*(\(\(\)\s*=>\s*\{[\s\S]*?\}\)\(\);)\s*<\/script>/;
let bytes = 0;
for (const { html } of unitPages) {
	const m = html.match(scriptMatch);
	if (m) bytes = Math.max(bytes, Buffer.byteLength(m[1], 'utf8'));
}
check('runtime script is small', bytes > 0 && bytes < 2000, `${bytes} bytes inline, 0 dependencies, 0 requests`);

// --- every page with footnotes must actually get the script, whatever its layout ---
for (const { rel, html } of unitPages) {
	check(`${rel}: layout ships the sidenote runtime`,
		html.includes('has-sidenotes') && html.match(scriptMatch) !== null,
		'script and styles present on this page');
}

const pass = results.filter((r) => r.pass).length;
const fail = results.length - pass;
for (const r of results) {
	const tag = r.pass ? 'ok  ' : 'FAIL';
	console.log(`${tag} ${r.name}${r.detail ? `  (${r.detail})` : ''}`);
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
