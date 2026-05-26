import { MercadoPagoConfig, Payment } from 'mercadopago';
import { db } from '../../lib/firebase-server.js';
import { collection, doc, getDoc, setDoc } from 'firebase/firestore';
import { enviarComprobantePago, enviarConfirmacionInscripcion } from '../../lib/email.js';
import { createClient } from '@sanity/client';

export const prerender = false;

const mpClient = new MercadoPagoConfig({
  accessToken: import.meta.env.MP_ACCESS_TOKEN || '',
});

const sanity = createClient({
  projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID,
  dataset: import.meta.env.PUBLIC_SANITY_DATASET,
  useCdn: false,
  apiVersion: '2023-05-03',
});

export const POST = async ({ request }) => {
  // MercadoPago espera un 200 rápido — devolvemos inmediatamente y procesamos async
  const body = await request.json().catch(() => null);

  // Ignorar notificaciones que no sean de tipo "payment"
  if (!body || body.type !== 'payment' || !body.data?.id) {
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }

  const mpPaymentId = String(body.data.id);

  // Procesar en background sin bloquear la respuesta
  processPayment(mpPaymentId).catch((err) =>
    console.error('[webhook] Error procesando pago:', mpPaymentId, err)
  );

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

async function processPayment(mpPaymentId) {
  if (!import.meta.env.MP_ACCESS_TOKEN) {
    console.warn('[webhook] MP_ACCESS_TOKEN no configurado, pago ignorado:', mpPaymentId);
    return;
  }
  // ── 1. Idempotencia: verificar si ya procesamos este pago ──
  const pagoRef = doc(collection(db, 'pagos'), `mp_${mpPaymentId}`);
  const existing = await getDoc(pagoRef);
  if (existing.exists()) {
    console.log('[webhook] Pago ya procesado, ignorando:', mpPaymentId);
    return;
  }

  // ── 2. Consultar el pago a la API de MercadoPago ──────────
  const paymentApi = new Payment(mpClient);
  const payment = await paymentApi.get({ id: mpPaymentId });

  if (payment.status !== 'approved') {
    console.log('[webhook] Pago no aprobado, estado:', payment.status, mpPaymentId);
    return;
  }

  const extRef = payment.external_reference || '';

  // ── 3. Detectar tipo de pago ──────────────────────────────
  if (extRef.startsWith('curso:')) {
    await processCoursePayment(mpPaymentId, payment, extRef);
    return;
  }

  // ── Pago de cuota/matrícula (flujo existente) ─────────────
  const payerEmail = payment.payer?.email || extRef || '';
  const monto = payment.transaction_amount;
  const concepto = payment.description || payment.additional_info?.items?.[0]?.title || 'Cuota/Matrícula CPCC';
  const fecha = new Date(payment.date_approved || payment.date_created);

  let matriculado = null;
  if (payerEmail) {
    try {
      matriculado = await sanity.fetch(
        `*[_type == "matriculado" && email == $email][0]{ nombreCompleto, numeroMatricula, email }`,
        { email: payerEmail }
      );
    } catch (err) {
      console.error('[webhook] Error buscando matriculado en Sanity:', err);
    }
  }

  await setDoc(pagoRef, {
    mpPaymentId,
    matriculadoEmail: payerEmail,
    matriculadoId: matriculado?.numeroMatricula || null,
    monto,
    concepto,
    fecha: fecha.toISOString(),
    estado: 'APROBADO',
    rawStatus: payment.status,
    paymentMethodId: payment.payment_method_id || null,
    creadoEn: new Date().toISOString(),
  });

  console.log('[webhook] Pago guardado en Firestore:', mpPaymentId);

  if (payerEmail) {
    try {
      await enviarComprobantePago({
        nombreCompleto: matriculado?.nombreCompleto || payerEmail,
        numeroMatricula: matriculado?.numeroMatricula || null,
        email: payerEmail,
        monto,
        concepto,
        mpPaymentId,
        fecha,
      });
      console.log('[webhook] Email de comprobante enviado a:', payerEmail);
    } catch (err) {
      console.error('[webhook] Error enviando email de comprobante:', err);
    }
  }
}

async function processCoursePayment(mpPaymentId, payment, extRef) {
  // extRef format: "curso:{cursoKey}:{email}"
  const withoutPrefix = extRef.slice('curso:'.length);
  const colonIdx = withoutPrefix.indexOf(':');
  const cursoKey = withoutPrefix.slice(0, colonIdx);
  const email = withoutPrefix.slice(colonIdx + 1);

  // Verificar inscripción existente
  const enrollId = `${cursoKey}_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
  const enrollRef = doc(collection(db, 'inscripciones'), enrollId);
  const existingEnroll = await getDoc(enrollRef);
  if (existingEnroll.exists() && existingEnroll.data().estado === 'ACTIVO') {
    console.log('[webhook] Inscripción ya activa, ignorando:', enrollId);
    return;
  }

  // Buscar datos del curso en Sanity
  let cursoTitulo = 'Curso CPCC';
  try {
    const config = await sanity.fetch(
      `*[_type == "capacitacionConfig"][0]{ "curso": cursos[_key == $key][0]{ titulo } }`,
      { key: cursoKey }
    );
    cursoTitulo = config?.curso?.titulo || cursoTitulo;
  } catch (err) {
    console.error('[webhook] Error buscando curso:', err);
  }

  // Buscar datos del matriculado
  let nombre = email;
  let esMatriculado = false;
  try {
    const mat = await sanity.fetch(
      `*[_type == "matriculado" && email == $email && estado == "ACTIVO"][0]{ nombreCompleto }`,
      { email }
    );
    if (mat) {
      nombre = mat.nombreCompleto;
      esMatriculado = true;
    }
  } catch (err) {
    console.error('[webhook] Error buscando matriculado:', err);
  }

  const tipoAcceso = esMatriculado ? 'pago_matriculados' : 'pago_publico';

  const enrollData = {
    cursoKey,
    cursoTitulo,
    email,
    nombre,
    esMatriculado,
    tipoAcceso,
    estado: 'ACTIVO',
    mpPaymentId,
    monto: payment.transaction_amount,
    creadoEn: new Date().toISOString(),
  };

  // Guardar inscripción en inscripciones/{enrollId}
  await setDoc(enrollRef, enrollData);

  // "Carpeta por curso": cursos/{cursoKey}/inscriptos/{enrollId}
  // Permite al admin consultar todos los inscriptos de un curso específico
  const cursoInscriptoRef = doc(collection(db, `cursos/${cursoKey}/inscriptos`), enrollId);
  await setDoc(cursoInscriptoRef, enrollData, { merge: true });

  // Registrar el pago
  const pagoRef = doc(collection(db, 'pagos'), `mp_${mpPaymentId}`);
  await setDoc(pagoRef, {
    mpPaymentId,
    tipo: 'curso',
    cursoKey,
    cursoTitulo,
    matriculadoEmail: email,
    monto: payment.transaction_amount,
    concepto: `Curso: ${cursoTitulo}`,
    fecha: new Date(payment.date_approved || payment.date_created).toISOString(),
    estado: 'APROBADO',
    rawStatus: payment.status,
    creadoEn: new Date().toISOString(),
  });

  console.log('[webhook] Inscripción de curso creada:', enrollId);

  try {
    await enviarConfirmacionInscripcion({ nombre, email, cursoTitulo, esMatriculado, tipoAcceso });
  } catch (err) {
    console.error('[webhook] Error enviando confirmación de inscripción:', err);
  }
}
