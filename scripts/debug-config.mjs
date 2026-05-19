import { createClient } from '@sanity/client';

const client = createClient({
  projectId: '8q7vz6co',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
});

// GROQ query igual al que usa padron.astro en producción
const padron = await client.fetch(
  `*[_type == "matriculado" && estado == "Activo"] | order(numeroMatricula asc){ numeroMatricula, nombreCompleto, "especialidad": especialidad->titulo, "jurisdiccion": jurisdiccion->titulo }`
);
console.log(`\n✅ Padrón público (ACTIVO): ${padron.length} profesionales`);

// GROQ query de institucional.astro
const inst = await client.fetch(`*[_type == "institucionalConfig"][0]{ presidente_nombre, vicepresidente_nombre, periodoComision }`);
console.log(`\n✅ Institucional: Presidente="${inst?.presidente_nombre}", Vice="${inst?.vicepresidente_nombre}", Período="${inst?.periodoComision}"`);

// GROQ query de disciplina.astro
const trib = await client.fetch(`*[_type == "tribunalConfig"][0]{ presidenteTrib_nombre, titular1_nombre, suplente1_nombre }`);
console.log(`\n✅ Tribunal: Presidente="${trib?.presidenteTrib_nombre}", Titular1="${trib?.titular1_nombre}", Suplente1="${trib?.suplente1_nombre}"`);
