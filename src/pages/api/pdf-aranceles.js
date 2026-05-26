import { createClient } from '@sanity/client';
import { jsPDF } from 'jspdf';
import { readFileSync } from 'fs';

export const prerender = false;

const sanity = createClient({
  projectId: '8q7vz6co',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-05-03',
});

const GREEN = [26, 92, 42];
const GOLD  = [139, 115, 85];

let LOGO_BASE64 = '';
try {
  LOGO_BASE64 = readFileSync(new URL('../../../public/LOGO-CENTRAL.jpg', import.meta.url)).toString('base64');
} catch {}

function fmtPesos(v) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(v);
}

function fmtJUS(v) {
  return Number(v).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

export async function GET() {
  try {
    const [aranceles, cobros, arancelesConf, contacto] = await Promise.all([
      sanity.fetch(`*[_type == "arancelProfesional"] | order(servicio asc){ servicio, unidadesCP }`),
      sanity.fetch(`*[_type == "configuracionCobros"][0]{ valorJUS }`),
      sanity.fetch(`*[_type == "arancelesConfig"][0]{ vigenciaDesde }`),
      sanity.fetch(`*[_type == "contactoConfig"][0]{ correo, direccion, telefonoOficial }`),
    ]);

    const valorJUS      = cobros?.valorJUS          || 88392.43;
    const vigenciaDesde = arancelesConf?.vigenciaDesde || null;
    const correo        = contacto?.correo          || 'criminalisticacolegio@gmail.com';
    const direccion     = contacto?.direccion       || 'Avenida América Latina 1672 — San Fernando del Valle de Catamarca';
    const cobertura     = aranceles.slice(0, 16);
    const honorarios    = aranceles.slice(16);

    const hoy = new Date();
    const fmtD = (d) => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;

    let vigStr = '';
    if (vigenciaDesde) {
      const vp = vigenciaDesde.split('-');
      vigStr = `${String(parseInt(vp[2])).padStart(2,'0')}/${String(parseInt(vp[1])).padStart(2,'0')}/${vp[0]}`;
    }

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    // Header
    doc.setFillColor(...GREEN);
    doc.rect(0, 0, 210, 40, 'F');
    if (LOGO_BASE64) {
      doc.addImage(`data:image/jpeg;base64,${LOGO_BASE64}`, 'JPEG', 14, 7, 26, 26);
    }
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('TABLA DE ARANCELES PERICIALES', 105, 14, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`CPCC · Catamarca · 1 JUS = ${fmtPesos(valorJUS)}`, 105, 22, { align: 'center' });
    if (vigStr) {
      doc.setFontSize(8);
      doc.text(`Vigente desde el ${vigStr}`, 105, 31, { align: 'center' });
    }

    let y = 48;

    const seccion = (titulo) => {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFillColor(235, 246, 235);
      doc.rect(15, y - 4, 180, 10, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...GREEN);
      doc.text(titulo, 18, y + 2);
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(7.5);
      doc.text('N°',         18,  y + 7);
      doc.text('Concepto',   30,  y + 7);
      doc.text('JUS',        162, y + 7, { align: 'right' });
      doc.text('Pesos ($)',  192, y + 7, { align: 'right' });
      y += 13;
    };

    const fila = (item, i, startNum) => {
      if (y > 268) { doc.addPage(); y = 20; }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(40, 40, 40);
      const num   = String((startNum || 1) + i);
      const lines = doc.splitTextToSize(item.servicio || '', 122);
      const rowH  = Math.max(lines.length * 4.5, 7);
      doc.text(num,   18, y + 5);
      doc.text(lines, 30, y + (lines.length > 1 ? 3 : 5));
      doc.text(fmtJUS(item.unidadesCP || 0),                162, y + 5, { align: 'right' });
      doc.text(fmtPesos((item.unidadesCP || 0) * valorJUS), 192, y + 5, { align: 'right' });
      doc.setDrawColor(220, 235, 220);
      doc.setLineWidth(0.2);
      doc.line(15, y + rowH, 195, y + rowH);
      y += rowH + 1;
    };

    if (cobertura.length) {
      seccion('COBERTURA DE GASTOS');
      cobertura.forEach((it, i) => fila(it, i, 1));
      y += 5;
    }
    if (honorarios.length) {
      seccion('HONORARIOS PERICIALES');
      honorarios.forEach((it, i) => fila(it, i, cobertura.length + 1));
    }

    // Footer
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.5);
    doc.line(15, 274, 195, 274);
    doc.setFillColor(...GREEN);
    doc.rect(0, 277, 210, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(direccion, 105, 284, { align: 'center' });
    doc.text(`${correo}  ·  Ley Provincial N° 5.595/19`, 105, 290, { align: 'center' });
    doc.setFontSize(6.5);
    doc.setTextColor(190, 225, 190);
    doc.text(`Emitida el ${fmtD(hoy)}`, 105, 295, { align: 'center' });

    const buffer = Buffer.from(doc.output('arraybuffer'));
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="tabla-aranceles-cpcc.pdf"',
      },
    });
  } catch (err) {
    console.error('[pdf-aranceles] Error:', err);
    return new Response(JSON.stringify({ error: 'Error generando la tabla.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
