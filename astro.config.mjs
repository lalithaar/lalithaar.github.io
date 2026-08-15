// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
// export default defineConfig({});

import remarkGithubAlerts from 'remark-github-alerts';

export default defineConfig({
  markdown: {
    remarkPlugins: [remarkGithubAlerts],
  },
});
