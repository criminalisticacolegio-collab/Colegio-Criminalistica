import { createClient } from '@sanity/client';

export const prerender = false;

const client = createClient({
  projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID,
  dataset: import.meta.env.PUBLIC_SANITY_DATASET,
  token: import.meta.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
  apiVersion: '2023-05-03',
});

export const POST = async ({ request }) => {
  console.log('====================================');
  console.log('RETÉN DE ADUANA - HEADER RECIBIDO:', request.headers.get('content-type'));
  console.log('====================================');

  try {
    const data = await request.formData();
    
    // Extracción de campos de texto con data.get()
    const nombre = data.get('nombre');
    const apellido = data.get('apellido');
    const dni = data.get('dni');
    const email = data.get('email');
    const phone = data.get('phone');
    const cuil = data.get('cuil');
    const jurisdiction = data.get('jurisdiction');
    const degree = data.get('degree');
    
    // Extracción de archivos
    const tituloFile = data.get('titulo_file');
    const dniFile = data.get('dni_file');
    const certificadoFile = data.get('certificado_file');

    // Validación básica
    if (!nombre || !apellido || !dni || !email) {
      return new Response(
        JSON.stringify({ message: 'Faltan campos obligatorios en el formulario' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Helper de subida secuencial a Sanity
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

    // Documento Sanity
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
      ...(certId && { archivoCertificado: { _type: 'file', asset: { _type: 'reference', _ref: certId } } }),
    };

    const result = await client.create(doc);

    return new Response(
      JSON.stringify({ success: true, message: 'Registro exitoso', id: result._id }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
