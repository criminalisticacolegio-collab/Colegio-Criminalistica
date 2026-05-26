export const prerender = false;

import { ejecutarControlMora } from './control-mora.js';

// Llamado automáticamente el 1° de cada mes por Google Cloud Scheduler.
// Configuración del job:
//   gcloud scheduler jobs create http control-mora-mensual \
//     --schedule="0 8 1 * *" \
//     --uri="https://[DOMINIO]/api/cron-mora" \
//     --headers="x-cron-secret=cpcc-cron-mora-2026" \
//     --time-zone="America/Argentina/Catamarca"

export const POST = async ({ request }) => {
  const secret = import.meta.env.CRON_SECRET;
  if (!secret) {
    return new Response('CRON_SECRET no configurado', { status: 503 });
  }
  if (request.headers.get('x-cron-secret') !== secret) {
    return new Response('No autorizado', { status: 401 });
  }

  try {
    const resultado = await ejecutarControlMora();
    return Response.json(resultado);
  } catch (err) {
    console.error('[cron-mora] Error:', err);
    return new Response(JSON.stringify({ error: 'Error interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
