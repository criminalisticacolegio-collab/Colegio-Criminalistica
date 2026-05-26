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

    // MercadoPago envía { type: 'payment', data: { id: '...' } }
    if (body.type !== 'payment') {
      return json({ ok: true, skipped: 'not a payment event' });
    }

    const mpPaymentId = body.data?.id;
    if (!mpPaymentId) return json({ ok: true, skipped: 'no payment id' });

    // Consultar MP para obtener los datos del pago
    const mpToken = import.meta.env.MP_ACCESS_TOKEN;
    if (!mpToken) {
      console.warn('[mp-webhook-curso] MP_ACCESS_TOKEN no configurado.');
      return json({ error: 'Los pagos estarán disponibles próximamente. Contacte al colegio: criminalisticacolegio@gmail.com' }, 503);
    }

    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${mpPaymentId}`, {
      headers: { Authorization: `Bearer ${mpToken}` },
    });
    if (!mpRes.ok) return json({ error: 'No se pudo consultar el pago en MP.' }, 500);

    const pago = await mpRes.json();
    if (pago.status !== 'approved') return json({ ok: true, skipped: `payment status: ${pago.status}` });

    const email = pago.payer?.email;
    if (!email) return json({ error: 'Email del pagador no encontrado.' }, 400);

    // Buscar inscripción pendiente en Sanity por email
    const inscripcion = await sanity.fetch(
      `*[_type == "inscripcionCurso" && email == $email && estadoPago == "pendiente"] | order(fechaInscripcion desc) [0]{
        _id, cursoNombre, nombreCompleto, email, linkClassroom, fechaInicio
      }`,
      { email }
    );

    if (!inscripcion) {
      console.warn(`[mp-webhook-curso] No se encontró inscripción pendiente para ${email}`);
      return json({ ok: true, skipped: 'no pending inscription found' });
    }

    // Buscar datos del curso para obtener linkClassroom y fechaInicio
    const cursoConfig = await sanity.fetch(
      `*[_type == "capacitacionConfig"][0]{
        "curso": cursos[_key == $cursoId][0]{ linkClassroom, fechaInicio }
      }`,
      { cursoId: inscripcion.cursoId || '' }
    );
    const linkClassroom = cursoConfig?.curso?.linkClassroom || '';
    const fechaInicio   = cursoConfig?.curso?.fechaInicio   || '';

    // Actualizar Sanity
    await sanity.patch(inscripcion._id)
      .set({
        estadoPago:      'aprobado',
        accesoEnviado:   true,
        fechaEnvioAcceso: new Date().toISOString(),
      })
      .commit();

    // Enviar email de acceso
    await enviarAccesoCurso({
      nombre:      inscripcion.nombreCompleto,
      email:       inscripcion.email,
      cursoNombre: inscripcion.cursoNombre,
      fechaInicio,
      linkClassroom,
      precioAbonado: pago.transaction_amount || 0,
    });

    return json({ ok: true });
  } catch (err) {
    console.error('[mp-webhook-curso] Error:', err);
    return json({ error: 'Error interno.' }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
