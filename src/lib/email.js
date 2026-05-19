import { Resend } from 'resend';
import { generarComprobantePago, generarCartaAspirante, generarCertificadoCurso } from './pdf.js';

const resend = new Resend(import.meta.env.RESEND_API_KEY);

// Dirección from verificada en Resend. Antes de producción configurar dominio propio.
const FROM = import.meta.env.EMAIL_FROM || 'CPC CTM <onboarding@resend.dev>';
const REPLY_TO = 'criminalisticacolegio@gmail.com';

/**
 * Email de confirmación al aspirante cuando completa el formulario de registro.
 */
export async function enviarConfirmacionAspirante({ nombre, apellido, dni, email, tituloProfesional, cuil, jurisdiccion }) {
  let pdfBuffer;
  try {
    pdfBuffer = generarCartaAspirante({
      nombre,
      apellido,
      dni,
      email,
      tituloProfesional,
      fecha: new Date(),
    });
  } catch (err) {
    console.error('[email] Error generando carta aspirante PDF:', err);
  }

  const attachments = pdfBuffer
    ? [{ filename: `Confirmacion_Registro_${apellido}_${nombre}.pdf`, content: pdfBuffer }]
    : [];

  const { error } = await resend.emails.send({
    from: FROM,
    reply_to: REPLY_TO,
    to: [email],
    subject: 'Colegio de Criminalísticas Catamarca — Recibimos tu solicitud de matriculación',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 0; border-radius: 12px; overflow: hidden;">

        <!-- Header -->
        <div style="background: #1b5e20; padding: 32px 40px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 700; line-height: 1.4;">
            Colegio de Profesionales en<br/>Ciencias Criminalísticas de Catamarca
          </h1>
        </div>

        <!-- Body -->
        <div style="padding: 40px; background: white;">
          <h2 style="color: #1b5e20; font-size: 22px; margin: 0 0 12px;">¡Recibimos tu solicitud! ✅</h2>
          <p style="color: #444; line-height: 1.6; margin: 0 0 24px;">
            Hola <strong>${nombre}</strong>, tu solicitud de matriculación fue recibida correctamente.
            Tu legajo quedará en estado <strong>PENDIENTE</strong> hasta que nos comuniquemos para coordinar la verificación presencial.
          </p>

          <!-- Datos box -->
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <h3 style="color: #166534; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 16px;">Datos Registrados</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr><td style="padding: 6px 0; color: #666; width: 40%;">Nombre completo:</td><td style="color: #111; font-weight: 600;">${nombre} ${apellido}</td></tr>
              <tr><td style="padding: 6px 0; color: #666;">DNI:</td><td style="color: #111; font-weight: 600;">${dni}</td></tr>
              ${cuil ? `<tr><td style="padding: 6px 0; color: #666;">CUIL/CUIT:</td><td style="color: #111; font-weight: 600;">${cuil}</td></tr>` : ''}
              ${jurisdiccion ? `<tr><td style="padding: 6px 0; color: #666;">Jurisdicción:</td><td style="color: #111; font-weight: 600;">${jurisdiccion}</td></tr>` : ''}
              ${tituloProfesional ? `<tr><td style="padding: 6px 0; color: #666;">Título profesional:</td><td style="color: #111; font-weight: 600;">${tituloProfesional}</td></tr>` : ''}
              <tr><td style="padding: 6px 0; color: #666;">Email:</td><td style="color: #111; font-weight: 600;">${email}</td></tr>
            </table>
          </div>

          <p style="color: #444; line-height: 1.6; font-size: 14px; margin: 0 0 8px;">
            📎 Adjuntamos la carta de recepción de tu solicitud para tus registros.
          </p>
          <p style="color: #444; line-height: 1.6; font-size: 14px; margin: 0;">
            Si tenés alguna consulta, respondé este email o contactanos directamente en Secretaría.
          </p>
        </div>

        <!-- Footer -->
        <div style="background: #1b5e20; padding: 20px 40px; text-align: center;">
          <p style="color: rgba(255,255,255,0.7); font-size: 12px; margin: 0;">
            CPC CTM · San Fernando del Valle de Catamarca · criminalisticacolegio@gmail.com
          </p>
        </div>
      </div>
    `,
    attachments,
  });

  if (error) {
    console.error('[email] Error enviando confirmación aspirante:', error);
    throw error;
  }
}

/**
 * Email con comprobante de pago en PDF adjunto, enviado tras confirmación del webhook.
 */
export async function enviarComprobantePago({ nombreCompleto, numeroMatricula, email, monto, concepto, mpPaymentId, fecha }) {
  let pdfBuffer;
  try {
    pdfBuffer = generarComprobantePago({
      nombreCompleto,
      numeroMatricula,
      email,
      monto,
      concepto,
      mpPaymentId,
      fecha,
    });
  } catch (err) {
    console.error('[email] Error generando comprobante PDF:', err);
  }

  const attachments = pdfBuffer
    ? [{ filename: `Comprobante_Pago_${numeroMatricula || 'CPC'}_${mpPaymentId}.pdf`, content: pdfBuffer }]
    : [];

  const montoFormateado = Number(monto).toLocaleString('es-AR');
  const fechaStr = new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const { error } = await resend.emails.send({
    from: FROM,
    reply_to: REPLY_TO,
    to: [email],
    subject: `CPC CTM — Comprobante de pago por $${montoFormateado}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; border-radius: 12px; overflow: hidden;">

        <!-- Header -->
        <div style="background: #1b5e20; padding: 32px 40px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 700; line-height: 1.4;">
            Colegio de Profesionales en<br/>Ciencias Criminalísticas de Catamarca
          </h1>
        </div>

        <!-- Body -->
        <div style="padding: 40px; background: white;">
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="width: 64px; height: 64px; background: #dcfce7; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 28px; margin-bottom: 12px;">✅</div>
            <h2 style="color: #166534; font-size: 24px; margin: 0 0 8px;">¡Pago Aprobado!</h2>
            <p style="color: #666; margin: 0; font-size: 15px;">Tu pago fue procesado y confirmado con éxito.</p>
          </div>

          <!-- Recibo box -->
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr style="border-bottom: 1px solid #d1fae5;">
                <td style="padding: 10px 0; color: #666;">Profesional:</td>
                <td style="color: #111; font-weight: 600; text-align: right;">${nombreCompleto}</td>
              </tr>
              ${numeroMatricula ? `<tr style="border-bottom: 1px solid #d1fae5;"><td style="padding: 10px 0; color: #666;">N° Matrícula:</td><td style="color: #111; font-weight: 600; text-align: right;">${numeroMatricula}</td></tr>` : ''}
              <tr style="border-bottom: 1px solid #d1fae5;">
                <td style="padding: 10px 0; color: #666;">Concepto:</td>
                <td style="color: #111; font-weight: 600; text-align: right;">${concepto}</td>
              </tr>
              <tr style="border-bottom: 1px solid #d1fae5;">
                <td style="padding: 10px 0; color: #666;">Fecha:</td>
                <td style="color: #111; font-weight: 600; text-align: right;">${fechaStr}</td>
              </tr>
              <tr style="border-bottom: 1px solid #d1fae5;">
                <td style="padding: 10px 0; color: #666;">N° Operación MP:</td>
                <td style="color: #111; font-weight: 600; text-align: right;">${mpPaymentId}</td>
              </tr>
              <tr>
                <td style="padding: 14px 0 0; color: #166534; font-weight: 700; font-size: 16px;">TOTAL PAGADO:</td>
                <td style="padding: 14px 0 0; color: #166534; font-weight: 800; font-size: 20px; text-align: right;">$${montoFormateado}</td>
              </tr>
            </table>
          </div>

          <p style="color: #666; font-size: 13px; line-height: 1.6; margin: 0 0 8px;">
            📎 Adjuntamos el comprobante oficial en PDF. Podés guardarlo para tus registros.
          </p>
          <p style="color: #666; font-size: 13px; line-height: 1.6; margin: 0;">
            La acreditación impactará en tu legajo en un plazo de 24 horas hábiles.
          </p>
        </div>

        <!-- Footer -->
        <div style="background: #1b5e20; padding: 20px 40px; text-align: center;">
          <p style="color: rgba(255,255,255,0.7); font-size: 12px; margin: 0;">
            CPC CTM · San Fernando del Valle de Catamarca · criminalisticacolegio@gmail.com
          </p>
        </div>
      </div>
    `,
    attachments,
  });

  if (error) {
    console.error('[email] Error enviando comprobante de pago:', error);
    throw error;
  }
}

/**
 * Confirmación de inscripción a un curso (gratuito o pago ya aprobado).
 */
export async function enviarConfirmacionInscripcion({ nombre, email, cursoTitulo, esMatriculado, tipoAcceso }) {
  const esPago = tipoAcceso?.startsWith('pago_');
  const descuentoMatriculado = esMatriculado && tipoAcceso === 'pago_matriculados';

  const { error } = await resend.emails.send({
    from: FROM,
    reply_to: REPLY_TO,
    to: [email],
    subject: `CPC CTM — Inscripción confirmada: ${cursoTitulo}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; border-radius: 12px; overflow: hidden;">
        <div style="background: #1b5e20; padding: 32px 40px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 700; line-height: 1.4;">
            Colegio de Profesionales en<br/>Ciencias Criminalísticas de Catamarca
          </h1>
        </div>
        <div style="padding: 40px; background: white;">
          <h2 style="color: #166534; font-size: 22px; margin: 0 0 12px;">¡Inscripción confirmada! ✅</h2>
          <p style="color: #444; line-height: 1.6; margin: 0 0 24px;">
            Hola <strong>${nombre}</strong>, tu inscripción al curso fue confirmada correctamente.
            ${esPago ? 'Tu pago fue aprobado y ya tenés acceso completo al curso.' : ''}
          </p>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <h3 style="color: #166534; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 12px;">Detalle de la inscripción</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr><td style="padding: 6px 0; color: #666; width: 40%;">Curso:</td><td style="color: #111; font-weight: 600;">${cursoTitulo}</td></tr>
              <tr><td style="padding: 6px 0; color: #666;">Email:</td><td style="color: #111; font-weight: 600;">${email}</td></tr>
              ${esMatriculado ? '<tr><td style="padding: 6px 0; color: #666;">Condición:</td><td style="color: #166534; font-weight: 700;">Matriculado activo ✓</td></tr>' : ''}
              ${descuentoMatriculado ? '<tr><td style="padding: 6px 0; color: #666;">Descuento:</td><td style="color: #166534; font-weight: 700;">Precio especial matriculado aplicado ✓</td></tr>' : ''}
            </table>
          </div>
          <p style="color: #666; font-size: 13px; line-height: 1.6; margin: 0;">
            Al finalizar el curso recibirás tu certificado de aprobación por email automáticamente.
          </p>
        </div>
        <div style="background: #1b5e20; padding: 20px 40px; text-align: center;">
          <p style="color: rgba(255,255,255,0.7); font-size: 12px; margin: 0;">
            CPC CTM · San Fernando del Valle de Catamarca · criminalisticacolegio@gmail.com
          </p>
        </div>
      </div>
    `,
  });

  if (error) {
    console.error('[email] Error enviando confirmación de inscripción:', error);
    throw error;
  }
}

/**
 * Email con certificado PDF de aprobación de curso, adjunto.
 */
export async function enviarCertificadoCurso({ nombre, email, cursoTitulo, fecha }) {
  let pdfBuffer;
  try {
    pdfBuffer = generarCertificadoCurso({ nombreCompleto: nombre, cursoTitulo, fecha });
  } catch (err) {
    console.error('[email] Error generando certificado PDF:', err);
  }

  const nombreArch = cursoTitulo.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40);
  const attachments = pdfBuffer
    ? [{ filename: `Certificado_${nombreArch}.pdf`, content: pdfBuffer }]
    : [];

  const fechaStr = new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const { error } = await resend.emails.send({
    from: FROM,
    reply_to: REPLY_TO,
    to: [email],
    subject: `CPC CTM — Certificado de aprobación: ${cursoTitulo}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; border-radius: 12px; overflow: hidden;">
        <div style="background: #1b5e20; padding: 32px 40px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 700; line-height: 1.4;">
            Colegio de Profesionales en<br/>Ciencias Criminalísticas de Catamarca
          </h1>
        </div>
        <div style="padding: 40px; background: white;">
          <div style="text-align: center; margin-bottom: 28px;">
            <div style="font-size: 48px; margin-bottom: 12px;">🎓</div>
            <h2 style="color: #166534; font-size: 24px; margin: 0 0 8px;">¡Certificado emitido!</h2>
            <p style="color: #666; margin: 0; font-size: 15px;">Completaste el curso con éxito.</p>
          </div>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr style="border-bottom: 1px solid #d1fae5;">
                <td style="padding: 10px 0; color: #666;">Profesional:</td>
                <td style="color: #111; font-weight: 600; text-align: right;">${nombre}</td>
              </tr>
              <tr style="border-bottom: 1px solid #d1fae5;">
                <td style="padding: 10px 0; color: #666;">Curso:</td>
                <td style="color: #111; font-weight: 600; text-align: right;">${cursoTitulo}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #666;">Fecha de aprobación:</td>
                <td style="color: #111; font-weight: 600; text-align: right;">${fechaStr}</td>
              </tr>
            </table>
          </div>
          <p style="color: #666; font-size: 13px; line-height: 1.6; margin: 0 0 8px;">
            📎 Adjuntamos tu certificado oficial en PDF. Guardalo para tus registros profesionales.
          </p>
          <p style="color: #666; font-size: 13px; line-height: 1.6; margin: 0;">
            Este certificado es emitido oficialmente por el Colegio de Profesionales en Ciencias Criminalísticas de Catamarca.
          </p>
        </div>
        <div style="background: #1b5e20; padding: 20px 40px; text-align: center;">
          <p style="color: rgba(255,255,255,0.7); font-size: 12px; margin: 0;">
            CPC CTM · San Fernando del Valle de Catamarca · criminalisticacolegio@gmail.com
          </p>
        </div>
      </div>
    `,
    attachments,
  });

  if (error) {
    console.error('[email] Error enviando certificado de curso:', error);
    throw error;
  }
}

/**
 * Email de reseteo / primer acceso al área privada de matriculados.
 * El link es generado por Firebase Admin y se envía por Resend para evitar spam.
 */
export async function enviarResetPassword({ nombre, email, resetLink }) {
  const nombreMostrado = nombre || 'Estimado/a profesional';

  const { error } = await resend.emails.send({
    from: FROM,
    reply_to: REPLY_TO,
    to: [email],
    subject: 'CPC Catamarca — Acceso a tu área privada',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; border-radius: 12px; overflow: hidden;">

        <!-- Header -->
        <div style="background: #1b5e20; padding: 32px 40px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 700; line-height: 1.4;">
            Colegio de Profesionales en<br/>Ciencias Criminalísticas de Catamarca
          </h1>
        </div>

        <!-- Body -->
        <div style="padding: 40px; background: white;">
          <p style="color: #444; line-height: 1.7; font-size: 15px; margin: 0 0 16px;">
            ${nombreMostrado},
          </p>
          <p style="color: #444; line-height: 1.7; font-size: 15px; margin: 0 0 24px;">
            Recibimos tu solicitud de acceso al área privada del Colegio de Profesionales en Ciencias Criminalísticas.
          </p>
          <p style="color: #444; line-height: 1.7; font-size: 15px; margin: 0 0 32px;">
            Para establecer tu contraseña hacé clic en el siguiente botón:
          </p>

          <!-- CTA Button -->
          <div style="text-align: center; margin-bottom: 32px;">
            <a href="${resetLink}"
               style="display: inline-block; background: #1b5e20; color: white; text-decoration: none;
                      padding: 14px 36px; border-radius: 8px; font-weight: 700; font-size: 16px;
                      letter-spacing: 0.02em;">
              Crear mi contraseña
            </a>
          </div>

          <!-- Aviso validez -->
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
            <p style="color: #166534; font-size: 13px; margin: 0; line-height: 1.6;">
              ⏱ <strong>Este link es válido por 24 horas.</strong><br/>
              Si no solicitaste este acceso, ignorá este mensaje — tu cuenta permanece segura.
            </p>
          </div>

          <p style="color: #666; font-size: 13px; line-height: 1.6; margin: 0 0 8px;">
            Si el botón no funciona, copiá y pegá el siguiente enlace en tu navegador:
          </p>
          <p style="font-size: 11px; color: #999; word-break: break-all; margin: 0;">
            ${resetLink}
          </p>
        </div>

        <!-- Firma -->
        <div style="padding: 24px 40px; background: #f9fafb; border-top: 1px solid #e5e7eb;">
          <p style="color: #555; font-size: 14px; margin: 0 0 4px; line-height: 1.6;">
            Atentamente,<br/>
            <strong style="color: #1b5e20;">Colegio de Profesionales en Ciencias Criminalísticas</strong><br/>
            Provincia de Catamarca
          </p>
        </div>

        <!-- Footer -->
        <div style="background: #1b5e20; padding: 20px 40px; text-align: center;">
          <p style="color: rgba(255,255,255,0.7); font-size: 12px; margin: 0;">
            Avenida América Latina 1672 — San Fernando del Valle de Catamarca<br/>
            criminalisticacolegio@gmail.com
          </p>
        </div>
      </div>
    `,
  });

  if (error) {
    console.error('[email] Error enviando reset password:', error);
    throw error;
  }
}

/**
 * Email de bienvenida al nuevo matriculado activo.
 * Incluye datos de matrícula, beneficios y link para crear contraseña (Firebase reset link).
 */
export async function enviarBienvenida({ nombreCompleto, email, numeroMatricula, especialidad, jurisdiccion, resetLink }) {
  const fechaAlta = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });

  const { error } = await resend.emails.send({
    from: FROM,
    reply_to: REPLY_TO,
    to: [email],
    subject: '¡Bienvenido/a al CPC Catamarca — Tu matrícula profesional está activa!',
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
      <body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;">
        <tr><td align="center" style="padding:32px 16px;">
          <table width="600" cellpadding="0" cellspacing="0" style="background:white;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">

            <!-- ENCABEZADO -->
            <tr>
              <td style="background:#1b5e20;padding:36px 40px;text-align:center;">
                <div style="width:60px;height:4px;background:rgba(255,255,255,0.3);margin:0 auto 20px;border-radius:2px;"></div>
                <h1 style="color:white;margin:0;font-size:20px;font-weight:800;line-height:1.4;letter-spacing:-0.01em;">
                  Colegio de Profesionales en<br/>Ciencias Criminalísticas
                </h1>
                <p style="color:rgba(255,255,255,0.7);margin:6px 0 0;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;">
                  Provincia de Catamarca
                </p>
                <div style="width:60px;height:4px;background:rgba(255,255,255,0.3);margin:20px auto 0;border-radius:2px;"></div>
              </td>
            </tr>

            <!-- CUERPO -->
            <tr>
              <td style="padding:40px;">

                <p style="color:#444;line-height:1.7;font-size:15px;margin:0 0 6px;">
                  Estimado/a <strong>${nombreCompleto}</strong>,
                </p>
                <p style="color:#444;line-height:1.7;font-size:15px;margin:0 0 16px;">
                  Es un honor darte la bienvenida al <strong>Colegio de Profesionales en Ciencias Criminalísticas de la Provincia de Catamarca</strong>.
                </p>
                <p style="color:#444;line-height:1.7;font-size:15px;margin:0 0 32px;">
                  Tu matrícula profesional ha sido oficialmente activada. A partir de hoy formás parte de la institución que representa y defiende el ejercicio profesional de las Ciencias Criminalísticas en nuestra provincia.
                </p>

                <!-- DATOS DE MATRÍCULA -->
                <div style="border:2px solid #1b5e20;border-radius:10px;overflow:hidden;margin-bottom:32px;">
                  <div style="background:#1b5e20;padding:10px 20px;">
                    <p style="color:white;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.12em;margin:0;">Tus Datos de Matrícula</p>
                  </div>
                  <table style="width:100%;border-collapse:collapse;font-size:14px;">
                    <tr style="border-bottom:1px solid #e5e7eb;">
                      <td style="padding:11px 20px;color:#666;width:44%;">🎓 Nombre completo</td>
                      <td style="padding:11px 20px;color:#111;font-weight:700;">${nombreCompleto}</td>
                    </tr>
                    <tr style="border-bottom:1px solid #e5e7eb;background:#f9fafb;">
                      <td style="padding:11px 20px;color:#666;">🔢 Número de matrícula</td>
                      <td style="padding:11px 20px;color:#1b5e20;font-weight:800;font-size:16px;">${numeroMatricula}</td>
                    </tr>
                    <tr style="border-bottom:1px solid #e5e7eb;">
                      <td style="padding:11px 20px;color:#666;">📋 Especialidad</td>
                      <td style="padding:11px 20px;color:#111;font-weight:600;">${especialidad}</td>
                    </tr>
                    <tr style="border-bottom:1px solid #e5e7eb;background:#f9fafb;">
                      <td style="padding:11px 20px;color:#666;">📍 Jurisdicción</td>
                      <td style="padding:11px 20px;color:#111;font-weight:600;">${jurisdiccion}</td>
                    </tr>
                    <tr style="border-bottom:1px solid #e5e7eb;">
                      <td style="padding:11px 20px;color:#666;">📅 Fecha de alta</td>
                      <td style="padding:11px 20px;color:#111;font-weight:600;">${fechaAlta}</td>
                    </tr>
                    <tr style="background:#f0fdf4;">
                      <td style="padding:11px 20px;color:#166534;font-weight:700;">✅ Estado</td>
                      <td style="padding:11px 20px;color:#166534;font-weight:800;">ACTIVO</td>
                    </tr>
                  </table>
                </div>

                <!-- BENEFICIOS -->
                <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:20px 24px;margin-bottom:32px;">
                  <p style="color:#166534;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.12em;margin:0 0 14px;">Tus Beneficios como Matriculado/a</p>
                  <table style="width:100%;border-collapse:collapse;font-size:13px;color:#444;">
                    <tr><td style="padding:5px 0;">✅ Acceso al área privada con tu historial de pagos</td></tr>
                    <tr><td style="padding:5px 0;">✅ Descarga de constancia de matrícula vigente</td></tr>
                    <tr><td style="padding:5px 0;">✅ Descarga de constancia de ética profesional</td></tr>
                    <tr><td style="padding:5px 0;">✅ Acceso a capacitaciones con precio preferencial</td></tr>
                    <tr><td style="padding:5px 0;">✅ Publicación en el padrón oficial público</td></tr>
                    <tr><td style="padding:5px 0;">✅ Participación en la bolsa de trabajo</td></tr>
                    <tr><td style="padding:5px 0;">✅ Biblioteca digital especializada</td></tr>
                    <tr><td style="padding:5px 0;">✅ Beneficios y convenios institucionales</td></tr>
                  </table>
                </div>

                <!-- ACTIVAR ACCESO -->
                <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;padding:20px 24px;margin-bottom:32px;">
                  <p style="color:#92400e;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.12em;margin:0 0 10px;">Activá tu Acceso al Área Privada</p>
                  <p style="color:#444;font-size:14px;line-height:1.6;margin:0 0 20px;">
                    Para acceder a todos tus beneficios en línea necesitás crear tu contraseña personal.<br/>
                    Hacé clic en el botón y seguí los pasos:
                  </p>
                  <div style="text-align:center;margin-bottom:16px;">
                    <a href="${resetLink}"
                       style="display:inline-block;background:#1b5e20;color:white;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:800;font-size:15px;letter-spacing:0.02em;">
                      🔐 Crear mi contraseña de acceso
                    </a>
                  </div>
                  <p style="color:#92400e;font-size:12px;text-align:center;margin:0;">
                    ⏱ Este link es válido por 24 horas. Si no lo usás podés solicitar uno nuevo desde la página.
                  </p>
                </div>

                <!-- RECORDÁ -->
                <div style="border-left:4px solid #1b5e20;padding:12px 16px;margin-bottom:32px;background:#f9fafb;border-radius:0 8px 8px 0;">
                  <p style="color:#555;font-size:13px;line-height:1.7;margin:0;">
                    📌 Tu cuota mensual vence el día <strong>20 de cada mes</strong>.<br/>
                    📌 Ante cualquier consulta escribinos a <a href="mailto:criminalisticacolegio@gmail.com" style="color:#1b5e20;font-weight:700;">criminalisticacolegio@gmail.com</a><br/>
                    📌 Seguinos en nuestras redes para estar al día con novedades, capacitaciones y comunicados.
                  </p>
                </div>

                <p style="color:#444;line-height:1.7;font-size:14px;margin:0 0 24px;">
                  Estamos para acompañarte en cada paso de tu ejercicio profesional.
                </p>

                <!-- FIRMA -->
                <div style="border-top:1px solid #e5e7eb;padding-top:20px;">
                  <p style="color:#444;font-size:14px;line-height:1.7;margin:0;">
                    Con orgullo institucional,<br/><br/>
                    <strong style="color:#1b5e20;font-size:15px;">Lic. Diego Tapia</strong><br/>
                    Presidente<br/>
                    Colegio de Profesionales en Ciencias Criminalísticas<br/>
                    Provincia de Catamarca
                  </p>
                </div>

              </td>
            </tr>

            <!-- PIE -->
            <tr>
              <td style="background:#1b5e20;padding:28px 40px;text-align:center;">
                <p style="color:rgba(255,255,255,0.5);font-size:11px;margin:0 0 6px;">
                  Avenida América Latina 1672 — San Fernando del Valle de Catamarca
                </p>
                <p style="color:rgba(255,255,255,0.7);font-size:12px;margin:0 0 10px;">
                  <a href="mailto:criminalisticacolegio@gmail.com" style="color:rgba(255,255,255,0.9);text-decoration:none;">criminalisticacolegio@gmail.com</a>
                </p>
                <p style="color:rgba(255,255,255,0.45);font-size:10px;margin:0;">
                  © 2025 CPC Catamarca — Ley Provincial N° 5.595/19
                </p>
              </td>
            </tr>

          </table>
        </td></tr>
      </table>
      </body></html>
    `,
  });

  if (error) {
    console.error('[email] Error enviando bienvenida:', error);
    throw error;
  }
}

/**
 * Notificación a secretaría + acuse de recibo al remitente cuando alguien usa el formulario de contacto.
 */
export async function enviarConsultaContacto({ nombre, email, mensaje }) {
  // 1. Notificación interna a la secretaría
  await resend.emails.send({
    from: FROM,
    reply_to: email,
    to: [REPLY_TO],
    subject: `Consulta web — ${nombre}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; border-radius: 12px; overflow: hidden;">
        <div style="background: #1b5e20; padding: 28px 40px;">
          <h1 style="color: white; margin: 0; font-size: 17px; font-weight: 700;">Nueva consulta desde el sitio web</h1>
        </div>
        <div style="padding: 32px; background: white;">
          <table style="width: 100%; font-size: 14px; border-collapse: collapse; margin-bottom: 24px;">
            <tr><td style="padding: 8px 0; color: #666; width: 30%;">Nombre:</td><td style="font-weight: 600; color: #111;">${nombre}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Email:</td><td style="font-weight: 600; color: #111;"><a href="mailto:${email}" style="color: #1b5e20;">${email}</a></td></tr>
          </table>
          <p style="font-size: 13px; font-weight: 700; color: #444; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 10px;">Mensaje:</p>
          <div style="background: #f4f4f5; border-radius: 8px; padding: 16px; font-size: 14px; color: #333; line-height: 1.6; white-space: pre-wrap;">${mensaje}</div>
        </div>
        <div style="background: #1b5e20; padding: 14px 40px; text-align: center;">
          <p style="color: rgba(255,255,255,0.65); font-size: 11px; margin: 0;">Respondé directamente a este email para contactar al remitente.</p>
        </div>
      </div>
    `,
  });

  // 2. Acuse de recibo al remitente
  const { error } = await resend.emails.send({
    from: FROM,
    to: [email],
    subject: 'CPC CTM — Recibimos tu consulta',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; border-radius: 12px; overflow: hidden;">
        <div style="background: #1b5e20; padding: 32px 40px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 700; line-height: 1.4;">
            Colegio de Profesionales en<br/>Ciencias Criminalísticas de Catamarca
          </h1>
        </div>
        <div style="padding: 40px; background: white;">
          <h2 style="color: #1b5e20; font-size: 20px; margin: 0 0 12px;">Recibimos tu consulta ✅</h2>
          <p style="color: #444; line-height: 1.6; margin: 0 0 24px;">
            Hola <strong>${nombre}</strong>, tu mensaje fue recibido correctamente.
            Te responderemos a la brevedad.<br/>
            Horario de atención: Lunes a Viernes · 8:00 a 14:00 hs.
          </p>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px;">
            <p style="color: #166534; font-weight: 700; margin: 0 0 8px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Tu mensaje:</p>
            <p style="color: #444; margin: 0; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${mensaje}</p>
          </div>
        </div>
        <div style="background: #1b5e20; padding: 20px 40px; text-align: center;">
          <p style="color: rgba(255,255,255,0.7); font-size: 12px; margin: 0;">
            CPC CTM · San Fernando del Valle de Catamarca
          </p>
        </div>
      </div>
    `,
  });

  if (error) {
    console.error('[email] Error enviando acuse de contacto:', error);
    throw error;
  }
}
