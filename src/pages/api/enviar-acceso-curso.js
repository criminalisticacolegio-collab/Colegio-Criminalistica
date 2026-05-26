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
    const { email, cursoId, nombreAlumno } = body;

    if (!email || !cursoId || !nombreAlumno) {
      return json({ error: 'Datos incompletos.' }, 400);
    }

    // Buscar datos del curso en Sanity
    const config = await sanity.fetch(
      `*[_type == "capacitacionConfig"][0]{
        "curso": cursos[_key == $cursoId][0]{
          titulo, linkClassroom, codigoClassroom, fechaInicio
        }
      }`,
      { cursoId }
    );

    const curso = config?.curso;
    if (!curso) {
      return json({ error: 'Curso no encontrado.' }, 404);
    }

    // Buscar inscripción para actualizar accesoEnviado
    const inscripcion = await sanity.fetch(
      `*[_type == "inscripcionCurso" && email == $email && cursoId == $cursoId] | order(fechaInscripcion desc) [0]{ _id }`,
      { email, cursoId }
    );

    // Enviar email de acceso
    await enviarAccesoCurso({
      nombre:           nombreAlumno,
      email,
      cursoNombre:      curso.titulo || 'Curso',
      fechaInicio:      curso.fechaInicio || '',
      linkClassroom:    curso.linkClassroom || '',
      codigoClassroom:  curso.codigoClassroom || '',
      precioAbonado:    0,
      esPreinscripcion: false,
    });

    // Marcar acceso enviado y pago aprobado en Sanity
    if (inscripcion?._id) {
      await sanity.patch(inscripcion._id)
        .set({
          estadoPago:       'aprobado',
          accesoEnviado:    true,
          fechaEnvioAcceso: new Date().toISOString(),
        })
        .commit();
    }

    return json({ ok: true });
  } catch (err) {
    console.error('[enviar-acceso-curso] Error:', err);
    return json({ error: 'Error interno.' }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
