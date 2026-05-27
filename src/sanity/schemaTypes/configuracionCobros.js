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
            name: 'enlaceNuevoProfesional',
            title: 'Enlace de pago — Inscripción Nuevo Profesional',
            type: 'url',
            description: 'URL de Mercado Pago que tomará el sistema para los nuevos profesionales que realizan el pago de la matrícula inicial.',
            group: 'plataforma',
        }),
        defineField({
            name: 'enlaceCuotaMensual',
            title: 'Enlace de pago — Cuota Mensual',
            type: 'url',
            description: 'URL para los pagos mensuales de los ya matriculados que figuran en el padrón oficial en estado regular (menos de 3 cuotas adeudadas).',
            group: 'plataforma',
        }),
        defineField({
            name: 'enlacePagoAnual',
            title: 'Enlace de pago — Promoción Pago Anual',
            type: 'url',
            description: 'URL para los matriculados regulares en el padrón oficial que elijan aprovechar la promoción del pago anual.',
            group: 'plataforma',
        }),
    ],
})
