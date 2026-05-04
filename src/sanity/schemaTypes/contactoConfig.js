import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'contactoConfig',
    title: 'Configuración de Contacto',
    type: 'document',
    __experimental_actions: ['update', 'publish'],
    fields: [
        defineField({
            name: 'telefonos',
            title: 'Teléfonos de Contacto',
            type: 'array',
            of: [{ type: 'string' }],
        }),
        defineField({
            name: 'whatsapp',
            title: 'Número de WhatsApp',
            type: 'string',
        }),
        defineField({
            name: 'correo',
            title: 'Correo Electrónico',
            type: 'string',
        }),
        defineField({
            name: 'redesSociales',
            title: 'Redes Sociales',
            type: 'array',
            of: [
                {
                    type: 'object',
                    fields: [
                        { name: 'plataforma', title: 'Plataforma', type: 'string' },
                        { name: 'url', title: 'URL del Perfil', type: 'url' },
                    ]
                }
            ]
        }),
    ],
})
