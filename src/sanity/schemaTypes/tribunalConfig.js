import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'tribunalConfig',
    title: 'Configuración del Tribunal',
    type: 'document',
    __experimental_actions: ['update', 'publish'],
    fields: [
        defineField({
            name: 'miembros',
            title: 'Miembros del Tribunal',
            type: 'array',
            of: [
                {
                    type: 'object',
                    fields: [
                        { name: 'nombre', title: 'Nombre Completo', type: 'string' },
                        { name: 'cargo', title: 'Cargo', type: 'string' },
                    ]
                }
            ]
        }),
        defineField({
            name: 'reglamento',
            title: 'Reglamento',
            type: 'text',
            rows: 10,
        }),
    ],
})
