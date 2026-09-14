// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
// export default defineConfig({});

import { legacyRedirectsIntegration } from './scripts/legacy-redirects.mjs';

export default defineConfig({
  site: 'https://isrl.in',
  integrations: [legacyRedirectsIntegration()],
});
