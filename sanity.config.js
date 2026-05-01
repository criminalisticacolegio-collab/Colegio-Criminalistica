import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './src/sanity/schemaTypes';

export default defineConfig({
  projectId: '8q7vz6co',
  dataset: 'production',
  plugins: [structureTool()],
  basePath: '/admin-colegio',
  schema: {
    types: schemaTypes,
  },
});
