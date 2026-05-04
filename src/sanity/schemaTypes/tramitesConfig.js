import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'tramitesConfig',
    title: 'Configuración de Trámites',
    type: 'document',
    __experimental_actions: ['update', 'publish'],
    fields: [
        defineField({
            name: 'tramitesDisponibles',
            title: 'Listado de Trámites Disponibles',
            type: 'array',
            of: [
                {
                    type: 'object',
                    fields: [
                        { name: 'nombre', title: 'Nombre del Trámite', type: 'string' },
                        { name: 'descripcion', title: 'Descripción', type: 'text', rows: 3 },
                        { name: 'requisitos', title: 'Requisitos Específicos', type: 'text', rows: 4 },
                        { name: 'arancel', title: 'Costo/Arancel', type: 'string' },
                    ]
                }
            ]
        }),
        defineField({
            name: 'requisitosGenerales',
            title: 'Requisitos Generales de Trámites',
            type: 'text',
            rows: 6,
        }),
    ],
})
