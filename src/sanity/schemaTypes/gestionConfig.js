import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'gestionConfig',
    title: 'Gestión y Transparencia',
    type: 'document',
    __experimental_actions: ['update', 'publish'],
    fields: [
        defineField({
            name: 'textoInstitucional',
            title: 'Texto introductorio de la sección',
            type: 'text',
            rows: 4,
        }),

        defineField({
            name: 'resultadoEjercicio',
            title: 'Resultado del Ejercicio (número en pesos)',
            description: 'Monto que se anima en la métrica del hero. Sin puntos ni comas (ej: 2000000).',
            type: 'number',
        }),

        defineField({
            name: 'anioEjercicio',
            title: 'Año del Ejercicio',
            description: 'Año que aparece en el label de la métrica (ej: 2024, 2025).',
            type: 'string',
        }),

        defineField({
            name: 'descripcionEjercicio',
            title: 'Descripción del resultado',
            description: 'Texto corto que explica qué representa el monto (ej: "Superávit contable certificado").',
            type: 'string',
        }),

        defineField({
            name: 'hitosGestion',
            title: 'Hitos de la Gestión (línea de tiempo)',
            description: 'Logros del período ordenados cronológicamente',
            type: 'array',
            of: [
                {
                    type: 'object',
                    preview: {
                        select: { title: 'titulo', subtitle: 'mes' },
                        prepare({ title, mes }) {
                            return { title: title || 'Sin título', subtitle: mes || '' };
                        },
                    },
                    fields: [
                        { name: 'mes',         title: 'Mes (ej: Jun)',        type: 'string', validation: Rule => Rule.required() },
                        { name: 'anio',        title: 'Año (ej: 2024)',       type: 'string', validation: Rule => Rule.required() },
                        { name: 'icono',       title: 'Ícono emoji',          type: 'string', description: 'Pegá un emoji: 🏛️ ⚖️ 🌐 📚 🎓 💼' },
                        { name: 'titulo',      title: 'Título del hito',      type: 'string', validation: Rule => Rule.required() },
                        { name: 'descripcion', title: 'Descripción breve',    type: 'string' },
                    ],
                },
            ],
        }),

        defineField({
            name: 'memorias',
            title: 'Memorias de Gestión',
            description: 'Documentos anuales de memoria de gestión',
            type: 'array',
            of: [
                {
                    type: 'object',
                    preview: {
                        select: { title: 'titulo', subtitle: 'anio' },
                        prepare({ title, anio }) {
                            return { title: title || 'Sin título', subtitle: anio ? `Año ${anio}` : '' };
                        },
                    },
                    fields: [
                        { name: 'titulo',      title: 'Título del documento', type: 'string', validation: Rule => Rule.required() },
                        { name: 'anio',        title: 'Año',                  type: 'number' },
                        { name: 'descripcion', title: 'Descripción breve',    type: 'string' },
                        { name: 'archivo',     title: 'Archivo PDF',          type: 'file', description: 'Sólo PDF' },
                    ],
                },
            ],
        }),

        defineField({
            name: 'balances',
            title: 'Balances y Estados Contables',
            description: 'Estados contables auditados',
            type: 'array',
            of: [
                {
                    type: 'object',
                    preview: {
                        select: { title: 'titulo', subtitle: 'periodo' },
                        prepare({ title, periodo }) {
                            return { title: title || 'Sin título', subtitle: periodo || '' };
                        },
                    },
                    fields: [
                        { name: 'titulo',      title: 'Título',         type: 'string', validation: Rule => Rule.required() },
                        { name: 'periodo',     title: 'Período (ej: 2025)', type: 'string' },
                        { name: 'descripcion', title: 'Descripción',    type: 'string' },
                        { name: 'archivo',     title: 'Archivo PDF',    type: 'file' },
                    ],
                },
            ],
        }),

        defineField({
            name: 'proyectos',
            title: 'Proyectos e Iniciativas',
            description: 'Proyectos institucionales y propuestas',
            type: 'array',
            of: [
                {
                    type: 'object',
                    preview: {
                        select: { title: 'titulo' },
                        prepare({ title }) { return { title: title || 'Sin título' }; },
                    },
                    fields: [
                        { name: 'titulo',      title: 'Título',          type: 'string', validation: Rule => Rule.required() },
                        { name: 'descripcion', title: 'Descripción',     type: 'string' },
                        { name: 'archivo',     title: 'Archivo PDF',     type: 'file' },
                    ],
                },
            ],
        }),

        defineField({
            name: 'resoluciones',
            title: 'Resoluciones del Consejo Directivo',
            type: 'array',
            of: [
                {
                    type: 'object',
                    preview: {
                        select: { title: 'numero', subtitle: 'descripcion' },
                        prepare({ title, subtitle }) {
                            return { title: `Res. ${title || 'S/N'}`, subtitle: subtitle || '' };
                        },
                    },
                    fields: [
                        { name: 'numero',      title: 'Número de Resolución', type: 'string' },
                        { name: 'fecha',       title: 'Fecha',                type: 'date' },
                        { name: 'descripcion', title: 'Descripción',          type: 'string' },
                        { name: 'archivo',     title: 'Archivo PDF',          type: 'file' },
                    ],
                },
            ],
        }),
    ],
})
