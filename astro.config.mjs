// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
// export default defineConfig({});

import { legacyRedirectsIntegration } from './scripts/legacy-redirects.mjs';

export default defineConfig({
  site: 'https://isrl.in',
  integrations: [legacyRedirectsIntegration(), sitemap()],
});
