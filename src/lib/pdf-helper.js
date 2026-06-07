import { LOGO_B64 } from './logo-base64.js';

const GREEN = [26, 92, 42];

/**
 * Dibuja el encabezado institucional centrado en todos los PDFs.
 * Logo centrado, nombre completo, "PROVINCIA DE CATAMARCA".
 */
export function drawHeader(doc) {
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, 210, 50, 'F');

  if (LOGO_B64) {
    // Logo centrado: x = (210 - 22) / 2 = 94
    doc.addImage(`data:image/jpeg;base64,${LOGO_B64}`, 'JPEG', 94, 5, 22, 22);
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('COLEGIO DE PROFESIONALES EN CIENCIAS CRIMINALÍSTICAS', 105, 33, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('PROVINCIA DE CATAMARCA', 105, 42, { align: 'center' });
}

/**
 * Dibuja el pie de página verde con dirección, correo y teléfono de Sanity.
 * @param {object} contacto - { direccion, correo, telefono }
 */
export function drawFooter(doc, contacto = {}) {
  const dir = contacto.direccion || 'Sede Oficial — San Fernando del Valle de Catamarca';
  const parts = [contacto.correo || 'criminalisticacolegio@gmail.com'];
  if (contacto.telefono) parts.push(contacto.telefono);
  const line2 = parts.join('  ·  ');

  doc.setFillColor(...GREEN);
  doc.rect(0, 275, 210, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(dir,   105, 283, { align: 'center' });
  doc.text(line2, 105, 291, { align: 'center' });
}

export { LOGO_B64 };
