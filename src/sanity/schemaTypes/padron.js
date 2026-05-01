export default {
  name: 'padron',
  title: 'Padrón Profesional',
  type: 'document',
  fields: [
    {
      name: 'nombre',
      title: 'Nombre y Apellido',
      type: 'string',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'matricula',
      title: 'Número de Matrícula',
      type: 'string',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'jurisdiccion',
      title: 'Jurisdicción',
      type: 'string',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'estado',
      title: 'Estado de Matrícula',
      type: 'string',
      options: {
        list: [
          { title: 'Activo', value: 'activo' },
          { title: 'Inactivo', value: 'inactivo' },
          { title: 'Suspendido', value: 'suspendido' },
        ],
      },
      validation: (Rule) => Rule.required(),
    },
  ],
};
