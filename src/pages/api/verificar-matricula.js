import { createClient } from '@sanity/client';

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
    const { numeroMatricula } = await request.json();

    if (!numeroMatricula || String(numeroMatricula).trim().length < 2) {
      return json({ ok: false, error: 'Número de matrícula inválido.' }, 400);
    }

    const val = String(numeroMatricula).trim();
    const matriculado = await sanity.fetch(
      `*[_type=="matriculado" && numeroMatricula==$mat][0]{_id, nombreCompleto, estado}`,
      { mat: val }
    );

    if (!matriculado) {
      return json({ ok: false, error: 'Matrícula no encontrada en el padrón.' });
    }

    if (matriculado.estado !== 'Activo') {
      return json({ ok: false, error: `Matrícula ${val} registrada pero con estado: ${matriculado.estado}.`, estado: matriculado.estado });
    }

    return json({ ok: true, nombre: matriculado.nombreCompleto, estado: matriculado.estado });

  } catch (err) {
    console.error('[verificar-matricula] Error:', err);
    return json({ ok: false, error: 'Error al verificar. Intentá de nuevo.' }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
