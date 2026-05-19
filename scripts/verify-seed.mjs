import { createClient } from '@sanity/client';

const client = createClient({
  projectId: '8q7vz6co',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
});

const matriculados = await client.fetch(
  `*[_type == "matriculado" && estado == "Activo"] | order(numeroMatricula asc){ numeroMatricula, nombreCompleto, "esp": especialidad->titulo, "jur": jurisdiccion->titulo }`
);
console.log(`\nMatriculados ACTIVOS: ${matriculados.length}`);
matriculados.forEach(m => console.log(`  ${m.numeroMatricula}  ${m.nombreCompleto}  |  ${m.esp}  |  ${m.jur}`));

const inst = await client.fetch(`*[_type == "institucionalConfig"][0]{ presidente_nombre, vicepresidente_nombre, misionText }`);
console.log(`\ninstitucionalConfig:`);
console.log(`  Presidente: ${inst?.presidente_nombre}`);
console.log(`  Vice:       ${inst?.vicepresidente_nombre}`);
console.log(`  Misión ok:  ${inst?.misionText?.length > 0}`);

const trib = await client.fetch(`*[_type == "tribunalConfig"][0]{ presidenteTrib_nombre, titular1_nombre, suplente1_nombre }`);
console.log(`\ntribunalConfig:`);
console.log(`  Presidente Trib: ${trib?.presidenteTrib_nombre}`);
console.log(`  Titular 1:       ${trib?.titular1_nombre}`);
console.log(`  Suplente 1:      ${trib?.suplente1_nombre}`);
