export const prerender = false;

import { enviarNotificacionMora } from '../../lib/email.js';

export const POST = async ({ request }) => {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Cuerpo inválido' }, 400);
  }

  const { nombreCompleto, numeroMatricula, email, mesesPendientes, mensaje, comprobanteUrl } = body;

  if (!nombreCompleto || !email || !mesesPendientes?.length) {
    return json({ error: 'Datos incompletos' }, 400);
  }

  try {
    await enviarNotificacionMora({
      nombreCompleto,
      numeroMatricula: numeroMatricula || '—',
      email,
      mesesPendientes,
      mensaje: mensaje || 'Solicito información para regularizar mis cuotas pendientes.',
      comprobanteUrl: comprobanteUrl || null,
    });
  } catch (e) {
    console.error('[notificar-mora] Error enviando email:', e);
    return json({ error: 'No se pudo enviar la notificación. Intentá de nuevo.' }, 500);
  }

  return json({ ok: true });
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
