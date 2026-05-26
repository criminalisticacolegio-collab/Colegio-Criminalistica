export const prerender = false;

import { createClient } from '@sanity/client';

const sanity = createClient({
  projectId: '8q7vz6co',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-05-03',
  token: import.meta.env.SANITY_API_WRITE_TOKEN,
});

const MSG_IA_INACTIVA = 'Servicio de análisis temporalmente no disponible. Consultá directamente con el Colegio.';

const SYSTEM = 'Sos un evaluador institucional especializado en colegios profesionales de Argentina. Analizás documentos de gestión (memorias, balances, resoluciones) y generás evaluaciones objetivas con lenguaje accesible para matriculados. Si se adjunta un archivo, leé su contenido completo para hacer el análisis. Respondés ÚNICAMENTE con un objeto JSON válido, sin markdown, sin bloques de código.';

async function fetchBase64(url) {
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) return null;
    const buf = await resp.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 8192) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    }
    return btoa(binary);
  } catch {
    return null;
  }
}

function mimeDesdeUrl(url) {
  const u = (url || '').toLowerCase();
  if (u.includes('.jpg') || u.includes('.jpeg')) return 'image/jpeg';
  if (u.includes('.png')) return 'image/png';
  return 'application/pdf';
}

export const POST = async ({ request }) => {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Cuerpo inválido' }, 400);
  }

  const { anio, memorias, balances, resoluciones } = body;

  // Leer configuración IA desde Sanity
  let iaConfig = null;
  try {
    iaConfig = await sanity.fetch(`*[_type == "configuracionIA"][0]{ activado, apiKey, modelo }`);
  } catch (err) {
    console.error('[evaluar-gestion] Error leyendo configuracionIA:', err.message);
  }

  console.log('=== DEBUG IA [evaluar-gestion] ===');
  console.log('config:', JSON.stringify(iaConfig));
  console.log('apiKey primeros 10 chars:', iaConfig?.apiKey?.substring(0, 10));
  console.log('modelo:', iaConfig?.modelo);
  console.log('activado:', iaConfig?.activado);

  const activado = iaConfig?.activado !== false;
  const apiKey   = iaConfig?.apiKey?.trim() || import.meta.env.GEMINI_API_KEY;
  const GEMINI_KEY = apiKey;
  const modelo   = 'gemini-2.5-flash';

  console.log(`→ activado=${activado} keyLen=${GEMINI_KEY?.length ?? 0} key10="${GEMINI_KEY?.substring(0, 10)}" modelo="${modelo}"`);

  if (!activado || !apiKey) {
    return json({ error: MSG_IA_INACTIVA }, 503);
  }

  const contexto = [];
  if (memorias?.length) {
    contexto.push(`MEMORIAS DE GESTIÓN:\n${memorias.map(m => `- ${m.titulo}${m.anio ? ` (${m.anio})` : ''}${m.descripcion ? ': ' + m.descripcion : ''}`).join('\n')}`);
  }
  if (balances?.length) {
    contexto.push(`BALANCES Y ESTADOS CONTABLES:\n${balances.map(b => `- ${b.titulo}${b.periodo ? ` · ${b.periodo}` : ''}${b.descripcion ? ': ' + b.descripcion : ''}`).join('\n')}`);
  }
  if (resoluciones?.length) {
    contexto.push(`RESOLUCIONES DEL CONSEJO DIRECTIVO:\n${resoluciones.map(r => `- ${r.numero ? 'Res. ' + r.numero : 'Resolución'}${r.fecha ? ' · ' + r.fecha : ''}${r.descripcion ? ': ' + r.descripcion : ''}`).join('\n')}`);
  }

  if (!contexto.length) {
    return json({ error: 'No hay documentos de gestión para evaluar' }, 400);
  }

  const todosLosDocs = [...(memorias || []), ...(balances || []), ...(resoluciones || [])];
  const docConArchivo = todosLosDocs.find(d => d.archivo);

  const periodoMsg = anio ? ` del año ${anio}` : '';
  const tieneArchivo = !!docConArchivo;
  const promptTexto = `Analizá la gestión${periodoMsg} del CPCC con esta información:

${contexto.join('\n\n')}
${tieneArchivo ? '\n[Se adjunta el documento completo para tu análisis]' : ''}

Respondé ÚNICAMENTE con un JSON (sin markdown) con exactamente estas claves:
{
  "transparencia": <número 0-100>,
  "eficiencia": <número 0-100>,
  "crecimiento": <número 0-100>,
  "respuesta": <número 0-100>,
  "calificacion": <número 0-100>,
  "sintesis": "síntesis de 2-3 oraciones",
  "positivos": "puntos destacables en una oración",
  "mejoras": "áreas de mejora en una oración"
}
Basate en la información provista. Si no hay datos suficientes para una métrica, asigná 50.`;

  const userParts = [];
  if (docConArchivo?.archivo) {
    const base64 = await fetchBase64(docConArchivo.archivo);
    if (base64) {
      userParts.push({ inlineData: { mimeType: mimeDesdeUrl(docConArchivo.archivo), data: base64 } });
    }
  }
  userParts.push({ text: promptTexto });

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`;
    console.log(`[evaluar-gestion] URL: https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`);
    const geminiBody = JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: 'user', parts: userParts }],
      generationConfig: { maxOutputTokens: 600 },
    });

    let resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: geminiBody });

    if (resp.status === 429) {
      await new Promise(r => setTimeout(r, 6000));
      resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: geminiBody });
    }

    if (!resp.ok) {
      const errorText = await resp.text();
      console.error('[evaluar-gestion] Gemini error response:', resp.status, errorText);
      if (resp.status === 429) return json({ error: 'Servicio de IA saturado. Esperá unos segundos e intentá de nuevo.' }, 429);
      let geminiMsg = `Error ${resp.status}`;
      try { geminiMsg = JSON.parse(errorText)?.error?.message || geminiMsg; } catch {}
      return json({ error: `IA: ${geminiMsg}` }, 502);
    }

    const data = await resp.json();
    if (data.error) {
      console.error('[evaluar-gestion] Gemini API error:', data.error);
      return json({ error: data.error.message || 'Error de la API de IA' }, 502);
    }

    const texto = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!texto) return json({ error: 'El servicio de IA no devolvió respuesta' }, 502);

    let evaluacion;
    try {
      const clean = texto.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      evaluacion = JSON.parse(clean);
    } catch {
      evaluacion = { transparencia: 50, eficiencia: 50, crecimiento: 50, respuesta: 50, calificacion: 50, sintesis: texto, positivos: '', mejoras: '' };
    }

    return json({ evaluacion });
  } catch (err) {
    console.error('[evaluar-gestion] Error:', err);
    return json({ error: 'Error interno' }, 500);
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
