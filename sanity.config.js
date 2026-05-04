import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './src/sanity/schemaTypes';
import { deskStructure } from './deskStructure';

export default defineConfig({
  projectId: '8q7vz6co',
  dataset: 'production',
  plugins: [
    structureTool({
      structure: deskStructure,
    }),
  ],
  basePath: '/admin-colegio',
  schema: {
    types: schemaTypes,
  },
});
