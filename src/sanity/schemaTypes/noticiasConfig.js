import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'noticiasConfig',
    title: 'Configuración de Noticias',
    type: 'document',
    __experimental_actions: ['update', 'publish'],
    fields: [
        defineField({
            name: 'textoPrincipal',
            title: 'Texto Principal de la Sección',
            type: 'text',
            rows: 4,
        }),
        defineField({
            name: 'novedades',
            title: 'Listado de Novedades',
            type: 'array',
            of: [
                {
                    type: 'object',
                    fields: [
                        { name: 'titulo', title: 'Título', type: 'string' },
                        { name: 'bajada', title: 'Bajada/Resumen', type: 'text', rows: 3 },
                        { name: 'fecha', title: 'Fecha de Publicación', type: 'date' },
                        { name: 'imagen', title: 'Imagen', type: 'image', options: { hotspot: true } },
                    ]
                }
            ]
        }),
    ],
})
