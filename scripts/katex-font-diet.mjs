// @ts-check

/**
 * KaTeX font diet.
 *
 * KaTeX ships every one of its 20 font files in three formats - woff2, woff and
 * ttf - and every `@font-face` lists them in that order. A browser downloads the
 * first format it understands and ignores the rest, so the woff and ttf copies
 * are dead weight: nothing has fetched them in a decade, but they still sit in
 * the repo and ship in every deploy. Together they are ~800KB, about 68% of
 * everything the build emits.
 *
 * Stripping them from the CSS *before* Vite resolves the `url()`s is the whole
 * trick. Vite only emits a font that something references, so removing the
 * fallback sources means the .woff and .ttf files are never written to dist at
 * all - no post-build pruning, no forked stylesheet, nothing to keep in sync.
 */

/**
 * Matches the woff and ttf fallbacks in a KaTeX `src` list, including the comma
 * that separates them from the source before, so the woff2 is left as the only
 * entry. Leading whitespace inside the list is tolerated.
 */
const FALLBACK_SRC =
	/,\s*url\([^)]*\.(?:woff|ttf)\)\s*format\("(?:woff|truetype)"\)/g;

export default function katexFontDiet() {
	return {
		name: 'katex-font-diet',
		// Run ahead of Vite's own CSS plugin so the fallbacks are gone before
		// it walks the `url()`s and decides what to emit.
		enforce: 'pre',
		/** @param {string} code @param {string} id */
		transform(code, id) {
			// `?url` imports skip the CSS pipeline entirely, so the same file
			// arrives here under a query suffix. Match both spellings.
			if (!/[\\/]katex\.min\.css(\?|$)/.test(id)) return null;
			FALLBACK_SRC.lastIndex = 0;
			if (!FALLBACK_SRC.test(code)) return null;
			return { code: code.replace(FALLBACK_SRC, ''), map: null };
		},
		/**
		 * `?url` copies the stylesheet to dist as a raw asset, bypassing the CSS
		 * pipeline that would otherwise rewrite and collect its `url()`s. The
		 * fonts therefore end up unbundled: the copy on disk still points at
		 * `fonts/...`, and Vite has no reason to emit the font files at all.
		 * Rewrite those paths to the emitted assets once the bundle is known.
		 *
		 * @param {{} } _options
		 * @param {Record<string, { type: string, source?: string | Buffer, name?: string, fileName?: string }>} bundle
		 */
		generateBundle(_options, bundle) {
			const emitted = new Set(
				Object.values(bundle)
					.map((c) => c.fileName)
					.filter((f) => f && /\.woff2$/.test(f)),
			);
			if (emitted.size === 0) return;

			for (const chunk of Object.values(bundle)) {
				if (chunk.type !== 'asset' || !chunk.fileName?.endsWith('.css')) continue;
				const source = String(chunk.source);
				let rewrote = 0;
				const next = source.replace(
					/url\((?:\.\/)?fonts\/(KaTeX_[A-Za-z0-9_-]+\.woff2)\)/g,
					(match, name) => {
						const hit = [...emitted].find(
						(f) => f?.startsWith('_astro/') && f.endsWith(`/${name}`),
					);
						if (!hit) return match;
						rewrote++;
						return `url(/${hit})`;
					},
				);
				if (rewrote) chunk.source = next;
			}
		},
	};
}
