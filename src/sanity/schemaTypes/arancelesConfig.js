import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'arancelesConfig',
  title: 'Aranceles — Tabla y Calculadora',
  type: 'document',
  __experimental_actions: ['update', 'publish'],
  fields: [
    defineField({
      name: 'valorJUS',
      title: 'Valor actual del JUS (en pesos)',
      type: 'number',
      description: 'Valor en $ de 1 JUS (Jornada Única de Salario). Se actualiza por resolución.',
      validation: Rule => Rule.required().positive(),
    }),
    defineField({
      name: 'vigenciaDesde',
      title: 'Vigente desde',
      type: 'date',
    }),
    defineField({
      name: 'nota',
      title: 'Nota aclaratoria',
      type: 'text',
      rows: 2,
      description: 'Ej: "Los honorarios son sugeridos. El profesional puede fijar un monto mayor."',
    }),
    defineField({
      name: 'items',
      title: 'Conceptos arancelarios',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'numero', title: 'N°', type: 'string' }),
            defineField({ name: 'concepto', title: 'Concepto', type: 'string', validation: Rule => Rule.required() }),
            defineField({
              name: 'categoria',
              title: 'Categoría',
              type: 'string',
              options: {
                list: [
                  { title: 'Cobertura de Gastos', value: 'cobertura' },
                  { title: 'Honorarios Periciales', value: 'honorarios' },
                ],
              },
              initialValue: 'honorarios',
            }),
            defineField({
              name: 'valorEnJUS',
              title: 'Valor en JUS',
              type: 'number',
              description: 'Cuántos JUS vale este concepto',
              validation: Rule => Rule.required().positive(),
            }),
            defineField({
              name: 'unidad',
              title: 'Unidad (opcional)',
              type: 'string',
              description: 'Ej: "por foto", "por hora", "por diligencia"',
            }),
          ],
          preview: {
            select: { title: 'concepto', subtitle: 'valorEnJUS', description: 'categoria' },
            prepare({ title, subtitle, description }) {
              return { title: title || '—', subtitle: `${subtitle} JUS · ${description}` }
            },
          },
        },
      ],
    }),
  ],
})
