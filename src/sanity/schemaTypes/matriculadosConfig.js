import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'matriculadosConfig',
    title: 'Configuración de Matriculados',
    type: 'document',
    __experimental_actions: ['update', 'publish'],
    fields: [
        defineField({
            name: 'titulo',
            title: 'Título de la Sección',
            type: 'string',
        }),
        defineField({
            name: 'descripcion',
            title: 'Texto Descriptivo',
            type: 'text',
            rows: 4,
        }),
        defineField({
            name: 'requisitos',
            title: 'Requisitos de Matriculación',
            type: 'text',
            rows: 10,
        }),
    ],
})
