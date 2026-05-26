import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'bibliotecaConfig',
    title: 'Biblioteca Digital',
    type: 'document',
    __experimental_actions: ['update', 'publish'],
    fields: [
        defineField({
            name: 'descripcionGeneral',
            title: 'Descripción general de la Biblioteca',
            type: 'text',
            rows: 3,
        }),

        // Recursos descargables
        defineField({
            name: 'recursos',
            title: 'Recursos y Documentos',
            type: 'array',
            of: [
                {
                    type: 'object',
                    preview: {
                        select: { title: 'titulo', subtitle: 'categoria' },
                    },
                    fields: [
                        { name: 'titulo',       title: 'Título del recurso',   type: 'string', validation: Rule => Rule.required() },
                        { name: 'descripcion',  title: 'Descripción breve',    type: 'string' },
                        {
                            name: 'extracto',
                            title: 'Contenido para IA (resumen del documento)',
                            type: 'text',
                            rows: 5,
                            description: 'Pegá aquí un resumen o puntos clave. La IA usará esto para responder consultas.',
                        },
                        {
                            name: 'categoria',
                            title: 'Categoría',
                            type: 'string',
                            options: {
                                list: [
                                    { title: 'Legislación Provincial',      value: 'LegislacionProvincial' },
                                    { title: 'Legislación Nacional',        value: 'LegislacionNacional' },
                                    { title: 'Código Penal y Procesal',     value: 'CodigoPenal' },
                                    { title: 'Peritos y Prueba Judicial',   value: 'PeritosYPrueba' },
                                    { title: 'Ética y Disciplina',          value: 'EticaYDisciplina' },
                                    { title: 'Especialidades Forenses',     value: 'EspecialidadesForenses' },
                                    { title: 'Medicina Legal',              value: 'MedicinaLegal' },
                                    { title: 'Criminología',                value: 'Criminologia' },
                                    { title: 'Decretos y Reglamentaciones', value: 'Decretos' },
                                ],
                            },
                        },
                        {
                            name: 'tipoRecurso',
                            title: 'Tipo de recurso',
                            type: 'string',
                            options: {
                                list: [
                                    { title: '📄 Archivo PDF descargable', value: 'pdf' },
                                    { title: '🔗 Link externo',            value: 'enlace' },
                                    { title: '📚 Libro digital',           value: 'libro' },
                                ],
                                layout: 'radio',
                            },
                            initialValue: 'pdf',
                        },
                        {
                            name: 'colorCategoria',
                            title: 'Color de categoría',
                            type: 'string',
                            options: {
                                list: [
                                    { title: 'Azul — Legislación',       value: '#1a2d4a' },
                                    { title: 'Verde — Ética/Reglamentos', value: '#1a5c2a' },
                                    { title: 'Rojo — Disciplina',        value: '#8B1A1A' },
                                    { title: 'Dorado — General',         value: '#8B7355' },
                                    { title: 'Celeste — Criminología',   value: '#2c5f8a' },
                                ],
                                layout: 'radio',
                            },
                            initialValue: '#8B7355',
                        },
                        { name: 'icono',       title: 'Ícono representativo (emoji)', type: 'string', initialValue: '📄', description: 'Ej: 📋 ⚖️ 📖 🔍' },
                        { name: 'destacado',   title: 'Mostrar como recurso destacado (arriba)', type: 'boolean', initialValue: false },
                        { name: 'archivo',     title: 'Archivo (PDF, DOCX, etc.)',    type: 'file' },
                        {
                            name: 'linkExterno',
                            title: 'URL del recurso externo',
                            type: 'url',
                            description: 'Si el recurso está en otro sitio (SAIJ, InfoLEG, etc.)',
                        },
                    ],
                },
            ],
        }),
    ],
})
