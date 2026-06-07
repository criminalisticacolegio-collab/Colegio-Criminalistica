import { createClient } from '@sanity/client';
import { enviarAccesoCurso } from '../../lib/email.js';

export const prerender = false;

const sanity = createClient({
  projectId: '8q7vz6co',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-05-03',
  token: import.meta.env.SANITY_API_WRITE_TOKEN,
});

export async function POST({ request }) {
  try {
    const body = await request.json();
    const {
      cursoKey, cursoNombre, nombreCompleto, dni, email, telefono,
      profesion, institucion, cargo,
      numeroMatricula, precioAbonado, esGratuito, esPreinscripcion,
      linkClassroom, codigoClassroom, fechaInicio,
    } = body;
    const emailNorm = (email || '').trim().toLowerCase();

    if (!email || !nombreCompleto || !cursoKey) {
      return json({ error: 'Datos incompletos.' }, 400);
    }

    const tipoInscripto = esPreinscripcion ? 'preinscripto' : (numeroMatricula ? 'matriculado' : 'publico');
    const estadoPago    = esPreinscripcion ? 'aprobado' : esGratuito ? 'gratuito' : 'pendiente';

    const inscripcion = await sanity.create({
      _type: 'inscripcionCurso',
      cursoId:        cursoKey,
      cursoNombre:    cursoNombre || 'Curso',
      nombreCompleto,
      dni:            dni || '',
      email,
      telefono:       telefono || '',
      profesion:      profesion || '',
      institucion:    institucion || '',
      cargo:          cargo || '',
      numeroMatricula: numeroMatricula || '',
      tipoInscripto,
      precioAbonado:  precioAbonado || 0,
      estadoPago,
      fechaInscripcion: new Date().toISOString(),
      accesoEnviado:  false,
    });

    let emailEnviado = false;

    // ── Email para TODOS los tipos de curso ──────────────────────────
    // Próximamente (esPreinscripcion): avisa que está en lista de espera
    // Todos los demás (gratuito, pago, promo, seminario): envía link de classroom
    try {
      if (esPreinscripcion) {
        await enviarAccesoCurso({
          nombre: nombreCompleto,
          email,
          cursoNombre: cursoNombre || 'Curso',
          esPreinscripcion: true,
        });
      } else {
        await enviarAccesoCurso({
          nombre: nombreCompleto,
          email,
          cursoNombre: cursoNombre || 'Curso',
          fechaInicio,
          linkClassroom: linkClassroom || '',
          codigoClassroom: codigoClassroom || '',
          precioAbonado: precioAbonado || 0,
        });
      }
      await sanity.patch(inscripcion._id)
        .set({ accesoEnviado: true, fechaEnvioAcceso: new Date().toISOString() })
        .commit();
      emailEnviado = true;
    } catch (emailErr) {
      console.error('[inscribir-curso] Error enviando email:', emailErr?.message || emailErr);
    }

    // ── Cursos de PAGO: además del email, devolver link de pago ──────
    if (!esGratuito && !esPreinscripcion) {
      let linkPago = null;
      try {
        const curso = await sanity.fetch(
          `*[_type == "capacitacionConfig"][0].cursos[_key == $key][0]{
            linkPagoMatriculado, linkPagoPublico, linkPagoExterno
          }`,
          { key: cursoKey }
        );
        if (curso) {
          if (emailNorm && numeroMatricula) {
            const activo = await sanity.fetch(
              `*[_type == "matriculado" && lower(email) == lower($email) && numeroMatricula == $mat && estado == "Activo"][0]{_id}`,
              { email: emailNorm, mat: numeroMatricula }
            );
            if (activo && curso.linkPagoMatriculado) {
              linkPago = curso.linkPagoMatriculado;
            }
          }
          if (!linkPago) {
            linkPago = curso.linkPagoPublico || curso.linkPagoExterno || null;
          }
        }
      } catch (err) {
        console.error('[inscribir-curso] Error determinando link de pago:', err.message);
      }
      return json({ ok: true, linkPago, emailEnviado, message: '¡Inscripción registrada! Te redirigimos al pago.' }, 200);
    }

    const message = esPreinscripcion
      ? '¡Listo! Te avisaremos cuando el curso esté disponible.'
      : emailEnviado
        ? `¡Inscripción confirmada! Revisá tu email ${email} — te enviamos el acceso al campus.`
        : `¡Inscripción confirmada! Ante cualquier inconveniente escribinos.`;

    return json({ ok: true, message, emailEnviado }, 200);

  } catch (err) {
    console.error('[inscribir-curso] Error:', err);
    return json({ error: 'Error al procesar la inscripción. Intentá de nuevo.' }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
