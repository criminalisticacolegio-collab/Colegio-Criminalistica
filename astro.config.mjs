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

// Acción personalizada para reenviar email de bienvenida desde Sanity Studio
function ReenviarBienvenidaAction({ id, onComplete }) {
  return {
    label: '📧 Reenviar email de bienvenida',
    onHandle: async () => {
      try {
        const res = await fetch('/api/bienvenida-matriculado', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ _id: id, forzar: true }),
        });
        const d = await res.json();
        if (res.ok) {
          alert(`✅ Email de bienvenida enviado a ${d.email}`);
        } else {
          alert(`❌ ${d.error || 'Error al enviar'}`);
        }
      } catch {
        alert('❌ Error de conexión al enviar el email');
      }
      if (onComplete) onComplete();
    },
  };
}

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: vercel(),
  integrations: [
    react(),
    sanity({
      projectId: '8q7vz6co',
      dataset: 'production',
      studioBasePath: '/admin-colegio',
      document: {
        actions: (prev, ctx) =>
          ctx.schemaType === 'matriculado'
            ? [ReenviarBienvenidaAction, ...prev]
            : prev,
      },
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
