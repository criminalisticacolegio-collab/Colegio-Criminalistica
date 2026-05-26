import { jsPDF } from 'jspdf';
import { readFileSync } from 'fs';

let LOGO_BASE64 = '';
try {
  const logoPath = new URL('../../public/LOGO-CENTRAL.jpg', import.meta.url);
  LOGO_BASE64 = readFileSync(logoPath).toString('base64');
} catch {
  // Logo no disponible, el encabezado se mostrará solo con texto
}

const FOOTER_LINE1 = 'Avenida América Latina 1672 — San Fernando del Valle de Catamarca';
const FOOTER_LINE2 = 'criminalisticacolegio@gmail.com';

/**
 * Genera el comprobante de pago como Buffer (para adjuntar en emails o descargar).
 * @param {object} params
 * @param {string} params.nombreCompleto
 * @param {string} params.numeroMatricula
 * @param {string} params.email
 * @param {number} params.monto
 * @param {string} params.concepto
 * @param {string} params.mpPaymentId
 * @param {Date}   params.fecha
 * @returns {Buffer}
 */
export function generarComprobantePago({ nombreCompleto, numeroMatricula, email, monto, concepto, mpPaymentId, fecha }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const fechaStr = (fecha instanceof Date ? fecha : new Date(fecha)).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });

  // ── Encabezado ──────────────────────────────────────────────
  doc.setFillColor(27, 94, 32);
  doc.rect(0, 0, 210, 40, 'F');

  if (LOGO_BASE64) {
    doc.addImage(`data:image/jpeg;base64,${LOGO_BASE64}`, 'JPEG', 6, 6, 26, 26);
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('COLEGIO DE PROFESIONALES EN CIENCIAS', 105, 13, { align: 'center' });
  doc.text('CRIMINALÍSTICAS DE CATAMARCA', 105, 21, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('COMPROBANTE OFICIAL DE PAGO', 105, 32, { align: 'center' });

  // ── Línea separadora ────────────────────────────────────────
  doc.setDrawColor(27, 94, 32);
  doc.setLineWidth(0.5);
  doc.line(15, 48, 195, 48);

  // ── Datos del comprobante ───────────────────────────────────
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);

  const col1 = 15;
  const col2 = 80;
  let y = 58;
  const lineH = 9;

  const campo = (label, valor) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(44, 62, 80);
    doc.text(label, col1, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(String(valor), col2, y);
    y += lineH;
  };

  campo('Fecha de Emisión:', fechaStr);
  campo('N° de Operación MP:', mpPaymentId);

  y += 4;
  doc.setDrawColor(200, 200, 200);
  doc.line(15, y, 195, y);
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(27, 94, 32);
  doc.text('DATOS DEL PROFESIONAL', col1, y);
  y += lineH;
  doc.setFontSize(10);

  campo('Nombre Completo:', nombreCompleto);
  campo('N° de Matrícula:', numeroMatricula);
  campo('Email:', email);

  y += 4;
  doc.setDrawColor(200, 200, 200);
  doc.line(15, y, 195, y);
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(27, 94, 32);
  doc.text('DETALLE DEL PAGO', col1, y);
  y += lineH;
  doc.setFontSize(10);

  campo('Concepto:', concepto);
  campo('Método de Pago:', 'MercadoPago');
  campo('Estado:', 'APROBADO ✓');

  // Monto destacado
  y += 6;
  doc.setFillColor(232, 245, 233);
  doc.roundedRect(15, y, 180, 20, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(27, 94, 32);
  doc.text('TOTAL PAGADO:', 25, y + 13);
  doc.setFontSize(16);
  doc.text(`$${Number(monto).toLocaleString('es-AR')}`, 175, y + 13, { align: 'right' });
  y += 30;

  // ── Nota legal ──────────────────────────────────────────────
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('Este comprobante es válido como recibo de pago. La acreditación definitiva', 105, y, { align: 'center' });
  doc.text('impactará en su legajo en un plazo de 24 horas hábiles.', 105, y + 5, { align: 'center' });

  // ── Pie de página ───────────────────────────────────────────
  doc.setFillColor(27, 94, 32);
  doc.rect(0, 279, 210, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(FOOTER_LINE1, 105, 286, { align: 'center' });
  doc.text(FOOTER_LINE2, 105, 292, { align: 'center' });

  return Buffer.from(doc.output('arraybuffer'));
}

/**
 * Genera carta de bienvenida para aspirantes como Buffer.
 */
export function generarCartaAspirante({ nombre, apellido, dni, email, tituloProfesional, fecha }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const fechaStr = new Date(fecha).toLocaleDateString('es-AR', {
    day: '2-digit', month: 'long', year: 'numeric'
  });

  doc.setFillColor(27, 94, 32);
  doc.rect(0, 0, 210, 35, 'F');

  if (LOGO_BASE64) {
    doc.addImage(`data:image/jpeg;base64,${LOGO_BASE64}`, 'JPEG', 6, 4, 25, 25);
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('COLEGIO DE PROFESIONALES EN CIENCIAS CRIMINALÍSTICAS', 105, 14, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('PROVINCIA DE CATAMARCA', 105, 25, { align: 'center' });

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  let y = 52;
  doc.text(`Catamarca, ${fechaStr}`, 195, y, { align: 'right' });
  y += 14;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(27, 94, 32);
  doc.text(`Sr./Sra. ${apellido}, ${nombre}`, 15, y);
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`Presente`, 15, y);
  y += 14;

  doc.setFont('helvetica', 'bold');
  doc.text('Ref.: Recepción de Solicitud de Matriculación', 15, y);
  y += 10;

  const cuerpo = [
    `Tenemos el agrado de dirigirnos a usted a fin de informarle que hemos recibido`,
    `correctamente su solicitud de matriculación ante este Colegio de Profesionales en`,
    `Ciencias Criminalísticas de la Provincia de Catamarca.`,
    ``,
    `Sus datos fueron registrados con el siguiente detalle:`,
  ];

  doc.setFont('helvetica', 'normal');
  for (const linea of cuerpo) {
    doc.text(linea, 15, y);
    y += 6.5;
  }
  y += 4;

  const campos = [
    ['Nombre y Apellido:', `${nombre} ${apellido}`],
    ['DNI:', dni],
    ['Email de contacto:', email],
    ['Título Profesional:', tituloProfesional || 'No especificado'],
  ];

  doc.setFillColor(232, 245, 233);
  doc.roundedRect(15, y, 180, campos.length * 9 + 8, 3, 3, 'F');
  y += 7;
  for (const [label, valor] of campos) {
    doc.setFont('helvetica', 'bold');
    doc.text(label, 22, y);
    doc.setFont('helvetica', 'normal');
    doc.text(valor, 80, y);
    y += 9;
  }
  y += 10;

  const cierre = [
    `Su legajo quedará en estado PENDIENTE hasta tanto se proceda a la verificación`,
    `presencial de la documentación presentada. Nos comunicaremos con usted a la`,
    `brevedad para coordinar los próximos pasos.`,
    ``,
    `Sin otro particular, saludamos a usted muy atentamente.`,
  ];

  for (const linea of cierre) {
    doc.text(linea, 15, y);
    y += 6.5;
  }

  y += 20;
  doc.setDrawColor(27, 94, 32);
  doc.line(15, y, 80, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Secretaría del Colegio', 15, y);
  doc.setFont('helvetica', 'normal');
  doc.text('CPCC', 15, y + 5);

  doc.setFillColor(27, 94, 32);
  doc.rect(0, 279, 210, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(FOOTER_LINE1, 105, 286, { align: 'center' });
  doc.text(FOOTER_LINE2, 105, 292, { align: 'center' });

  return Buffer.from(doc.output('arraybuffer'));
}

/**
 * Genera certificado de aprobación de curso en formato apaisado (landscape A4).
 * @param {object} params
 * @param {string} params.nombreCompleto
 * @param {string} params.cursoTitulo
 * @param {Date}   params.fecha
 * @returns {Buffer}
 */
export function generarCertificadoCurso({ nombreCompleto, cursoTitulo, fecha }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  const fechaStr = new Date(fecha).toLocaleDateString('es-AR', {
    day: '2-digit', month: 'long', year: 'numeric'
  });

  // ── Encabezado verde ────────────────────────────────────────
  doc.setFillColor(27, 94, 32);
  doc.rect(0, 0, 297, 38, 'F');

  if (LOGO_BASE64) {
    doc.addImage(`data:image/jpeg;base64,${LOGO_BASE64}`, 'JPEG', 8, 5, 26, 26);
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('COLEGIO DE PROFESIONALES EN CIENCIAS CRIMINALÍSTICAS', 148, 17, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('PROVINCIA DE CATAMARCA', 148, 28, { align: 'center' });

  // ── Título ──────────────────────────────────────────────────
  doc.setTextColor(27, 94, 32);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('CERTIFICADO DE APROBACIÓN', 148, 60, { align: 'center' });
  doc.setDrawColor(27, 94, 32);
  doc.setLineWidth(0.8);
  doc.line(70, 65, 227, 65);

  // ── Cuerpo ──────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(70, 70, 70);
  doc.text(
    'El Colegio de Profesionales en Ciencias Criminalísticas de la Provincia de Catamarca certifica que:',
    148, 82, { align: 'center' }
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(27, 94, 32);
  doc.text(nombreCompleto, 148, 102, { align: 'center' });

  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(60, 107, 237, 107);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(70, 70, 70);
  doc.text('ha completado satisfactoriamente el curso:', 148, 120, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(44, 62, 80);
  doc.text(cursoTitulo, 148, 135, { align: 'center' });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10);
  doc.setTextColor(130, 130, 130);
  doc.text(`Catamarca, ${fechaStr}`, 148, 152, { align: 'center' });

  // ── Firmas ──────────────────────────────────────────────────
  // Izquierdo: Sello
  doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.3);
  doc.rect(20, 163, 65, 25, 'S');
  doc.setFont('helvetica', 'italic'); doc.setFontSize(7); doc.setTextColor(200, 200, 200);
  doc.text('Sello', 52.5, 177, { align: 'center' });

  // Derecho: Presidente
  doc.setDrawColor(120, 120, 120); doc.setLineWidth(0.4);
  doc.line(175, 172, 235, 172);

  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(44, 62, 80);
  doc.text('Lic. Diego Tapia', 235, 177, { align: 'right' });

  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(80, 80, 80);
  doc.text('Licenciado en Criminalística', 235, 182, { align: 'right' });

  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(44, 62, 80);
  doc.text('Presidente', 235, 187, { align: 'right' });

  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(80, 80, 80);
  doc.text('Colegio de Profesionales en Ciencias Criminalísticas', 235, 192, { align: 'right' });
  doc.text('Provincia de Catamarca', 235, 197, { align: 'right' });

  // ── Pie ─────────────────────────────────────────────────────
  doc.setFillColor(27, 94, 32);
  doc.rect(0, 200, 297, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text(`${FOOTER_LINE1}  ·  ${FOOTER_LINE2}  ·  Ley N° 5.595/19`, 148, 206, { align: 'center' });

  return Buffer.from(doc.output('arraybuffer'));
}
