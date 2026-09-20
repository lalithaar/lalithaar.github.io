// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// https://astro.build/config
// export default defineConfig({});

import { legacyRedirectsIntegration } from './scripts/legacy-redirects.mjs';
import remarkBacklinks from './scripts/remark-backlinks.mjs';

export default defineConfig({
  site: 'https://isrl.in',
  integrations: [legacyRedirectsIntegration(), sitemap()],
  markdown: {
    remarkPlugins: [remarkBacklinks,remarkMath],
    rehypePlugins: [rehypeKatex],

  },
});
