import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'tramitesConfig',
    title: 'Trámites',
    type: 'document',
    __experimental_actions: ['update', 'publish'],
    fields: [
        defineField({
            name: 'requisitosGenerales',
            title: 'Requisitos Generales',
            type: 'text',
            rows: 5,
            description: 'Se muestran como intro antes del listado de trámites',
        }),

        defineField({
            name: 'tramitesDisponibles',
            title: 'Trámites Disponibles',
            type: 'array',
            of: [
                {
                    type: 'object',
                    preview: {
                        select: { title: 'nombre', subtitle: 'arancel' },
                        prepare({ title, subtitle }) {
                            return {
                                title: title || 'Sin nombre',
                                subtitle: subtitle ? `Arancel: ${subtitle}` : 'Sin arancel especificado',
                            };
                        },
                    },
                    fields: [
                        {
                            name: 'activo',
                            title: 'Activo',
                            type: 'boolean',
                            initialValue: true,
                        },
                        {
                            name: 'nombre',
                            title: 'Nombre del Trámite',
                            type: 'string',
                            validation: Rule => Rule.required(),
                        },
                        {
                            name: 'icono',
                            title: 'Ícono (emoji)',
                            type: 'string',
                            initialValue: '📋',
                        },
                        {
                            name: 'descripcion',
                            title: 'Descripción',
                            type: 'text',
                            rows: 3,
                        },
                        {
                            name: 'requisitos',
                            title: 'Requisitos Específicos',
                            type: 'array',
                            of: [{ type: 'string' }],
                            description: 'Lista de documentos o pasos requeridos',
                        },
                        {
                            name: 'arancel',
                            title: 'Costo / Arancel',
                            type: 'string',
                            placeholder: 'Ej: $5.000 o "Sin costo"',
                        },
                        {
                            name: 'plazo',
                            title: 'Plazo estimado',
                            type: 'string',
                            placeholder: 'Ej: 5 días hábiles',
                        },
                        {
                            name: 'formulario',
                            title: 'Formulario descargable',
                            type: 'file',
                        },
                        {
                            name: 'categoria',
                            title: 'Categoría',
                            type: 'string',
                            options: {
                                list: [
                                    { title: 'Matriculación', value: 'Matriculacion' },
                                    { title: 'Certificados', value: 'Certificados' },
                                    { title: 'Habilitaciones', value: 'Habilitaciones' },
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
