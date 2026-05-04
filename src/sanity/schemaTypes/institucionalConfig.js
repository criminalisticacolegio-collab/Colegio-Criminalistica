import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'institucionalConfig',
    title: 'Configuración Institucional (Página Espejo)',
    type: 'document',
    __experimental_actions: ['update', 'publish'],
    fields: [
        // --- 1. MISIÓN Y VISIÓN ---
        defineField({
            name: 'misionText',
            title: 'Texto de la Misión',
            type: 'text',
            rows: 4,
        }),
        defineField({
            name: 'visionText',
            title: 'Texto de la Visión',
            type: 'text',
            rows: 4,
        }),

        // --- 2. GESTIÓN Y AUTORIDADES PRINCIPALES ---
        defineField({
            name: 'nombreListaActual',
            title: 'Nombre de la Lista Actual',
            description: 'Ej: LISTA "RENOVACIÓN Y TRANSPARENCIA PROFESIONAL"',
            type: 'string',
        }),
        defineField({
            name: 'nombrePresidente',
            title: 'Nombre del Presidente',
            type: 'string',
        }),
        defineField({
            name: 'fotoPresidente',
            title: 'Foto del Presidente',
            type: 'image',
            options: { hotspot: true }, // Permite recortar la foto en el panel
        }),
        defineField({
            name: 'nombreVicepresidente',
            title: 'Nombre del Vicepresidente',
            type: 'string',
        }),
        defineField({
            name: 'fotoVicepresidente',
            title: 'Foto del Vicepresidente',
            type: 'image',
            options: { hotspot: true },
        }),

        // --- 3. COMISIÓN DIRECTIVA ---
        defineField({
            name: 'periodoComision',
            title: 'Período de Gestión',
            description: 'Ej: Periodo 2026-2028',
            type: 'string',
        }),
        defineField({ name: 'secretariaName', title: 'Nombre de la Secretaria', type: 'string' }),
        defineField({ name: 'prosecretariaName', title: 'Nombre de la Prosecretaria', type: 'string' }),
        defineField({ name: 'tesoreraName', title: 'Nombre de la Tesorera', type: 'string' }),
        defineField({ name: 'protesoreraName', title: 'Nombre de la Protesorera', type: 'string' }),
        defineField({ name: 'vocalTitular1Name', title: 'Vocal Titular 1°', type: 'string' }),
        defineField({ name: 'vocalTitular2Name', title: 'Vocal Titular 2°', type: 'string' }),
        defineField({ name: 'vocalTitular3Name', title: 'Vocal Titular 3°', type: 'string' }),
        defineField({ name: 'vocalSuplente1Name', title: 'Vocal Suplente 1°', type: 'string' }),
        defineField({ name: 'vocalSuplente2Name', title: 'Vocal Suplente 2°', type: 'string' }),
        defineField({ name: 'vocalSuplente3Name', title: 'Vocal Suplente 3°', type: 'string' }),
        defineField({ name: 'vocalSuplente4Name', title: 'Vocal Suplente 4°', type: 'string' }),
    ],
})