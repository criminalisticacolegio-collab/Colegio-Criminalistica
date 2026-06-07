import { jsPDF } from 'jspdf';
import { getContacto } from '../../lib/contacto.js';
import { drawHeader, drawFooter } from '../../lib/pdf-helper.js';

export const prerender = false;

const GREEN = [26, 92, 42];
const GOLD  = [139, 115, 85];

function fmtPesos(v) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(v);
}

function fmtJUS(v) {
  return Number(v).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

function pad2(n) { return String(n).padStart(2, '0'); }

function pesosALetras(monto) {
  const entero   = Math.floor(monto);
  const centavos = Math.round((monto - entero) * 100);
  const UND = ['','UN','DOS','TRES','CUATRO','CINCO','SEIS','SIETE','OCHO','NUEVE',
    'DIEZ','ONCE','DOCE','TRECE','CATORCE','QUINCE',
    'DIECISÉIS','DIECISIETE','DIECIOCHO','DIECINUEVE','VEINTE'];
  const DEC = ['','DIEZ','VEINTE','TREINTA','CUARENTA','CINCUENTA','SESENTA','SETENTA','OCHENTA','NOVENTA'];
  const CEN = ['','CIENTO','DOSCIENTOS','TRESCIENTOS','CUATROCIENTOS','QUINIENTOS',
    'SEISCIENTOS','SETECIENTOS','OCHOCIENTOS','NOVECIENTOS'];

  function m1000(n) {
    if (n === 0) return '';
    if (n <= 20) return UND[n];
    if (n < 30) return n === 21 ? 'VEINTIÚN' : 'VEINTI' + UND[n - 20];
    const c = Math.floor(n / 100), r = n % 100;
    let s = '';
    if (c > 0) { s = (c === 1 && r === 0) ? 'CIEN' : CEN[c]; if (r > 0) s += ' '; }
    if (r > 0 && r <= 20) { s += UND[r]; }
    else if (r > 20) {
      const d = Math.floor(r / 10), u = r % 10;
      s += (d === 2 && u > 0) ? 'VEINTI' + UND[u] : DEC[d] + (u > 0 ? ' Y ' + UND[u] : '');
    }
    return s;
  }

  if (entero === 0) return `SON PESOS: CERO CON ${pad2(centavos)}/100`;
  const mill  = Math.floor(entero / 1000000);
  const miles = Math.floor((entero % 1000000) / 1000);
  const resto = entero % 1000;
  let r = '';
  if (mill  > 0) r += (mill  === 1 ? 'UN MILLÓN' : m1000(mill)  + ' MILLONES') + (miles > 0 || resto > 0 ? ' ' : '');
  if (miles > 0) r += (miles === 1 ? 'MIL'        : m1000(miles) + ' MIL')      + (resto > 0 ? ' ' : '');
  if (resto > 0) r += m1000(resto);
  return `SON PESOS: ${r.trim()} CON ${pad2(centavos)}/100`;
}

export async function POST({ request }) {
  try {
    const body = await request.json();
    const { items = [], perito = {}, causa = {}, valorJUS = 88392.43, vigenciaDesde = null } = body;

    if (!items.length) {
      return new Response(JSON.stringify({ error: 'Sin ítems.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const totalJus   = items.reduce((s, it) => s + (it.subtotalJus || 0), 0);
    const totalPesos = totalJus * valorJUS;

    const hoy = new Date();
    const fmtD = (d) => `${pad2(d.getDate())}/${pad2(d.getMonth()+1)}/${d.getFullYear()}`;
    const preNum = `PRE-${hoy.getFullYear()}${pad2(hoy.getMonth()+1)}${pad2(hoy.getDate())}-${pad2(hoy.getHours())}${pad2(hoy.getMinutes())}${pad2(hoy.getSeconds())}`;

    let vigStr = '';
    if (vigenciaDesde) {
      const vp = vigenciaDesde.split('-');
      vigStr = `${pad2(parseInt(vp[2]))}/${pad2(parseInt(vp[1]))}/${vp[0]}`;
    }

    const contacto = await getContacto();
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    drawHeader(doc);

    // Título
    doc.setTextColor(...GREEN);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13.5);
    doc.text('PRESUPUESTO DE HONORARIOS PERICIALES', 105, 60, { align: 'center' });
    doc.setDrawColor(...GREEN);
    doc.setLineWidth(0.7);
    doc.line(15, 64, 195, 64);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(90, 90, 90);
    doc.text(`N° ${preNum}`, 15, 60);
    doc.text(`Fecha de emisión: ${fmtD(hoy)}`, 195, 60, { align: 'right' });

    let y = 78;

    // Datos perito + causa
    const hayDatos = perito.nombre || perito.matricula || perito.especialidad || perito.contacto ||
                     causa.numero  || causa.juzgado    || causa.caratula;
    if (hayDatos) {
      doc.setFillColor(245, 248, 245);
      doc.roundedRect(15, y - 2, 84, 40, 2, 2, 'F');
      doc.roundedRect(103, y - 2, 92, 40, 2, 2, 'F');

      doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...GREEN);
      doc.text('DATOS DEL PERITO', 20, y + 4);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(40, 40, 40);
      if (perito.nombre)       { doc.setFont('helvetica','bold'); doc.text(perito.nombre, 20, y + 11); doc.setFont('helvetica','normal'); }
      if (perito.matricula)    doc.text(`Matrícula N° ${perito.matricula}`, 20, y + 18);
      if (perito.especialidad) doc.text(perito.especialidad, 20, y + 25);
      if (perito.contacto)     { doc.setFontSize(7.5); doc.text(perito.contacto, 20, y + 32); }

      doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...GREEN);
      doc.text('DATOS DE LA CAUSA', 108, y + 4);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(40, 40, 40);
      if (causa.numero)   doc.text(causa.numero,   108, y + 11);
      if (causa.juzgado)  doc.text(causa.juzgado,  108, y + 18);
      if (causa.caratula) {
        const cl = doc.splitTextToSize(causa.caratula, 84);
        doc.text(cl, 108, y + 25);
      }
      y += 46;
    }

    // Cabecera tabla
    doc.setFillColor(...GREEN);
    doc.rect(15, y, 180, 8, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(255, 255, 255);
    doc.text('N°',        18,  y + 5.5);
    doc.text('Concepto',  28,  y + 5.5);
    doc.text('Cant.',    124,  y + 5.5, { align: 'right' });
    doc.text('JUS Unit.',146,  y + 5.5, { align: 'right' });
    doc.text('Sub JUS',  168,  y + 5.5, { align: 'right' });
    doc.text('Sub $',    195,  y + 5.5, { align: 'right' });
    y += 9;

    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(40, 40, 40);
    items.forEach((s, si) => {
      if (y > 242) { doc.addPage(); y = 20; }
      const bg = si % 2 === 0 ? [255, 255, 255] : [245, 249, 245];
      const lines = doc.splitTextToSize(s.concepto || '', 88);
      const rowH  = Math.max(lines.length * 5, 8);
      doc.setFillColor(bg[0], bg[1], bg[2]);
      doc.rect(15, y, 180, rowH, 'F');
      doc.text(String(s.num || si + 1), 18, y + 5.5);
      doc.text(lines, 28, y + (lines.length > 1 ? 4 : 5.5));
      doc.text(Number(s.cant  || 1).toLocaleString('es-AR'),  124, y + 5.5, { align: 'right' });
      doc.text(fmtJUS(s.jus || 0),                            146, y + 5.5, { align: 'right' });
      doc.text(fmtJUS(s.subtotalJus || 0),                    168, y + 5.5, { align: 'right' });
      doc.text(fmtPesos(s.subtotalPes || 0),                  195, y + 5.5, { align: 'right' });
      doc.setDrawColor(200, 220, 200); doc.setLineWidth(0.15);
      y += rowH;
      doc.line(15, y, 195, y);
    });
    y += 6;

    // Subtotal JUS
    doc.setFillColor(235, 246, 235); doc.rect(15, y, 180, 8, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(60, 60, 60);
    doc.text('Subtotal en JUS:', 100, y + 5.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`${fmtJUS(totalJus)} JUS`, 195, y + 5.5, { align: 'right' });
    y += 9;

    // Valor JUS
    doc.setFillColor(255, 255, 255); doc.rect(15, y, 180, 8, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(110, 110, 110);
    doc.text(`Valor 1 JUS vigente${vigStr ? ' al ' + vigStr : ''}:`, 100, y + 5.5);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(40, 40, 40);
    doc.text(fmtPesos(valorJUS), 195, y + 5.5, { align: 'right' });
    y += 10;

    // Total
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFillColor(...GREEN); doc.rect(15, y, 180, 12, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(255, 255, 255);
    doc.text('TOTAL A COBRAR:', 100, y + 8);
    doc.setFontSize(11);
    doc.text(fmtPesos(totalPesos), 195, y + 8, { align: 'right' });
    y += 15;

    // En letras
    doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(60, 60, 60);
    const letrasLines = doc.splitTextToSize(pesosALetras(totalPesos), 174);
    doc.text(letrasLines, 15, y + 4);
    y += letrasLines.length * 5 + 10;

    // Nota legal
    if (y > 235) { doc.addPage(); y = 20; }
    doc.setDrawColor(...GREEN); doc.setLineWidth(0.4); doc.line(15, y, 195, y);
    y += 5;
    const notaLegal = `Los honorarios consignados son sugeridos conforme la tabla de aranceles del Colegio de Profesionales en Ciencias Criminalísticas de la Provincia de Catamarca${vigStr ? ', vigente desde el ' + vigStr : ''}. El profesional puede fijar un monto mayor según la complejidad de la tarea. Valor del JUS sujeto a actualización por resolución de la Comisión Directiva.`;
    doc.setFont('helvetica', 'italic'); doc.setFontSize(7.5); doc.setTextColor(130, 130, 130);
    const notaLines = doc.splitTextToSize(notaLegal, 180);
    doc.text(notaLines, 15, y);
    y += notaLines.length * 4 + 8;

    // Firma
    const sigY = Math.max(y + 15, 228);
    doc.setDrawColor(80, 80, 80); doc.setLineWidth(0.4);
    doc.line(112, sigY, 193, sigY);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(90, 90, 90);
    doc.text('Firma y sello del profesional', 152, sigY + 5, { align: 'center' });
    if (perito.nombre) {
      doc.setFont('helvetica','bold'); doc.setFontSize(8);
      doc.text(perito.nombre, 152, sigY + 11, { align: 'center' });
    }
    if (perito.matricula) {
      doc.setFont('helvetica','normal'); doc.setFontSize(7.5);
      doc.text(`Mat. N° ${perito.matricula}`, 152, sigY + 17, { align: 'center' });
    }

    // Pie
    doc.setDrawColor(...GOLD); doc.setLineWidth(0.5); doc.line(0, 274, 210, 274);
    drawFooter(doc, { direccion: contacto.direccion, correo: contacto.correo, telefono: contacto.telefono });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(190, 225, 190);
    doc.text(`Emitido el ${fmtD(hoy)} · ${preNum}`, 105, 294, { align: 'center' });

    const buffer = Buffer.from(doc.output('arraybuffer'));
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="presupuesto-${preNum}.pdf"`,
      },
    });
  } catch (err) {
    console.error('[pdf-presupuesto] Error:', err);
    return new Response(JSON.stringify({ error: 'Error generando el presupuesto.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
