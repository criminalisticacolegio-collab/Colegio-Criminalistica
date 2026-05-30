export const prerender = false;

import { createClient } from '@sanity/client';
import { adminAuth } from '../../lib/firebase-admin.js';
import { enviarNotificacionSuspension, enviarReactivacion } from '../../lib/email.js';

const sanity = createClient({
  projectId: '8q7vz6co',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-05-03',
  token: import.meta.env.SANITY_API_WRITE_TOKEN,
});

// Verifica firma HMAC si está configurado SANITY_WEBHOOK_SECRET
async function verificarFirma(request, bodyText) {
  const secret = import.meta.env.SANITY_WEBHOOK_SECRET;
  if (!secret) return true; // Sin secret configurado, skip verificación

  const signature = request.headers.get('sanity-webhook-signature');
  if (!signature) return false;

  const ts = signature.split(',').find(p => p.startsWith('t='))?.split('=')[1];
  const v1 = signature.split(',').find(p => p.startsWith('v1='))?.split('=')[1];
  if (!ts || !v1) return false;

  const payload = `${ts}.${bodyText}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  return computed === v1;
}

async function sincronizarConFirebase(matriculado) {
  if (!matriculado?.email || !matriculado?.numeroMatricula) {
    throw new Error('Faltan email o numeroMatricula en el documento');
  }

  const emailNorm = matriculado.email.trim().toLowerCase();
  let uid = null;
  let operacion;
  let oldEstado = null;

  // ── Paso 1: buscar por UID guardado en Sanity (más confiable) ──
  if (matriculado.firebaseUid) {
    try {
      const existing = await adminAuth.getUser(matriculado.firebaseUid);
      uid = existing.uid;
      oldEstado = existing.customClaims?.estado || 'Activo';
      const updates = { displayName: matriculado.nombreCompleto };
      if (existing.email !== emailNorm) {
        updates.email = emailNorm;
        console.log(`[sanity-webhook] Email actualizado: ${existing.email} → ${emailNorm}`);
      }
      await adminAuth.updateUser(uid, updates);
      operacion = 'actualizado';
    } catch (err) {
      if (err.code !== 'auth/user-not-found') throw err;
      uid = null; // UID desactualizado, seguir buscando
    }
  }

  // ── Paso 2: buscar por email actual ───────────────────────────
  if (!uid) {
    try {
      const existing = await adminAuth.getUserByEmail(emailNorm);
      uid = existing.uid;
      oldEstado = existing.customClaims?.estado || 'Activo';
      await adminAuth.updateUser(uid, { displayName: matriculado.nombreCompleto });
      operacion = 'actualizado';
    } catch (err) {
      if (err.code !== 'auth/user-not-found') throw err;
    }
  }

  // ── Paso 3: buscar por numeroMatricula en claims (email cambió) ─
  if (!uid) {
    try {
      let pageToken;
      do {
        const page = await adminAuth.listUsers(1000, pageToken);
        for (const user of page.users) {
          if (user.customClaims?.numeroMatricula === matriculado.numeroMatricula) {
            uid = user.uid;
            oldEstado = user.customClaims?.estado || 'Activo';
            const updates = { displayName: matriculado.nombreCompleto };
            if (user.email !== emailNorm) {
              updates.email = emailNorm;
              console.log(`[sanity-webhook] Email corregido por matrícula ${matriculado.numeroMatricula}: ${user.email} → ${emailNorm}`);
            }
            await adminAuth.updateUser(uid, updates);
            operacion = 'actualizado';
            break;
          }
        }
        pageToken = page.pageToken;
      } while (pageToken && !uid);
    } catch (err) {
      console.error('[sanity-webhook] Error en búsqueda por matrícula:', err.message);
    }
  }

  // ── Paso 4: no existe — crear cuenta nueva ────────────────────
  if (!uid) {
    const created = await adminAuth.createUser({
      email: emailNorm,
      password: matriculado.numeroMatricula,
      displayName: matriculado.nombreCompleto,
      disabled: false,
    });
    uid = created.uid;
    operacion = 'creado';
    console.log(`[sanity-webhook] Cuenta nueva creada: ${emailNorm}`);
  }

  // ── Claims ────────────────────────────────────────────────────
  await adminAuth.setCustomUserClaims(uid, {
    numeroMatricula: matriculado.numeroMatricula,
    estado: matriculado.estado || 'Activo',
    especialidad: matriculado.especialidad || null,
    jurisdiccion: matriculado.jurisdiccion || null,
  });

  // ── Guardar UID en Sanity para futuros lookups ────────────────
  try {
    await sanity.patch(matriculado._id).set({ firebaseUid: uid }).commit();
  } catch (e) {
    console.warn('[sanity-webhook] No se pudo guardar firebaseUid:', e.message);
  }

  return { uid, operacion, oldEstado };
}

export const POST = async ({ request }) => {
  if (!adminAuth) {
    return json({ error: 'Firebase Admin no inicializado' }, 500);
  }

  let bodyText;
  try {
    bodyText = await request.text();
  } catch {
    return json({ error: 'No se pudo leer el body' }, 400);
  }

  const firmaValida = await verificarFirma(request, bodyText);
  if (!firmaValida) {
    console.warn('[sanity-webhook] Firma inválida, rechazando');
    return json({ error: 'Firma inválida' }, 401);
  }

  let payload;
  try {
    payload = JSON.parse(bodyText);
  } catch {
    return json({ error: 'JSON inválido' }, 400);
  }

  const docId = payload._id;
  const docType = payload._type;

  if (docType !== 'matriculado') {
    return json({ ok: true, message: `Tipo "${docType}" ignorado` });
  }

  console.log(`[sanity-webhook] Evento recibido para matriculado _id: ${docId}`);

  // Fetch documento completo desde Sanity con campos dereferenciados
  let matriculado;
  try {
    matriculado = await sanity.fetch(
      `*[_type == "matriculado" && _id == $id][0]{
        _id, email, nombreCompleto, numeroMatricula, estado, firebaseUid,
        "especialidad": especialidad->titulo,
        "jurisdiccion": jurisdiccion->titulo
      }`,
      { id: docId }
    );
  } catch (err) {
    console.error('[sanity-webhook] Error leyendo documento desde Sanity:', err.message);
    return json({ error: 'Error consultando Sanity: ' + err.message }, 500);
  }

  if (!matriculado) {
    console.warn(`[sanity-webhook] Documento ${docId} no encontrado en Sanity (puede ser un borrado)`);
    return json({ ok: true, message: 'Documento no encontrado, puede haberse eliminado' });
  }

  let resultado;
  try {
    resultado = await sincronizarConFirebase(matriculado);
    console.log(`[sanity-webhook] ${resultado.operacion.toUpperCase()}: ${matriculado.email} (uid: ${resultado.uid})`);
  } catch (err) {
    console.error('[sanity-webhook] Error sincronizando con Firebase:', err.message);
    return json({ error: err.message }, 500);
  }

  const eraActivo = resultado.oldEstado === 'Activo';
  const eraSuspendido = resultado.oldEstado === 'Suspendido' || resultado.oldEstado === 'Baja';
  const ahoraActivo = matriculado.estado === 'Activo';
  const ahoraSuspendido = matriculado.estado === 'Suspendido' || matriculado.estado === 'Baja';

  // Activo → Suspendido/Baja: notificar suspensión
  if (eraActivo && ahoraSuspendido) {
    try {
      await enviarNotificacionSuspension({
        nombreCompleto: matriculado.nombreCompleto,
        email: matriculado.email,
        numeroMatricula: matriculado.numeroMatricula,
        estado: matriculado.estado,
      });
      console.log(`[sanity-webhook] Email de suspensión enviado a: ${matriculado.email}`);
    } catch (e) {
      console.error(`[sanity-webhook] ERROR enviando email de suspensión a ${matriculado.email}:`, e.message, e.stack);
    }
  }

  // Suspendido/Baja → Activo: notificar reactivación
  if (eraSuspendido && ahoraActivo) {
    try {
      await enviarReactivacion({
        nombreCompleto: matriculado.nombreCompleto,
        email: matriculado.email,
        numeroMatricula: matriculado.numeroMatricula,
      });
      console.log(`[sanity-webhook] Email de reactivación enviado a: ${matriculado.email}`);
    } catch (e) {
      console.error(`[sanity-webhook] ERROR enviando email de reactivación a ${matriculado.email}:`, e.message, e.stack);
    }
  }

  return json({ ok: true, operacion: resultado.operacion, email: matriculado.email, uid: resultado.uid });
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
