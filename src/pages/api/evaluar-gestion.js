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

const SYSTEM = `Sos un evaluador institucional especializado en colegios profesionales de Argentina. Analizás documentos de gestión (memorias, balances, resoluciones) y generás evaluaciones objetivas con lenguaje accesible para matriculados.
Si se adjuntan archivos, leé su contenido completo para hacer el análisis.
Si algún documento no pudo cargarse automáticamente pero se indica su URL, mencioná ese enlace para que el matriculado pueda consultarlo directamente.
Respondés ÚNICAMENTE con un objeto JSON válido, sin markdown, sin bloques de código.`;

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

  const { anio, memorias, balances, resoluciones } = body;

  let iaConfig = null;
  try {
    iaConfig = await sanity.fetch(`*[_type == "configuracionIA"][0]{ activado, apiKey, modelo }`);
  } catch (err) {
    console.error('[evaluar-gestion] Error leyendo configuracionIA:', err.message);
  }

  const activado = iaConfig?.activado !== false;
  const apiKey   = iaConfig?.apiKey?.trim() || import.meta.env.GEMINI_API_KEY;
  const modelo   = 'gemini-2.5-flash';

  if (!activado || !apiKey) {
    return json({ error: MSG_IA_INACTIVA }, 503);
  }

  // Construir contexto textual incluyendo URLs de cada documento
  const contexto = [];
  if (memorias?.length) {
    const lineas = memorias.map(m => {
      const url = m.archivo ? ` [Documento: ${m.archivo}]` : '';
      return `- ${m.titulo}${m.anio ? ` (${m.anio})` : ''}${m.descripcion ? ': ' + m.descripcion : ''}${url}`;
    });
    contexto.push(`MEMORIAS DE GESTIÓN:\n${lineas.join('\n')}`);
  }
  if (balances?.length) {
    const lineas = balances.map(b => {
      const url = b.archivo ? ` [Documento: ${b.archivo}]` : '';
      return `- ${b.titulo}${b.periodo ? ` · ${b.periodo}` : ''}${b.descripcion ? ': ' + b.descripcion : ''}${url}`;
    });
    contexto.push(`BALANCES Y ESTADOS CONTABLES:\n${lineas.join('\n')}`);
  }
  if (resoluciones?.length) {
    const lineas = resoluciones.map(r => {
      const url = r.archivo ? ` [Documento: ${r.archivo}]` : '';
      return `- ${r.numero ? 'Res. ' + r.numero : 'Resolución'}${r.fecha ? ' · ' + r.fecha : ''}${r.descripcion ? ': ' + r.descripcion : ''}${url}`;
    });
    contexto.push(`RESOLUCIONES DEL CONSEJO DIRECTIVO:\n${lineas.join('\n')}`);
  }

  if (!contexto.length) {
    return json({ error: 'No hay documentos de gestión para evaluar' }, 400);
  }

  // Intentar descargar hasta 3 documentos (para no exceder límite de tokens de Gemini)
  const todosLosDocs = [...(memorias || []), ...(balances || []), ...(resoluciones || [])];
  const docsConArchivo = todosLosDocs.filter(d => d.archivo).slice(0, 3);

  const intentosDescarga = await Promise.all(
    docsConArchivo.map(async d => {
      const base64 = await fetchBase64(d.archivo);
      return { titulo: d.titulo, url: d.archivo, base64 };
    })
  );

  const cargados   = intentosDescarga.filter(d => d.base64);
  const noCargados = intentosDescarga.filter(d => !d.base64);

  const periodoMsg = anio ? ` del año ${anio}` : '';

  // Notas sobre documentos no accesibles
  let notaDocumentos = '';
  if (cargados.length > 0) {
    notaDocumentos += `\n[Se adjuntan ${cargados.length} documento(s) para análisis: ${cargados.map(d => `"${d.titulo}"`).join(', ')}]`;
  }
  if (noCargados.length > 0) {
    notaDocumentos += `\n[Los siguientes documentos no pudieron cargarse automáticamente — incluí sus enlaces en la síntesis para que el matriculado pueda consultarlos:\n${noCargados.map(d => `- "${d.titulo}": ${d.url}`).join('\n')}]`;
  }

  const promptTexto = `Analizá la gestión${periodoMsg} del CPCC con esta información:

${contexto.join('\n\n')}
${notaDocumentos}

Respondé ÚNICAMENTE con un JSON (sin markdown) con exactamente estas claves:
{
  "transparencia": <número 0-100>,
  "eficiencia": <número 0-100>,
  "crecimiento": <número 0-100>,
  "respuesta": <número 0-100>,
  "calificacion": <número 0-100>,
  "sintesis": "síntesis de 2-3 oraciones. Si hay documentos no accesibles, mencioná que el matriculado puede consultarlos en los enlaces provistos",
  "positivos": "puntos destacables en una oración",
  "mejoras": "áreas de mejora en una oración"
}
Basate en la información provista. Si no hay datos suficientes para una métrica, asigná 50.`;

  const userParts = [];
  cargados.forEach(d => {
    userParts.push({ inlineData: { mimeType: mimeDesdeUrl(d.url), data: d.base64 } });
  });
  userParts.push({ text: promptTexto });

  // Escapa caracteres de control dentro de strings JSON
  function sanitizarStr(str) {
    let inStr = false, esc = false, out = '';
    for (let i = 0; i < str.length; i++) {
      const c = str[i], code = str.charCodeAt(i);
      if (esc)          { out += c; esc = false; continue; }
      if (c === '\\')   { out += c; esc = true;  continue; }
      if (c === '"')    { inStr = !inStr; out += c; continue; }
      if (inStr && code < 0x20) {
        if      (c === '\n') out += '\\n';
        else if (c === '\r') out += '\\r';
        else if (c === '\t') out += '\\t';
        else out += '\\u' + code.toString(16).padStart(4, '0');
        continue;
      }
      out += c;
    }
    return out;
  }

  // Extrae evaluacion del texto de Gemini con 4 niveles de fallback
  function extraerEvaluacion(raw) {
    // 1. Parse directo tras quitar markdown
    try {
      const clean = raw.replace(/^```(?:json)?\s*/im, '').replace(/\s*```\s*$/im, '').trim();
      const e = JSON.parse(sanitizarStr(clean));
      if (e && e.transparencia != null) return e;
    } catch {}

    // 2. Localizar JSON por profundidad de llaves (ignora texto antes/después)
    for (let start = 0; start < raw.length; start++) {
      if (raw[start] !== '{') continue;
      let depth = 0;
      for (let i = start; i < raw.length; i++) {
        if (raw[i] === '{') depth++;
        else if (raw[i] === '}') {
          depth--;
          if (depth === 0) {
            try {
              const e = JSON.parse(sanitizarStr(raw.slice(start, i + 1)));
              if (e && e.transparencia != null) return e;
            } catch {}
            break;
          }
        }
      }
    }

    // 3. Extracción manual campo por campo — infalible
    const num = k => { const m = raw.match(new RegExp('"' + k + '"\\s*:\\s*(\\d+)')); return m ? Number(m[1]) : 50; };
    const str = k => { const m = raw.match(new RegExp('"' + k + '"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"')); return m ? m[1].replace(/\\n/g, '\n') : ''; };
    return {
      transparencia: num('transparencia'),
      eficiencia:    num('eficiencia'),
      crecimiento:   num('crecimiento'),
      respuesta:     num('respuesta'),
      calificacion:  num('calificacion'),
      sintesis:      str('sintesis')  || 'Evaluación basada en los documentos disponibles.',
      positivos:     str('positivos') || '',
      mejoras:       str('mejoras')   || '',
    };
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`;
    const geminiBody = JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: 'user', parts: userParts }],
      generationConfig: { maxOutputTokens: 2500 },
    });

    let resp;
    for (let i = 0; i < 3; i++) {
      if (i > 0) await new Promise(r => setTimeout(r, i === 1 ? 8000 : 20000));
      resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: geminiBody });
      if (resp.status !== 429) break;
    }

    if (!resp.ok) {
      const errorText = await resp.text();
      console.error('[evaluar-gestion] Gemini error:', resp.status, errorText);
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

    // Tomar todas las partes: primero non-thought, si no hay, la última con texto
    const _partes = data.candidates?.[0]?.content?.parts || [];
    const textoRaw = (_partes.find(p => !p.thought && p.text) || _partes.slice().reverse().find(p => p.text) || {}).text || '';
    if (!textoRaw) return json({ error: 'El servicio de IA no devolvió respuesta' }, 502);

    const evaluacion = extraerEvaluacion(textoRaw);
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
