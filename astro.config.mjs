import { defineConfig } from 'astro/config';
import sanity from '@sanity/astro';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import { loadEnv } from 'vite';

const { PUBLIC_SANITY_PROJECT_ID, PUBLIC_SANITY_DATASET } = loadEnv(
  process.env.NODE_ENV || 'development',
  process.cwd(),
  ''
);

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: vercel(),
  integrations: [
    react(),
    sanity({
      projectId: '8q7vz6co',
      dataset: 'production',
    }),
  ],
  vite: {
    plugins: [
      {
        name: 'decode-space-paths',
        enforce: 'pre',
        resolveId(id) {
          if (id.includes('%20')) {
            return decodeURI(id);
          }
        }
      }
    ]
  }
});
