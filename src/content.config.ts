import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const notes = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/notes' }),
  schema: z.object({
    title: z.string().optional(),
    date: z.coerce.date().default(() => new Date()),
    description: z.string().optional(),
    draft: z.coerce.boolean().optional().default(false),
  }),
});

export const collections = { notes };
