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
  const u = url.toLowerCase();
  if (u.includes('.jpg') || u.includes('.jpeg')) return 'image/jpeg';
  if (u.includes('.png')) return 'image/png';
  if (u.includes('.gif')) return 'image/gif';
  if (u.includes('.webp')) return 'image/webp';
  return 'application/pdf';
}

// Selecciona recursos relevantes considerando archivos Y enlaces externos
function seleccionarRelevantes(mensaje, recursos) {
  const palabras = mensaje.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  // Incluye tanto recursos con archivo descargable como con link externo
  const conAcceso = recursos.filter(r => r.archivo || r.linkExterno);
  if (!palabras.length) return conAcceso.slice(0, 5);

  const relevantes = conAcceso.filter(r => {
    const haystack = `${r.titulo} ${r.descripcion || ''} ${r.categoria || ''} ${r.extracto || ''}`.toLowerCase();
    return palabras.some(p => haystack.includes(p));
  });

  return relevantes.length > 0 ? relevantes.slice(0, 5) : conAcceso.slice(0, 4);
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

  let iaConfig = null;
  try {
    iaConfig = await sanity.fetch(`*[_type == "configuracionIA"][0]{ activado, apiKey, modelo }`);
  } catch (err) {
    console.error('[biblioteca-chat] Error leyendo configuracionIA:', err.message);
  }

  const activado = iaConfig?.activado !== false;
  const apiKey   = iaConfig?.apiKey?.trim() || import.meta.env.GEMINI_API_KEY;
  const modelo   = 'gemini-2.5-flash';

  if (!activado || !apiKey) {
    return json({ error: MSG_IA_INACTIVA }, 503);
  }

  // Catálogo completo con URLs reales para que la IA pueda citarlas
  let catalogoContext = '';
  if (recursos.length > 0) {
    const lineas = recursos.map(r => {
      const tipo = r.archivo ? '[PDF descargable]' : r.linkExterno ? '[Enlace externo]' : '[Recurso]';
      const desc = r.descripcion ? ` — ${r.descripcion}` : '';
      const url  = r.archivo || r.linkExterno || '';
      const urlInfo = url ? ` | URL: ${url}` : '';
      return `• ${tipo} "${r.titulo}"${desc}${urlInfo} (Categoría: ${r.categoria || 'General'})`;
    });
    catalogoContext = `\n\nBIBLIOTECA DIGITAL — CATÁLOGO COMPLETO (${recursos.length} documentos):\n${lineas.join('\n')}`;
  }

  const SYSTEM = `Sos LegalBot, el asistente jurídico de la Biblioteca Digital del Colegio de Profesionales en Ciencias Criminalísticas de la Provincia de Catamarca (CPCC).

TU ROL:
- Respondés consultas sobre normativa profesional, ética pericial, legislación argentina, trámites del Colegio y ciencias criminalísticas.
- Ya tenés acceso completo al catálogo de la Biblioteca Digital con todos sus documentos. El usuario NO te proporciona documentos: vos ya los tenés cargados en tu contexto.
- Cuando hay archivos adjuntos en la sesión, los leés y usás su contenido real para responder.
- Para documentos del catálogo que no pudieron cargarse, incluís su URL directamente en la respuesta con formato [Título del documento](URL) para que el usuario pueda abrirlo.
- Para documentos externos del catálogo, incluís el enlace con formato [Título](URL).
- NUNCA digas "el documento que me proporcionaste" ni "el archivo que enviaste" — vos ya tenés el conocimiento; el usuario no te dio nada.
- Citás artículos específicos de leyes, códigos de ética y normativa vigente cuando es posible.
- Si no tenés certeza de un dato, lo aclarás y sugerís consultar a la Secretaría.
- Nunca inventás leyes ni artículos que no existen.
- Respondés en español técnico pero accesible, máximo 5 párrafos salvo que pidan más detalle.${catalogoContext}

PÁGINAS DEL SITIO INSTITUCIONAL (citá estos enlaces cuando sea relevante):
- Calculadora de Aranceles y Honorarios: [Aranceles y Honorarios](/aranceles)
- Panel del Matriculado: [Mi Panel](/matriculados)
- Capacitaciones: [Capacitaciones](/capacitacion)
- Biblioteca Digital: [Biblioteca](/biblioteca)
- Bolsa de Trabajo: [Bolsa de Trabajo](/bolsa-trabajo)

ESTILO DE RESPUESTA:
- Cuando citás un documento de la biblioteca, incluís su URL en formato [Nombre del documento](URL).
- Cuando la consulta es sobre honorarios o aranceles, incluís el enlace [Calculadora de Aranceles](/aranceles).
- Citás normativa específica: ley, artículo, inciso cuando lo conocés con certeza.
- Usás ejemplos prácticos cuando ayudan a entender.`;

  // Intentar descargar archivos de los recursos relevantes (solo PDFs/imágenes, no links externos)
  const relevantes = seleccionarRelevantes(mensaje, recursos);
  const soloConArchivo = relevantes.filter(r => r.archivo);

  const intentosDescarga = await Promise.all(
    soloConArchivo.map(async r => {
      const base64 = await fetchBase64(r.archivo);
      return { titulo: r.titulo, url: r.archivo, base64 };
    })
  );

  const cargados    = intentosDescarga.filter(d => d.base64);
  const noCargados  = intentosDescarga.filter(d => !d.base64);
  const soloExterno = relevantes.filter(r => r.linkExterno && !r.archivo);

  const partsArchivos = cargados.map(a => ({
    inlineData: { mimeType: mimeDesdeUrl(a.url), data: a.base64 },
  }));

  // Nota sobre documentos no accesibles automáticamente
  const notasAcceso = [];
  if (noCargados.length > 0) {
    notasAcceso.push(
      `Documentos que no pudieron cargarse automáticamente (indicá al usuario que los abra desde estos enlaces):\n` +
      noCargados.map(d => `- "${d.titulo}": ${d.url}`).join('\n')
    );
  }
  if (soloExterno.length > 0) {
    notasAcceso.push(
      `Documentos externos relevantes (no podés leerlos directamente, pero podés indicar el enlace):\n` +
      soloExterno.map(r => `- "${r.titulo}": ${r.linkExterno}`).join('\n')
    );
  }

  const textoMensaje = notasAcceso.length > 0
    ? `${mensaje.trim()}\n\n[SISTEMA: ${notasAcceso.join('\n')}]`
    : mensaje.trim();

  const userParts = [...partsArchivos, { text: textoMensaje }];

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
    generationConfig: { maxOutputTokens: 2000, temperature: 0.4 },
  });

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`;
    let resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: geminiBody });

    if (resp.status === 429) {
      await new Promise(r => setTimeout(r, 6000));
      resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: geminiBody });
    }

    if (!resp.ok) {
      const errorText = await resp.text();
      console.error('[biblioteca-chat] Gemini error:', resp.status, errorText);
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

    const _partes = data.candidates?.[0]?.content?.parts || [];
    const texto = (_partes.find(p => !p.thought && p.text) || _partes.find(p => p.text) || {}).text || '';
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
