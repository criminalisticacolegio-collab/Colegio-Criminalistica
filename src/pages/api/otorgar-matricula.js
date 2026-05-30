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

export const POST = async ({ request }) => {
  // Solo accesible con ADMIN_SECRET — llamado desde Sanity Studio (admin autenticado)
  const secret = import.meta.env.ADMIN_SECRET;
  if (!secret) return json({ success: false, message: 'ADMIN_SECRET no configurado' }, 503);
  if (request.headers.get('Authorization') !== `Bearer ${secret}`) {
    return json({ success: false, message: 'No autorizado' }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, message: 'JSON inválido' }, 400);
  }

  const { aspiranteId, numeroMatricula } = body;

  if (!aspiranteId || !numeroMatricula) {
    return json({ success: false, message: 'aspiranteId y numeroMatricula son requeridos' }, 400);
  }

  if (!/^MP-\d{3}$/.test(numeroMatricula)) {
    return json({ success: false, message: 'Formato inválido. Use MP-001, MP-002, etc.' }, 400);
  }

  // 1. Leer datos completos del aspirante
  let aspirante;
  try {
    aspirante = await sanity.fetch(
      `*[_type == "aspirante" && _id == $id][0]{
        _id, nombre, apellido, dni, email, cuil, telefono,
        tituloProfesional, jurisdiccion, numeroMatricula
      }`,
      { id: aspiranteId }
    );
  } catch (err) {
    console.error('[otorgar-matricula] Error leyendo aspirante:', err.message);
    return json({ success: false, message: 'Error consultando Sanity: ' + err.message }, 500);
  }

  if (!aspirante) {
    return json({ success: false, message: 'Aspirante no encontrado' }, 404);
  }

  if (!aspirante.email) {
    return json({ success: false, message: 'El aspirante no tiene email registrado' }, 422);
  }

  const emailNorm = aspirante.email.trim().toLowerCase();
  const nombreCompleto = `${aspirante.nombre} ${aspirante.apellido}`.trim();

  // 2. Verificar que no existe ya en el padrón (por email o por número de matrícula)
  let duplicado;
  try {
    duplicado = await sanity.fetch(
      `*[_type == "matriculado" && (lower(email) == lower($email) || numeroMatricula == $num)][0]._id`,
      { email: emailNorm, num: numeroMatricula }
    );
  } catch (err) {
    console.error('[otorgar-matricula] Error verificando duplicado:', err.message);
    return json({ success: false, message: 'Error verificando duplicados: ' + err.message }, 500);
  }

  if (duplicado) {
    return json({ success: false, message: `Ya existe un matriculado con ese email o número de matrícula (${numeroMatricula})` }, 409);
  }

  // 3. Buscar referencia de jurisdicción por titulo
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
      // sin bloquear el flujo
    }
  }

  // 4. Crear documento matriculado en Sanity
  const nuevoMatriculado = {
    _type: 'matriculado',
    numeroMatricula,
    nombreCompleto,
    email: emailNorm,
    estado: 'Activo',
    ...(jurisdiccionRef && { jurisdiccion: jurisdiccionRef }),
  };

  let matriculadoDoc;
  try {
    matriculadoDoc = await sanity.create(nuevoMatriculado);
    console.log(`[otorgar-matricula] Matriculado creado: ${matriculadoDoc._id}`);
  } catch (err) {
    console.error('[otorgar-matricula] Error creando matriculado:', err.message);
    return json({ success: false, message: 'Error creando matriculado en Sanity: ' + err.message }, 500);
  }

  // 5. Crear usuario en Firebase Auth (contraseña = numeroMatricula)
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
          password: numeroMatricula,
          displayName: nombreCompleto,
          disabled: false,
        });
        uid = created.uid;
      }
      await adminAuth.setCustomUserClaims(uid, {
        numeroMatricula,
        estado: 'Activo',
      });
      console.log(`[otorgar-matricula] Firebase user ${uid} para ${emailNorm}`);
    } catch (err) {
      console.error('[otorgar-matricula] Error en Firebase:', err.message);
      // El matriculado ya fue creado — no revertimos, solo logueamos
    }
  } else {
    console.warn('[otorgar-matricula] Firebase Admin no inicializado');
  }

  // 6. Enviar email de bienvenida
  try {
    await enviarBienvenidaMatriculacion({
      nombreCompleto,
      email: emailNorm,
      numeroMatricula,
      jurisdiccion: jurisdiccionTitulo,
    });
    console.log(`[otorgar-matricula] Email de bienvenida enviado a ${emailNorm}`);
  } catch (err) {
    console.error('[otorgar-matricula] Error enviando email:', err.message);
  }

  return json({
    success: true,
    matriculadoId: matriculadoDoc._id,
    uid,
    email: emailNorm,
    numeroMatricula,
  });
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
