export const prerender = false;

import { createClient } from '@sanity/client';
import { adminAuth } from '../../lib/firebase-admin.js';

const sanity = createClient({
  projectId: '8q7vz6co',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-05-03',
  token: import.meta.env.SANITY_API_WRITE_TOKEN,
});

export const POST = async ({ request }) => {
  // Solo accesible con ADMIN_SECRET — operación interna, nunca exponer al público
  const secret = import.meta.env.ADMIN_SECRET;
  if (!secret) return json({ error: 'ADMIN_SECRET no configurado' }, 503);
  if (request.headers.get('Authorization') !== `Bearer ${secret}`) {
    return json({ error: 'No autorizado' }, 401);
  }

  if (!adminAuth) {
    return json({ error: 'Firebase Admin no inicializado. Verificá FIREBASE_SERVICE_ACCOUNT en .env' }, 500);
  }

  let matriculados;
  try {
    matriculados = await sanity.fetch(`
      *[_type == "matriculado"]{
        _id,
        email,
        nombreCompleto,
        numeroMatricula,
        estado,
        "especialidad": especialidad->nombre,
        "jurisdiccion": jurisdiccion->nombre
      }
    `);
  } catch (err) {
    console.error('[sincronizar-padron] Error leyendo Sanity:', err.message);
    return json({ error: 'Error leyendo padrón de Sanity: ' + err.message }, 500);
  }

  console.log(`[sincronizar-padron] Padrón cargado: ${matriculados.length} matriculados`);

  let creados = 0;
  let actualizados = 0;
  const errores = [];

  for (const m of matriculados) {
    if (!m.email || !m.numeroMatricula) {
      errores.push({ id: m._id, nombre: m.nombreCompleto, error: 'Faltan email o numeroMatricula' });
      continue;
    }

    const emailNorm = m.email.trim().toLowerCase();

    try {
      let uid;
      let esPrimeroVez = false;

      try {
        const existing = await adminAuth.getUserByEmail(emailNorm);
        uid = existing.uid;
        await adminAuth.updateUser(uid, { displayName: m.nombreCompleto });
        actualizados++;
      } catch (err) {
        if (err.code === 'auth/user-not-found') {
          const created = await adminAuth.createUser({
            email: emailNorm,
            password: m.numeroMatricula,
            displayName: m.nombreCompleto,
            disabled: false,
          });
          uid = created.uid;
          esPrimeroVez = true;
          creados++;
          console.log(`[sincronizar-padron] CREADO: ${emailNorm} (${m.numeroMatricula})`);
        } else {
          throw err;
        }
      }

      await adminAuth.setCustomUserClaims(uid, {
        numeroMatricula: m.numeroMatricula,
        estado: m.estado || 'Activo',
        especialidad: m.especialidad || null,
        jurisdiccion: m.jurisdiccion || null,
      });

      if (esPrimeroVez) {
        console.log(`[sincronizar-padron] Claims seteados para ${emailNorm}: ${m.numeroMatricula} / ${m.estado}`);
      }
    } catch (err) {
      console.error(`[sincronizar-padron] Error con ${emailNorm}:`, err.message);
      errores.push({ email: m.email, nombre: m.nombreCompleto, error: err.message });
    }
  }

  const reporte = {
    total: matriculados.length,
    creados,
    actualizados,
    errores_count: errores.length,
    errores,
  };

  console.log('[sincronizar-padron] Reporte final:', JSON.stringify(reporte));
  return json(reporte);
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
