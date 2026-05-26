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
  const u = url.toLowerCase();
  if (u.includes('.jpg') || u.includes('.jpeg')) return 'image/jpeg';
  if (u.includes('.png')) return 'image/png';
  if (u.includes('.gif')) return 'image/gif';
  if (u.includes('.webp')) return 'image/webp';
  return 'application/pdf';
}

function recursosRelevantes(mensaje, recursos) {
  const palabras = mensaje.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const conArchivo = recursos.filter(r => r.archivo);
  if (!palabras.length) return conArchivo.slice(0, 3);

  const relevantes = conArchivo.filter(r => {
    const haystack = `${r.titulo} ${r.descripcion || ''} ${r.categoria || ''}`.toLowerCase();
    return palabras.some(p => haystack.includes(p));
  });

  return relevantes.length > 0 ? relevantes.slice(0, 4) : conArchivo.slice(0, 3);
}

export const POST = async ({ request }) => {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Cuerpo inválido' }, 400);
  }

  const { mensaje, historial = [], recursos = [] } = body;

  if (!mensaje?.trim()) {
    return json({ error: 'Mensaje vacío' }, 400);
  }

  // Leer configuración IA desde Sanity
  let iaConfig = null;
  try {
    iaConfig = await sanity.fetch(`*[_type == "configuracionIA"][0]{ activado, apiKey, modelo }`);
  } catch (err) {
    console.error('[biblioteca-chat] Error leyendo configuracionIA:', err.message);
  }

  console.log('=== DEBUG IA [biblioteca-chat] ===');
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

  // Catálogo completo como contexto textual
  let catalogoContext = '';
  if (recursos.length > 0) {
    const lineas = recursos.map(r => {
      const tipo = r.archivo ? '[Archivo]' : r.linkExterno ? '[Enlace externo]' : '[Recurso]';
      const desc = r.descripcion ? ` — ${r.descripcion}` : '';
      return `• ${tipo} "${r.titulo}"${desc} (Categoría: ${r.categoria || 'General'})`;
    });
    catalogoContext = `\n\nBIBLIOTECA DIGITAL (${recursos.length} documentos disponibles):\n${lineas.join('\n')}`;
  }

  const SYSTEM = `Sos LegalBot, el asistente jurídico de la Biblioteca Digital del Colegio de Profesionales en Ciencias Criminalísticas de la Provincia de Catamarca (CPCC).

TU ROL:
- Respondés consultas sobre normativa profesional, ética pericial, legislación argentina, trámites del Colegio y ciencias criminalísticas.
- Cuando se adjunta un archivo en esta conversación, lo leés y usás su contenido real para responder.
- Citás artículos específicos de leyes, códigos de ética y normativa vigente cuando es posible.
- Si no tenés certeza de un dato, lo aclarás y sugerís consultar a la Secretaría.
- Nunca inventás leyes ni artículos que no existen.
- Respondés en español técnico pero accesible, máximo 4 párrafos salvo que pidan más detalle.${catalogoContext}

ESTILO DE RESPUESTA:
- Si usás contenido de un archivo adjunto, indicá de qué documento proviene la información.
- Citás normativa específica: ley, artículo, inciso cuando lo conocés con certeza.
- Usás ejemplos prácticos cuando ayudan a entender.`;

  const docsRelevantes = recursosRelevantes(mensaje, recursos);
  const archivosDescargados = await Promise.all(
    docsRelevantes.map(async r => {
      const base64 = await fetchBase64(r.archivo);
      return base64 ? { titulo: r.titulo, base64, mime: mimeDesdeUrl(r.archivo) } : null;
    })
  );
  const partsArchivos = archivosDescargados
    .filter(Boolean)
    .map(a => ({ inlineData: { mimeType: a.mime, data: a.base64 } }));

  const userParts = [...partsArchivos, { text: mensaje.trim() }];

  const contents = [
    ...historial.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    { role: 'user', parts: userParts },
  ];

  const geminiBody = JSON.stringify({
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents,
    generationConfig: { maxOutputTokens: 1200, temperature: 0.4 },
  });

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`;
    console.log(`[biblioteca-chat] URL: https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`);
    let resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: geminiBody });

    if (resp.status === 429) {
      await new Promise(r => setTimeout(r, 6000));
      resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: geminiBody });
    }

    if (!resp.ok) {
      const errorText = await resp.text();
      console.error('[biblioteca-chat] Gemini error response:', resp.status, errorText);
      if (resp.status === 429) return json({ error: 'Servicio de IA saturado. Esperá unos segundos e intentá de nuevo.' }, 429);
      let geminiMsg = `Error ${resp.status}`;
      try { geminiMsg = JSON.parse(errorText)?.error?.message || geminiMsg; } catch {}
      return json({ error: `IA: ${geminiMsg}` }, 502);
    }

    const data = await resp.json();
    if (data.error) {
      console.error('[biblioteca-chat] Gemini API error:', data.error);
      return json({ error: data.error.message || 'Error de la API de IA' }, 502);
    }

    const texto = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!texto) return json({ error: 'El servicio de IA no devolvió respuesta' }, 502);

    return json({ respuesta: texto });
  } catch (err) {
    console.error('[biblioteca-chat] Error de red:', err);
    return json({ error: 'No se pudo conectar con el servicio de IA' }, 500);
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
