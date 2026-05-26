import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'configuracionCobros',
    title: 'Configuración de Cobros',
    type: 'document',
    groups: [
        { name: 'valores',    title: '💰 Valores y Promociones' },
        { name: 'plataforma', title: '🔗 Plataforma de Cobros' },
    ],
    fields: [
        defineField({
            name: 'valorCuotaMensual',
            title: 'Valor Cuota Mensual',
            type: 'number',
            validation: Rule => Rule.required(),
            group: 'valores',
        }),
        defineField({
            name: 'valorMatriculaAnual',
            title: 'Valor Matrícula Anual',
            type: 'number',
            validation: Rule => Rule.required(),
            group: 'valores',
        }),
        defineField({
            name: 'promocionAnualActiva',
            title: 'Promoción Anual Activa',
            type: 'boolean',
            initialValue: false,
            group: 'valores',
        }),

        // ── PLATAFORMA DE COBROS ───────────────────────────────────
        defineField({
            name: 'plataformaNombre',
            title: 'Plataforma de cobros',
            type: 'string',
            description: 'Ej: MercadoPago, Modo, transferencia bancaria, etc.',
            group: 'plataforma',
        }),
        defineField({
            name: 'linkCuotaMensual',
            title: 'Enlace de pago — Cuota Mensual',
            type: 'url',
            description: 'URL del botón de pago generado en tu plataforma. Si está cargado, el sistema lo usa directamente.',
            group: 'plataforma',
        }),
        defineField({
            name: 'linkMatriculaAnual',
            title: 'Enlace de pago — Matrícula Anual',
            type: 'url',
            description: 'URL del botón de pago generado en tu plataforma. Si está cargado, el sistema lo usa directamente.',
            group: 'plataforma',
        }),
    ],
})
