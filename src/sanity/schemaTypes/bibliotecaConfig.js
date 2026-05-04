import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'bibliotecaConfig',
    title: 'Configuración de Biblioteca',
    type: 'document',
    __experimental_actions: ['update', 'publish'],
    fields: [
        defineField({
            name: 'tituloBuscador',
            title: 'Título del Buscador de Leyes',
            type: 'string',
        }),
        defineField({
            name: 'categoriasLeyes',
            title: 'Categorías de Leyes',
            type: 'array',
            of: [{ type: 'string' }],
        }),
        defineField({
            name: 'descripcionGeneral',
            title: 'Descripción General',
            type: 'text',
            rows: 3,
        }),
    ],
})
