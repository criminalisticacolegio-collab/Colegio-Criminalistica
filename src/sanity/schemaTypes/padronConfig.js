import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'padronConfig',
    title: 'Configuración del Padrón',
    type: 'document',
    __experimental_actions: ['update', 'publish'],
    fields: [
        defineField({
            name: 'tituloBuscador',
            title: 'Título del Buscador',
            type: 'string',
        }),
        defineField({
            name: 'descripcion',
            title: 'Texto Descriptivo',
            type: 'text',
            rows: 4,
        }),
        defineField({
            name: 'advertenciasLegales',
            title: 'Advertencias Legales',
            type: 'text',
            rows: 6,
        }),
    ],
})
