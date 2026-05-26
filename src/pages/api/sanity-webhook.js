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
  let uid;
  let operacion;

  try {
    const existing = await adminAuth.getUserByEmail(emailNorm);
    uid = existing.uid;
    await adminAuth.updateUser(uid, { displayName: matriculado.nombreCompleto });
    operacion = 'actualizado';
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      const created = await adminAuth.createUser({
        email: emailNorm,
        password: matriculado.numeroMatricula,
        displayName: matriculado.nombreCompleto,
        disabled: false,
      });
      uid = created.uid;
      operacion = 'creado';
    } else {
      throw err;
    }
  }

  await adminAuth.setCustomUserClaims(uid, {
    numeroMatricula: matriculado.numeroMatricula,
    estado: matriculado.estado || 'Activo',
    especialidad: matriculado.especialidad || null,
    jurisdiccion: matriculado.jurisdiccion || null,
  });

  return { uid, operacion };
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
        _id, email, nombreCompleto, numeroMatricula, estado,
        "especialidad": especialidad->nombre,
        "jurisdiccion": jurisdiccion->nombre
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

  try {
    const resultado = await sincronizarConFirebase(matriculado);
    console.log(`[sanity-webhook] ${resultado.operacion.toUpperCase()}: ${matriculado.email} (uid: ${resultado.uid})`);
    return json({ ok: true, operacion: resultado.operacion, email: matriculado.email, uid: resultado.uid });
  } catch (err) {
    console.error('[sanity-webhook] Error sincronizando con Firebase:', err.message);
    return json({ error: err.message }, 500);
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
