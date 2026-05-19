import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'institucionalConfig',
    title: 'Institucional',
    type: 'document',
    groups: [
        { name: 'gestion',       title: '🗂️ Gestión y Período' },
        { name: 'mision',        title: '🎯 Misión y Visión' },
        { name: 'presidente',    title: '👑 Presidente' },
        { name: 'vicepresidente',title: '🏅 Vicepresidente' },
        { name: 'comision',      title: '📋 Comisión Directiva' },
    ],
    fields: [

        // ── GESTIÓN Y PERÍODO ──────────────────────────────────────
        defineField({
            name: 'nombreListaActual',
            title: 'Nombre de la Lista Actual',
            type: 'string',
            description: 'Ej: "Renovación y Transparencia Profesional"',
            group: 'gestion',
        }),
        defineField({
            name: 'periodoComision',
            title: 'Período de Gestión',
            type: 'string',
            description: 'Ej: 2026-2028',
            group: 'gestion',
        }),

        // ── MISIÓN Y VISIÓN ────────────────────────────────────────
        defineField({
            name: 'misionText',
            title: 'Texto de la Misión',
            type: 'text',
            rows: 5,
            group: 'mision',
        }),
        defineField({
            name: 'visionText',
            title: 'Texto de la Visión',
            type: 'text',
            rows: 5,
            group: 'mision',
        }),

        // ── PRESIDENTE ────────────────────────────────────────────
        defineField({
            name: 'presidente_nombre',
            title: 'Nombre completo',
            type: 'string',
            group: 'presidente',
        }),
        defineField({
            name: 'presidente_especialidad',
            title: 'Especialidad / Título profesional',
            type: 'string',
            group: 'presidente',
        }),
        defineField({
            name: 'presidente_foto',
            title: 'Foto del Presidente',
            type: 'image',
            options: { hotspot: true },
            group: 'presidente',
        }),

        // ── VICEPRESIDENTE ────────────────────────────────────────
        defineField({
            name: 'vicepresidente_nombre',
            title: 'Nombre completo',
            type: 'string',
            group: 'vicepresidente',
        }),
        defineField({
            name: 'vicepresidente_especialidad',
            title: 'Especialidad / Título profesional',
            type: 'string',
            group: 'vicepresidente',
        }),
        defineField({
            name: 'vicepresidente_foto',
            title: 'Foto del Vicepresidente',
            type: 'image',
            options: { hotspot: true },
            group: 'vicepresidente',
        }),

        // ── COMISIÓN DIRECTIVA ─────────────────────────────────────
        // Secretaría
        defineField({ name: 'secretaria_nombre',        title: 'Secretaria — Nombre',         type: 'string', group: 'comision' }),
        defineField({ name: 'secretaria_especialidad',  title: 'Secretaria — Especialidad',    type: 'string', group: 'comision' }),
        defineField({ name: 'prosecretaria_nombre',     title: 'Prosecretaria — Nombre',       type: 'string', group: 'comision' }),
        defineField({ name: 'prosecretaria_especialidad', title: 'Prosecretaria — Especialidad', type: 'string', group: 'comision' }),
        // Tesorería
        defineField({ name: 'tesorera_nombre',          title: 'Tesorera — Nombre',            type: 'string', group: 'comision' }),
        defineField({ name: 'tesorera_especialidad',    title: 'Tesorera — Especialidad',      type: 'string', group: 'comision' }),
        defineField({ name: 'protesorera_nombre',       title: 'Protesorera — Nombre',         type: 'string', group: 'comision' }),
        defineField({ name: 'protesorera_especialidad', title: 'Protesorera — Especialidad',   type: 'string', group: 'comision' }),
        // Vocales Titulares
        defineField({ name: 'vocalTitular1_nombre',     title: 'Vocal Titular 1° — Nombre',    type: 'string', group: 'comision' }),
        defineField({ name: 'vocalTitular1_especialidad', title: 'Vocal Titular 1° — Especialidad', type: 'string', group: 'comision' }),
        defineField({ name: 'vocalTitular2_nombre',     title: 'Vocal Titular 2° — Nombre',    type: 'string', group: 'comision' }),
        defineField({ name: 'vocalTitular2_especialidad', title: 'Vocal Titular 2° — Especialidad', type: 'string', group: 'comision' }),
        defineField({ name: 'vocalTitular3_nombre',     title: 'Vocal Titular 3° — Nombre',    type: 'string', group: 'comision' }),
        defineField({ name: 'vocalTitular3_especialidad', title: 'Vocal Titular 3° — Especialidad', type: 'string', group: 'comision' }),
        // Vocales Suplentes
        defineField({ name: 'vocalSuplente1_nombre',    title: 'Vocal Suplente 1° — Nombre',   type: 'string', group: 'comision' }),
        defineField({ name: 'vocalSuplente1_especialidad', title: 'Vocal Suplente 1° — Especialidad', type: 'string', group: 'comision' }),
        defineField({ name: 'vocalSuplente2_nombre',    title: 'Vocal Suplente 2° — Nombre',   type: 'string', group: 'comision' }),
        defineField({ name: 'vocalSuplente2_especialidad', title: 'Vocal Suplente 2° — Especialidad', type: 'string', group: 'comision' }),
        defineField({ name: 'vocalSuplente3_nombre',    title: 'Vocal Suplente 3° — Nombre',   type: 'string', group: 'comision' }),
        defineField({ name: 'vocalSuplente3_especialidad', title: 'Vocal Suplente 3° — Especialidad', type: 'string', group: 'comision' }),
        defineField({ name: 'vocalSuplente4_nombre',    title: 'Vocal Suplente 4° — Nombre',   type: 'string', group: 'comision' }),
        defineField({ name: 'vocalSuplente4_especialidad', title: 'Vocal Suplente 4° — Especialidad', type: 'string', group: 'comision' }),
    ],
})
