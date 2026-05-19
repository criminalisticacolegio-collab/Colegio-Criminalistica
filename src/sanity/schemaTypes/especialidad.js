import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'especialidad',
    title: 'Especialidades',
    type: 'document',
    fields: [
        defineField({
            name: 'titulo',
            title: 'Título',
            type: 'string',
            description: 'Ej: Balística Forense',
            validation: Rule => Rule.required(),
        }),
        defineField({
            name: 'descripcion',
            title: 'Descripción',
            type: 'text',
        }),
    ],
})
