import { createClient } from '@sanity/client';

const sanity = createClient({
  projectId: '8q7vz6co',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-05-03',
});

let _cache = null;
let _cacheAt = 0;
const TTL_MS = 5 * 60 * 1000; // 5 minutos

/**
 * Devuelve los datos de contacto institucional desde Sanity.
 * Tiene un caché de 5 minutos para no hacer una query por cada email.
 */
export async function getContacto() {
  const now = Date.now();
  if (_cache && now - _cacheAt < TTL_MS) return _cache;

  try {
    const data = await sanity.fetch(
      `*[_type == "contactoConfig"][0]{
        correo, telefonoOficial, whatsapp, direccion, horarios
      }`
    );
    _cache = {
      correo:    data?.correo    || 'criminalisticacolegio@gmail.com',
      telefono:  data?.telefonoOficial || null,
      whatsapp:  data?.whatsapp  || null,
      direccion: data?.direccion || 'Sede Oficial — San Fernando del Valle de Catamarca',
      horarios:  data?.horarios  || 'Lunes a Viernes · 8:00 a 14:00 hs',
    };
    _cacheAt = now;
  } catch {
    _cache = {
      correo:    'criminalisticacolegio@gmail.com',
      telefono:  null,
      whatsapp:  null,
      direccion: 'Sede Oficial — San Fernando del Valle de Catamarca',
      horarios:  'Lunes a Viernes · 8:00 a 14:00 hs',
    };
  }
  return _cache;
}
