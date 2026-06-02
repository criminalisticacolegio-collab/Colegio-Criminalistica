import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'noticiasConfig',
    title: 'Noticias y Novedades',
    type: 'document',
    __experimental_actions: ['update', 'publish'],
    fields: [
        defineField({
            name: 'textoPrincipal',
            title: 'Texto introductorio de la sección',
            type: 'text',
            rows: 3,
        }),

        defineField({
            name: 'novedades',
            title: 'Novedades',
            type: 'array',
            of: [
                {
                    type: 'object',
                    preview: {
                        select: {
                            title: 'titulo',
                            subtitle: 'fecha',
                            media: 'imagen',
                            destacado: 'destacado',
                            publicado: 'publicado',
                        },
                        prepare({ title, subtitle, media, destacado, publicado }) {
                            const estado = publicado === false ? ' [oculta]' : destacado ? ' ⭐' : '';
                            return {
                                title: (title || 'Sin título') + estado,
                                subtitle: subtitle
                                    ? new Date(subtitle).toLocaleDateString('es-AR')
                                    : 'Sin fecha',
                                media,
                            };
                        },
                    },
                    fields: [
                        {
                            name: 'publicado',
                            title: 'Publicado',
                            type: 'boolean',
                            initialValue: true,
                            description: 'Desactivar para ocultar sin borrar',
                        },
                        {
                            name: 'destacado',
                            title: '⭐ Destacado en Inicio',
                            type: 'boolean',
                            initialValue: false,
                            description: 'Activar para que aparezca en el slider de la página principal',
                        },
                        {
                            name: 'titulo',
                            title: 'Título',
                            type: 'string',
                            validation: Rule => Rule.required(),
                        },
                        {
                            name: 'bajada',
                            title: 'Resumen / Bajada',
                            type: 'text',
                            rows: 3,
                        },
                        {
                            name: 'fecha',
                            title: 'Fecha de Publicación',
                            type: 'date',
                            validation: Rule => Rule.required(),
                        },
                        {
                            name: 'imagen',
                            title: 'Imagen principal',
                            type: 'image',
                            options: { hotspot: true },
                        },
                        {
                            name: 'galeria',
                            title: 'Galería de fotos (hasta 5)',
                            type: 'array',
                            of: [{ type: 'image', options: { hotspot: true } }],
                            validation: Rule => Rule.max(5),
                            description: 'Fotos adicionales para el carrusel. La imagen principal siempre aparece primero.',
                        },
                        {
                            name: 'link',
                            title: 'Enlace externo (opcional)',
                            type: 'url',
                            description: 'Si la novedad apunta a una página externa o resolución',
                        },
                        {
                            name: 'archivo',
                            title: 'Archivo adjunto (PDF, etc.)',
                            type: 'file',
                            description: 'Resoluciones, circulares, comunicados',
                        },
                        {
                            name: 'categoria',
                            title: 'Categoría',
                            type: 'string',
                            options: {
                                list: [
                                    { title: 'Institucional', value: 'Institucional' },
                                    { title: 'Resolución', value: 'Resolucion' },
                                    { title: 'Capacitación', value: 'Capacitacion' },
                                    { title: 'Convocatoria', value: 'Convocatoria' },
                                    { title: 'General', value: 'General' },
                                ],
                            },
                            initialValue: 'General',
                        },
                    ],
                },
            ],
        }),
    ],
})
