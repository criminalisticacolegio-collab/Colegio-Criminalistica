import { createClient } from '@sanity/client';

const client = createClient({
    projectId: '8q7vz6co',
    dataset: 'production',
    useCdn: false,
    token: "skDbCkkiXbv9FKu6Gt2Sr5FcUwvgWQ5fa7MXXaai8GBYoM6Um0E3zgPm5C3rmEkXlSHE1LN7eRob7xjgW5My6MbwlRhnE13yDCCsVwPwMB8GuQEkJKOrtWrCpFnuq8vouF0IRGDpw3ssPhOnccN2dhvA48ZsCCYjZ9vg7dMm1mX0A68s3zLA", // Asegúrate de que tu token esté aquí
    apiVersion: '2026-04-30',
});

const autoridadesColegio = [
    {
        _type: 'autoridades',
        primerNombre: 'Diego',
        apellido: 'Tapia',
        profesion: 'Lic. en Criminalística',
        cargo: 'Presidente',
        lista: 'Renovación y Transparencia Profesional'
    },
    {
        _type: 'autoridades',
        primerNombre: 'Nelson',
        segundoNombre: 'Dario',
        apellido: 'Bayon',
        profesion: 'Lic. en Criminalística',
        cargo: 'Vicepresidente',
        lista: 'Renovación y Transparencia Profesional'
    },
    {
        _type: 'autoridades',
        primerNombre: 'Maria',
        segundoNombre: 'Soledad',
        apellido: 'Salles',
        profesion: 'Perito Judicial',
        cargo: 'Secretaria',
        lista: 'Renovación y Transparencia Profesional'
    }
];

async function importarSincronizado() {
    console.log("🛠️ Iniciando carga con etiquetas oficiales...");
    for (const auth of autoridadesColegio) {
        try {
            await client.create(auth);
            console.log(`✅ Sincronizado: ${auth.primerNombre} ${auth.apellido}`);
        } catch (err) {
            console.error(`❌ Error en ${auth.primerNombre}:`, err.message);
        }
    }
    console.log("✨ ¡Carga terminada! Revisa el panel.");
}

importarSincronizado();