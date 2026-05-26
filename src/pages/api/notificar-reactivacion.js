export const prerender = false;

import { createClient } from '@sanity/client';
import { enviarReactivacion } from '../../lib/email.js';

const sanity = createClient({
  projectId: '8q7vz6co',
  dataset: 'production',
  apiVersion: '2023-05-03',
  useCdn: false,
});

export const POST = async ({ request }) => {
  // Solo accesible con SANITY_WEBHOOK_SECRET — disparado por webhook de Sanity
  const secret = import.meta.env.SANITY_WEBHOOK_SECRET;
  if (secret) {
    const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
    if (token !== secret) return json({ error: 'No autorizado' }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Cuerpo inválido' }, 400);
  }

  const { email } = body;
  if (!email) return json({ error: 'Email requerido' }, 400);

  let mat;
  try {
    mat = await sanity.fetch(
      `*[_type == "matriculado" && email == $email][0]{ nombreCompleto, numeroMatricula, email, estado }`,
      { email }
    );
  } catch (e) {
    console.error('[notificar-reactivacion] Error Sanity:', e);
    return json({ error: 'Error consultando el padrón' }, 500);
  }

  if (!mat) return json({ error: 'Matriculado no encontrado' }, 404);
  if (mat.estado !== 'Activo') return json({ skipped: 'La matrícula aún no está activa' }, 200);

  try {
    await enviarReactivacion({
      nombreCompleto: mat.nombreCompleto,
      email: mat.email,
      numeroMatricula: mat.numeroMatricula,
    });
  } catch (e) {
    console.error('[notificar-reactivacion] Error enviando email:', e);
    return json({ error: 'No se pudo enviar el email de reactivación' }, 500);
  }

  return json({ ok: true });
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
