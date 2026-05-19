import { createClient } from '@sanity/client';
import { adminAuth } from '../../lib/firebase-admin.js';
import { enviarResetPassword } from '../../lib/email.js';

export const prerender = false;

const sanity = createClient({
  projectId: '8q7vz6co',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-05-03',
});

export const POST = async ({ request }) => {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Cuerpo inválido' }, 400);
  }

  const email = (body?.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return json({ error: 'Email inválido.' }, 400);
  }

  // ── 1. Verificar que el email esté en el padrón activo ──────
  let matriculado = null;
  try {
    matriculado = await sanity.fetch(
      `*[_type == "matriculado" && (email == $email || email == $emailOriginal)][0]{
        nombreCompleto, email, estado
      }`,
      { email, emailOriginal: body.email?.trim() }
    );
  } catch (err) {
    console.error('[send-reset-email] Error consultando Sanity:', err.message);
    return json({ error: 'Error interno. Intentá de nuevo.' }, 500);
  }

  if (!matriculado) {
    // Respuesta genérica para no revelar qué emails están registrados
    return json({
      error: 'Este email no está registrado en el padrón del Colegio. Contactá a Secretaría si crees que es un error.',
    }, 404);
  }

  // ── 2. Verificar Firebase Admin disponible ──────────────────
  if (!adminAuth) {
    console.error('[send-reset-email] adminAuth no disponible — FIREBASE_SERVICE_ACCOUNT faltante.');
    return json({
      error: 'Sistema de acceso no disponible. Contactá a Secretaría.',
    }, 503);
  }

  // ── 3. Generar link de reseteo (crea el usuario si no existe) ─
  let resetLink;
  try {
    resetLink = await adminAuth.generatePasswordResetLink(email);
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      // Primera vez: el matriculado existe en Sanity pero no en Firebase → lo creamos
      try {
        await adminAuth.createUser({ email, emailVerified: false });
        resetLink = await adminAuth.generatePasswordResetLink(email);
      } catch (createErr) {
        console.error('[send-reset-email] Error creando usuario Firebase:', createErr.code, createErr.message);
        return json({ error: 'No se pudo crear el acceso. Contactá a Secretaría.' }, 500);
      }
    } else {
      console.error('[send-reset-email] Error generando link:', err.code, err.message);
      return json({ error: 'No se pudo generar el link de acceso. Intentá de nuevo.' }, 500);
    }
  }

  // ── 4. Enviar email vía Resend ──────────────────────────────
  try {
    await enviarResetPassword({
      nombre: matriculado.nombreCompleto || '',
      email,
      resetLink,
    });
  } catch (err) {
    console.error('[send-reset-email] Error enviando email:', err);
    return json({ error: 'No se pudo enviar el email. Revisá la configuración de Resend.' }, 500);
  }

  return json({ success: true });
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
