export const prerender = false;

import { createClient } from '@sanity/client';
import { adminAuth } from '../../lib/firebase-admin.js';
import { enviarBienvenidaMatriculacion } from '../../lib/email.js';

const sanity = createClient({
  projectId: '8q7vz6co',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-05-03',
  token: import.meta.env.SANITY_API_WRITE_TOKEN,
});

async function verificarFirma(request, bodyText) {
  const secret = import.meta.env.SANITY_WEBHOOK_SECRET;
  if (!secret) return true;

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

export const POST = async ({ request }) => {
  let bodyText;
  try {
    bodyText = await request.text();
  } catch {
    return json({ error: 'No se pudo leer el body' }, 400);
  }

  const firmaValida = await verificarFirma(request, bodyText);
  if (!firmaValida) {
    console.warn('[webhook-aspirante] Firma inválida, rechazando');
    return json({ error: 'Firma inválida' }, 401);
  }

  let payload;
  try {
    payload = JSON.parse(bodyText);
  } catch {
    return json({ error: 'JSON inválido' }, 400);
  }

  const docType = payload._type;
  const docId = payload._id;

  if (docType !== 'aspirante') {
    return json({ ok: true, message: `Tipo "${docType}" ignorado` });
  }

  // Fetch aspirante completo desde Sanity
  let aspirante;
  try {
    aspirante = await sanity.fetch(
      `*[_type == "aspirante" && _id == $id][0]{
        _id, nombre, apellido, dni, email, cuil, telefono,
        tituloProfesional, jurisdiccion, numeroMatricula
      }`,
      { id: docId }
    );
  } catch (err) {
    console.error('[webhook-aspirante] Error leyendo aspirante:', err.message);
    return json({ error: 'Error consultando Sanity: ' + err.message }, 500);
  }

  if (!aspirante) {
    return json({ ok: true, message: 'Aspirante no encontrado (puede haberse eliminado)' });
  }

  // Solo actuar cuando se asigna número de matrícula
  if (!aspirante.numeroMatricula) {
    return json({ ok: true, message: 'Aspirante sin numeroMatricula, ignorado' });
  }

  if (!aspirante.email) {
    return json({ error: 'El aspirante no tiene email' }, 422);
  }

  const emailNorm = aspirante.email.trim().toLowerCase();
  const nombreCompleto = `${aspirante.nombre} ${aspirante.apellido}`.trim();

  // Verificar que no existe ya un matriculado con ese email
  let matriculadoExistente;
  try {
    matriculadoExistente = await sanity.fetch(
      `*[_type == "matriculado" && email == $email][0]._id`,
      { email: emailNorm }
    );
  } catch (err) {
    console.error('[webhook-aspirante] Error buscando matriculado duplicado:', err.message);
    return json({ error: 'Error verificando duplicados: ' + err.message }, 500);
  }

  if (matriculadoExistente) {
    console.log(`[webhook-aspirante] Matriculado ya existe para ${emailNorm}, omitiendo`);
    return json({ ok: true, message: 'Matriculado ya existe, omitido' });
  }

  // Buscar referencia de jurisdicción por titulo
  let jurisdiccionRef = null;
  let jurisdiccionTitulo = aspirante.jurisdiccion || '';
  if (aspirante.jurisdiccion) {
    try {
      const jDoc = await sanity.fetch(
        `*[_type == "jurisdiccion" && titulo == $t][0]{ _id, titulo }`,
        { t: aspirante.jurisdiccion }
      );
      if (jDoc?._id) {
        jurisdiccionRef = { _type: 'reference', _ref: jDoc._id };
        jurisdiccionTitulo = jDoc.titulo;
      }
    } catch {
      // No bloqueamos si no se encuentra la referencia
    }
  }

  // Crear documento matriculado en Sanity
  const nuevoMatriculado = {
    _type: 'matriculado',
    nombreCompleto,
    email: emailNorm,
    numeroMatricula: aspirante.numeroMatricula,
    estado: 'Activo',
    ...(jurisdiccionRef && { jurisdiccion: jurisdiccionRef }),
  };

  let matriculadoDoc;
  try {
    matriculadoDoc = await sanity.create(nuevoMatriculado);
    console.log(`[webhook-aspirante] Matriculado creado: ${matriculadoDoc._id} (${emailNorm})`);
  } catch (err) {
    console.error('[webhook-aspirante] Error creando matriculado en Sanity:', err.message);
    return json({ error: 'Error creando matriculado: ' + err.message }, 500);
  }

  // Crear usuario en Firebase (contraseña = numeroMatricula)
  let uid;
  if (adminAuth) {
    try {
      const existing = await adminAuth.getUserByEmail(emailNorm).catch(() => null);
      if (existing) {
        await adminAuth.updateUser(existing.uid, { displayName: nombreCompleto });
        uid = existing.uid;
      } else {
        const created = await adminAuth.createUser({
          email: emailNorm,
          password: aspirante.numeroMatricula,
          displayName: nombreCompleto,
          disabled: false,
        });
        uid = created.uid;
      }
      await adminAuth.setCustomUserClaims(uid, {
        numeroMatricula: aspirante.numeroMatricula,
        estado: 'Activo',
      });
      console.log(`[webhook-aspirante] Firebase user ${uid} para ${emailNorm}`);
    } catch (err) {
      console.error('[webhook-aspirante] Error en Firebase:', err.message);
      // No devolvemos error — el matriculado ya fue creado en Sanity
    }
  } else {
    console.warn('[webhook-aspirante] Firebase Admin no inicializado, omitiendo creación de usuario');
  }

  // Enviar email de bienvenida
  try {
    await enviarBienvenidaMatriculacion({
      nombreCompleto,
      email: emailNorm,
      numeroMatricula: aspirante.numeroMatricula,
      jurisdiccion: jurisdiccionTitulo,
    });
    console.log(`[webhook-aspirante] Email de bienvenida enviado a ${emailNorm}`);
  } catch (err) {
    console.error('[webhook-aspirante] Error enviando email de bienvenida:', err.message);
    // No bloqueamos el flujo — el matriculado ya fue creado
  }

  return json({
    ok: true,
    matriculadoId: matriculadoDoc._id,
    uid,
    email: emailNorm,
    numeroMatricula: aspirante.numeroMatricula,
  });
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
