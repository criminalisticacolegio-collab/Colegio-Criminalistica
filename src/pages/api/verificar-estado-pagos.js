export const prerender = false;

import { createClient } from '@sanity/client';
import { enviarSuspensionColegio } from '../../lib/email.js';
import { adminAuth } from '../../lib/firebase-admin.js';

const sanityRead = createClient({
  projectId: '8q7vz6co',
  dataset: 'production',
  apiVersion: '2023-05-03',
  useCdn: false,
});

const sanityWrite = createClient({
  projectId: '8q7vz6co',
  dataset: 'production',
  apiVersion: '2023-05-03',
  token: import.meta.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
});

const MESES_ORDEN = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function contarMesesPendientesConsecutivos(historialPagos) {
  if (!historialPagos || historialPagos.length === 0) return { count: 0, meses: [] };

  // Ordenar descendente por año y mes
  const sorted = [...historialPagos].sort((a, b) => {
    if (b.anio !== a.anio) return b.anio - a.anio;
    return MESES_ORDEN.indexOf(b.mes) - MESES_ORDEN.indexOf(a.mes);
  });

  const pendientes = [];
  for (const entrada of sorted) {
    if (entrada.estado === 'pendiente') {
      pendientes.push(entrada);
    } else {
      break; // se corta la racha consecutiva
    }
  }

  return { count: pendientes.length, meses: pendientes };
}

export const POST = async ({ request }) => {
  // Verificar Firebase Bearer token — solo el propio matriculado puede ver sus datos
  if (!adminAuth) return json({ error: 'Auth no disponible' }, 503);

  const rawToken = request.headers.get('Authorization')?.replace('Bearer ', '') || '';
  if (!rawToken) return json({ error: 'No autorizado' }, 401);

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(rawToken);
  } catch {
    return json({ error: 'Token inválido o expirado' }, 401);
  }

  // Email extraído del token verificado — no se confía en el body
  const email = decoded.email;
  if (!email) return json({ error: 'Token sin email' }, 401);

  let mat;
  try {
    mat = await sanityRead.fetch(
      `*[_type == "matriculado" && email == $email][0]{
        _id, nombreCompleto, numeroMatricula, email, estado,
        "especialidad": especialidad->titulo,
        "jurisdiccion": jurisdiccion->titulo,
        historialPagos
      }`,
      { email }
    );
  } catch (e) {
    console.error('[verificar-pagos] Error Sanity:', e);
    return json({ error: 'Error consultando el padrón' }, 500);
  }

  if (!mat) return json({ error: 'Matriculado no encontrado' }, 404);

  const { count: mesesPendientes, meses } = contarMesesPendientesConsecutivos(mat.historialPagos || []);

  // Auto-suspender si 3 o más meses consecutivos y aún no está Suspendido
  if (mesesPendientes >= 3 && mat.estado !== 'Suspendido') {
    try {
      await sanityWrite.patch(mat._id).set({ estado: 'Suspendido' }).commit();
      mat.estado = 'Suspendido';
    } catch (e) {
      console.warn('[verificar-pagos] No se pudo actualizar estado en Sanity:', e.message);
    }

    // Email automático al colegio
    try {
      await enviarSuspensionColegio({
        nombreCompleto: mat.nombreCompleto,
        numeroMatricula: mat.numeroMatricula,
        email: mat.email,
        especialidad: mat.especialidad,
        jurisdiccion: mat.jurisdiccion,
        mesesPendientes: meses,
      });
    } catch (e) {
      console.warn('[verificar-pagos] No se pudo enviar email de suspensión:', e.message);
    }
  }

  return json({
    ok: true,
    estado: mat.estado,
    mesesPendientesConsecutivos: mesesPendientes,
    mesesPendientes: meses,
    historialPagos: mat.historialPagos || [],
  });
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
