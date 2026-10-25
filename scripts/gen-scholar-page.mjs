// One-shot generator for src/pages/google-scholar-if-it-worked.astro.
//
// Takes the page whose entries carry their abstracts through inline
// renderAbstract(`…`) calls and rewrites it as plain, fully written-out markup:
// one <li> per paper, with the abstract as ordinary HTML text and KaTeX maths
// baked in as real markup at generation time.
//
// After it has run, the .astro file itself is the source of truth — edit it
// directly (sidenotes, extra notes, whatever). Running this again on plain
// output is refused on purpose, because it rebuilds every entry from parsed
// markup and would drop anything hand-added inside an <li>.
//
// Usage: node scripts/gen-scholar-page.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import katex from 'katex';

const PAGE = 'src/pages/google-scholar-if-it-worked.astro';
const src = readFileSync(PAGE, 'utf8');

if (!src.includes('renderAbstract(')) {
	console.error('already plain markup — edit the .astro file directly; not regenerating.');
	process.exit(1);
}

const TAB = '\t\t\t';
const html = (raw) =>
	raw
		.replace(/&/g, '&')
		.replace(/</g, '<')
		.replace(/>/g, '>')
		.replace(/\n/g, '<br />')
		.replace(
			/\$([^$]+)\$/g,
			(_match, tex) => katex.renderToString(tex, { throwOnError: false })
		);

// --- parse every entry ------------------------------------------------------
const blocks = [...src.matchAll(/<li class="work">([\s\S]*?)<\/li>/g)].map((m) => m[1]);
if (blocks.length !== 16) throw new Error(`expected 16 entries, got ${blocks.length}`);

const build = (block) => {
	const file = /<!-- local file: (.*?) -->/.exec(block)?.[1];
	const title = /<a class="work-title" href="([^"]*)">([\s\S]*?)<\/a>/.exec(block);
	const authors = /<div class="work-authors">([\s\S]*?)<\/div>/.exec(block)?.[1];
	const type = /<span class="work-type">([\s\S]*?)<\/span>/.exec(block)?.[1];
	const year = /<span>(\d{4})<\/span>/.exec(block)?.[1];
	const doi = /<a class="doi-link" href="https:\/\/doi\.org\/([^"]*)">DOI: (.*?)<\/a>/.exec(block);
	if (!title || !authors || !type || !year || !doi) {
		throw new Error(`unparsable entry: ${block.slice(0, 120)}`);
	}

	const paragraphs = [];
	for (const [, literal] of block.matchAll(
		/renderAbstract\((`(?:[^`\\]|\\.)*`)\)/g
	)) {
			const raw = new Function(`return ${literal}`)();
		paragraphs.push(`${TAB}\t<p class="work-abstract">${html(raw)}</p>`);
	}

	const out = [`${TAB}<li class="work">`];
	if (file) out.push(`${TAB}\t<!-- local file: ${file} -->`);
	out.push(`${TAB}\t<a class="work-title" href="${title[1]}">${title[2]}</a>`);
	out.push(`${TAB}\t<div class="work-authors">${authors}</div>`);
	out.push(`${TAB}\t<div class="work-meta">`);
	out.push(`${TAB}\t\t<span class="work-type">${type}</span>`);
	out.push(`${TAB}\t\t<span aria-hidden="true">·</span>`);
	out.push(`${TAB}\t\t<span>${year}</span>`);
	out.push(`${TAB}\t\t<span aria-hidden="true">·</span>`);
	out.push(`${TAB}\t\t<a class="doi-link" href="https://doi.org/${doi[1]}">DOI: ${doi[2]}</a>`);
	out.push(`${TAB}\t</div>`);
	out.push(...paragraphs);
	out.push(`${TAB}</li>`);
	return out.join('\n');
};

const list = /(\t\t<ol class="works">\n)([\s\S]*?)(\t\t<\/ol>)/.exec(src);
if (!list) throw new Error('could not locate the works <ol>');
const next =
	src.slice(0, list.index) +
	list[1] +
	blocks.map(build).join('\n') +
	'\n' +
	list[3] +
	src.slice(list.index + list[0].length);

// --- strip the helpers the plain markup no longer needs --------------------
const cleaned = next
	.replace("import katex from 'katex';\n", '')
	.replace(/\nconst escapeHtml[\s\S]*?\n\}\n(?=\n---)/, '\n');

if (
	cleaned.includes('renderAbstract(') ||
	cleaned.includes('escapeHtml') ||
	cleaned.includes("import katex")
) {
	throw new Error('helpers still present in output');
}
writeFileSync(PAGE, cleaned);
console.log(`wrote ${PAGE}: ${blocks.length} plain entries, ${cleaned.length} bytes`);