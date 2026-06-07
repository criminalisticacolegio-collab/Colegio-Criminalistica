import { transporter, FROM, REPLY_TO } from './mailer.js';
import { generarComprobantePago, generarCartaAspirante, generarCertificadoCurso } from './pdf.js';
import { getContacto } from './contacto.js';
import { LOGO_B64 } from './logo-base64.js';

const _logoImg = LOGO_B64
  ? `<img src="data:image/jpeg;base64,${LOGO_B64}" alt="Logo CPCC" style="width:72px;height:72px;object-fit:contain;border-radius:50%;border:3px solid rgba(255,255,255,0.3);margin:0 auto 14px;display:block;" />`
  : '';

const EMAIL_HEADER = `
        <!-- Header -->
        <div style="background: #1a5c2a; padding: 28px 40px 20px; text-align: center;">
          ${_logoImg}
          <h1 style="color: white; margin: 0; font-size: 18px; font-weight: 700; line-height: 1.5;">
            Colegio de Profesionales en Ciencias Criminalísticas<br/>
            <span style="font-size:13px;font-weight:400;opacity:0.85;">Provincia de Catamarca</span>
          </h1>
        </div>`;

/**
 * Email de confirmación al aspirante cuando completa el formulario de registro.
 */
export async function enviarConfirmacionAspirante({ nombre, apellido, dni, email, tituloProfesional, cuil, jurisdiccion, documentosRecibidos = [] }) {
  const contacto = await getContacto();
  const emailContacto = contacto.correo;
  const telContacto = contacto.telefono;

  let pdfBuffer;
  try {
    pdfBuffer = generarCartaAspirante({
      nombre,
      apellido,
      dni,
      email,
      tituloProfesional,
      fecha: new Date(),
      contacto,
    });
  } catch (err) {
    console.error('[email] Error generando carta aspirante PDF:', err);
  }

  const attachments = pdfBuffer
    ? [{ filename: `Confirmacion_Registro_${apellido}_${nombre}.pdf`, content: pdfBuffer }]
    : [];

  const docsHtml = documentosRecibidos.length > 0
    ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin-bottom:24px;">
        <h3 style="color:#166534;font-size:14px;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 12px;">Documentación Recibida</h3>
        ${documentosRecibidos.map(d => `<p style="color:#111;font-size:14px;margin:5px 0;">✅ ${d}</p>`).join('')}
      </div>`
    : '';

  await transporter.sendMail({
    from: FROM,
    replyTo: REPLY_TO,
    to: email,
    subject: 'Solicitud recibida — CPCC Catamarca',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 0; border-radius: 12px; overflow: hidden;">

        ${EMAIL_HEADER}

        <!-- Body -->
        <div style="padding: 40px; background: white;">
          <h2 style="color: #1a5c2a; font-size: 22px; margin: 0 0 12px;">¡Recibimos tu solicitud! ✅</h2>
          <p style="color: #444; line-height: 1.6; margin: 0 0 24px;">
            Hola <strong>${nombre}</strong>, recibimos tu solicitud de matriculación junto con la documentación detallada a continuación.
            Tu legajo quedará en estado <strong>PENDIENTE</strong> mientras el Colegio realiza la verificación correspondiente. Te avisaremos por este mismo correo cuando tu matrícula sea aprobada.
          </p>

          ${docsHtml}

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

        <!-- Footer (datos leídos de Sanity) -->
        <div style="background: #1a5c2a; padding: 20px 40px; text-align: center;">
          <p style="color: rgba(255,255,255,0.7); font-size: 12px; margin: 0;">
            CPCC · ${emailContacto}${telContacto ? ` · Tel: ${telContacto}` : ''}
          </p>
        </div>
      </div>
    `,
    attachments,
  });
}

/**
 * Email de bienvenida al nuevo matriculado creado desde el webhook de aspirante.
 * La contraseña inicial es el número de matrícula.
 */
export async function enviarBienvenidaMatriculacion({ nombreCompleto, email, numeroMatricula, jurisdiccion }) {
  const contacto = await getContacto();
  const fechaAlta = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
  const siteUrl = import.meta.env.SITE || 'https://cpcc-catamarca.com';

  await transporter.sendMail({
    from: FROM,
    replyTo: REPLY_TO,
    to: email,
    subject: `¡Bienvenido/a al CPCC — Tu matrícula ${numeroMatricula} está activa!`,
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
              <td style="background:#1a5c2a;padding:36px 40px;text-align:center;">
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
                <div style="border:2px solid #1a5c2a;border-radius:10px;overflow:hidden;margin-bottom:32px;">
                  <div style="background:#1a5c2a;padding:10px 20px;">
                    <p style="color:white;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.12em;margin:0;">Tus Datos de Matrícula</p>
                  </div>
                  <table style="width:100%;border-collapse:collapse;font-size:14px;">
                    <tr style="border-bottom:1px solid #e5e7eb;">
                      <td style="padding:11px 20px;color:#666;width:44%;">🎓 Nombre completo</td>
                      <td style="padding:11px 20px;color:#111;font-weight:700;">${nombreCompleto}</td>
                    </tr>
                    <tr style="border-bottom:1px solid #e5e7eb;background:#f9fafb;">
                      <td style="padding:11px 20px;color:#666;">🔢 Número de matrícula</td>
                      <td style="padding:11px 20px;color:#1a5c2a;font-weight:800;font-size:16px;">${numeroMatricula}</td>
                    </tr>
                    ${jurisdiccion ? `<tr style="border-bottom:1px solid #e5e7eb;">
                      <td style="padding:11px 20px;color:#666;">📍 Jurisdicción</td>
                      <td style="padding:11px 20px;color:#111;font-weight:600;">${jurisdiccion}</td>
                    </tr>` : ''}
                    <tr style="border-bottom:1px solid #e5e7eb;${!jurisdiccion ? '' : 'background:#f9fafb;'}">
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
                  </table>
                </div>

                <!-- ACCESO AL ÁREA PRIVADA -->
                <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;padding:20px 24px;margin-bottom:32px;">
                  <p style="color:#92400e;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.12em;margin:0 0 10px;">Tu Acceso al Área Privada</p>
                  <p style="color:#444;font-size:14px;line-height:1.6;margin:0 0 16px;">
                    Ya tenés tu cuenta activa. Para ingresar usá:
                  </p>
                  <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px;">
                    <tr style="border-bottom:1px solid #fde68a;">
                      <td style="padding:8px 0;color:#666;width:40%;">Usuario (email):</td>
                      <td style="color:#111;font-weight:700;">${email}</td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;color:#666;">Contraseña inicial:</td>
                      <td style="color:#1a5c2a;font-weight:800;font-size:15px;font-family:monospace;">${numeroMatricula}</td>
                    </tr>
                  </table>
                  <div style="text-align:center;margin-bottom:12px;">
                    <a href="${siteUrl}/matriculados"
                       style="display:inline-block;background:#1a5c2a;color:white;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:800;font-size:15px;letter-spacing:0.02em;">
                      🔐 Ingresar al Área Privada
                    </a>
                  </div>
                  <p style="color:#92400e;font-size:12px;text-align:center;margin:0;">
                    ⚠️ Por seguridad, te recomendamos cambiar tu contraseña desde el área privada en tu primer ingreso.
                  </p>
                </div>

                <!-- RECORDÁ -->
                <div style="border-left:4px solid #1a5c2a;padding:12px 16px;margin-bottom:32px;background:#f9fafb;border-radius:0 8px 8px 0;">
                  <p style="color:#555;font-size:13px;line-height:1.7;margin:0;">
                    📌 Tu cuota mensual vence el día <strong>20 de cada mes</strong>.<br/>
                    📌 Ante cualquier consulta escribinos a <a href="mailto:${contacto.correo}" style="color:#1a5c2a;font-weight:700;">${contacto.correo}</a><br/>
                    📌 Seguinos en nuestras redes para estar al día con novedades y capacitaciones.
                  </p>
                </div>

                <!-- FIRMA -->
                <div style="border-top:1px solid #e5e7eb;padding-top:20px;">
                  <p style="color:#444;font-size:14px;line-height:1.7;margin:0;">
                    Con orgullo institucional,<br/><br/>
                    <strong style="color:#1a5c2a;font-size:15px;">Comisión Directiva</strong><br/>
                    Colegio de Profesionales en Ciencias Criminalísticas<br/>
                    Provincia de Catamarca
                  </p>
                </div>

              </td>
            </tr>

            <!-- PIE -->
            <tr>
              <td style="background:#1a5c2a;padding:28px 40px;text-align:center;">
                <p style="color:rgba(255,255,255,0.5);font-size:11px;margin:0 0 6px;">
                  ${contacto.direccion}
                </p>
                <p style="color:rgba(255,255,255,0.7);font-size:12px;margin:0 0 10px;">
                  <a href="mailto:${contacto.correo}" style="color:rgba(255,255,255,0.9);text-decoration:none;">${contacto.correo}</a>
                </p>
                <p style="color:rgba(255,255,255,0.45);font-size:10px;margin:0;">
                  © 2025 CPCC Catamarca — Ley Provincial N° 5.595/19
                </p>
              </td>
            </tr>

          </table>
        </td></tr>
      </table>
      </body></html>
    `,
  });
}

/**
 * Email con comprobante de pago en PDF adjunto, enviado tras confirmación del webhook.
 */
export async function enviarComprobantePago({ nombreCompleto, numeroMatricula, email, monto, concepto, mpPaymentId, fecha }) {
  const contacto = await getContacto();
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
      contacto,
    });
  } catch (err) {
    console.error('[email] Error generando comprobante PDF:', err);
  }

  const attachments = pdfBuffer
    ? [{ filename: `Comprobante_Pago_${numeroMatricula || 'CPC'}_${mpPaymentId}.pdf`, content: pdfBuffer }]
    : [];

  const montoFormateado = Number(monto).toLocaleString('es-AR');
  const fechaStr = new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  await transporter.sendMail({
    from: FROM,
    replyTo: REPLY_TO,
    to: email,
    subject: `CPCC — Comprobante de pago por $${montoFormateado}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; border-radius: 12px; overflow: hidden;">

        ${EMAIL_HEADER}

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
            CPCC · ${contacto.direccion} · ${contacto.correo}
          </p>
        </div>
      </div>
    `,
    attachments,
  });
}

/**
 * Confirmación de inscripción a un curso (gratuito o pago ya aprobado).
 */
export async function enviarConfirmacionInscripcion({ nombre, email, cursoTitulo, esMatriculado, tipoAcceso }) {
  const contacto = await getContacto();
  const esPago = tipoAcceso?.startsWith('pago_');
  const descuentoMatriculado = esMatriculado && tipoAcceso === 'pago_matriculados';

  await transporter.sendMail({
    from: FROM,
    replyTo: REPLY_TO,
    to: email,
    subject: `CPCC — Inscripción confirmada: ${cursoTitulo}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; border-radius: 12px; overflow: hidden;">
        ${EMAIL_HEADER}
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
            CPCC · ${contacto.direccion} · ${contacto.correo}
          </p>
        </div>
      </div>
    `,
  });
}

/**
 * Email con certificado PDF de aprobación de curso, adjunto.
 */
export async function enviarCertificadoCurso({ nombre, email, cursoTitulo, fecha }) {
  const contacto = await getContacto();
  let pdfBuffer;
  try {
    pdfBuffer = generarCertificadoCurso({ nombreCompleto: nombre, cursoTitulo, fecha, contacto });
  } catch (err) {
    console.error('[email] Error generando certificado PDF:', err);
  }

  const nombreArch = cursoTitulo.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40);
  const attachments = pdfBuffer
    ? [{ filename: `Certificado_${nombreArch}.pdf`, content: pdfBuffer }]
    : [];

  const fechaStr = new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  await transporter.sendMail({
    from: FROM,
    replyTo: REPLY_TO,
    to: email,
    subject: `CPCC — Certificado de aprobación: ${cursoTitulo}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; border-radius: 12px; overflow: hidden;">
        ${EMAIL_HEADER}
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
            CPCC · ${contacto.direccion} · ${contacto.correo}
          </p>
        </div>
      </div>
    `,
    attachments,
  });
}

/**
 * Email de reseteo / primer acceso al área privada de matriculados.
 */
export async function enviarResetPassword({ nombre, email, resetLink }) {
  const contacto = await getContacto();
  const nombreMostrado = nombre || 'Estimado/a profesional';

  await transporter.sendMail({
    from: FROM,
    replyTo: REPLY_TO,
    to: email,
    subject: 'Restablecer tu contraseña — CPCC Catamarca',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; border-radius: 12px; overflow: hidden;">

        ${EMAIL_HEADER}

        <!-- Body -->
        <div style="padding: 32px 40px; background: white;">
          <p style="color: #1a2d4a; line-height: 1.7; font-size: 15px; margin: 0 0 16px;">
            Hola <strong>${nombreMostrado}</strong>,
          </p>
          <p style="color: #1a2d4a; line-height: 1.7; font-size: 15px; margin: 0 0 16px;">
            Recibimos una solicitud para restablecer la contraseña de tu área privada.
          </p>
          <p style="color: #1a2d4a; line-height: 1.7; font-size: 15px; margin: 0 0 32px;">
            Hacé clic en el siguiente botón para crear tu nueva contraseña:
          </p>

          <!-- CTA Button -->
          <div style="text-align: center; margin-bottom: 32px;">
            <a href="${resetLink}"
               style="display: inline-block; background: #1a5c2a; color: white; text-decoration: none;
                      padding: 14px 36px; border-radius: 8px; font-weight: 700; font-size: 16px;
                      letter-spacing: 0.02em;">
              Restablecer mi contraseña
            </a>
          </div>

          <p style="color: #666; font-size: 13px; line-height: 1.6; margin: 0 0 4px;">
            Si el botón no funciona, copiá y pegá este enlace en tu navegador:
          </p>
          <p style="font-size: 11px; color: #999; word-break: break-all; margin: 0;">
            ${resetLink}
          </p>
        </div>

        <!-- Footer -->
        <div style="background: #1a2d4a; padding: 20px 40px; text-align: center;">
          <p style="color: rgba(255,255,255,0.6); font-size: 12px; margin: 0 0 4px;">
            El link expira en 1 hora.
          </p>
          <p style="color: rgba(255,255,255,0.6); font-size: 12px; margin: 0;">
            CPCC — ${contacto.correo}
          </p>
        </div>
      </div>
    `,
  });
}

/**
 * Email de bienvenida al nuevo matriculado activo.
 */
export async function enviarBienvenida({ nombreCompleto, email, numeroMatricula, especialidad, jurisdiccion, resetLink }) {
  const contacto = await getContacto();
  const fechaAlta = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });

  await transporter.sendMail({
    from: FROM,
    replyTo: REPLY_TO,
    to: email,
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
                    📌 Ante cualquier consulta escribinos a <a href="mailto:${contacto.correo}" style="color:#1b5e20;font-weight:700;">${contacto.correo}</a><br/>
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
                  ${contacto.direccion}
                </p>
                <p style="color:rgba(255,255,255,0.7);font-size:12px;margin:0 0 10px;">
                  <a href="mailto:${contacto.correo}" style="color:rgba(255,255,255,0.9);text-decoration:none;">${contacto.correo}</a>
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
}

/**
 * Email de acceso al campus virtual enviado al inscripto cuando se confirma la inscripción.
 */
export async function enviarAccesoCurso({ nombre, email, cursoNombre, fechaInicio, linkClassroom, codigoClassroom = '', precioAbonado = 0, esPreinscripcion = false, esInscripcionPago = false }) {
  const contacto = await getContacto();
  const fechaStr = fechaInicio
    ? new Date(fechaInicio).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'A confirmar';
  const montoStr = precioAbonado > 0 ? `$${Number(precioAbonado).toLocaleString('es-AR')}` : 'Gratuito';

  const subject = esInscripcionPago
    ? `CPCC — Inscripción recibida: ${cursoNombre}`
    : esPreinscripcion
      ? `CPCC — Pre-inscripción registrada: ${cursoNombre}`
      : `¡Tu acceso al curso ${cursoNombre} está listo! — CPCC`;

  const body = esInscripcionPago
    ? `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8f9fa;border-radius:12px;overflow:hidden;">
        <div style="background:#1a5c2a;padding:32px 40px;text-align:center;">
          <h1 style="color:white;margin:0;font-size:20px;font-weight:700;line-height:1.4;">CPCC Catamarca</h1>
        </div>
        <div style="padding:32px 40px;background:white;">
          <h2 style="color:#1a2d4a;font-size:20px;margin:0 0 12px;">¡Recibimos tu inscripción! 📋</h2>
          <p style="color:#1a2d4a;line-height:1.6;margin:0 0 20px;">Hola <strong>${nombre}</strong>, registramos tu solicitud de inscripción al curso <strong>${cursoNombre}</strong>.</p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin-bottom:24px;">
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <tr style="border-bottom:1px solid #d1fae5;"><td style="padding:8px 0;color:#1a2d4a;">📚 Curso:</td><td style="color:#111;font-weight:700;text-align:right;">${cursoNombre}</td></tr>
              <tr style="border-bottom:1px solid #d1fae5;"><td style="padding:8px 0;color:#1a2d4a;">📅 Fecha de inicio:</td><td style="color:#111;font-weight:600;text-align:right;">${fechaStr}</td></tr>
              <tr><td style="padding:8px 0;color:#1a2d4a;">💰 Monto a abonar:</td><td style="color:#111;font-weight:700;text-align:right;">${montoStr}</td></tr>
            </table>
          </div>
          <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:20px;margin-bottom:24px;">
            <p style="color:#7c5e00;font-size:14px;font-weight:700;margin:0 0 8px;">⚠️ Próximo paso: completar el pago</p>
            <p style="color:#7c5e00;font-size:13px;line-height:1.6;margin:0;">
              Te abrimos el link de pago en una nueva pestaña al momento de tu inscripción.<br/>
              Una vez que se acredite tu pago, recibirás por este email el acceso al campus virtual.<br/>
              Ante cualquier consulta escribinos a <a href="mailto:${contacto.correo}" style="color:#1a5c2a;font-weight:700;">${contacto.correo}</a>
            </p>
          </div>
        </div>
        <div style="background:#1a2d4a;padding:20px 40px;text-align:center;">
          <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:0;">CPCC — ${contacto.correo}</p>
        </div>
      </div>`
    : esPreinscripcion
    ? `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8f9fa;border-radius:12px;overflow:hidden;">
        <div style="background:#1a5c2a;padding:32px 40px;text-align:center;">
          <h1 style="color:white;margin:0;font-size:20px;font-weight:700;line-height:1.4;">CPCC Catamarca</h1>
        </div>
        <div style="padding:32px 40px;background:white;">
          <h2 style="color:#1a2d4a;font-size:20px;margin:0 0 12px;">¡Te anotamos en la lista de espera! ⏳</h2>
          <p style="color:#1a2d4a;line-height:1.6;margin:0 0 20px;">Hola <strong>${nombre}</strong>, recibimos tu pre-inscripción para el curso <strong>${cursoNombre}</strong>.</p>
          <p style="color:#1a2d4a;line-height:1.6;margin:0;">Te notificaremos por este email en cuanto el curso esté disponible para inscripción.</p>
        </div>
        <div style="background:#1a2d4a;padding:20px 40px;text-align:center;">
          <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:0;">CPCC — ${contacto.correo}</p>
        </div>
      </div>`
    : `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8f9fa;border-radius:12px;overflow:hidden;">
        <div style="background:#1a5c2a;padding:32px 40px;text-align:center;">
          <h1 style="color:white;margin:0;font-size:20px;font-weight:700;line-height:1.4;">CPCC Catamarca</h1>
        </div>
        <div style="padding:32px 40px;background:white;">
          <div style="text-align:center;margin-bottom:28px;">
            <div style="font-size:48px;margin-bottom:8px;">🎓</div>
            <h2 style="color:#1a5c2a;font-size:22px;margin:0 0 6px;">¡Tu acceso está listo!</h2>
            <p style="color:#1a2d4a;margin:0;font-size:15px;">Tu inscripción fue confirmada exitosamente.</p>
          </div>

          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin-bottom:24px;">
            <p style="color:#1a5c2a;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 14px;">Detalle de tu inscripción</p>
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <tr style="border-bottom:1px solid #d1fae5;"><td style="padding:8px 0;color:#1a2d4a;">📚 Curso:</td><td style="color:#111;font-weight:700;text-align:right;">${cursoNombre}</td></tr>
              <tr style="border-bottom:1px solid #d1fae5;"><td style="padding:8px 0;color:#1a2d4a;">📅 Fecha de inicio:</td><td style="color:#111;font-weight:600;text-align:right;">${fechaStr}</td></tr>
              <tr style="border-bottom:1px solid #d1fae5;"><td style="padding:8px 0;color:#1a2d4a;">✅ Estado:</td><td style="color:#1a5c2a;font-weight:800;text-align:right;">CONFIRMADO</td></tr>
              <tr><td style="padding:8px 0;color:#1a2d4a;">💰 Monto abonado:</td><td style="color:#111;font-weight:700;text-align:right;">${montoStr}</td></tr>
            </table>
          </div>

          <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:20px;margin-bottom:24px;">
            <p style="color:#1a2d4a;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 12px;">Tu acceso al Campus Virtual</p>
            ${linkClassroom ? `
            <p style="color:#1a2d4a;font-size:13px;font-weight:700;margin:0 0 8px;">OPCIÓN 1 — Acceso directo:</p>
            <div style="text-align:center;margin-bottom:16px;">
              <a href="${linkClassroom}" style="display:inline-block;background:#1a5c2a;color:white;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:800;font-size:15px;">🎓 Ingresar al Campus Virtual</a>
            </div>` : ''}
            ${codigoClassroom ? `
            <p style="color:#1a2d4a;font-size:13px;font-weight:700;margin:0 0 8px;">OPCIÓN 2 — Con código:</p>
            <ol style="color:#1a2d4a;font-size:13px;line-height:1.8;margin:0 0 12px;padding-left:20px;">
              <li>Andá a <strong>classroom.google.com</strong></li>
              <li>Clic en <strong>+</strong> → "Unirse a clase"</li>
              <li>Ingresá el código:</li>
            </ol>
            <div style="text-align:center;background:white;border:2px solid #1a5c2a;border-radius:8px;padding:12px 20px;margin-bottom:12px;">
              <span style="font-size:26px;font-weight:800;letter-spacing:0.2em;color:#1a5c2a;font-family:monospace;">${codigoClassroom}</span>
            </div>` : ''}
            ${!linkClassroom && !codigoClassroom ? `
            <p style="color:#7c5e00;font-size:13px;line-height:1.6;margin:0;">
              📬 <strong>Secretaría te enviará el enlace de acceso al aula en breve</strong> al mismo correo en que recibís este mensaje.<br/>
              Ante cualquier consulta escribinos a <a href="mailto:${contacto.correo}" style="color:#1a5c2a;font-weight:700;">${contacto.correo}</a>
            </p>` : ''}
          </div>
          <div style="background:#f8f9fa;border-left:4px solid #1a5c2a;padding:14px 18px;border-radius:0 8px 8px 0;margin-bottom:24px;">
            <p style="color:#1a2d4a;font-size:13px;line-height:1.7;margin:0;">
              ⚠️ <strong>Acceso personal e intransferible.</strong><br/>
              📌 Necesitás cuenta Google para ingresar al aula.<br/>
              📌 Ante inconvenientes escribinos a <a href="mailto:${contacto.correo}" style="color:#1a5c2a;font-weight:700;">${contacto.correo}</a>
            </p>
          </div>

          <p style="color:#1a2d4a;font-size:14px;line-height:1.6;margin:0 0 18px;">¡Éxito en tu formación profesional!</p>
          <div style="border-top:1px solid #e5e7eb;padding-top:16px;">
            <p style="color:#1a2d4a;font-size:14px;line-height:1.7;margin:0;">Comisión Directiva<br/><strong style="color:#1a5c2a;">CPCC — Colegio de Profesionales en Ciencias Criminalísticas</strong><br/>Provincia de Catamarca</p>
          </div>
        </div>
        <div style="background:#1a2d4a;padding:20px 40px;text-align:center;">
          <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:0;">CPCC — ${contacto.correo}</p>
        </div>
      </div>`;

  await transporter.sendMail({
    from: FROM,
    replyTo: REPLY_TO,
    to: email,
    subject,
    html: body,
  });
}

/**
 * Email automático al colegio cuando el sistema detecta 3+ meses consecutivos sin pago.
 */
export async function enviarSuspensionColegio({ nombreCompleto, numeroMatricula, email, especialidad, jurisdiccion, mesesPendientes }) {
  const listaMeses = mesesPendientes.map(m => `${m.mes} ${m.anio}`).join(', ');
  const sanityUrl = `https://colegio-criminalistica.sanity.studio`;

  await transporter.sendMail({
    from: FROM,
    replyTo: REPLY_TO,
    to: REPLY_TO,
    subject: `⚠️ Matrícula suspendida — ${nombreCompleto}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;border-radius:12px;overflow:hidden;">
        <div style="background:#991b1b;padding:28px 40px;text-align:center;">
          <h1 style="color:white;margin:0;font-size:18px;font-weight:700;">⚠️ Matrícula Suspendida Automáticamente</h1>
          <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px;">Sistema de detección de mora — CPCC</p>
        </div>
        <div style="padding:36px;background:white;">
          <p style="color:#444;font-size:14px;line-height:1.7;margin:0 0 20px;">
            El sistema detectó <strong>3 cuotas consecutivas sin abonar</strong> para el siguiente matriculado y <strong>marcó la matrícula como SUSPENDIDA automáticamente</strong>:
          </p>
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:20px;margin-bottom:24px;">
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <tr><td style="padding:7px 0;color:#666;width:40%;">Nombre:</td><td style="color:#111;font-weight:700;">${nombreCompleto}</td></tr>
              <tr><td style="padding:7px 0;color:#666;">Matrícula:</td><td style="color:#111;font-weight:700;">${numeroMatricula}</td></tr>
              <tr><td style="padding:7px 0;color:#666;">Email:</td><td style="color:#111;font-weight:700;">${email}</td></tr>
              ${especialidad ? `<tr><td style="padding:7px 0;color:#666;">Especialidad:</td><td style="color:#111;font-weight:600;">${especialidad}</td></tr>` : ''}
              ${jurisdiccion ? `<tr><td style="padding:7px 0;color:#666;">Jurisdicción:</td><td style="color:#111;font-weight:600;">${jurisdiccion}</td></tr>` : ''}
              <tr><td style="padding:7px 0;color:#666;">Meses pendientes:</td><td style="color:#991b1b;font-weight:700;">${listaMeses}</td></tr>
            </table>
          </div>
          <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
            <p style="color:#92400e;font-size:13px;font-weight:700;margin:0 0 8px;">Para reactivar la matrícula:</p>
            <ol style="color:#555;font-size:13px;line-height:1.9;margin:0;padding-left:20px;">
              <li>Abrí el documento del matriculado en Sanity</li>
              <li>Actualizá los meses adeudados → "Pagado" con fecha y monto</li>
              <li>Cambiá el estado del matriculado → "Activo"</li>
              <li>Publicá los cambios</li>
            </ol>
          </div>
          <div style="text-align:center;margin-bottom:8px;">
            <a href="${sanityUrl}" style="display:inline-block;background:#1b5e20;color:white;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:700;font-size:14px;">Ir al Panel Admin (Sanity)</a>
          </div>
        </div>
        <div style="background:#1b5e20;padding:16px 40px;text-align:center;">
          <p style="color:rgba(255,255,255,0.7);font-size:11px;margin:0;">CPCC · Sistema automático de gestión de matrículas</p>
        </div>
      </div>
    `,
  });
}

/**
 * Email al colegio cuando un matriculado en mora envía el formulario de contacto.
 */
export async function enviarNotificacionMora({ nombreCompleto, numeroMatricula, email, mesesPendientes, mensaje, comprobanteUrl }) {
  const listaMeses = mesesPendientes.map(m => `${m.mes} ${m.anio}`).join(', ');
  const totalCuotas = mesesPendientes.length;
  const fechaSolicitud = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  await transporter.sendMail({
    from: FROM,
    replyTo: email,
    to: REPLY_TO,
    subject: `Solicitud regularización — ${nombreCompleto}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;border-radius:12px;overflow:hidden;">
        <div style="background:#1b5e20;padding:28px 40px;text-align:center;">
          <h1 style="color:white;margin:0;font-size:18px;font-weight:700;">Solicitud de Regularización de Cuotas</h1>
        </div>
        <div style="padding:36px;background:white;">
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin-bottom:24px;">
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <tr><td style="padding:7px 0;color:#666;width:40%;">Matriculado:</td><td style="color:#111;font-weight:700;">${nombreCompleto}</td></tr>
              <tr><td style="padding:7px 0;color:#666;">Matrícula:</td><td style="color:#111;font-weight:700;">${numeroMatricula}</td></tr>
              <tr><td style="padding:7px 0;color:#666;">Email:</td><td style="color:#1b5e20;font-weight:700;"><a href="mailto:${email}" style="color:#1b5e20;">${email}</a></td></tr>
              <tr><td style="padding:7px 0;color:#666;">Meses adeudados:</td><td style="color:#991b1b;font-weight:700;">${listaMeses}</td></tr>
              <tr><td style="padding:7px 0;color:#666;">Total cuotas:</td><td style="color:#991b1b;font-weight:700;">${totalCuotas} ${totalCuotas === 1 ? 'mes' : 'meses'}</td></tr>
              <tr><td style="padding:7px 0;color:#666;">Fecha solicitud:</td><td style="color:#111;font-weight:600;">${fechaSolicitud}</td></tr>
            </table>
          </div>
          <p style="font-size:13px;font-weight:700;color:#444;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 10px;">Mensaje del matriculado:</p>
          <div style="background:#f4f4f5;border-radius:8px;padding:16px;font-size:14px;color:#333;line-height:1.6;white-space:pre-wrap;margin-bottom:${comprobanteUrl ? '24px' : '8px'};">${mensaje}</div>
          ${comprobanteUrl ? `
          <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:14px 18px;">
            <p style="color:#92400e;font-size:13px;font-weight:700;margin:0 0 8px;">📎 Comprobante adjunto:</p>
            <a href="${comprobanteUrl}" style="color:#1b5e20;font-weight:700;font-size:13px;word-break:break-all;">${comprobanteUrl}</a>
          </div>` : ''}
        </div>
        <div style="background:#1b5e20;padding:14px 40px;text-align:center;">
          <p style="color:rgba(255,255,255,0.65);font-size:11px;margin:0;">Respondé directamente a este email para contactar al matriculado.</p>
        </div>
      </div>
    `,
  });
}

/**
 * Email al matriculado cuando el admin reactiva su matrícula en Sanity.
 */
export async function enviarReactivacion({ nombreCompleto, email, numeroMatricula }) {
  const contacto = await getContacto();
  await transporter.sendMail({
    from: FROM,
    replyTo: REPLY_TO,
    to: email,
    subject: 'CPCC — Tu matrícula fue reactivada',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;border-radius:12px;overflow:hidden;">
        <div style="background:#1b5e20;padding:32px 40px;text-align:center;">
          <h1 style="color:white;margin:0;font-size:20px;font-weight:700;line-height:1.4;">
            Colegio de Profesionales en<br/>Ciencias Criminalísticas de Catamarca
          </h1>
        </div>
        <div style="padding:40px;background:white;">
          <div style="text-align:center;margin-bottom:28px;">
            <div style="font-size:48px;margin-bottom:8px;">✅</div>
            <h2 style="color:#166534;font-size:24px;margin:0 0 8px;">¡Tu matrícula fue reactivada!</h2>
            <p style="color:#666;margin:0;font-size:15px;">Ya podés acceder a todos tus beneficios.</p>
          </div>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin-bottom:24px;">
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <tr><td style="padding:8px 0;color:#666;width:44%;">Nombre:</td><td style="color:#111;font-weight:700;">${nombreCompleto}</td></tr>
              <tr><td style="padding:8px 0;color:#666;">Matrícula:</td><td style="color:#1b5e20;font-weight:800;font-size:16px;">${numeroMatricula}</td></tr>
              <tr><td style="padding:8px 0;color:#166534;font-weight:700;">Estado:</td><td style="color:#166534;font-weight:800;">ACTIVO ✅</td></tr>
            </table>
          </div>
          <p style="color:#444;line-height:1.7;font-size:14px;margin:0 0 16px;">
            Tu situación fue regularizada y la matrícula volvió al estado <strong>Activo</strong>. A partir de ahora podés:
          </p>
          <ul style="color:#444;font-size:14px;line-height:2;margin:0 0 24px;padding-left:20px;">
            <li>Descargar tu constancia de matrícula vigente</li>
            <li>Obtener tu constancia de ética profesional</li>
            <li>Acceder a capacitaciones con precio preferencial</li>
          </ul>
          <div style="text-align:center;margin-bottom:16px;">
            <a href="${import.meta.env.SITE || 'https://cpcc-catamarca.com'}/matriculados"
               style="display:inline-block;background:#1b5e20;color:white;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:700;font-size:14px;">
              Ir a mi área privada
            </a>
          </div>
          <p style="color:#666;font-size:12px;text-align:center;margin:0;">
            Ante cualquier consulta escribinos a <a href="mailto:${contacto.correo}" style="color:#1b5e20;font-weight:700;">${contacto.correo}</a>
          </p>
        </div>
        <div style="background:#1b5e20;padding:20px 40px;text-align:center;">
          <p style="color:rgba(255,255,255,0.7);font-size:12px;margin:0;">CPCC · ${contacto.direccion} · ${contacto.correo}</p>
        </div>
      </div>
    `,
  });
}

/**
 * Aviso al matriculado que acumula exactamente 2 meses consecutivos pendientes (en riesgo).
 */
export async function enviarAvisoRiesgoMora({ nombreCompleto, email, numeroMatricula }) {
  const contacto = await getContacto();
  const contactoEmail = contacto.correo;

  await transporter.sendMail({
    from: FROM,
    replyTo: REPLY_TO,
    to: email,
    subject: 'Aviso de cuotas pendientes — CPCC',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;border-radius:12px;overflow:hidden;">

        <!-- Header verde institucional -->
        <div style="background:#1a5c2a;padding:32px 40px;text-align:center;">
          <h1 style="color:white;margin:0;font-size:20px;font-weight:700;line-height:1.4;">
            Colegio de Profesionales en<br/>Ciencias Criminalísticas de Catamarca
          </h1>
        </div>

        <!-- Cuerpo -->
        <div style="padding:40px;background:white;">
          <h2 style="color:#1a5c2a;font-size:20px;margin:0 0 20px;">Aviso de cuotas pendientes</h2>

          <p style="color:#444;line-height:1.7;font-size:15px;margin:0 0 16px;">
            Estimado/a <strong>${nombreCompleto}</strong>,
          </p>
          <p style="color:#444;line-height:1.7;font-size:15px;margin:0 0 16px;">
            Le informamos que registra <strong>2 cuotas mensuales pendientes de pago</strong>.
          </p>
          <p style="color:#444;line-height:1.7;font-size:15px;margin:0 0 16px;">
            Para evitar la suspensión de su matrícula, le solicitamos regularizar su situación a la brevedad comunicándose con la administración del Colegio.
          </p>

          <!-- Info de contacto -->
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin-bottom:28px;">
            <p style="color:#166534;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 10px;">Contacto — Administración CPCC</p>
            <p style="color:#444;font-size:14px;margin:0 0 6px;">
              📧 Email: <a href="mailto:${contactoEmail}" style="color:#1a5c2a;font-weight:700;">${contactoEmail}</a>
            </p>
            ${numeroMatricula ? `<p style="color:#444;font-size:14px;margin:0;">🔢 Su matrícula: <strong>${numeroMatricula}</strong></p>` : ''}
          </div>

          <!-- Aviso estado activo -->
          <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:16px 20px;margin-bottom:28px;">
            <p style="color:#92400e;font-size:14px;font-weight:600;margin:0;">
              ✅ Su matrícula permanece <strong>ACTIVA</strong> mientras regularice su situación.
            </p>
          </div>

          <!-- Botón -->
          <div style="text-align:center;margin-bottom:8px;">
            <a href="mailto:${contactoEmail}"
               style="display:inline-block;background:#1a5c2a;color:white;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:700;font-size:14px;">
              Contactar administración
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background:#1a5c2a;padding:20px 40px;text-align:center;">
          <p style="color:rgba(255,255,255,0.7);font-size:12px;margin:0;">
            CPCC · ${contactoEmail}
          </p>
        </div>
      </div>
    `,
  });
}

/**
 * Notificación formal de mora al matriculado con 3 o más meses consecutivos pendientes.
 */
/**
 * Notificación al matriculado cuando su estado pasa a Suspendido o Baja por acción administrativa.
 */
export async function enviarNotificacionSuspension({ nombreCompleto, email, numeroMatricula, estado }) {
  const contacto = await getContacto();
  const contactoEmail = contacto.correo;
  const esBaja = estado === 'Baja';
  const etiqueta = esBaja ? 'BAJA' : 'SUSPENDIDA';
  const descripcion = esBaja
    ? 'Su matrícula ha sido dada de baja en el registro oficial del Colegio.'
    : 'Su matrícula ha sido suspendida temporalmente por disposición de la administración del Colegio.';

  await transporter.sendMail({
    from: FROM,
    replyTo: REPLY_TO,
    to: email,
    subject: `Notificación de estado de matrícula — CPCC Catamarca`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;border-radius:12px;overflow:hidden;">

        <div style="background:#1a5c2a;padding:32px 40px;text-align:center;">
          <h1 style="color:white;margin:0;font-size:20px;font-weight:700;line-height:1.4;">
            Colegio de Profesionales en<br/>Ciencias Criminalísticas de Catamarca
          </h1>
          <p style="color:rgba(255,255,255,0.6);font-size:11px;margin:8px 0 0;">Ley Provincial N° 5.595/19</p>
        </div>

        <div style="background:#7f1d1d;padding:12px 40px;text-align:center;">
          <p style="color:white;font-size:13px;font-weight:700;margin:0;text-transform:uppercase;letter-spacing:0.07em;">
            Actualización de estado — Matrícula ${etiqueta}
          </p>
        </div>

        <div style="padding:40px;background:white;">
          <p style="color:#1a2d1a;font-size:15px;line-height:1.8;margin:0 0 16px;">
            Estimado/a <strong>${nombreCompleto}</strong>,
          </p>
          <p style="color:#444;font-size:15px;line-height:1.8;margin:0 0 16px;">
            Le comunicamos que su situación en el Padrón Oficial del <strong>Colegio de Profesionales en Ciencias Criminalísticas de Catamarca</strong> ha sido actualizada.
          </p>
          <p style="color:#444;font-size:15px;line-height:1.8;margin:0 0 28px;">
            ${descripcion}
          </p>

          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
            <p style="color:#991b1b;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 12px;">Situación actual de su matrícula</p>
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <tr style="border-bottom:1px solid #fecaca;">
                <td style="padding:7px 0;color:#666;width:40%;">Titular:</td>
                <td style="color:#111;font-weight:700;padding:7px 0;">${nombreCompleto}</td>
              </tr>
              ${numeroMatricula ? `<tr style="border-bottom:1px solid #fecaca;">
                <td style="padding:7px 0;color:#666;">N° de matrícula:</td>
                <td style="color:#111;font-weight:700;padding:7px 0;">${numeroMatricula}</td>
              </tr>` : ''}
              <tr>
                <td style="padding:7px 0;color:#666;">Estado:</td>
                <td style="color:#991b1b;font-weight:800;padding:7px 0;">${etiqueta}</td>
              </tr>
            </table>
          </div>

          <div style="background:#f5f9f5;border:1px solid #c6e6c8;border-radius:8px;padding:16px 20px;margin-bottom:32px;">
            <p style="color:#1a5c2a;font-size:13px;font-weight:700;margin:0 0 8px;">¿Qué hacer a continuación?</p>
            <p style="color:#444;font-size:14px;line-height:1.7;margin:0;">
              Comuníquese con la Secretaría del Colegio para obtener información sobre su situación y los pasos necesarios para regularizarla.
            </p>
            <p style="color:#444;font-size:14px;margin:10px 0 0;">
              📧 <a href="mailto:${contactoEmail}" style="color:#1a5c2a;font-weight:700;">${contactoEmail}</a><br/>
              🕐 Horario de atención: ${contacto.horarios}
            </p>
          </div>

          <div style="border-top:1px solid #e5e7eb;padding-top:20px;">
            <p style="color:#444;font-size:14px;line-height:1.8;margin:0;">
              Saluda atentamente,<br/><br/>
              <strong style="color:#1a5c2a;font-size:15px;">Secretaría del Colegio</strong><br/>
              Colegio de Profesionales en Ciencias Criminalísticas<br/>
              Provincia de Catamarca
            </p>
          </div>
        </div>

        <div style="background:#1a5c2a;padding:20px 40px;text-align:center;">
          <p style="color:rgba(255,255,255,0.5);font-size:11px;margin:0 0 5px;">
            ${contacto.direccion}
          </p>
          <p style="color:rgba(255,255,255,0.7);font-size:12px;margin:0;">
            <a href="mailto:${contactoEmail}" style="color:rgba(255,255,255,0.9);text-decoration:none;">${contactoEmail}</a>
          </p>
        </div>
      </div>
    `,
  });
}

export async function enviarNotificacionMoraFormal({ nombreCompleto, email, numeroMatricula }) {
  const contacto = await getContacto();
  const contactoEmail = contacto.correo;

  await transporter.sendMail({
    from: FROM,
    replyTo: REPLY_TO,
    to: email,
    subject: 'Notificación de mora — CPCC Catamarca',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;border-radius:12px;overflow:hidden;">

        <!-- Header verde institucional -->
        <div style="background:#1a5c2a;padding:32px 40px;text-align:center;">
          <h1 style="color:white;margin:0;font-size:20px;font-weight:700;line-height:1.4;">
            Colegio de Profesionales en<br/>Ciencias Criminalísticas de Catamarca
          </h1>
        </div>

        <!-- Banda de alerta en dorado -->
        <div style="background:#8B7355;padding:14px 40px;text-align:center;">
          <p style="color:white;font-size:14px;font-weight:700;margin:0;text-transform:uppercase;letter-spacing:0.06em;">
            ⚠ Notificación de Mora — Acción Requerida
          </p>
        </div>

        <!-- Cuerpo -->
        <div style="padding:40px;background:white;">
          <p style="color:#444;line-height:1.7;font-size:15px;margin:0 0 16px;">
            Estimado/a <strong>${nombreCompleto}</strong>,
          </p>
          <p style="color:#444;line-height:1.7;font-size:15px;margin:0 0 16px;">
            Le informamos que registra <strong>3 o más cuotas mensuales vencidas sin abonar</strong>.
          </p>
          <p style="color:#444;line-height:1.7;font-size:15px;margin:0 0 16px;">
            Su matrícula se encuentra en estado de <strong style="color:#8B7355;">MORA</strong>. Le solicitamos contactarse con la administración del Colegio a la brevedad para regularizar su situación.
          </p>

          <!-- Datos matrícula -->
          <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:20px;margin-bottom:24px;">
            <p style="color:#92400e;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 10px;">Situación de su Matrícula</p>
            <p style="color:#444;font-size:14px;margin:0 0 6px;">
              👤 Titular: <strong>${nombreCompleto}</strong>
            </p>
            ${numeroMatricula ? `<p style="color:#444;font-size:14px;margin:0 0 6px;">🔢 Matrícula: <strong>${numeroMatricula}</strong></p>` : ''}
            <p style="color:#92400e;font-size:14px;font-weight:700;margin:0;">
              Estado: <span style="color:#8B7355;">EN MORA</span>
            </p>
          </div>

          <!-- Contacto -->
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin-bottom:28px;">
            <p style="color:#166534;font-size:13px;font-weight:700;margin:0 0 8px;">Para regularizar su situación:</p>
            <p style="color:#444;font-size:14px;margin:0;">
              📧 <a href="mailto:${contactoEmail}" style="color:#1a5c2a;font-weight:700;">${contactoEmail}</a>
            </p>
          </div>

          <!-- Botón -->
          <div style="text-align:center;">
            <a href="mailto:${contactoEmail}"
               style="display:inline-block;background:#1a5c2a;color:white;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:700;font-size:14px;">
              Contactar administración
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background:#1a5c2a;padding:20px 40px;text-align:center;">
          <p style="color:rgba(255,255,255,0.7);font-size:12px;margin:0;">
            CPCC · ${contactoEmail}
          </p>
        </div>
      </div>
    `,
  });
}

/**
 * Email resumen mensual al administrador con listas de matriculados en riesgo y en mora.
 */
export async function enviarResumenMoraAdmin({ enRiesgo = [], enMora = [], fecha }) {
  const fechaStr = new Date(fecha).toLocaleDateString('es-AR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const filaTabla = (items) => items.map(m => `
    <tr style="border-bottom:1px solid #e5e7eb;">
      <td style="padding:9px 12px;color:#111;font-weight:600;">${m.nombreCompleto}</td>
      <td style="padding:9px 12px;color:#1a5c2a;font-weight:700;">${m.numeroMatricula || '—'}</td>
      <td style="padding:9px 12px;color:#555;">${m.email}</td>
      <td style="padding:9px 12px;text-align:center;font-weight:700;color:#8B7355;">${m.mesesConsecutivos}</td>
    </tr>`).join('');

  const tablaRiesgo = enRiesgo.length > 0 ? `
    <h3 style="color:#92400e;font-size:15px;margin:0 0 12px;">⚠ En Riesgo — 2 meses pendientes (${enRiesgo.length})</h3>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:32px;">
      <thead>
        <tr style="background:#fffbeb;">
          <th style="padding:9px 12px;text-align:left;color:#666;font-weight:700;">Nombre</th>
          <th style="padding:9px 12px;text-align:left;color:#666;font-weight:700;">Matrícula</th>
          <th style="padding:9px 12px;text-align:left;color:#666;font-weight:700;">Email</th>
          <th style="padding:9px 12px;text-align:center;color:#666;font-weight:700;">Meses</th>
        </tr>
      </thead>
      <tbody>${filaTabla(enRiesgo)}</tbody>
    </table>` : `<p style="color:#666;font-size:14px;margin:0 0 32px;">✅ Sin matriculados en riesgo este mes.</p>`;

  const tablaMora = enMora.length > 0 ? `
    <h3 style="color:#991b1b;font-size:15px;margin:0 0 12px;">🔴 En Mora — 3+ meses pendientes (${enMora.length})</h3>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px;">
      <thead>
        <tr style="background:#fef2f2;">
          <th style="padding:9px 12px;text-align:left;color:#666;font-weight:700;">Nombre</th>
          <th style="padding:9px 12px;text-align:left;color:#666;font-weight:700;">Matrícula</th>
          <th style="padding:9px 12px;text-align:left;color:#666;font-weight:700;">Email</th>
          <th style="padding:9px 12px;text-align:center;color:#666;font-weight:700;">Meses</th>
        </tr>
      </thead>
      <tbody>${filaTabla(enMora)}</tbody>
    </table>` : `<p style="color:#666;font-size:14px;margin:0 0 24px;">✅ Sin matriculados en mora este mes.</p>`;

  await transporter.sendMail({
    from: FROM,
    replyTo: REPLY_TO,
    to: REPLY_TO,
    subject: `Reporte mensual de mora — ${fechaStr}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;background:#f9fafb;border-radius:12px;overflow:hidden;">

        <div style="background:#1a5c2a;padding:28px 40px;text-align:center;">
          <h1 style="color:white;margin:0;font-size:18px;font-weight:700;">Reporte Mensual de Mora</h1>
          <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:13px;">${fechaStr} — CPCC Catamarca</p>
        </div>

        <div style="padding:36px;background:white;">

          <!-- Resumen -->
          <div style="display:flex;gap:16px;margin-bottom:32px;">
            <div style="flex:1;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:16px;text-align:center;">
              <p style="color:#92400e;font-size:28px;font-weight:800;margin:0;">${enRiesgo.length}</p>
              <p style="color:#92400e;font-size:12px;font-weight:700;text-transform:uppercase;margin:4px 0 0;">En riesgo</p>
            </div>
            <div style="flex:1;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;text-align:center;">
              <p style="color:#991b1b;font-size:28px;font-weight:800;margin:0;">${enMora.length}</p>
              <p style="color:#991b1b;font-size:12px;font-weight:700;text-transform:uppercase;margin:4px 0 0;">En mora</p>
            </div>
            <div style="flex:1;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;text-align:center;">
              <p style="color:#166534;font-size:28px;font-weight:800;margin:0;">${enRiesgo.length + enMora.length}</p>
              <p style="color:#166534;font-size:12px;font-weight:700;text-transform:uppercase;margin:4px 0 0;">Total alertas</p>
            </div>
          </div>

          ${tablaRiesgo}
          ${tablaMora}

          <p style="color:#999;font-size:12px;margin:0;text-align:center;">
            Este reporte fue generado automáticamente. El estado de las matrículas NO fue modificado.
          </p>
        </div>

        <div style="background:#1a5c2a;padding:16px 40px;text-align:center;">
          <p style="color:rgba(255,255,255,0.65);font-size:11px;margin:0;">CPCC · Sistema automático de control de mora</p>
        </div>
      </div>
    `,
  });
}

/**
 * Notificación a secretaría + acuse de recibo al remitente cuando alguien usa el formulario de contacto.
 */
export async function enviarConsultaContacto({ nombre, email, mensaje }) {
  const contacto = await getContacto();
  // 1. Notificación interna a la secretaría
  await transporter.sendMail({
    from: FROM,
    replyTo: email,
    to: REPLY_TO,
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

  // 2. Acuse de recibo al remitente — template institucional formal
  const fechaConsulta = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: 'Consulta recibida — Colegio de Profesionales en Ciencias Criminalísticas de Catamarca',
    html: `
      <!DOCTYPE html>
      <html lang="es">
      <body style="margin:0;padding:0;background:#f0f2f0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f0;padding:32px 16px;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

            <!-- HEADER -->
            <tr>
              <td style="background:#1a5c2a;padding:36px 40px;text-align:center;">
                <p style="color:rgba(255,255,255,0.7);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;margin:0 0 10px;">República Argentina · Provincia de Catamarca</p>
                <h1 style="color:white;margin:0;font-size:20px;font-weight:700;line-height:1.5;">
                  Colegio de Profesionales en<br/>Ciencias Criminalísticas de Catamarca
                </h1>
                <p style="color:rgba(255,255,255,0.6);font-size:11px;margin:8px 0 0;">Ley Provincial N° 5.595/19</p>
              </td>
            </tr>

            <!-- BANDA IDENTIFICADORA -->
            <tr>
              <td style="background:#2e7d32;padding:10px 40px;text-align:center;">
                <p style="color:rgba(255,255,255,0.9);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin:0;">
                  Acuse de Recibo — Consulta Institucional
                </p>
              </td>
            </tr>

            <!-- CUERPO -->
            <tr>
              <td style="padding:40px 40px 32px;">

                <p style="color:#1a2d1a;font-size:15px;line-height:1.8;margin:0 0 16px;">
                  Estimado/a <strong>${nombre}</strong>,
                </p>
                <p style="color:#333;font-size:15px;line-height:1.8;margin:0 0 16px;">
                  Nos dirigimos a usted a fin de comunicarle que su consulta dirigida al <strong>Colegio de Profesionales en Ciencias Criminalísticas de Catamarca</strong> ha sido recibida correctamente con fecha <strong>${fechaConsulta}</strong>.
                </p>
                <p style="color:#333;font-size:15px;line-height:1.8;margin:0 0 28px;">
                  La misma ha sido derivada al área correspondiente para su atención. Le responderemos a través de la dirección de correo electrónico consignada en el presente formulario, dentro del horario de atención institucional.
                </p>

                <!-- Copia del mensaje -->
                <div style="background:#f5f9f5;border-left:4px solid #1a5c2a;border-radius:0 8px 8px 0;padding:20px 24px;margin-bottom:28px;">
                  <p style="color:#1a5c2a;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 12px;">Copia de su consulta</p>
                  <p style="color:#444;font-size:14px;line-height:1.7;margin:0;white-space:pre-wrap;">${mensaje}</p>
                </div>

                <!-- Datos de contacto y horarios -->
                <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px 24px;margin-bottom:32px;">
                  <p style="color:#1a5c2a;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 14px;">Datos de contacto del Colegio</p>
                  <table style="width:100%;border-collapse:collapse;font-size:14px;">
                    <tr>
                      <td style="padding:5px 0;color:#666;width:40%;">Horario de atención:</td>
                      <td style="color:#111;font-weight:600;">${contacto.horarios}</td>
                    </tr>
                    <tr>
                      <td style="padding:5px 0;color:#666;">Correo electrónico:</td>
                      <td><a href="mailto:${contacto.correo}" style="color:#1a5c2a;font-weight:600;text-decoration:none;">${contacto.correo}</a></td>
                    </tr>
                    <tr>
                      <td style="padding:5px 0;color:#666;">Sede:</td>
                      <td style="color:#111;">${contacto.direccion}</td>
                    </tr>
                  </table>
                </div>

                <!-- Firma -->
                <div style="border-top:1px solid #e5e7eb;padding-top:24px;">
                  <p style="color:#333;font-size:14px;line-height:1.8;margin:0;">
                    Saluda atentamente,<br/><br/>
                    <strong style="color:#1a5c2a;font-size:15px;">Secretaría del Colegio</strong><br/>
                    Colegio de Profesionales en Ciencias Criminalísticas<br/>
                    Provincia de Catamarca
                  </p>
                </div>

              </td>
            </tr>

            <!-- FOOTER -->
            <tr>
              <td style="background:#1a5c2a;padding:24px 40px;text-align:center;">
                <p style="color:rgba(255,255,255,0.5);font-size:11px;margin:0 0 5px;">
                  ${contacto.direccion}
                </p>
                <p style="color:rgba(255,255,255,0.7);font-size:12px;margin:0 0 8px;">
                  <a href="mailto:${contacto.correo}" style="color:rgba(255,255,255,0.9);text-decoration:none;">${contacto.correo}</a>
                </p>
                <p style="color:rgba(255,255,255,0.4);font-size:10px;margin:0;">
                  © 2025 CPCC — Ley Provincial N° 5.595/19 · Este es un correo automático, por favor no lo responda directamente.
                </p>
              </td>
            </tr>

          </table>
        </td></tr>
      </table>
      </body></html>
    `,
  });
}

/**
 * Acuse de recibo institucional cuando alguien envía una propuesta o proyecto al Colegio.
 */
export async function enviarAcuseReciboPropuesta({ nombre, email, tituloPropuesta, tipoPropuesta, fechaEnvio }) {
  const contacto = await getContacto();
  const fechaStr = fechaEnvio
    ? new Date(fechaEnvio).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });

  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: 'Propuesta recibida — Colegio de Profesionales en Ciencias Criminalísticas de Catamarca',
    html: `
      <!DOCTYPE html>
      <html lang="es">
      <body style="margin:0;padding:0;background:#f0f2f0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f0;padding:32px 16px;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

            <!-- HEADER -->
            <tr>
              <td style="background:#1a5c2a;padding:36px 40px;text-align:center;">
                <p style="color:rgba(255,255,255,0.7);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;margin:0 0 10px;">República Argentina · Provincia de Catamarca</p>
                <h1 style="color:white;margin:0;font-size:20px;font-weight:700;line-height:1.5;">
                  Colegio de Profesionales en<br/>Ciencias Criminalísticas de Catamarca
                </h1>
                <p style="color:rgba(255,255,255,0.6);font-size:11px;margin:8px 0 0;">Ley Provincial N° 5.595/19</p>
              </td>
            </tr>

            <!-- BANDA IDENTIFICADORA -->
            <tr>
              <td style="background:#2e7d32;padding:10px 40px;text-align:center;">
                <p style="color:rgba(255,255,255,0.9);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin:0;">
                  Acuse de Recibo — Propuesta Institucional
                </p>
              </td>
            </tr>

            <!-- CUERPO -->
            <tr>
              <td style="padding:40px 40px 32px;">

                <p style="color:#1a2d1a;font-size:15px;line-height:1.8;margin:0 0 16px;">
                  Estimado/a <strong>${nombre}</strong>,
                </p>
                <p style="color:#333;font-size:15px;line-height:1.8;margin:0 0 16px;">
                  El <strong>Colegio de Profesionales en Ciencias Criminalísticas de Catamarca</strong> se complace en comunicarle que su propuesta ha sido recibida y registrada correctamente en el sistema institucional con fecha <strong>${fechaStr}</strong>.
                </p>
                <p style="color:#333;font-size:15px;line-height:1.8;margin:0 0 28px;">
                  Su aporte será sometido a análisis y evaluación por parte de la <strong>Comisión Directiva</strong>, la cual determinará su viabilidad y los lineamientos para su eventual implementación en el marco de los objetivos institucionales del Colegio. Le informaremos sobre el resultado de dicha evaluación a través del correo electrónico consignado.
                </p>

                <!-- Datos de la propuesta -->
                <div style="background:#f5f9f5;border:1px solid #c6e6c8;border-radius:8px;padding:20px 24px;margin-bottom:28px;">
                  <p style="color:#1a5c2a;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 14px;">Datos de la propuesta registrada</p>
                  <table style="width:100%;border-collapse:collapse;font-size:14px;">
                    <tr style="border-bottom:1px solid #e0f0e0;">
                      <td style="padding:8px 0;color:#555;width:35%;">Título:</td>
                      <td style="color:#111;font-weight:700;padding:8px 0;">${tituloPropuesta}</td>
                    </tr>
                    ${tipoPropuesta ? `
                    <tr style="border-bottom:1px solid #e0f0e0;">
                      <td style="padding:8px 0;color:#555;">Categoría:</td>
                      <td style="color:#111;font-weight:600;padding:8px 0;">${tipoPropuesta}</td>
                    </tr>` : ''}
                    <tr style="border-bottom:1px solid #e0f0e0;">
                      <td style="padding:8px 0;color:#555;">Remitente:</td>
                      <td style="color:#111;font-weight:600;padding:8px 0;">${nombre}</td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;color:#555;">Fecha de envío:</td>
                      <td style="color:#111;font-weight:600;padding:8px 0;">${fechaStr}</td>
                    </tr>
                  </table>
                </div>

                <!-- Nota de proceso -->
                <div style="background:#fffbeb;border-left:4px solid #d97706;border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:32px;">
                  <p style="color:#92400e;font-size:13px;font-weight:700;margin:0 0 6px;">Proceso de evaluación</p>
                  <p style="color:#555;font-size:13px;line-height:1.7;margin:0;">
                    Las propuestas son evaluadas en reunión de Comisión Directiva. El tiempo de respuesta puede variar según la agenda institucional. Si necesita hacer seguimiento de su presentación, puede comunicarse con la Secretaría del Colegio.
                  </p>
                </div>

                <!-- Firma -->
                <div style="border-top:1px solid #e5e7eb;padding-top:24px;">
                  <p style="color:#333;font-size:14px;line-height:1.8;margin:0;">
                    Agradecemos su compromiso con el fortalecimiento institucional.<br/><br/>
                    Saluda atentamente,<br/><br/>
                    <strong style="color:#1a5c2a;font-size:15px;">Comisión Directiva</strong><br/>
                    Colegio de Profesionales en Ciencias Criminalísticas<br/>
                    Provincia de Catamarca
                  </p>
                </div>

              </td>
            </tr>

            <!-- FOOTER -->
            <tr>
              <td style="background:#1a5c2a;padding:24px 40px;text-align:center;">
                <p style="color:rgba(255,255,255,0.5);font-size:11px;margin:0 0 5px;">
                  ${contacto.direccion}
                </p>
                <p style="color:rgba(255,255,255,0.7);font-size:12px;margin:0 0 8px;">
                  <a href="mailto:${contacto.correo}" style="color:rgba(255,255,255,0.9);text-decoration:none;">${contacto.correo}</a>
                </p>
                <p style="color:rgba(255,255,255,0.4);font-size:10px;margin:0;">
                  © 2025 CPCC — Ley Provincial N° 5.595/19 · Este es un correo automático, por favor no lo responda directamente.
                </p>
              </td>
            </tr>

          </table>
        </td></tr>
      </table>
      </body></html>
    `,
  });
}
