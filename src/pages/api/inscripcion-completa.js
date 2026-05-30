import { Resend } from 'resend';
import { createClient } from '@sanity/client';
import { db } from '../../lib/firebase-server.js';
import { collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

export const prerender = false;

const resend = new Resend(import.meta.env.RESEND_API_KEY);
const FROM   = import.meta.env.EMAIL_FROM || 'CPCC <onboarding@resend.dev>';
const ADMIN_EMAIL = import.meta.env.ADMIN_EMAIL || 'criminalisticacolegio@gmail.com';

const sanity = createClient({
  projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID,
  dataset:   import.meta.env.PUBLIC_SANITY_DATASET,
  useCdn:    false,
  apiVersion: '2023-05-03',
});

export const POST = async ({ request }) => {
  let fd;
  try {
    fd = await request.formData();
  } catch {
    return json({ error: 'Solicitud inválida' }, 400);
  }

  const nombre    = String(fd.get('nombre')    || '').trim();
  const dni       = String(fd.get('dni')       || '').trim();
  const email     = String(fd.get('email')     || '').trim();
  const matricula = String(fd.get('matricula') || '').trim();
  const cursoKey  = String(fd.get('cursoKey')  || '').trim();
  const paymentId = String(fd.get('paymentId') || '').trim();
  const archivo   = fd.get('comprobante');

  if (!nombre || !dni || !email || !cursoKey || !paymentId) {
    return json({ error: 'Completá todos los campos requeridos.' }, 400);
  }

  // ── 1. Datos del curso y del matriculado desde Sanity ─────
  let cursoTitulo  = 'Curso CPCC';
  let esMatriculado = false;

  try {
    const [configRes, matRes] = await Promise.all([
      sanity.fetch(
        `*[_type == "capacitacionConfig"][0]{ "c": cursos[_key == $k][0]{ titulo } }`,
        { k: cursoKey }
      ),
      sanity.fetch(
        `*[_type == "matriculado" && lower(email) == lower($email) && estado == "Activo"][0]{ _id }`,
        { email }
      ),
    ]);
    cursoTitulo   = configRes?.c?.titulo || cursoTitulo;
    esMatriculado = !!matRes;
  } catch (err) {
    console.error('[inscripcion-completa] Error Sanity:', err);
  }

  // ── 2. Guardar / actualizar en inscripciones/{cursoKey}_{email} ─
  const ahora    = new Date().toISOString();
  const enrollId = `${cursoKey}_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;

  const datos = {
    cursoKey,
    cursoTitulo,
    email,
    nombre,
    dni,
    matricula: matricula || null,
    esMatriculado,
    mpPaymentId: paymentId,
    inscripcionCompletaEn: ahora,
  };

  const enrollRef  = doc(collection(db, 'inscripciones'), enrollId);
  const existSnap  = await getDoc(enrollRef);

  if (existSnap.exists()) {
    await updateDoc(enrollRef, datos);
  } else {
    await setDoc(enrollRef, { ...datos, estado: 'ACTIVO', creadoEn: ahora });
  }

  // ── 3. "Carpeta por curso" — cursos/{cursoKey}/inscriptos/ ─
  // Esta subcollección permite al admin ver todos los inscriptos de un curso
  const cursoRef = doc(collection(db, `cursos/${cursoKey}/inscriptos`), enrollId);
  await setDoc(cursoRef, {
    ...datos,
    estado: 'ACTIVO',
    creadoEn: existSnap.exists() ? (existSnap.data().creadoEn || ahora) : ahora,
  }, { merge: true });

  // ── 4. Procesar el archivo adjunto ─────────────────────────
  let comprobanteBuffer   = null;
  let comprobanteFilename = 'comprobante.pdf';

  if (archivo && archivo.size > 0) {
    try {
      comprobanteBuffer   = Buffer.from(await archivo.arrayBuffer());
      comprobanteFilename = archivo.name || 'comprobante.pdf';

      // Validar tamaño máximo 5 MB
      if (comprobanteBuffer.length > 5 * 1024 * 1024) {
        return json({ error: 'El archivo supera el tamaño máximo de 5 MB.' }, 400);
      }
    } catch (err) {
      console.error('[inscripcion-completa] Error procesando archivo:', err);
    }
  }

  // ── 5. Notificar al Colegio ────────────────────────────────
  try {
    await resend.emails.send({
      from:     FROM,
      reply_to: email,
      to:       [ADMIN_EMAIL],
      subject:  `CPCC — Nueva inscripción: ${cursoTitulo}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;">
          <div style="background:#1b5e20;padding:28px 36px;border-radius:10px 10px 0 0;">
            <h1 style="color:white;margin:0;font-size:17px;font-weight:700;">
              Nueva inscripción al curso
            </h1>
          </div>
          <div style="background:#fff;padding:32px 36px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;">
            <h2 style="color:#166534;margin:0 0 20px;font-size:19px;">${cursoTitulo}</h2>
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <tr style="border-bottom:1px solid #f0f0f0;">
                <td style="padding:9px 0;color:#666;width:38%;">Nombre completo:</td>
                <td style="padding:9px 0;font-weight:600;">${nombre}</td>
              </tr>
              <tr style="border-bottom:1px solid #f0f0f0;">
                <td style="padding:9px 0;color:#666;">DNI:</td>
                <td style="padding:9px 0;font-weight:600;">${dni}</td>
              </tr>
              <tr style="border-bottom:1px solid #f0f0f0;">
                <td style="padding:9px 0;color:#666;">Email:</td>
                <td style="padding:9px 0;font-weight:600;">${email}</td>
              </tr>
              <tr style="border-bottom:1px solid #f0f0f0;">
                <td style="padding:9px 0;color:#666;">N° Matrícula:</td>
                <td style="padding:9px 0;font-weight:600;">${matricula || '—'}</td>
              </tr>
              <tr style="border-bottom:1px solid #f0f0f0;">
                <td style="padding:9px 0;color:#666;">Matriculado activo:</td>
                <td style="padding:9px 0;font-weight:600;color:${esMatriculado ? '#166534' : '#444'};">
                  ${esMatriculado ? 'Sí ✓' : 'No'}
                </td>
              </tr>
              <tr style="border-bottom:1px solid #f0f0f0;">
                <td style="padding:9px 0;color:#666;">ID de pago MP:</td>
                <td style="padding:9px 0;font-weight:600;">${paymentId}</td>
              </tr>
              <tr>
                <td style="padding:9px 0;color:#666;">Fecha inscripción:</td>
                <td style="padding:9px 0;font-weight:600;">
                  ${new Date(ahora).toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                </td>
              </tr>
            </table>
            ${comprobanteBuffer
              ? `<p style="margin:20px 0 0;font-size:13px;color:#166534;font-weight:600;">📎 Comprobante de pago adjunto.</p>`
              : `<p style="margin:20px 0 0;font-size:13px;color:#666;">ℹ️ Sin comprobante adjunto. Verificar con ID de pago MP.</p>`
            }
          </div>
        </div>
      `,
      attachments: comprobanteBuffer
        ? [{ filename: comprobanteFilename, content: comprobanteBuffer }]
        : [],
    });
  } catch (err) {
    console.error('[inscripcion-completa] Error notificando al Colegio:', err);
  }

  // ── 6. Confirmación al inscripto ───────────────────────────
  try {
    await resend.emails.send({
      from:  FROM,
      to:    [email],
      subject: `CPCC — Inscripción confirmada: ${cursoTitulo}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border-radius:12px;overflow:hidden;">
          <div style="background:#1b5e20;padding:32px 40px;text-align:center;">
            <h1 style="color:white;margin:0;font-size:19px;line-height:1.4;">
              Colegio de Profesionales en<br/>Ciencias Criminalísticas de Catamarca
            </h1>
          </div>
          <div style="background:white;padding:40px;">
            <h2 style="color:#166534;font-size:21px;margin:0 0 12px;">¡Inscripción oficial confirmada! 🎓</h2>
            <p style="color:#444;line-height:1.6;margin:0 0 24px;">
              Hola <strong>${nombre}</strong>, tu inscripción al curso fue registrada correctamente
              y el Colegio ya fue notificado.
            </p>
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin-bottom:24px;">
              <table style="width:100%;border-collapse:collapse;font-size:14px;">
                <tr><td style="padding:6px 0;color:#666;width:38%;">Curso:</td>
                    <td style="color:#111;font-weight:600;">${cursoTitulo}</td></tr>
                <tr><td style="padding:6px 0;color:#666;">Nombre:</td>
                    <td style="color:#111;font-weight:600;">${nombre}</td></tr>
                <tr><td style="padding:6px 0;color:#666;">DNI:</td>
                    <td style="color:#111;font-weight:600;">${dni}</td></tr>
                <tr><td style="padding:6px 0;color:#666;">Email:</td>
                    <td style="color:#111;font-weight:600;">${email}</td></tr>
                ${matricula ? `<tr><td style="padding:6px 0;color:#666;">Matrícula:</td>
                    <td style="color:#111;font-weight:600;">${matricula}</td></tr>` : ''}
              </table>
            </div>
            <p style="color:#666;font-size:13px;line-height:1.6;margin:0;">
              Al completar el curso recibirás tu certificado de aprobación por email automáticamente.
            </p>
          </div>
          <div style="background:#1b5e20;padding:20px 40px;text-align:center;">
            <p style="color:rgba(255,255,255,0.7);font-size:12px;margin:0;">
              CPCC · San Fernando del Valle de Catamarca · criminalisticacolegio@gmail.com
            </p>
          </div>
        </div>
      `,
    });
  } catch (err) {
    console.error('[inscripcion-completa] Error email al inscripto:', err);
  }

  return json({ success: true, message: '¡Inscripción completada!' });
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
