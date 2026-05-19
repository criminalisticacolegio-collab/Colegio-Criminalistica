import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'configuracionCobros',
    title: 'Configuración de Cobros',
    type: 'document',
    fields: [
        defineField({
            name: 'valorCuotaMensual',
            title: 'Valor Cuota Mensual',
            type: 'number',
            validation: Rule => Rule.required(),
        }),
        defineField({
            name: 'valorMatriculaAnual',
            title: 'Valor Matrícula Anual',
            type: 'number',
            validation: Rule => Rule.required(),
        }),
        defineField({
            name: 'promocionAnualActiva',
            title: 'Promoción Anual Activa',
            type: 'boolean',
            initialValue: false,
        }),
    ],
})
