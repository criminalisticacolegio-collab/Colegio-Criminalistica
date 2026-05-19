import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'mantenimientoConfig',
  title: 'Mantenimiento del Sitio Web',
  type: 'document',
  __experimental_actions: ['update', 'publish'],
  fields: [
    defineField({
      name: 'emailAdministrador',
      title: 'Email del administrador (para comprobantes)',
      type: 'string',
      description: 'Se usa como pagador en MercadoPago y aparece en el comprobante.',
    }),
    defineField({
      name: 'conceptos',
      title: 'Conceptos de Mantenimiento Mensual',
      type: 'array',
      description: 'Cada concepto activo se suma al total a pagar.',
      of: [
        {
          type: 'object',
          preview: {
            select: { title: 'nombre', subtitle: 'monto', active: 'activo' },
            prepare({ title, subtitle, active }) {
              const monto = subtitle
                ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(subtitle)
                : '—';
              return {
                title: `${active === false ? '⏸ ' : '✅ '}${title}`,
                subtitle: `${monto} / mes`,
              };
            },
          },
          fields: [
            {
              name: 'nombre',
              title: 'Concepto',
              type: 'string',
              validation: Rule => Rule.required(),
              description: 'Ej: Hosting Web, Plan Gemini Pro, Dominio .com.ar',
            },
            {
              name: 'descripcion',
              title: 'Descripción',
              type: 'string',
              description: 'Ej: Servidor Vercel Pro, Google AI API nivel 1',
            },
            {
              name: 'proveedor',
              title: 'Proveedor / Plataforma',
              type: 'string',
              description: 'Ej: Vercel, Google, NIC Argentina',
            },
            {
              name: 'monto',
              title: 'Monto mensual (ARS)',
              type: 'number',
              validation: Rule => Rule.min(0),
            },
            {
              name: 'activo',
              title: 'Incluir en el total',
              type: 'boolean',
              initialValue: true,
              description: 'Desactivar para excluirlo temporalmente sin borrarlo.',
            },
          ],
        },
      ],
    }),
    defineField({
      name: 'notas',
      title: 'Notas internas',
      type: 'text',
      rows: 4,
      description: 'Información interna sobre contratos, vencimientos, accesos, etc.',
    }),
  ],
})
