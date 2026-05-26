import { createClient } from '@sanity/client';
import { jsPDF } from 'jspdf';
import { readFileSync } from 'fs';
import { adminAuth } from '../../lib/firebase-admin.js';

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
      sanity.fetch(`*[_type == "contactoConfig"][0]{ correo, direccion }`),
    ]);

    if (!mat) return json({ error: 'Profesional no encontrado en el padrón.' }, 404);
    if (mat.estado !== 'Activo') return json({ error: 'La matrícula no está activa.' }, 403);

    const pteColegio      = institucional?.presidente_nombre       || 'Presidente';
    const pteColegioCargo = institucional?.presidente_especialidad || 'Licenciado/a en Criminalística';
    const correo          = contacto?.correo    || 'criminalisticacolegio@gmail.com';
    const direccion       = contacto?.direccion || 'Avenida América Latina 1672 — San Fernando del Valle de Catamarca';

    const hoy = new Date();
    const vencimiento = new Date(hoy); vencimiento.setDate(hoy.getDate() + 30);
    const fmtFecha = (d) => d.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    // Header
    doc.setFillColor(...GREEN);
    doc.rect(0, 0, 210, 40, 'F');
    if (LOGO_BASE64) {
      doc.addImage(`data:image/jpeg;base64,${LOGO_BASE64}`, 'JPEG', 6, 7, 26, 26);
    }
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('COLEGIO DE PROFESIONALES EN CIENCIAS CRIMINALÍSTICAS', 105, 16, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('PROVINCIA DE CATAMARCA', 105, 24, { align: 'center' });
    doc.text(correo, 105, 31, { align: 'center' });

    // Gold separator
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.8);
    doc.line(15, 44, 195, 44);

    // Título
    doc.setTextColor(...GREEN);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('CONSTANCIA DE MATRÍCULA VIGENTE', 105, 60, { align: 'center' });
    doc.setDrawColor(...GREEN);
    doc.setLineWidth(0.5);
    doc.line(30, 65, 180, 65);

    // Texto introductorio
    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text('El Colegio de Profesionales en Ciencias Criminalísticas de la Provincia de Catamarca', 105, 80, { align: 'center' });
    doc.text('CERTIFICA que el/la profesional que se detalla a continuación se encuentra', 105, 88, { align: 'center' });
    doc.text('MATRICULADO/A y HABILITADO/A para el ejercicio de la profesión.', 105, 96, { align: 'center' });

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
    doc.line(115, 260, 195, 260);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(44, 62, 80);
    doc.text(pteColegio, 195, 266, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(70, 70, 70);
    doc.text(pteColegioCargo, 195, 272, { align: 'right' });
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(44, 62, 80);
    doc.text('Presidente CPCC', 195, 278, { align: 'right' });

    // Footer
    doc.setDrawColor(...GOLD); doc.setLineWidth(0.5); doc.line(0, 284, 210, 284);
    doc.setFillColor(...GREEN);
    doc.rect(0, 284, 210, 13, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(6.5); doc.setFont('helvetica', 'normal');
    doc.text(`${direccion}  ·  ${correo}  ·  Ley N° 5.595/19`, 105, 291, { align: 'center' });

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
