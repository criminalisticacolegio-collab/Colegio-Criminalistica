import { MercadoPagoConfig, Payment } from 'mercadopago';
import { db } from '../../lib/firebase-server.js';
import { collection, doc, getDoc } from 'firebase/firestore';
import { generarComprobantePago } from '../../lib/pdf.js';

export const prerender = false;

const mpClient = new MercadoPagoConfig({
  accessToken: import.meta.env.MP_ACCESS_TOKEN || '',
});

export const GET = async ({ url }) => {
  const params    = new URL(url).searchParams;
  const paymentId = params.get('paymentId') || '';
  const cursoKey  = params.get('cursoKey')  || '';
  const email     = params.get('email')     || '';

  if (!paymentId) {
    return new Response(JSON.stringify({ error: 'paymentId requerido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── 1. Buscar en Firestore (escrito por el webhook) ───────
  let pdfData = null;
  try {
    const snap = await getDoc(doc(collection(db, 'pagos'), `mp_${paymentId}`));
    if (snap.exists()) {
      const d = snap.data();
      pdfData = {
        nombreCompleto: d.nombre || d.matriculadoEmail || email,
        numeroMatricula: d.matriculadoId || null,
        email: d.matriculadoEmail || email,
        monto: d.monto || 0,
        concepto: d.concepto || 'Curso CPC CTM',
        mpPaymentId: paymentId,
        fecha: new Date(d.fecha || Date.now()),
      };
    }
  } catch (err) {
    console.error('[comprobante-curso] Error Firestore:', err);
  }

  // ── 2. Fallback: consultar MP API (race condition con webhook) ─
  if (!pdfData) {
    try {
      const paymentApi = new Payment(mpClient);
      const payment    = await paymentApi.get({ id: paymentId });

      const pn = payment.payer?.first_name || '';
      const pa = payment.payer?.last_name  || '';
      const nombreCompleto = (pn || pa)
        ? `${pn} ${pa}`.trim()
        : (email || 'Inscripto');

      pdfData = {
        nombreCompleto,
        numeroMatricula: null,
        email: payment.payer?.email || email,
        monto: payment.transaction_amount || 0,
        concepto: payment.additional_info?.items?.[0]?.title || `Curso: ${cursoKey}`,
        mpPaymentId: paymentId,
        fecha: new Date(payment.date_approved || payment.date_created),
      };
    } catch (err) {
      console.error('[comprobante-curso] Error MP API:', err);
    }
  }

  // ── 3. Datos mínimos si todo falló ────────────────────────
  if (!pdfData) {
    pdfData = {
      nombreCompleto: email || 'Inscripto',
      numeroMatricula: null,
      email,
      monto: 0,
      concepto: 'Curso CPC CTM',
      mpPaymentId: paymentId,
      fecha: new Date(),
    };
  }

  // ── 4. Generar PDF ────────────────────────────────────────
  try {
    const pdfBuffer = generarComprobantePago(pdfData);
    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Comprobante_Pago_${paymentId}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[comprobante-curso] Error generando PDF:', err);
    return new Response(JSON.stringify({ error: 'Error al generar el comprobante' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
