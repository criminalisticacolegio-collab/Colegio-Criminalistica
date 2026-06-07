import { createClient } from '@sanity/client';
import { jsPDF } from 'jspdf';
import { adminAuth } from '../../lib/firebase-admin.js';
import { drawHeader, drawFooter } from '../../lib/pdf-helper.js';

export const prerender = false;

const sanity = createClient({
  projectId: '8q7vz6co',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-05-03',
});

const GREEN = [26, 92, 42];
const GOLD  = [139, 115, 85];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST({ request }) {
  try {
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) return json({ error: 'No autorizado.' }, 401);

    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(token);
    } catch {
      return json({ error: 'Token inválido o expirado.' }, 401);
    }

    const email = decoded.email;
    if (!email) return json({ error: 'Token sin email.' }, 401);

    const [mat, tribunal, contacto] = await Promise.all([
      sanity.fetch(
        `*[_type == "matriculado" && lower(email) == lower($email)][0]{
          nombreCompleto, numeroMatricula, estado
        }`,
        { email }
      ),
      sanity.fetch(`*[_type == "tribunalConfig"][0]{ presidenteTrib_nombre, presidenteTrib_especialidad }`),
      sanity.fetch(`*[_type == "contactoConfig"][0]{ correo, direccion, telefonoOficial }`),
    ]);

    if (!mat) return json({ error: 'Profesional no encontrado en el padrón.' }, 404);
    if (mat.estado !== 'Activo') return json({ error: 'No se puede emitir la constancia. La matrícula no está activa.' }, 403);

    const pteTribunal      = tribunal?.presidenteTrib_nombre        || 'Presidente del Tribunal';
    const pteTribunalCargo = tribunal?.presidenteTrib_especialidad  || 'Licenciado/a en Criminalística';
    const contactoData     = { correo: contacto?.correo, direccion: contacto?.direccion, telefono: contacto?.telefonoOficial };

    const hoy = new Date();
    const fmtFecha = (d) => d.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    drawHeader(doc);

    // Gold separator
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.8);
    doc.line(15, 54, 195, 54);

    // Título
    doc.setTextColor(26, 92, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.text('CONSTANCIA DE ÉTICA PROFESIONAL', 105, 70, { align: 'center' });
    doc.setDrawColor(26, 92, 42);
    doc.setLineWidth(0.5);
    doc.line(30, 75, 180, 75);

    // Texto introductorio
    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text('El Tribunal de Ética del Colegio de Profesionales en Ciencias Criminalísticas', 105, 80, { align: 'center' });
    doc.text('de la Provincia de Catamarca CERTIFICA que:', 105, 88, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...GREEN);
    doc.text((mat.nombreCompleto || '—').toUpperCase(), 105, 104, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(`Matrícula N° ${mat.numeroMatricula || '—'}`, 105, 113, { align: 'center' });

    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    const texto = 'NO REGISTRA sanciones disciplinarias vigentes ante este Tribunal a la fecha de emisión del presente certificado.';
    const lines = doc.splitTextToSize(texto, 140);
    doc.text(lines, 105, 130, { align: 'center' });

    // Datos
    const campo2 = (label, valor, y) => {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(100, 100, 100);
      doc.text(label.toUpperCase(), 35, y);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(20, 20, 20);
      doc.text(valor, 35, y + 6);
    };
    campo2('Fecha de emisión', fmtFecha(hoy),                       155);
    campo2('Vigencia',         '30 días desde la fecha de emisión', 175);

    // Firma
    doc.setDrawColor(120, 120, 120); doc.setLineWidth(0.4);
    doc.line(115, 218, 195, 218);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(44, 62, 80);
    doc.text(pteTribunal, 195, 224, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(70, 70, 70);
    doc.text(pteTribunalCargo, 195, 230, { align: 'right' });
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(44, 62, 80);
    doc.text('Presidente del Tribunal de Ética', 195, 236, { align: 'right' });
    doc.text('y Disciplina — CPCC Catamarca', 195, 241, { align: 'right' });

    drawFooter(doc, contactoData);

    const buffer = Buffer.from(doc.output('arraybuffer'));
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="constancia-etica-${mat.numeroMatricula}.pdf"`,
      },
    });
  } catch (err) {
    console.error('[pdf-certificado-etica] Error:', err);
    return json({ error: 'Error generando el certificado.' }, 500);
  }
}
