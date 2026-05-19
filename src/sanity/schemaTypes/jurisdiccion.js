import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'jurisdiccion',
    title: 'Jurisdicciones',
    type: 'document',
    fields: [
        defineField({
            name: 'titulo',
            title: 'Título',
            type: 'string',
            description: 'Ej: 1° Circunscripción (Capital)',
            validation: Rule => Rule.required(),
        }),
        defineField({
            name: 'numero',
            title: 'Número',
            type: 'number',
            description: 'Para ordenamiento',
        }),
        defineField({
            name: 'activa',
            title: 'Activa',
            type: 'boolean',
            initialValue: true,
        }),
    ],
})
