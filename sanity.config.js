import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './src/sanity/schemaTypes';
import { deskStructure } from './deskStructure';
import { useState } from 'react';

// URL base de la web (Vercel). Se configura en .env como SANITY_STUDIO_API_BASE
const API_BASE = (import.meta.env.SANITY_STUDIO_API_BASE || '').replace(/\/$/, '');

function ReenviarBienvenidaAction({ id, onComplete }) {
  return {
    label: '📧 Reenviar bienvenida',
    onHandle: async () => {
      try {
        const res = await fetch(`${API_BASE}/api/bienvenida-matriculado`, {
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
        const res = await fetch(`${API_BASE}/api/otorgar-matricula`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.SANITY_STUDIO_WEBHOOK_SECRET || ''}`,
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
  schema: {
    types: schemaTypes,
  },
  document: {
    actions: (prev, context) => {
      if (context.schemaType === 'aspirante') {
        return [...prev, OtorgarMatriculaAction];
      }
      if (context.schemaType === 'matriculado') {
        return [ReenviarBienvenidaAction, ...prev];
      }
      return prev;
    },
  },
});
