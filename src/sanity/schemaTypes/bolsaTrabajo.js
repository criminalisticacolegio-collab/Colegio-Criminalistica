import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'bolsaTrabajo',
  title: 'Bolsa de Trabajo',
  type: 'document',
  fields: [
    defineField({
      name: 'tipo',
      title: 'Tipo de publicación',
      type: 'string',
      options: {
        list: [
          { title: 'Oferente — Profesional disponible', value: 'oferente' },
          { title: 'Demandante — Organismo/Empresa busca perito', value: 'demandante' },
        ],
      },
      validation: Rule => Rule.required(),
    }),
    defineField({ name: 'nombre', title: 'Nombre / Organismo', type: 'string', validation: Rule => Rule.required() }),
    defineField({
      name: 'especialidades',
      title: 'Especialidades / Tipo de pericia',
      type: 'array',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'jurisdiccion',
      title: 'Jurisdicción',
      type: 'string',
    }),
    defineField({
      name: 'modalidad',
      title: 'Modalidad',
      type: 'string',
      options: {
        list: [
          { title: 'Presencial', value: 'presencial' },
          { title: 'Virtual', value: 'virtual' },
          { title: 'Mixta', value: 'mixta' },
        ],
      },
    }),
    defineField({ name: 'contacto', title: 'Contacto (email o teléfono)', type: 'string' }),
    defineField({ name: 'descripcion', title: 'Descripción / Detalles', type: 'text', rows: 3 }),
    defineField({ name: 'matricula', title: 'N° Matrícula (si es matriculado del Colegio)', type: 'string' }),
    defineField({ name: 'fechaPublicacion', title: 'Fecha de publicación', type: 'date' }),
    defineField({ name: 'activo', title: 'Publicación activa', type: 'boolean', initialValue: true }),
  ],
  preview: {
    select: { title: 'nombre', subtitle: 'tipo', description: 'jurisdiccion' },
    prepare({ title, subtitle, description }) {
      const label = subtitle === 'oferente' ? '👤 Oferente' : '🏢 Demandante'
      return { title: title || 'Sin nombre', subtitle: `${label}${description ? ' · ' + description : ''}` }
    },
  },
})
