import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'configuracionIA',
    title: 'Configuración IA',
    type: 'document',
    __experimental_actions: ['update', 'publish'],
    fields: [
        defineField({
            name: 'activado',
            title: 'Analistas IA activos',
            type: 'boolean',
            description: 'Si está desactivado los analistas muestran "Servicio temporalmente no disponible"',
            initialValue: true,
        }),
        defineField({
            name: 'apiKey',
            title: 'API Key de IA',
            type: 'string',
            description: 'Clave de acceso al servicio de IA (Gemini, Claude, etc.)',
        }),
        defineField({
            name: 'proveedor',
            title: 'Proveedor de IA',
            type: 'string',
            options: {
                list: [
                    { title: 'Google Gemini', value: 'google' },
                    { title: 'Anthropic Claude', value: 'anthropic' },
                ],
                layout: 'radio',
            },
            initialValue: 'google',
        }),
        defineField({
            name: 'modelo',
            title: 'Modelo de IA',
            type: 'string',
            options: {
                list: [
                    { title: 'Gemini 2.0 Flash (gratuito)', value: 'gemini-2.0-flash' },
                    { title: 'Gemini 1.5 Flash (gratuito)', value: 'gemini-1.5-flash' },
                    { title: 'Gemini 1.5 Pro (pago)', value: 'gemini-1.5-pro' },
                    { title: 'Gemini 2.5 Pro (pago)', value: 'gemini-2.5-pro' },
                ],
                layout: 'radio',
            },
            initialValue: 'gemini-2.0-flash',
        }),
    ],
})
