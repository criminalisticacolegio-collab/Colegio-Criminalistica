export const prerender = false;

import { createClient } from '@sanity/client';
import { adminAuth } from '../../lib/firebase-admin.js';
import { transporter, FROM } from '../../lib/mailer.js';

const sanity = createClient({
  projectId: '8q7vz6co',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-05-03',
});

export const POST = async ({ request }) => {
  if (!adminAuth) {
    return json({ error: 'Servicio no disponible. Contactá a Secretaría.' }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Cuerpo inválido' }, 400);
  }

  const emailRaw = (body?.email || '').trim();
  const email = emailRaw.toLowerCase();
  if (!email || !email.includes('@')) {
    return json({ error: 'Email inválido.' }, 400);
  }

  // ── 1. Buscar en Sanity sin filtrar por estado ──────────────
  let matriculado = null;
  try {
    matriculado = await sanity.fetch(
      `*[_type == "matriculado" && lower(email) == lower($email)][0]{
        _id, nombreCompleto, numeroMatricula, estado, email,
        "especialidad": especialidad->titulo,
        "jurisdiccion": jurisdiccion->titulo
      }`,
      { email }
    );
  } catch (err) {
    console.error('[send-reset-email] Error consultando Sanity:', err.message);
    return json({ error: 'Error interno. Intentá de nuevo.' }, 500);
  }

  // ── 2. No existe en el padrón ──────────────────────────────
  if (!matriculado) {
    console.log('[send-reset-email] Email no encontrado en padrón:', email);
    return json({ notInPadron: true }, 200);
  }

  console.log(`[send-reset-email] Matriculado encontrado: ${matriculado.nombreCompleto} (${matriculado.estado})`);

  // ── 3. Verificar/crear cuenta en Firebase Auth ──────────────
  let esPrimerAcceso = false;
  try {
    await adminAuth.getUserByEmail(email);
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      await adminAuth.createUser({
        email,
        password: matriculado.numeroMatricula,
        displayName: matriculado.nombreCompleto,
        disabled: false,
      });
      await adminAuth.setCustomUserClaims(
        (await adminAuth.getUserByEmail(email)).uid,
        {
          numeroMatricula: matriculado.numeroMatricula,
          estado: matriculado.estado,
          especialidad: matriculado.especialidad || null,
          jurisdiccion: matriculado.jurisdiccion || null,
        }
      );
      esPrimerAcceso = true;
      console.log(`[send-reset-email] Usuario creado en Firebase: ${email}`);
    } else {
      console.error('[send-reset-email] Error verificando Firebase:', err.code);
      return json({ error: 'Error interno. Intentá de nuevo.' }, 500);
    }
  }

  // ── 4. Generar link de reset desde Firebase Admin ──────────
  let resetLink;
  try {
    resetLink = await adminAuth.generatePasswordResetLink(email);
  } catch (err) {
    console.error('[send-reset-email] Error generando reset link:', err.message);
    return json({ error: 'No se pudo generar el link de recuperación.' }, 500);
  }

  // ── 5. Enviar email con template institucional ──────────────
  const nombre = matriculado.nombreCompleto.split(' ')[0];
  const primerAccesoBloque = esPrimerAcceso
    ? `<div style="background:#fff8e1;border:1px solid #ffe082;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0;color:#7c5e00;font-size:14px;line-height:1.6;">
          <strong>Primera vez que ingresás al sistema.</strong><br/>
          Tu contraseña actual es tu número de matrícula:
          <strong style="font-size:16px;letter-spacing:1px;">${matriculado.numeroMatricula}</strong><br/>
          Podés usarla para ingresar o establecer una nueva con el botón de abajo.
        </p>
      </div>`
    : '';

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:0;border-radius:12px;overflow:hidden;">

      <!-- Header -->
      <div style="background:#1a5c2a;padding:32px 40px;text-align:center;">
        <h1 style="color:white;margin:0;font-size:20px;font-weight:700;line-height:1.4;">
          Colegio de Profesionales en<br/>Ciencias Criminalísticas de Catamarca
        </h1>
      </div>

      <!-- Body -->
      <div style="padding:40px;background:white;">
        <h2 style="color:#1a5c2a;font-size:22px;margin:0 0 12px;">Restablecer contraseña</h2>
        <p style="color:#444;line-height:1.6;margin:0 0 24px;">
          Hola <strong>${nombre}</strong>, recibimos una solicitud para restablecer la contraseña
          de tu cuenta asociada a este email.
        </p>

        ${primerAccesoBloque}

        <p style="color:#444;line-height:1.6;margin:0 0 28px;">
          Hacé clic en el botón para establecer una nueva contraseña.
          Este enlace es válido por <strong>1 hora</strong>.
        </p>

        <!-- Botón -->
        <div style="text-align:center;margin-bottom:32px;">
          <a href="${resetLink}"
             style="display:inline-block;background:#1a5c2a;color:white;text-decoration:none;
                    padding:14px 36px;border-radius:8px;font-size:16px;font-weight:700;
                    letter-spacing:0.3px;">
            Restablecer contraseña
          </a>
        </div>

        <p style="color:#888;font-size:13px;line-height:1.5;margin:0;">
          Si no solicitaste este cambio, ignorá este mensaje. Tu contraseña no será modificada.<br/>
          Si tenés problemas para ingresar, contactá a Secretaría del Colegio.
        </p>
      </div>

      <!-- Footer -->
      <div style="background:#1a2d4a;padding:24px 40px;text-align:center;">
        <p style="color:#a0b4c8;font-size:13px;margin:0;line-height:1.6;">
          Colegio de Profesionales en Ciencias Criminalísticas de Catamarca<br/>
          ${matriculado.jurisdiccion ? matriculado.jurisdiccion + ' · ' : ''}${matriculado.numeroMatricula}
        </p>
      </div>

    </div>
  `;

  try {
    await transporter.sendMail({
      from: FROM,
      to: email,
      subject: 'CPCC Catamarca — Restablecer contraseña',
      html,
    });
    console.log(`[send-reset-email] Email enviado OK a ${email} (primerAcceso=${esPrimerAcceso})`);
  } catch (err) {
    console.error('[send-reset-email] Error enviando email:', err.message);
    return json({ error: 'No se pudo enviar el email. Intentá de nuevo o contactá a Secretaría.' }, 500);
  }

  return json({ success: true });
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
