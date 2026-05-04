import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'capacitacionConfig',
    title: 'Configuración de Capacitaciones',
    type: 'document',
    __experimental_actions: ['update', 'publish'],
    fields: [
        defineField({
            name: 'descripcion',
            title: 'Texto Descriptivo',
            type: 'text',
            rows: 4,
        }),
        defineField({
            name: 'cursos',
            title: 'Listado de Cursos',
            type: 'array',
            of: [
                {
                    type: 'object',
                    fields: [
                        { name: 'titulo', title: 'Título del Curso', type: 'string' },
                        { name: 'foto', title: 'Foto', type: 'image', options: { hotspot: true } },
                        { name: 'fecha', title: 'Fecha', type: 'date' },
                    ]
                }
            ]
        }),
    ],
})
