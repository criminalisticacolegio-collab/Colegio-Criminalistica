import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './src/sanity/schemaTypes';
import { deskStructure } from './deskStructure';
import { useState } from 'react';

function OtorgarMatriculaAction(props) {
  const [isLoading, setIsLoading] = useState(false);
  const doc = props.draft || props.published;

  return {
    label: isLoading ? 'Procesando...' : '🎓 Otorgar Matrícula',
    disabled: isLoading,
    tone: doc?.numeroMatricula ? 'positive' : 'default',
    onHandle: async () => {
      if (!doc?.numeroMatricula) {
        alert('⚠️ Completá el campo "Número de Matrícula" antes de otorgar.');
        props.onComplete();
        return;
      }
      setIsLoading(true);
      try {
        const res = await fetch('/api/otorgar-matricula', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.PUBLIC_ADMIN_SECRET || ''}`,
          },
          body: JSON.stringify({
            aspiranteId: doc._id,
            numeroMatricula: doc.numeroMatricula,
          }),
        });
        const result = await res.json();
        if (result.success) {
          alert('✅ Matrícula otorgada. El profesional fue agregado al padrón y recibirá el email de bienvenida.');
        } else {
          alert('❌ Error: ' + (result.message || 'Error desconocido'));
        }
      } catch (err) {
        alert('❌ Error de conexión: ' + err.message);
      } finally {
        setIsLoading(false);
        props.onComplete();
      }
    },
  };
}

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
  document: {
    actions: (prev, context) => {
      if (context.schemaType === 'aspirante') {
        return [...prev, OtorgarMatriculaAction];
      }
      return prev;
    },
  },
});
