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

const SYSTEM = `Sos un analista jurídico especializado en ética profesional y disciplina de colegios profesionales de Argentina. Tu objetivo es ayudar al matriculado a ENTENDER el caso: qué normas infringió exactamente (con cita de artículo y ley cuando es posible), qué atenuantes o normas se tuvieron en cuenta A SU FAVOR para reducir la sanción, y cómo evitar situaciones similares en el futuro.
Si se adjunta el documento de la resolución, leé su contenido completo para hacer el análisis.
Si el documento no pudo cargarse automáticamente pero se indica su URL, mencioná ese enlace en tu respuesta para que el matriculado pueda acceder directamente al texto completo.
Respondés en español técnico pero accesible, con tono pedagógico y empático. Nunca inventás artículos ni leyes que no existen. Respondés ÚNICAMENTE con un objeto JSON válido, sin markdown, sin bloques de código.`;

async function fetchBase64(url) {
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(12000) });
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

  const { numero, titulo, resumen, normativa, archivo } = body;

  if (!titulo) {
    return json({ error: 'Datos insuficientes para analizar' }, 400);
  }

  let iaConfig = null;
  try {
    iaConfig = await sanity.fetch(`*[_type == "configuracionIA"][0]{ activado, apiKey, modelo }`);
  } catch (err) {
    console.error('[analizar-resolucion] Error leyendo configuracionIA:', err.message);
  }

  const activado = iaConfig?.activado !== false;
  const apiKey   = iaConfig?.apiKey?.trim() || import.meta.env.GEMINI_API_KEY;
  const modelo   = 'gemini-2.5-flash';

  if (!activado || !apiKey) {
    return json({ error: MSG_IA_INACTIVA }, 503);
  }

  // Intentar descargar el PDF
  let base64 = null;
  let archivoCargado = false;
  if (archivo) {
    base64 = await fetchBase64(archivo);
    archivoCargado = !!base64;
  }

  const contextoTexto = [
    numero ? `Resolución N°: ${numero}` : '',
    `Asunto: ${titulo}`,
    resumen  ? `Resumen del caso: ${resumen}`    : '',
    normativa ? `Normativa citada: ${normativa}` : '',
  ].filter(Boolean).join('\n');

  // Nota sobre el documento según si pudo cargarse o no
  let notaDocumento = '';
  if (archivoCargado) {
    notaDocumento = '\n[Se adjunta el documento completo de la resolución para tu análisis]';
  } else if (archivo) {
    notaDocumento = `\n[El documento no pudo cargarse automáticamente. Está disponible en: ${archivo} — mencioná este enlace en tu respuesta para que el matriculado pueda leerlo directamente]`;
  }

  const promptTexto = `Analizá la siguiente resolución disciplinaria del Tribunal de Ética desde la perspectiva del matriculado involucrado:

${contextoTexto}${notaDocumento}

Respondé ÚNICAMENTE con un JSON con exactamente estas 6 claves (sin markdown ni bloques de código):
{
  "resumen": "síntesis del caso en 2-3 oraciones: qué hizo el matriculado y cuál fue la sanción",
  "transgresiones": "normas específicamente violadas: citá artículo y ley (ej: Art. 12 Ley Provincial N°5.119, Art. 8 Código de Ética CPCC). Si no se conocen los artículos exactos, describí los principios éticos infringidos",
  "atenuantes": "normas, circunstancias o argumentos que fueron considerados A FAVOR del matriculado para reducir o moderar la sanción. Si no hay atenuantes evidentes, indicá cuáles principios del debido proceso se aplicaron",
  "gravedad": "leve | moderada | grave | muy grave",
  "recomendacion": "qué debe incorporar todo profesional en su práctica para evitar esta situación: consejo concreto, práctico y aplicable al ejercicio de la criminalística",
  "enlace": "${archivo || ''}"
}`;

  const userParts = [];
  if (archivoCargado) {
    userParts.push({ inlineData: { mimeType: mimeDesdeUrl(archivo), data: base64 } });
  }
  userParts.push({ text: promptTexto });

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`;
    const geminiBody = JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: 'user', parts: userParts }],
      generationConfig: { maxOutputTokens: 1500 },
    });

    let resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: geminiBody });

    if (resp.status === 429) {
      await new Promise(r => setTimeout(r, 6000));
      resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: geminiBody });
    }

    if (!resp.ok) {
      const errorText = await resp.text();
      console.error('[analizar-resolucion] Gemini error:', resp.status, errorText);
      if (resp.status === 429) return json({ error: 'Servicio de IA saturado. Esperá unos segundos e intentá de nuevo.' }, 429);
      let geminiMsg = `Error ${resp.status}`;
      try { geminiMsg = JSON.parse(errorText)?.error?.message || geminiMsg; } catch {}
      return json({ error: `IA: ${geminiMsg}` }, 502);
    }

    const data = await resp.json();
    if (data.error) {
      console.error('[analizar-resolucion] Gemini API error:', data.error);
      return json({ error: data.error.message || 'Error de la API de IA' }, 502);
    }

    const _partes = data.candidates?.[0]?.content?.parts || [];
    const texto = (_partes.find(p => !p.thought && p.text) || _partes.find(p => p.text) || {}).text || '';
    if (!texto) return json({ error: 'El servicio de IA no devolvió respuesta' }, 502);

    function sanitizarJSON(str) {
      let inStr = false, escaped = false, result = '';
      for (let i = 0; i < str.length; i++) {
        const c = str[i];
        if (escaped) { result += c; escaped = false; continue; }
        if (c === '\\') { result += c; escaped = true; continue; }
        if (c === '"') { inStr = !inStr; result += c; continue; }
        if (inStr && c === '\n') { result += '\\n'; continue; }
        if (inStr && c === '\r') { result += '\\r'; continue; }
        if (inStr && c === '\t') { result += '\\t'; continue; }
        result += c;
      }
      return result;
    }

    let analisis;
    try {
      const clean = texto.replace(/^```(?:json)?\s*/im, '').replace(/\s*```\s*$/im, '').trim();
      analisis = JSON.parse(sanitizarJSON(clean));
    } catch {
      const m = texto.match(/\{[\s\S]*\}/);
      if (m) { try { analisis = JSON.parse(sanitizarJSON(m[0])); } catch {} }
    }
    if (!analisis) {
      analisis = {
        resumen: texto,
        transgresiones: '—',
        atenuantes: '—',
        gravedad: '—',
        recomendacion: '—',
        enlace: archivo || '',
      };
    }

    // Garantizar que el enlace siempre esté presente
    if (!analisis.enlace && archivo) analisis.enlace = archivo;

    return json({ analisis });
  } catch (err) {
    console.error('[analizar-resolucion] Error:', err);
    return json({ error: 'Error interno al analizar' }, 500);
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
