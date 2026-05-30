export const prerender = false;

/**
 * POST /api/sync-matriculados
 * Sincroniza TODOS los matriculados de Sanity con Firebase Auth.
 * Crea la cuenta si no existe, actualiza claims si ya existe.
 * Requiere: Authorization: Bearer ADMIN_SECRET
 */

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
  const secret = import.meta.env.ADMIN_SECRET;
  if (!secret) return json({ error: 'ADMIN_SECRET no configurado' }, 503);
  if (request.headers.get('Authorization') !== `Bearer ${secret}`) {
    return json({ error: 'No autorizado' }, 401);
  }
  if (!adminAuth) return json({ error: 'Firebase Admin no inicializado' }, 500);

  // Traer todos los matriculados con email y número de matrícula
  let matriculados;
  try {
    matriculados = await sanity.fetch(`
      *[_type == "matriculado" && defined(email) && defined(numeroMatricula)]{
        _id, email, nombreCompleto, numeroMatricula, estado,
        "especialidad": especialidad->titulo,
        "jurisdiccion": jurisdiccion->titulo
      }
    `);
  } catch (err) {
    return json({ error: 'Error consultando Sanity: ' + err.message }, 500);
  }

  const resultados = { creados: [], actualizados: [], errores: [] };

  for (const mat of matriculados) {
    const email = mat.email?.trim().toLowerCase();
    if (!email) continue;

    try {
      let uid;
      let operacion;

      try {
        const existing = await adminAuth.getUserByEmail(email);
        uid = existing.uid;
        await adminAuth.updateUser(uid, { displayName: mat.nombreCompleto });
        operacion = 'actualizado';
        resultados.actualizados.push(email);
      } catch (err) {
        if (err.code === 'auth/user-not-found') {
          const created = await adminAuth.createUser({
            email,
            password: mat.numeroMatricula,
            displayName: mat.nombreCompleto,
            disabled: false,
          });
          uid = created.uid;
          operacion = 'creado';
          resultados.creados.push(email);
        } else {
          throw err;
        }
      }

      await adminAuth.setCustomUserClaims(uid, {
        numeroMatricula: mat.numeroMatricula,
        estado: mat.estado || 'Activo',
        especialidad: mat.especialidad || null,
        jurisdiccion: mat.jurisdiccion || null,
      });

      console.log(`[sync-matriculados] ${operacion.toUpperCase()}: ${email}`);
    } catch (err) {
      console.error(`[sync-matriculados] ERROR con ${email}:`, err.message);
      resultados.errores.push({ email, error: err.message });
    }
  }

  console.log(`[sync-matriculados] Completado — creados: ${resultados.creados.length}, actualizados: ${resultados.actualizados.length}, errores: ${resultados.errores.length}`);

  return json({
    ok: true,
    total: matriculados.length,
    creados: resultados.creados.length,
    actualizados: resultados.actualizados.length,
    errores: resultados.errores.length,
    detalle: resultados,
  });
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
