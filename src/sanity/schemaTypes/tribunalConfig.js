import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'tribunalConfig',
    title: 'Tribunal de Disciplina',
    type: 'document',
    groups: [
        { name: 'info',           title: '📋 Información General' },
        { name: 'presidente',     title: '⚖️ Presidente del Tribunal' },
        { name: 'titulares',      title: '👥 Miembros Titulares' },
        { name: 'suplentes',      title: '📌 Miembros Suplentes' },
        { name: 'legal',          title: '📄 Marco Legal' },
        { name: 'resoluciones',   title: '⚖️ Resoluciones' },
    ],
    fields: [

        // ── INFORMACIÓN GENERAL ────────────────────────────────────
        defineField({
            name: 'descripcion',
            title: 'Descripción del Tribunal',
            type: 'text',
            rows: 4,
            group: 'info',
        }),

        // ── PRESIDENTE DEL TRIBUNAL ────────────────────────────────
        defineField({ name: 'presidenteTrib_nombre',       title: 'Nombre completo',            type: 'string', group: 'presidente' }),
        defineField({ name: 'presidenteTrib_especialidad', title: 'Especialidad / Título',       type: 'string', group: 'presidente' }),

        // ── MIEMBROS TITULARES ─────────────────────────────────────
        defineField({ name: 'titular1_nombre',       title: 'Miembro Titular 1 — Nombre',       type: 'string', group: 'titulares' }),
        defineField({ name: 'titular1_especialidad', title: 'Miembro Titular 1 — Especialidad', type: 'string', group: 'titulares' }),
        defineField({ name: 'titular2_nombre',       title: 'Miembro Titular 2 — Nombre',       type: 'string', group: 'titulares' }),
        defineField({ name: 'titular2_especialidad', title: 'Miembro Titular 2 — Especialidad', type: 'string', group: 'titulares' }),
        defineField({ name: 'titular3_nombre',       title: 'Miembro Titular 3 — Nombre',       type: 'string', group: 'titulares' }),
        defineField({ name: 'titular3_especialidad', title: 'Miembro Titular 3 — Especialidad', type: 'string', group: 'titulares' }),

        // ── MIEMBROS SUPLENTES ─────────────────────────────────────
        defineField({ name: 'suplente1_nombre',       title: 'Miembro Suplente 1 — Nombre',       type: 'string', group: 'suplentes' }),
        defineField({ name: 'suplente1_especialidad', title: 'Miembro Suplente 1 — Especialidad', type: 'string', group: 'suplentes' }),
        defineField({ name: 'suplente2_nombre',       title: 'Miembro Suplente 2 — Nombre',       type: 'string', group: 'suplentes' }),
        defineField({ name: 'suplente2_especialidad', title: 'Miembro Suplente 2 — Especialidad', type: 'string', group: 'suplentes' }),

        // ── MARCO LEGAL ────────────────────────────────────────────
        defineField({
            name: 'reglamento',
            title: 'Reglamento del Tribunal',
            type: 'text',
            rows: 10,
            group: 'legal',
        }),
        defineField({
            name: 'archivoReglamento',
            title: 'Reglamento en PDF (descargable)',
            type: 'file',
            group: 'legal',
        }),
        defineField({
            name: 'contactoTribunal',
            title: 'Email de contacto del Tribunal',
            type: 'string',
            group: 'legal',
        }),

        // ── RESOLUCIONES ───────────────────────────────────────
        defineField({
            name: 'resoluciones',
            title: 'Resoluciones del Tribunal',
            type: 'array',
            group: 'resoluciones',
            of: [
                {
                    type: 'object',
                    preview: {
                        select: { title: 'numero', subtitle: 'fecha' },
                        prepare({ title, subtitle }) {
                            return {
                                title: title ? `Resolución ${title}` : 'Sin número',
                                subtitle: subtitle ? new Date(subtitle).toLocaleDateString('es-AR') : '',
                            };
                        },
                    },
                    fields: [
                        { name: 'numero',    title: 'Número (Ej: 01/2024)',          type: 'string', validation: R => R.required() },
                        { name: 'fecha',     title: 'Fecha',                          type: 'date',   validation: R => R.required() },
                        { name: 'titulo',    title: 'Título / Asunto',                type: 'string', validation: R => R.required() },
                        { name: 'resumen',   title: 'Resumen del caso (anonimizado)', type: 'text', rows: 4 },
                        { name: 'normativa', title: 'Artículos / Normativa citada',   type: 'text', rows: 2 },
                        { name: 'archivo',   title: 'PDF de la resolución (opcional)', type: 'file' },
                    ],
                },
            ],
        }),
    ],
})
