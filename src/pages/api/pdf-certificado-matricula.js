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

    const [mat, institucional, contacto] = await Promise.all([
      sanity.fetch(
        `*[_type == "matriculado" && lower(email) == lower($email)][0]{
          nombreCompleto, numeroMatricula, estado,
          "especialidad": especialidad->titulo,
          "jurisdiccion": jurisdiccion->titulo
        }`,
        { email }
      ),
      sanity.fetch(`*[_type == "institucionalConfig"][0]{ presidente_nombre, presidente_especialidad }`),
      sanity.fetch(`*[_type == "contactoConfig"][0]{ correo, direccion, telefonoOficial }`),
    ]);

    if (!mat) return json({ error: 'Profesional no encontrado en el padrón.' }, 404);
    if (mat.estado !== 'Activo') return json({ error: 'La matrícula no está activa.' }, 403);

    const pteColegio      = institucional?.presidente_nombre       || 'Presidente';
    const pteColegioCargo = institucional?.presidente_especialidad || 'Licenciado/a en Criminalística';
    const contactoData    = { correo: contacto?.correo, direccion: contacto?.direccion, telefono: contacto?.telefonoOficial };

    const hoy = new Date();
    const vencimiento = new Date(hoy); vencimiento.setDate(hoy.getDate() + 30);
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
    doc.setFontSize(18);
    doc.text('CONSTANCIA DE MATRÍCULA VIGENTE', 105, 70, { align: 'center' });
    doc.setDrawColor(26, 92, 42);
    doc.setLineWidth(0.5);
    doc.line(30, 75, 180, 75);

    // Texto introductorio
    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text('El Colegio de Profesionales en Ciencias Criminalísticas de la Provincia de Catamarca', 105, 90, { align: 'center' });
    doc.text('CERTIFICA que el/la profesional que se detalla a continuación se encuentra', 105, 98, { align: 'center' });
    doc.text('MATRICULADO/A y HABILITADO/A para el ejercicio de la profesión.', 105, 106, { align: 'center' });

    // Datos
    const campo = (label, valor, y) => {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
      doc.setTextColor(100, 100, 100); doc.text(label.toUpperCase(), 35, y);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
      doc.setTextColor(20, 20, 20); doc.text(valor, 35, y + 6);
    };

    const y0 = 115;
    campo('Nombre completo',  mat.nombreCompleto     || '—', y0);
    campo('N° de Matrícula',  mat.numeroMatricula    || '—', y0 + 20);
    campo('Especialidad',     mat.especialidad       || '—', y0 + 40);
    campo('Jurisdicción',     mat.jurisdiccion       || '—', y0 + 60);
    campo('Estado',           'ACTIVO',                      y0 + 80);
    campo('Fecha de emisión', fmtFecha(hoy),                 y0 + 100);
    campo('Vigencia hasta',   fmtFecha(vencimiento),         y0 + 120);

    // Firma
    doc.setDrawColor(120, 120, 120); doc.setLineWidth(0.4);
    doc.line(115, 245, 195, 245);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(44, 62, 80);
    doc.text(pteColegio, 195, 251, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(70, 70, 70);
    doc.text(pteColegioCargo, 195, 257, { align: 'right' });
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(44, 62, 80);
    doc.text('Presidente — CPCC Catamarca', 195, 263, { align: 'right' });

    drawFooter(doc, contactoData);

    const buffer = Buffer.from(doc.output('arraybuffer'));
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="constancia-matricula-${mat.numeroMatricula}.pdf"`,
      },
    });
  } catch (err) {
    console.error('[pdf-certificado-matricula] Error:', err);
    return json({ error: 'Error generando el certificado.' }, 500);
  }
}
