// Build-time RSS feed for the markdown pages in src/pages.
//
// This site keeps its posts as plain .md pages (not a content collection), so
// the feed is assembled by reading those files directly, mirroring the approach
// in scripts/remark-backlinks.mjs. Pages without dates use their last git commit
// date, falling back to the file mtime (and finally the build time) so the feed
// always has something to sort on.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import rss from '@astrojs/rss';

// Astro runs the build from the project root, so anchor to the cwd rather than
// import.meta.url (which points at the bundled entry once the endpoint is built).
const PROJECT_ROOT = process.cwd();
const PAGES_ROOT = path.join(PROJECT_ROOT, 'src', 'pages');

// Homepage has no article body and `ideas` is a gitignored scratch page.
const EXCLUDED = new Set(['index', 'ideas']);

function slugFromFilename(filename) {
  return filename.replace(/\.(md|markdown)$/i, '');
}

function parseFrontmatter(source) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(source);
  if (!match) return {};
  const front = {};
  for (const line of match[1].split(/\r?\n/)) {
    const entry = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!entry) continue;
    let value = entry[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    front[entry[1]] = value;
  }
  return front;
}

function bodyOf(source) {
  const match = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/.exec(source);
  return match ? source.slice(match[0].length) : source;
}

function toExcerpt(body) {
  const cleaned = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
  for (const block of cleaned.split(/\r?\n\s*\r?\n/)) {
    const trimmed = block.trim();
    if (!trimmed || /^#{1,6}\s/.test(trimmed) || /^[>*+-]\s/.test(trimmed)) continue;
    const plain = trimmed
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/\[\^[^\]]*\]/g, ' ')
      .replace(/\$[^$]*\$/g, ' ')
      .replace(/[*_`~#>]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!plain) continue;
    return plain.length > 240 ? plain.slice(0, 240).replace(/\s+\S*$/, '') + '...' : plain;
  }
  return '';
}

function gitDate(relPath) {
  try {
    const out = execFileSync(
      'git',
      ['log', '-1', '--format=%cI', '--', relPath],
      { cwd: PROJECT_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    ).trim();
    return out ? new Date(out) : null;
  } catch {
    return null;
  }
}

function dateFor(front, filename, relPath) {
  const declared = front.date ?? front.pubDate;
  if (declared) {
    const parsed = new Date(declared);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  const fromGit = gitDate(relPath);
  if (fromGit && !Number.isNaN(fromGit.getTime())) return fromGit;
  try {
    return statSync(path.join(PAGES_ROOT, filename)).mtime;
  } catch {
    return new Date();
  }
}

export async function GET(context) {
  const files = readdirSync(PAGES_ROOT).filter((f) => /\.(md|markdown)$/i.test(f));

  const items = files
    .map((filename) => {
      const slug = slugFromFilename(filename);
      if (EXCLUDED.has(slug)) return null;

      const source = readFileSync(path.join(PAGES_ROOT, filename), 'utf8');
      const front = parseFrontmatter(source);
      if (front.draft === 'true') return null;

      const relPath = path.posix.join('src/pages', filename);
      return {
        title: front.title || slug,
        description: front.description || toExcerpt(bodyOf(source)),
        pubDate: dateFor(front, filename, relPath),
        link: `/${slug}/`,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  return rss({
    title: 'Lalitha A R',
    description: 'Under construction whenever my brain cells decide to cooperate.',
    site: context.site,
    items,
    customData: '<language>en</language>',
  });
}
