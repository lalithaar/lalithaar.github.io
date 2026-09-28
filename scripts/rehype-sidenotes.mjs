// Build-time: reshape remark-rehype's footnote output into a two-column unit.
//
// The goal is that the browser receives ONE tree that is already correct, so the
// only thing left to do at runtime is measuring and setting `top` on each note.
// Nothing is cloned, no content is duplicated, and copy/paste order stays
// book-correct: running text first, notes after.
//
//   before                                after
//   <h1/><p/>…<section data-footnotes/>   <div class="md-unit">
//                                             <article class="prose">…</article>
//                                             <aside class="notes">…</aside>
//                                           </div>
//
// Pages with no footnotes are left completely untouched, so they keep the plain
// 70ch single column and pay nothing.

/** Depth-first walk over a hast tree, calling `fn` on every element node. */
function walk(node, fn) {
	if (!node || typeof node !== 'object') return;
	if (node.type === 'element') fn(node);
	const children = node.children;
	if (Array.isArray(children)) for (const child of children) walk(child, fn);
}

/** hast spells `data-footnotes` as `dataFootnotes`; accept either. */
function isFootnotesSection(node) {
	if (node.type !== 'element' || node.tagName !== 'section') return false;
	const props = node.properties ?? {};
	return props.dataFootnotes !== undefined || props.datafootnotes !== undefined;
}

export default function rehypeSidenotes() {
	return function transformer(tree) {
		const sectionIndex = tree.children.findIndex(isFootnotesSection);
		if (sectionIndex === -1) return; // no footnotes on this page

		const section = tree.children[sectionIndex];
		const prose = tree.children.filter((_, i) => i !== sectionIndex);

		// The <ol> marker is suppressed by CSS so the underlined number link is the
		// only number. Safari and VoiceOver strip the list role when list-style is
		// none, which also drops the "3 of 7" position, so put the role back.
		const ol = section.children.find(
			(n) => n.type === 'element' && n.tagName === 'ol',
		);
		if (ol) {
			ol.properties = { ...ol.properties, role: 'list' };
			const items = ol.children.filter((n) => n.type === 'element' && n.tagName === 'li');
			items.forEach((li, index) => {
				const n = index + 1;
				// remark already appends a ↩ backref. It duplicates the number link
				// exactly, so a screen reader hears every destination twice and
				// keyboard users tab through it twice. Keep it clickable for the
				// mouse; remove it from the tab order and the accessibility tree.
				walk(li, (node) => {
					if (node.properties?.dataFootnoteBackref === undefined) return;
					node.properties = {
						...node.properties,
						ariaHidden: 'true',
						tabIndex: -1,
					};
				});
				// remark wraps the note body in a <p>. A <p> is a block box, so the
				// number and the text it labels land on separate lines even though
				// the number is an inline <a> — a bare "1" above its own note. Tag
				// the body so the stylesheet can flow it in beside the number.
				for (const child of li.children) {
					if (child.type !== 'element' || child.tagName !== 'p') continue;
					const existing = child.properties?.className ?? [];
					child.properties = {
						...child.properties,
						className: [...existing, 'note-body'],
					};
				}
				// The single real control: underlined, full contrast, named.
				li.children.unshift({
					type: 'element',
					tagName: 'a',
					properties: {
						className: ['note-num'],
						href: `#${li.properties?.id?.replace(/^user-content-fn-/, 'user-content-fnref-')}`,
						ariaLabel: `Back to reference ${n} in the text`,
					},
					children: [{ type: 'text', value: String(n) }],
				});
			});
		}

		// The heading is visible where the notes are a list in the reading flow,
		// because a bare run of numbered notes at the bottom of a page gives the
		// reader no signal that this is the footnotes section at all. The stylesheet
		// removes it inside the margin column, where the first note has to sit at
		// the top. The <aside> carries the real accessible name either way, so the
		// heading is not duplicated for assistive tech.
		walk(section, (node) => {
			if (node.tagName !== 'h2') return;
			node.properties = { ...node.properties, className: ['notes-heading'] };
		});

		tree.children = [
			{
				type: 'element',
				tagName: 'div',
				properties: { className: ['md-unit'] },
				children: [
					{
						type: 'element',
						tagName: 'article',
						properties: { className: ['prose'] },
						children: prose,
					},
					{
						type: 'element',
						tagName: 'aside',
						properties: { className: ['notes'], ariaLabel: 'Notes' },
						children: [section],
					},
				],
			},
		];
	};
}
