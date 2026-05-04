import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'gestionConfig',
    title: 'Configuración de Gestión',
    type: 'document',
    __experimental_actions: ['update', 'publish'],
    fields: [
        defineField({
            name: 'textoInstitucional',
            title: 'Texto Institucional de Gestión',
            type: 'text',
            rows: 4,
        }),
        defineField({
            name: 'memorias',
            title: 'Memorias de Gestión',
            type: 'text',
            rows: 6,
        }),
        defineField({
            name: 'balances',
            title: 'Balances y Estados Contables',
            type: 'text',
            rows: 6,
        }),
    ],
})
