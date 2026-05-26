export const prerender = false;

import { createClient } from '@sanity/client';
import {
  enviarAvisoRiesgoMora,
  enviarNotificacionMoraFormal,
  enviarResumenMoraAdmin,
} from '../../lib/email.js';

const sanity = createClient({
  projectId: '8q7vz6co',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-05-03',
  token: import.meta.env.SANITY_API_WRITE_TOKEN,
});

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

function contarMesesConsecutivosPendientes(historialPagos) {
  if (!historialPagos?.length) return 0;

  const hoy = new Date();
  const mesActual = hoy.getMonth();   // 0-11
  const anioActual = hoy.getFullYear();

  // Solo entradas hasta el mes actual, ordenadas de más reciente a más antigua
  const sorted = [...historialPagos]
    .filter(p => {
      const idx = MESES.indexOf(p.mes);
      if (idx === -1) return false;
      return p.anio * 12 + idx <= anioActual * 12 + mesActual;
    })
    .sort((a, b) => {
      const na = a.anio * 12 + MESES.indexOf(a.mes);
      const nb = b.anio * 12 + MESES.indexOf(b.mes);
      return nb - na;
    });

  if (!sorted.length) return 0;

  let count = 0;
  let expectedNum = sorted[0].anio * 12 + MESES.indexOf(sorted[0].mes);

  for (const pago of sorted) {
    const numMes = pago.anio * 12 + MESES.indexOf(pago.mes);
    if (numMes !== expectedNum) break; // hay un hueco → no son consecutivos
    if (pago.estado !== 'pendiente') break; // encontró un mes pagado → fin
    count++;
    expectedNum--;
  }

  return count;
}

export async function ejecutarControlMora() {
  const matriculados = await sanity.fetch(
    `*[_type == "matriculado" && estado == "Activo"]{
      _id, nombreCompleto, email,
      numeroMatricula, historialPagos
    }`
  );

  const enRiesgo = [];
  const enMora   = [];

  for (const mat of matriculados) {
    const meses = contarMesesConsecutivosPendientes(mat.historialPagos);
    if (meses === 2) {
      enRiesgo.push({ nombreCompleto: mat.nombreCompleto, email: mat.email, numeroMatricula: mat.numeroMatricula, mesesConsecutivos: meses });
    } else if (meses >= 3) {
      enMora.push({ nombreCompleto: mat.nombreCompleto, email: mat.email, numeroMatricula: mat.numeroMatricula, mesesConsecutivos: meses });
    }
  }

  // Emails individuales — en riesgo
  for (const mat of enRiesgo) {
    try {
      await enviarAvisoRiesgoMora(mat);
    } catch (err) {
      console.error(`[control-mora] Error aviso riesgo → ${mat.email}:`, err.message);
    }
  }

  // Emails individuales — en mora
  for (const mat of enMora) {
    try {
      await enviarNotificacionMoraFormal(mat);
    } catch (err) {
      console.error(`[control-mora] Error mora formal → ${mat.email}:`, err.message);
    }
  }

  // Resumen al admin (solo si hay casos)
  if (enRiesgo.length > 0 || enMora.length > 0) {
    try {
      await enviarResumenMoraAdmin({ enRiesgo, enMora, fecha: new Date() });
    } catch (err) {
      console.error('[control-mora] Error resumen admin:', err.message);
    }
  }

  console.log(`[control-mora] Procesados: ${matriculados.length} | En riesgo: ${enRiesgo.length} | En mora: ${enMora.length}`);

  return {
    enRiesgo: enRiesgo.length,
    enMora:   enMora.length,
    procesados: matriculados.length,
    fecha: new Date(),
  };
}

export const POST = async ({ request }) => {
  const secret = import.meta.env.ADMIN_SECRET;
  if (!secret) return json({ error: 'ADMIN_SECRET no configurado' }, 503);
  if (request.headers.get('Authorization') !== `Bearer ${secret}`) {
    return json({ error: 'No autorizado' }, 401);
  }

  try {
    const resultado = await ejecutarControlMora();
    return json(resultado);
  } catch (err) {
    console.error('[control-mora] Error:', err);
    return json({ error: 'Error interno al ejecutar control de mora' }, 500);
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
