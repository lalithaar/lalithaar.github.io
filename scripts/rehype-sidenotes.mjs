import { visit } from 'unist-util-visit';

function clone(node) {
	if (node.type === 'text') {
		return { type: 'text', value: node.value };
	}
	return {
		...node,
		properties: node.properties ? { ...node.properties } : undefined,
		children: node.children?.map(clone),
		position: undefined,
	};
}

function removeBy(predicate) {
	return function prune(node) {
		if (!node.children) return;
		node.children = node.children.filter((child) => {
			if (predicate(child)) return false;
			prune(child);
			return true;
		});
	};
}

const FLATTEN = new Set(['p', 'li']);

function flattenBlocks(node) {
	if (!node.children?.length) return;
	for (let i = node.children.length - 1; i >= 0; i--) {
		const child = node.children[i];
		if (child.type !== 'element') continue;
		flattenBlocks(child);
		if (FLATTEN.has(child.tagName)) {
			node.children.splice(i, 1, ...(child.children ?? []));
		}
	}
}

export default function rehypeSidenotes() {
	return (tree) => {
		let footnotes = null;

		visit(tree, (node) => {
			if (
				node.type === 'element' &&
				node.tagName === 'section' &&
				node.properties?.dataFootnotes !== undefined
			) {
				footnotes = node;
				return visit.SKIP;
			}
		});

		if (!footnotes) return;

		const notes = new Map();
		visit(footnotes, (node) => {
			if (
				node.type === 'element' &&
				node.tagName === 'li' &&
				typeof node.properties?.id === 'string' &&
				node.properties.id.startsWith('user-content-fn-')
			) {
				notes.set(node.properties.id, node);
				return visit.SKIP;
			}
		});

		if (notes.size === 0) return;

		const isBackref = (node) => node.type === 'element' && node.properties?.dataFootnoteBackref !== undefined;

		const walkChildren = (parentNode) => {
			const children = parentNode.children ?? [];
			for (const node of children) {
				if (node.type !== 'element' || !node.children) continue;

				if (node.tagName === 'sup') {
					const ref = node.children[0];
					if (ref?.type !== 'element' || ref.tagName !== 'a') {
						walkChildren(node);
						continue;
					}
					const href = ref.properties?.href;
					if (typeof href !== 'string' || !href.startsWith('#user-content-fn-')) {
						walkChildren(node);
						continue;
					}

					const id = href.slice(1);
					const li = notes.get(id);
					if (!li) {
						walkChildren(node);
						continue;
					}

					const index = parentNode.children.indexOf(node);
					const already = parentNode.children[index + 1];
					if (already?.type === 'element' && already.properties?.dataSidenote !== undefined) {
						walkChildren(node);
						continue;
					}

					const body = clone(li);
					removeBy(isBackref)(body);
					flattenBlocks(body);

					const number = id.slice('user-content-fn-'.length);

					parentNode.children.splice(index + 1, 0, {
						type: 'element',
						tagName: 'span',
						properties: {
							className: ['sidenote'],
							dataNote: number,
							id: `sidenote-fn-${number}`,
							dataSidenote: '',
						},
						children: body.children,
					});
				}

				walkChildren(node);
			}
		};

		for (const child of tree.children ?? []) {
			walkChildren(child);
		}
	};
}