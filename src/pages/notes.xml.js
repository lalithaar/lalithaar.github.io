import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import { noteTitle } from '../lib/note-title';

export async function GET(context) {
  const notes = await getCollection('notes');

  const items = notes
    .filter((note) => !note.data.draft)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
    .map((note) => {
      const title = noteTitle(note);
      const description =
        note.data.description ||
        (note.body || '')
          .replace(/```[\s\S]*?```/g, ' ')
          .replace(/<!--[\s\S]*?-->/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 240);
      return {
        title,
        description,
        pubDate: note.data.date,
        link: `/notes/${note.id}/`,
      };
    });

  return rss({
    title: 'Lalitha A R - Notes',
    description: 'Micro blog notes, separate from the long-form feed.',
    site: context.site,
    items,
    customData: '<language>en</language>',
  });
}
