/**
 * Script: dedup-jurisdiccion-capital.mjs
 *
 * Detecta jurisdicciones "Capital" duplicadas en Sanity,
 * migra todos los matriculados al registro correcto y elimina el duplicado.
 *
 * Uso:
 *   node scripts/dedup-jurisdiccion-capital.mjs
 *
 * Requiere variables de entorno (o .env):
 *   PUBLIC_SANITY_PROJECT_ID
 *   PUBLIC_SANITY_DATASET
 *   SANITY_API_WRITE_TOKEN   (con permisos de escritura — ya está en tu .env)
 */

import { createClient } from '@sanity/client';
import 'dotenv/config';

const client = createClient({
  projectId: process.env.PUBLIC_SANITY_PROJECT_ID,
  dataset:   process.env.PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2023-05-03',
  token:      process.env.SANITY_API_WRITE_TOKEN,
  useCdn:     false,
});

async function main() {
  console.log('🔍 Buscando jurisdicciones...');

  // Traer todas las jurisdicciones
  const todas = await client.fetch(
    `*[_type == "jurisdiccion"] | order(numero asc, titulo asc) { _id, titulo, numero, activa }`
  );

  console.log(`   Total encontradas: ${todas.length}`);
  todas.forEach(j => console.log(`   - [${j._id}] ${j.titulo} (nro: ${j.numero})`));

  // Detectar duplicados por título "Capital" (case-insensitive, parcial)
  const capitales = todas.filter(j =>
    j.titulo?.toLowerCase().includes('capital')
  );

  if (capitales.length <= 1) {
    console.log('\n✅ No hay duplicados de "Capital". Nada que hacer.');
    return;
  }

  console.log(`\n⚠️  Se encontraron ${capitales.length} jurisdicciones con "Capital":`);
  capitales.forEach(j => console.log(`   - [${j._id}] ${j.titulo}`));

  // El que tiene número más bajo (o el primero) es el "correcto"
  const [correcto, ...duplicados] = [...capitales].sort((a, b) => (a.numero ?? 999) - (b.numero ?? 999));

  console.log(`\n✔ Jurisdicción CORRECTA  : [${correcto._id}] ${correcto.titulo}`);
  duplicados.forEach(d => console.log(`✖ Jurisdicción DUPLICADA : [${d._id}] ${d.titulo}`));

  for (const dup of duplicados) {
    console.log(`\n🔄 Migrando matriculados de [${dup._id}] → [${correcto._id}]...`);

    // Buscar matriculados que referencian el duplicado
    const afectados = await client.fetch(
      `*[_type == "matriculado" && jurisdiccion._ref == $id] { _id, nombreCompleto }`,
      { id: dup._id }
    );

    console.log(`   Matriculados afectados: ${afectados.length}`);

    if (afectados.length > 0) {
      const transaction = client.transaction();
      for (const mat of afectados) {
        console.log(`   → ${mat.nombreCompleto || mat._id}`);
        transaction.patch(mat._id, {
          set: { jurisdiccion: { _type: 'reference', _ref: correcto._id } },
        });
      }
      await transaction.commit();
      console.log(`   ✅ ${afectados.length} matriculados migrados.`);
    }

    // Eliminar el duplicado
    console.log(`\n🗑  Eliminando jurisdicción duplicada [${dup._id}]...`);
    await client.delete(dup._id);
    console.log(`   ✅ Eliminado.`);
  }

  console.log('\n🎉 Deduplicación completada correctamente.');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
