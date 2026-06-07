export const prerender = false;

import { createClient } from '@sanity/client';
import { adminAuth } from '../../lib/firebase-admin.js';

const sanity = createClient({
  projectId: '8q7vz6co',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-05-03',
});

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function GET({ request }) {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();

  if (!token) return json({ error: 'No autorizado.' }, 401);

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(token);
  } catch {
    return json({ error: 'Token inválido o expirado.' }, 401);
  }

  const email = decoded.email;
  if (!email) return json({ error: 'Token sin email.' }, 401);

  try {
    const mat = await sanity.fetch(
      `*[_type == "matriculado" && lower(email) == lower($email)][0]{
        nombreCompleto, numeroMatricula, estado, email,
        "especialidad": especialidad->{ titulo },
        "jurisdiccion": jurisdiccion->{ titulo }
      }`,
      { email }
    );
    return json({ mat: mat || null });
  } catch (err) {
    console.error('[get-matriculado] Error Sanity:', err.message);
    return json({ error: 'Error consultando el padrón.' }, 500);
  }
}
