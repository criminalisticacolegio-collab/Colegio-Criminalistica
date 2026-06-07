import { createClient } from '@sanity/client';
import { jsPDF } from 'jspdf';
import { LOGO_B64 } from '../../lib/pdf-helper.js';

export const prerender = false;

const sanity = createClient({
  projectId: '8q7vz6co',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-05-03',
});

const GREEN = [26, 92, 42];
const GOLD  = [139, 115, 85];

export async function GET() {
  try {
    const [matriculados, contacto] = await Promise.all([
      sanity.fetch(
        `*[_type == "matriculado" && estado == "Activo"] | order(nombreCompleto asc){
          nombreCompleto, numeroMatricula,
          "especialidad": especialidad->titulo,
          "jurisdiccion": jurisdiccion->titulo
        }`
      ),
      sanity.fetch(`*[_type == "contactoConfig"][0]{ correo, direccion, telefonoOficial }`),
    ]);

    const correo    = contacto?.correo          || 'criminalisticacolegio@gmail.com';
    const direccion = contacto?.direccion       || 'Avenida América Latina 1672 — San Fernando del Valle de Catamarca';
    const telefono  = contacto?.telefonoOficial || '';

    const hoy = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    const ROW_H     = 7.5;
    const COL_N     = 15;
    const COL_MAT   = 23;
    const COL_NOM   = 47;
    const COL_ESP   = 118;
    const COL_JUR   = 172;
    const TABLE_END = 195;
    const PAGE_MAX  = 272;

    const drawHeader = (d) => {
      d.setFillColor(...GREEN);
      d.rect(0, 0, 210, 54, 'F');
      if (LOGO_B64) {
        d.addImage(`data:image/jpeg;base64,${LOGO_B64}`, 'JPEG', 94, 5, 22, 22);
      }
      d.setTextColor(255, 255, 255);
      d.setFont('helvetica', 'bold');
      d.setFontSize(12);
      d.text('COLEGIO DE PROFESIONALES EN CIENCIAS CRIMINALÍSTICAS', 105, 32, { align: 'center' });
      d.setFont('helvetica', 'normal');
      d.setFontSize(9);
      d.text('PROVINCIA DE CATAMARCA', 105, 41, { align: 'center' });
      d.setFont('helvetica', 'bold');
      d.setFontSize(11);
      d.setTextColor(255, 235, 160);
      d.text('PADRÓN OFICIAL DE MATRICULADOS ACTIVOS', 105, 50, { align: 'center' });
    };

    const drawTableHead = (d, y) => {
      d.setFillColor(...GREEN);
      d.rect(COL_N, y, TABLE_END - COL_N, 8, 'F');
      d.setTextColor(255, 255, 255);
      d.setFont('helvetica', 'bold');
      d.setFontSize(7.5);
      d.text('N°',           COL_N   + 1, y + 5.5);
      d.text('Matrícula',    COL_MAT + 1, y + 5.5);
      d.text('Nombre Completo', COL_NOM + 1, y + 5.5);
      d.text('Especialidad', COL_ESP + 1, y + 5.5);
      d.text('Jurisdicción', COL_JUR + 1, y + 5.5);
      return y + 9;
    };

    const drawFooter = (d, pageNum) => {
      d.setDrawColor(...GOLD);
      d.setLineWidth(0.6);
      d.line(15, PAGE_MAX + 2, 195, PAGE_MAX + 2);
      d.setTextColor(80, 80, 80);
      d.setFont('helvetica', 'normal');
      d.setFontSize(7);
      d.text(direccion, 105, PAGE_MAX + 7, { align: 'center' });
      const footerLine2 = telefono ? `${correo}  ·  Tel: ${telefono}` : correo;
      d.text(footerLine2, 105, PAGE_MAX + 12, { align: 'center' });
      d.setTextColor(120, 120, 120);
      d.text(`Emitido el ${hoy}  ·  Página ${pageNum}`, 105, PAGE_MAX + 17, { align: 'center' });
    };

    drawHeader(doc);
    let y = drawTableHead(doc, 50);
    let page = 1;

    for (let i = 0; i < matriculados.length; i++) {
      const m = matriculados[i];

      if (y + ROW_H > PAGE_MAX) {
        drawFooter(doc, page);
        doc.addPage();
        page++;
        drawHeader(doc);
        y = drawTableHead(doc, 50);
      }

      const even = i % 2 === 0;
      doc.setFillColor(even ? 255 : 243, even ? 255 : 250, even ? 255 : 243);
      doc.rect(COL_N, y, TABLE_END - COL_N, ROW_H, 'F');

      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);

      doc.text(String(i + 1), COL_N + 1, y + 5);
      doc.text(String(m.numeroMatricula || '—'), COL_MAT + 1, y + 5);

      const nombre = doc.splitTextToSize(m.nombreCompleto || '—', 67);
      doc.text(nombre[0], COL_NOM + 1, y + 5);

      const espec = doc.splitTextToSize(m.especialidad || '—', 50);
      doc.text(espec[0], COL_ESP + 1, y + 5);

      doc.text(String(m.jurisdiccion || '—'), COL_JUR + 1, y + 5);

      doc.setDrawColor(210, 232, 210);
      doc.setLineWidth(0.1);
      doc.line(COL_N, y + ROW_H, TABLE_END, y + ROW_H);

      y += ROW_H;
    }

    y += 5;
    if (y + 8 > PAGE_MAX) {
      drawFooter(doc, page);
      doc.addPage();
      page++;
      drawHeader(doc);
      y = 55;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...GREEN);
    doc.text(`Total de profesionales activos: ${matriculados.length}`, COL_N, y + 5);

    drawFooter(doc, page);

    const buffer = Buffer.from(doc.output('arraybuffer'));
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="padron-oficial-cpcc.pdf"',
      },
    });
  } catch (err) {
    console.error('[pdf-padron] Error:', err);
    return new Response(JSON.stringify({ error: 'Error generando el padrón.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
