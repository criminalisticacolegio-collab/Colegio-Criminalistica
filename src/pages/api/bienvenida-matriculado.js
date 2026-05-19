export const prerender = false;

import { adminAuth } from '../../lib/firebase-admin.js';
import { enviarBienvenida } from '../../lib/email.js';
import { createClient } from '@sanity/client';

const sanity = createClient({
  projectId: '8q7vz6co',
  dataset: 'production',
  apiVersion: '2023-05-03',
  token: import.meta.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
});

export const POST = async ({ request }) => {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Cuerpo inválido' }, 400);
  }

  const { _id, forzar = false } = body;

  // Validar secret de webhook si está configurado
  const webhookSecret = import.meta.env.SANITY_WEBHOOK_SECRET;
  if (webhookSecret) {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (token !== webhookSecret && !forzar) {
      return json({ error: 'No autorizado' }, 401);
    }
  }

  if (!_id) return json({ error: 'ID de matriculado requerido' }, 400);

  // Obtener datos completos del matriculado desde Sanity
  let mat;
  try {
    mat = await sanity.fetch(
      `*[_type == "matriculado" && _id == $id][0]{
        _id, nombreCompleto, email, numeroMatricula, estado, accesoEnviado,
        "especialidad": especialidad->titulo,
        "jurisdiccion":  jurisdiccion->titulo
      }`,
      { id: _id }
    );
  } catch (e) {
    console.error('[bienvenida] Error consultando Sanity:', e);
    return json({ error: 'Error consultando el padrón' }, 500);
  }

  if (!mat)             return json({ error: 'Matriculado no encontrado' }, 404);
  if (mat.estado !== 'Activo') return json({ skipped: 'No está activo' }, 200);
  if (mat.accesoEnviado && !forzar) return json({ skipped: 'Email ya enviado anteriormente' }, 200);
  if (!mat.email)       return json({ error: 'El matriculado no tiene email registrado' }, 400);

  if (!adminAuth) {
    return json({
      error: 'FIREBASE_SERVICE_ACCOUNT no configurado. Obtenerla en Firebase Console → Configuración → Cuentas de servicio → Generar nueva clave privada.',
    }, 503);
  }

  // 1. Crear usuario en Firebase Auth (o recuperar si ya existe)
  let resetLink;
  try {
    try {
      await adminAuth.createUser({ email: mat.email, emailVerified: false });
    } catch (createErr) {
      if (createErr.code !== 'auth/email-already-exists') throw createErr;
    }
    resetLink = await adminAuth.generatePasswordResetLink(mat.email);
  } catch (e) {
    console.error('[bienvenida] Error Firebase Admin:', e);
    return json({ error: `Error Firebase: ${e.message}` }, 500);
  }

  // 2. Enviar email de bienvenida por Resend
  try {
    await enviarBienvenida({
      nombreCompleto: mat.nombreCompleto,
      email:           mat.email,
      numeroMatricula: mat.numeroMatricula,
      especialidad:    mat.especialidad  || '—',
      jurisdiccion:    mat.jurisdiccion  || '—',
      resetLink,
    });
  } catch (e) {
    console.error('[bienvenida] Error enviando email:', e);
    return json({ error: 'Error al enviar el email de bienvenida' }, 500);
  }

  // 3. Registrar en Sanity que el email fue enviado
  try {
    await sanity.patch(_id).set({
      accesoEnviado:    true,
      fechaEnvioAcceso: new Date().toISOString().split('T')[0],
    }).commit();
  } catch (e) {
    console.warn('[bienvenida] No se pudo actualizar Sanity:', e.message);
  }

  return json({ ok: true, email: mat.email });
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
