// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// https://astro.build/config
// export default defineConfig({});

import { legacyRedirectsIntegration } from './scripts/legacy-redirects.mjs';
import remarkBacklinks from './scripts/remark-backlinks.mjs';
import katexFontDiet from './scripts/katex-font-diet.mjs';
import rehypeSidenotes from './scripts/rehype-sidenotes.mjs';

export default defineConfig({
  site: 'https://isrl.in',
  integrations: [legacyRedirectsIntegration(), sitemap()],
  // Markdown ![]() images get a srcset of resized variants plus the matching
  // responsive CSS, instead of a single full-size file.
  image: {
    layout: 'constrained',
    responsiveStyles: true,
  },
  markdown: {
    remarkPlugins: [remarkBacklinks,remarkMath],
    rehypePlugins: [rehypeKatex, rehypeSidenotes],

  },
  vite: {
    plugins: [katexFontDiet()],
  },
});
