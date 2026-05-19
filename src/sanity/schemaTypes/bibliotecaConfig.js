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

        defineField({
            name: 'tituloBuscador',
            title: 'Título del Buscador de Leyes',
            type: 'string',
            initialValue: 'Buscador de Legislación',
        }),

        defineField({
            name: 'categoriasLeyes',
            title: 'Categorías del Buscador de Leyes',
            type: 'array',
            of: [{ type: 'string' }],
            description: 'Ej: "Procesal Penal", "Civil", "Peritos"',
        }),

        // Recursos descargables organizados por categoría
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
                        { name: 'titulo', title: 'Título del recurso', type: 'string', validation: Rule => Rule.required() },
                        { name: 'descripcion', title: 'Descripción breve', type: 'string' },
                        {
                            name: 'extracto',
                            title: 'Contenido para IA (extracto o resumen del documento)',
                            type: 'text',
                            rows: 5,
                            description: 'Pegá aquí un resumen o los puntos clave del documento. La IA usará esto para responder consultas sobre su contenido.',
                        },
                        {
                            name: 'categoria',
                            title: 'Categoría',
                            type: 'string',
                            options: {
                                list: [
                                    { title: 'Legislación', value: 'Legislacion' },
                                    { title: 'Protocolos', value: 'Protocolos' },
                                    { title: 'Formularios', value: 'Formularios' },
                                    { title: 'Guías Técnicas', value: 'Guias' },
                                    { title: 'Jurisprudencia', value: 'Jurisprudencia' },
                                    { title: 'Bibliografía', value: 'Bibliografia' },
                                ],
                            },
                        },
                        { name: 'icono', title: 'Ícono (emoji)', type: 'string', initialValue: '📄' },
                        { name: 'archivo', title: 'Archivo (PDF, DOCX, etc.)', type: 'file' },
                        {
                            name: 'linkExterno',
                            title: 'Enlace externo (si no es archivo propio)',
                            type: 'url',
                            description: 'Usar en lugar de archivo para links a SAIJ, Infoleg, etc.',
                        },
                        { name: 'destacado', title: 'Destacar en la página', type: 'boolean', initialValue: false },
                    ],
                },
            ],
        }),
    ],
})
