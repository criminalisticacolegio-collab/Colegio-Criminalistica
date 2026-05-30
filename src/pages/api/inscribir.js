import { createClient } from '@sanity/client';
import { db } from '../../lib/firebase-server.js';
import { collection, doc, getDoc, setDoc } from 'firebase/firestore';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { enviarConfirmacionInscripcion } from '../../lib/email.js';

export const prerender = false;

const sanity = createClient({
  projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID,
  dataset: import.meta.env.PUBLIC_SANITY_DATASET,
  useCdn: false,
  apiVersion: '2023-05-03',
});

const mpClient = new MercadoPagoConfig({
  accessToken: import.meta.env.MP_ACCESS_TOKEN || '',
});

export const POST = async ({ request }) => {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Cuerpo inválido' }, 400);
  }

  const { cursoKey, email, nombre: nombreBody } = body;

  if (!cursoKey || !email) {
    return json({ error: 'Parámetros requeridos: cursoKey, email' }, 400);
  }

  // ── 1. Buscar el curso en Sanity ──────────────────────────
  let curso = null;
  try {
    const config = await sanity.fetch(
      `*[_type == "capacitacionConfig"][0]{ "curso": cursos[_key == $key][0] }`,
      { key: cursoKey }
    );
    curso = config?.curso;
  } catch (err) {
    console.error('[inscribir] Error buscando curso en Sanity:', err);
  }

  if (!curso) {
    return json({ error: 'Curso no encontrado' }, 404);
  }

  const tipoAcceso = curso.tipoAcceso || 'gratuito_publico';

  // ── 2. Verificar si es matriculado activo en Sanity ───────
  let esMatriculado = false;
  let nombreMatriculado = null;
  try {
    const mat = await sanity.fetch(
      `*[_type == "matriculado" && lower(email) == lower($email) && estado == "Activo"][0]{ nombreCompleto }`,
      { email }
    );
    if (mat) {
      esMatriculado = true;
      nombreMatriculado = mat.nombreCompleto;
    }
  } catch (err) {
    console.error('[inscribir] Error verificando matriculado:', err);
  }

  const nombre = nombreMatriculado || nombreBody || email;

  // ── 3. Control de acceso ──────────────────────────────────
  if (tipoAcceso === 'gratuito_matriculados' && !esMatriculado) {
    return json({
      error: 'Este curso es exclusivo para matriculados activos del Colegio.',
      requiresMatricula: true,
    }, 403);
  }

  // ── 4. Idempotencia ───────────────────────────────────────
  const enrollId = `${cursoKey}_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
  let enrollRef = null;
  if (db) {
    try {
      enrollRef = doc(collection(db, 'inscripciones'), enrollId);
      const existing = await getDoc(enrollRef);
      if (existing.exists()) {
        return json({ success: true, alreadyEnrolled: true, message: 'Ya estás inscripto en este curso.' });
      }
    } catch (err) {
      console.warn('[inscribir] No se pudo verificar inscripción previa:', err.message);
      enrollRef = null;
    }
  }

  // ── 5. Cursos gratuitos: inscripción directa ──────────────
  if (tipoAcceso === 'gratuito_publico' || tipoAcceso === 'gratuito_matriculados') {
    if (enrollRef) {
      try {
        await setDoc(enrollRef, {
          cursoKey,
          cursoTitulo: curso.titulo,
          email,
          nombre,
          esMatriculado,
          tipoAcceso,
          estado: 'ACTIVO',
          creadoEn: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('[inscribir] No se pudo guardar inscripción en Firestore:', err.message);
      }
    }

    enviarConfirmacionInscripcion({ nombre, email, cursoTitulo: curso.titulo, esMatriculado, tipoAcceso })
      .catch(err => console.error('[inscribir] Error enviando email:', err));

    return json({ success: true, message: '¡Inscripción confirmada!' });
  }

  // ── 6. Cursos pagos ───────────────────────────────────────
  const usarPrecioMat = tipoAcceso === 'pago_matriculados' && esMatriculado && curso.precioMatriculado != null;
  const precio = usarPrecioMat ? curso.precioMatriculado : (curso.precioNormal || 0);

  // Precio 0 = matriculados gratis
  if (precio === 0) {
    if (enrollRef) {
      try {
        await setDoc(enrollRef, {
          cursoKey,
          cursoTitulo: curso.titulo,
          email,
          nombre,
          esMatriculado,
          tipoAcceso,
          estado: 'ACTIVO',
          creadoEn: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('[inscribir] No se pudo guardar inscripción en Firestore:', err.message);
      }
    }

    enviarConfirmacionInscripcion({ nombre, email, cursoTitulo: curso.titulo, esMatriculado, tipoAcceso })
      .catch(err => console.error('[inscribir] Error enviando email:', err));

    return json({ success: true, message: '¡Inscripción confirmada! (acceso gratuito para matriculados)' });
  }

  // Crear preferencia de MercadoPago
  if (!import.meta.env.MP_ACCESS_TOKEN) {
    return json({ error: 'Los pagos estarán disponibles próximamente. Contacte al colegio: criminalisticacolegio@gmail.com' }, 503);
  }
  const origin = new URL(request.url).origin;
  const preference = new Preference(mpClient);

  try {
    const result = await preference.create({
      body: {
        items: [{
          title: `Curso: ${curso.titulo}`,
          unit_price: Number(precio),
          quantity: 1,
          currency_id: 'ARS',
        }],
        payer: { email },
        external_reference: `curso:${cursoKey}:${email}`,
        notification_url: `${origin}/api/mp-webhook`,
        back_urls: {
          success: `${origin}/success-curso`,
          failure: `${origin}/capacitacion`,
          pending: `${origin}/success-curso`,
        },
        auto_return: 'approved',
      },
    });

    return json({ mpUrl: result.init_point, precio });
  } catch (err) {
    console.error('[inscribir] Error creando preferencia MP:', err);
    return json({ error: 'Error procesando el pago. Intentá de nuevo.' }, 500);
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
