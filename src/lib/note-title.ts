interface NoteLike {
  data: { title?: string };
  body?: string;
}

/** Strip markdown syntax so the derived title reads like plain text. */
function plainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/[*_~>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Title for a note: the frontmatter title when present, otherwise the first
 * few words of the body. Used for <title> tags and RSS at build time.
 */
export function noteTitle(note: NoteLike, maxWords = 8, maxChars = 70): string {
  const explicit = note.data.title?.trim();
  if (explicit) return explicit;

  const text = plainText(note.body ?? '');
  if (!text) return 'Untitled note';

  const words = text.split(' ').slice(0, maxWords).join(' ');
  return words.length > maxChars ? `${words.slice(0, maxChars).trimEnd()}…` : words;
}
