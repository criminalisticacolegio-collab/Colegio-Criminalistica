import { createClient } from '@sanity/client';
import { enviarConfirmacionAspirante } from '../../lib/email.js';

export const prerender = false;

const client = createClient({
  projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID,
  dataset: import.meta.env.PUBLIC_SANITY_DATASET,
  token: import.meta.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
  apiVersion: '2023-05-03',
});

export const POST = async ({ request }) => {
  try {
    const data = await request.formData();

    const nombre = data.get('nombre');
    const apellido = data.get('apellido');
    const dni = data.get('dni');
    const email = data.get('email');
    const phone = data.get('phone');
    const cuil = data.get('cuil');
    const jurisdiction = data.get('jurisdiction');
    const degree = data.get('degree');

    const tituloFile = data.get('titulo_file');
    const dniFile = data.get('dni_file');
    const certificadoFile = data.get('antecedentes_file');
    const comprobanteFile = data.get('comprobante_file');

    if (!nombre || !apellido || !dni || !email) {
      return new Response(
        JSON.stringify({ message: 'Faltan campos obligatorios en el formulario' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const uploadAsset = async (file, label) => {
      if (!file || !file.size || file.size === 0) return null;
      const buffer = Buffer.from(await file.arrayBuffer());
      const asset = await client.assets.upload('file', buffer, {
        filename: file.name || `${label}.file`,
        contentType: file.type || 'application/octet-stream',
      });
      return asset._id;
    };

    const tituloId = await uploadAsset(tituloFile, 'Título');
    const dniId = await uploadAsset(dniFile, 'DNI');
    const certId = await uploadAsset(certificadoFile, 'Certificado');
    const comprobanteId = await uploadAsset(comprobanteFile, 'Comprobante');

    const doc = {
      _type: 'aspirante',
      nombre,
      apellido,
      dni,
      email,
      telefono: phone,
      cuil,
      jurisdiccion: jurisdiction,
      tituloProfesional: degree,
      ...(tituloId && { archivoTitulo: { _type: 'file', asset: { _type: 'reference', _ref: tituloId } } }),
      ...(dniId && { archivoDNI: { _type: 'file', asset: { _type: 'reference', _ref: dniId } } }),
      ...(certId && { certificadoAntecedentes: { _type: 'file', asset: { _type: 'reference', _ref: certId } } }),
      ...(comprobanteId && { archivoComprobante: { _type: 'file', asset: { _type: 'reference', _ref: comprobanteId } } }),
    };

    const result = await client.create(doc);

    const documentosRecibidos = [
      tituloFile?.size ? 'Título Profesional' : null,
      dniFile?.size ? 'DNI' : null,
      certificadoFile?.size ? 'Certificado de Antecedentes Penales' : null,
      comprobanteFile?.size ? 'Comprobante de Pago de Matrícula' : null,
    ].filter(Boolean);

    // Enviar email de confirmación — no bloqueamos si falla
    enviarConfirmacionAspirante({
      nombre,
      apellido,
      dni,
      email,
      tituloProfesional: degree,
      cuil,
      jurisdiccion: jurisdiction,
      documentosRecibidos,
    }).catch((err) => console.error('[aspirantes] Error enviando email de confirmación:', err));

    return new Response(
      JSON.stringify({ success: true, message: 'Registro exitoso', id: result._id }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[aspirantes] Error:', error);
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
