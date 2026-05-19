import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'arancelProfesional',
    title: 'Aranceles Profesionales',
    type: 'document',
    fields: [
        defineField({
            name: 'servicio',
            title: 'Servicio',
            type: 'string',
            validation: Rule => Rule.required(),
        }),
        defineField({
            name: 'unidadesCP',
            title: 'Unidades CP',
            type: 'number',
            validation: Rule => Rule.required(),
        }),
        defineField({
            name: 'valorEstimado',
            title: 'Valor Estimado',
            type: 'number',
            validation: Rule => Rule.required(),
        }),
    ],
})
