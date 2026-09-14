// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
// export default defineConfig({});

import remarkGithubAlerts from 'remark-github-alerts';
import { legacyRedirectsIntegration } from './scripts/legacy-redirects.mjs';

export default defineConfig({
  site: 'https://isrl.in',
  markdown: {
    remarkPlugins: [remarkGithubAlerts],
  },
  integrations: [legacyRedirectsIntegration()],
});
