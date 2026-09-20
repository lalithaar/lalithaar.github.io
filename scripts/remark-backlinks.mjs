// Build-time backlinks: scans src/pages/*.md, builds a link index, and injects
// a static "Backlinks" section (mirroring the footnote layout) into pages that
// are linked to by other pages. No runtime JavaScript.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PAGES_ROOT = fileURLToPath(new URL('../src/pages/', import.meta.url));

const LINK_REGEX = /\[([^\][]*)\]\(([^)\s]*)\)/g;

let cache = { signature: '', data: null };

function signature(files) {
  let sig = '';
  for (const file of files) {
    const st = statSync(path.join(PAGES_ROOT, file));
    sig += `${file}:${st.mtimeMs}:${st.size};`;
  }
  return sig;
}

function slugFromFilename(filename) {
  const name = filename.replace(/\.(md|markdown)$/i, '');
  return name === 'index' ? '/' : '/' + name;
}

function extractTitle(frontmatter, fallback) {
  const match = /(?:^|\n)title:\s*["']?([^"'\n]+)/.exec(frontmatter ?? '');
  if (!match) return fallback;
  return match[1].replace(/["']$/, '').trim() || fallback;
}

function buildIndex(files) {
  const pages = new Map();
  for (const file of files) {
    const source = readFileSync(path.join(PAGES_ROOT, file), 'utf8');
    const front = /^---\r?\n([\s\S]*?)\r?\n---/.exec(source)?.[1];
    const slug = slugFromFilename(file);
    pages.set(slug, { title: extractTitle(front, slug), source });
  }

  const index = {};
  for (const [fromSlug, page] of pages) {
    // Strip HTML comments so commented-out draft links don't count.
    const src = page.source.replace(/<!--[\s\S]*?-->/g, ' ');
    const regex = new RegExp(LINK_REGEX.source, 'g');
    let match;
    while ((match = regex.exec(src))) {
      const [, text, rawHref] = match;
      const href = rawHref.trim();
      const resolved = resolveHref(href, fromSlug);
      if (!resolved || resolved.target === fromSlug) continue;
      if (!pages.has(resolved.target)) continue; // only link to real pages
      const context = contextFor(src, text, href);
      (index[resolved.target] ??= []).push({
        fromTitle: page.title,
        href: fromSlug, // the page that links here (the linker), not the fragment target
        context,
      });
    }
  }

  for (const target of Object.keys(index)) {
    const seen = new Set();
    index[target] = index[target]
      .filter((entry) => {
        const key = `${entry.fromTitle}|${entry.href}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => a.fromTitle.localeCompare(b.fromTitle));
  }
  return index;
}

function getIndex() {
  const files = readdirSync(PAGES_ROOT).filter((f) => /\.(md|markdown)$/i.test(f));
  const sig = signature(files);
  if (sig !== cache.signature) {
    cache.signature = sig;
    cache.data = buildIndex(files);
  }
  return cache.data;
}

function resolveHref(href, fromSlug) {
  if (!href) return null;
  if (href.startsWith('#') || href.startsWith('mailto:')) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return null; // external scheme

  const [pathname, frag] = href.split('#');
  let target;
  if (pathname.startsWith('/')) {
    target = pathname;
  } else {
    target = path.posix.join(path.posix.dirname(fromSlug), pathname);
  }
  target = target.replace(/\.(md|markdown)$/i, '');
  if (target.length > 1 && target.endsWith('/')) target = target.replace(/\/+$/, '');
  if (target === '/index') target = '/';

  const linkHref = frag ? `${target}#${frag}` : target;
  return { target, href: linkHref };
}

function currentSlug(filePath) {
  let rel = path.relative(PAGES_ROOT, filePath);
  rel = rel.split(path.sep).join('/');
  return slugFromFilename(rel);
}

function contextFor(src, text, href) {
  const lines = src.split(/\r?\n/);
  let lineIndex = lines.findIndex((l) => href && l.includes(href));
  if (lineIndex === -1) lineIndex = lines.findIndex((l) => text && l.includes(text));
  if (lineIndex === -1) return '';

  const isBoundary = (l) => {
    const t = l.trim();
    return t === '' || /^#{1,6}\s/.test(t) || t === '---';
  };

  const upward = [];
  let up = lineIndex - 1;
  while (up >= 0 && !isBoundary(lines[up])) {
    upward.unshift(lines[up]);
    up--;
  }
  const downward = [];
  let down = lineIndex + 1;
  while (down < lines.length && !isBoundary(lines[down])) {
    downward.push(lines[down]);
    down++;
  }

  let flat = [...upward, lines[lineIndex], ...downward].join(' ');
  flat = flat.replace(/\[([^\][]*)\]\([^)\s]*\)/g, (_, t) => t || '');
  flat = flat.replace(/\[\^[^\]]*\](?::)?/g, ''); // footnote markers
  flat = flat.replace(/[*_`~]/g, '');
  flat = flat.replace(/\s+/g, ' ').trim();
  if (!flat) return '';

  const needle = (text || href).replace(/[*_`~]/g, '').trim();
  const pos = needle ? flat.indexOf(needle) : -1;
  if (pos === -1) return flat.slice(0, 200);

  const center = pos + needle.length / 2;
  const start = Math.max(0, center - 90);
  const end = Math.min(flat.length, center + 90);
  let out = flat.slice(start, end).trim();
  if (start > 0) out = '…' + out;
  if (end < flat.length) out += '…';
  return out;
}

function escapeHtml(value, forAttribute = false) {
  return value.replace(forAttribute ? /[&<>"]/g : /[&<>]/g, (ch) => {
    switch (ch) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return ch;
    }
  });
}

function renderBacklinks(backlinks) {
  const items = backlinks
    .map((entry) => {
      const title = escapeHtml(entry.fromTitle);
      const href = escapeHtml(entry.href, true);
      const context = entry.context
        ? `<p class="backlink-context">${escapeHtml(entry.context)}</p>`
        : '';
      return `<li><a href="${href}">${title}</a>${context}</li>`;
    })
    .join('\n');

  return `<hr />\n<section class="backlinks" aria-label="Backlinks">\n<h2 id="backlinks">Backlinks</h2>\n<ul>\n${items}\n</ul>\n</section>`;
}

export default function remarkBacklinks() {
  return function transformer(tree, file) {
    const filePath = file.path ?? file.history?.[0];
    if (!filePath) return;

    const slug = currentSlug(filePath);
    const backlinks = getIndex()[slug];
    if (!backlinks || backlinks.length === 0) return;

    tree.children.push({ type: 'html', value: renderBacklinks(backlinks) });
  };
}