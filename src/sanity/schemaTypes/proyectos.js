import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'proyectos',
  title: 'Proyectos y Propuestas',
  type: 'document',
  fields: [
    defineField({
      name: 'titulo',
      title: 'Título',
      type: 'string',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'descripcion',
      title: 'Descripción / Objetivos',
      type: 'text',
      rows: 5,
    }),
    defineField({
      name: 'tipo',
      title: 'Tipo de propuesta',
      type: 'string',
      options: {
        list: [
          { title: 'Proyecto institucional', value: 'institucional' },
          { title: 'Sugerencia', value: 'sugerencia' },
          { title: 'Propuesta de mejora', value: 'mejora' },
          { title: 'Otro', value: 'otro' },
        ],
      },
      initialValue: 'sugerencia',
    }),
    defineField({ name: 'nombreRemitente', title: 'Nombre del Remitente', type: 'string' }),
    defineField({ name: 'emailRemitente', title: 'Email del Remitente', type: 'string' }),
    defineField({ name: 'matricula', title: 'N° Matrícula (opcional)', type: 'string' }),
    defineField({
      name: 'estado',
      title: 'Estado',
      type: 'string',
      options: {
        list: [
          { title: 'Recibido', value: 'Recibido' },
          { title: 'En análisis', value: 'En análisis' },
          { title: 'Aprobado', value: 'Aprobado' },
          { title: 'Rechazado', value: 'Rechazado' },
        ],
      },
      initialValue: 'Recibido',
    }),
    defineField({ name: 'fechaEnvio', title: 'Fecha de Envío', type: 'date' }),
    defineField({
      name: 'respuestaAdmin',
      title: 'Respuesta del Colegio (visible al público si Aprobado)',
      type: 'text',
      rows: 5,
    }),
    defineField({
      name: 'archivosAdjuntos',
      title: 'Archivos Adjuntos',
      type: 'array',
      of: [{ type: 'file' }],
      options: { layout: 'list' },
      validation: Rule => Rule.max(3).warning('Máximo 3 archivos adjuntos'),
    }),
  ],
  preview: {
    select: { title: 'titulo', subtitle: 'estado', description: 'nombreRemitente' },
    prepare({ title, subtitle, description }) {
      return { title: title || 'Sin título', subtitle: `${subtitle || 'Recibido'} — ${description || ''}` }
    },
  },
})
