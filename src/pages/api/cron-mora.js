export const prerender = false;

import { ejecutarControlMora } from './control-mora.js';

// GET — invocado por Vercel Cron el 1° de cada mes a las 08:00 ART (11:00 UTC).
// Vercel inyecta automáticamente Authorization: Bearer CRON_SECRET.
export const GET = async ({ request }) => {
  const cronSecret = import.meta.env.CRON_SECRET;
  if (!cronSecret) {
    return new Response('CRON_SECRET no configurado', { status: 503 });
  }
  if (request.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
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

// POST — disparador manual con x-cron-secret para pruebas o ejecución desde scripts.
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
