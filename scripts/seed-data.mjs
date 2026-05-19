/**
 * Seed script — carga datos iniciales en Sanity
 * Ejecutar: node --env-file=.env scripts/seed-data.mjs
 */
import { createClient } from '@sanity/client';

const token = process.env.SANITY_API_WRITE_TOKEN;
if (!token) {
  console.error('❌ Falta SANITY_API_WRITE_TOKEN en las variables de entorno.');
  process.exit(1);
}

const client = createClient({
  projectId: '8q7vz6co',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token,
  useCdn: false,
});

async function main() {
  console.log('🚀 Iniciando carga de datos CPC CTM en Sanity...\n');

  // ── 1. Jurisdicción Capital ─────────────────────────────────────
  await client.createOrReplace({
    _id: 'jur-capital',
    _type: 'jurisdiccion',
    titulo: 'Capital',
    numero: 1,
    activa: true,
  });
  console.log('✓ Jurisdicción: Capital');

  // ── 2. Especialidades ───────────────────────────────────────────
  await client.createOrReplace({
    _id: 'esp-lic-criminalistica',
    _type: 'especialidad',
    titulo: 'Lic. en Criminalística',
    descripcion: 'Licenciatura en Ciencias Criminalísticas',
  });
  await client.createOrReplace({
    _id: 'esp-perito-judicial',
    _type: 'especialidad',
    titulo: 'Perito Judicial',
    descripcion: 'Perito Judicial en Ciencias Forenses',
  });
  console.log('✓ Especialidades: Lic. en Criminalística, Perito Judicial\n');

  const jurRef  = { _type: 'reference', _ref: 'jur-capital' };
  const espLic  = { _type: 'reference', _ref: 'esp-lic-criminalistica' };
  const espPerito = { _type: 'reference', _ref: 'esp-perito-judicial' };

  // ── 3. Matriculados (19 autoridades 2026-2028) ──────────────────
  const matriculados = [
    // Comisión Directiva
    { id: 'mat-mp001', num: 'MP-001', nombre: 'Diego Tapia',                  esp: espLic   },
    { id: 'mat-mp002', num: 'MP-002', nombre: 'Nelson Darío Bayón',           esp: espLic   },
    { id: 'mat-mp003', num: 'MP-003', nombre: 'María Soledad Salles',         esp: espPerito },
    { id: 'mat-mp004', num: 'MP-004', nombre: 'Gabriela Del Valle Iváñez',   esp: espLic   },
    { id: 'mat-mp005', num: 'MP-005', nombre: 'Ivana del Valle Barrionuevo', esp: espLic   },
    { id: 'mat-mp006', num: 'MP-006', nombre: 'Maribel Villacorta',          esp: espLic   },
    { id: 'mat-mp007', num: 'MP-007', nombre: 'Omar Carpio',                 esp: espLic   },
    { id: 'mat-mp008', num: 'MP-008', nombre: 'Natalia Gómez',               esp: espLic   },
    { id: 'mat-mp009', num: 'MP-009', nombre: 'Cinthia Balderrama',          esp: espLic   },
    { id: 'mat-mp010', num: 'MP-010', nombre: 'Janet Morales',               esp: espLic   },
    { id: 'mat-mp011', num: 'MP-011', nombre: 'Ariel Cáseres',               esp: espLic   },
    { id: 'mat-mp012', num: 'MP-012', nombre: 'Lía Ledesma',                 esp: espLic   },
    { id: 'mat-mp013', num: 'MP-013', nombre: 'Angie Santana',               esp: espLic   },
    // Tribunal de Ética y Disciplina
    { id: 'mat-mp014', num: 'MP-014', nombre: 'Orlando Antonio Quevedo',     esp: espLic   },
    { id: 'mat-mp015', num: 'MP-015', nombre: 'Natalia Franco',              esp: espLic   },
    { id: 'mat-mp016', num: 'MP-016', nombre: 'Carlos Pereira',              esp: espLic   },
    { id: 'mat-mp017', num: 'MP-017', nombre: 'Enrique Sarmiento',           esp: espLic   },
    { id: 'mat-mp018', num: 'MP-018', nombre: 'Anahí Bulacio',               esp: espLic   },
    { id: 'mat-mp019', num: 'MP-019', nombre: 'Xavier Carrizo',              esp: espLic   },
  ];

  console.log('Cargando matriculados...');
  for (const m of matriculados) {
    await client.createOrReplace({
      _id: m.id,
      _type: 'matriculado',
      numeroMatricula: m.num,
      nombreCompleto: m.nombre,
      email: `${m.num.toLowerCase().replace('-', '')}@cpcctm.ar`,
      estado: 'Activo',
      jurisdiccion: jurRef,
      especialidad: m.esp,
    });
    console.log(`  ✓ ${m.num} — ${m.nombre}`);
  }

  // ── 4. institucionalConfig ──────────────────────────────────────
  await client.createOrReplace({
    _id: 'institucionalConfig',
    _type: 'institucionalConfig',
    periodoComision: '2026-2028',
    misionText: 'Queremos un Colegio que crezca, que se modernice y que represente con orgullo a todos los profesionales en Ciencias Criminalísticas. Una gestión abierta, transparente y de puertas abiertas.',
    visionText: 'Construir un Colegio moderno, transparente y participativo, que sea motivo de orgullo para cada profesional en Ciencias Criminalísticas de la provincia. Un Colegio que no solo administre, sino que genere oportunidades, visibilidad y crecimiento para todos sus integrantes.',
    presidente_nombre: 'Diego Tapia',
    presidente_especialidad: 'Lic. en Criminalística',
    vicepresidente_nombre: 'Nelson Darío Bayón',
    vicepresidente_especialidad: 'Lic. en Criminalística',
    secretaria_nombre: 'María Soledad Salles',
    secretaria_especialidad: 'Perito Judicial',
    prosecretaria_nombre: 'Gabriela Del Valle Iváñez',
    tesorera_nombre: 'Ivana del Valle Barrionuevo',
    protesorera_nombre: 'Maribel Villacorta',
    vocalTitular1_nombre: 'Omar Carpio',
    vocalTitular2_nombre: 'Natalia Gómez',
    vocalTitular3_nombre: 'Cinthia Balderrama',
    vocalSuplente1_nombre: 'Janet Morales',
    vocalSuplente2_nombre: 'Ariel Cáseres',
    vocalSuplente3_nombre: 'Lía Ledesma',
    vocalSuplente4_nombre: 'Angie Santana',
  });
  console.log('\n✓ institucionalConfig cargado');

  // ── 5. tribunalConfig ───────────────────────────────────────────
  await client.createOrReplace({
    _id: 'tribunalConfig',
    _type: 'tribunalConfig',
    descripcion: 'El Tribunal de Ética y Disciplina es el órgano encargado de velar por el cumplimiento del Código de Ética Profesional y la conducta de los matriculados en el ejercicio de la profesión.',
    presidenteTrib_nombre: 'Orlando Antonio Quevedo',
    presidenteTrib_especialidad: 'Lic. en Criminalística',
    titular1_nombre: 'Natalia Franco',
    titular2_nombre: 'Carlos Pereira',
    titular3_nombre: 'Enrique Sarmiento',
    suplente1_nombre: 'Anahí Bulacio',
    suplente2_nombre: 'Xavier Carrizo',
  });
  console.log('✓ tribunalConfig cargado');

  console.log('\n✅ Carga completa. 19 matriculados + 2 configuraciones listas en Sanity.');
  console.log('   → Recargá el Studio (F5) para ver los cambios.');
}

main().catch(err => {
  console.error('\n❌ Error en seed:', err.message);
  process.exit(1);
});
