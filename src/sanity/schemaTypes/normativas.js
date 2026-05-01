export default {
  name: 'normativas',
  title: 'Normativas',
  type: 'document',
  fields: [
    {
      name: 'titulo',
      title: 'Título de la Normativa',
      type: 'string',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'categoria',
      title: 'Categoría',
      type: 'string',
      options: {
        list: [
          { title: 'Leyes', value: 'leyes' },
          { title: 'Decretos', value: 'decretos' },
          { title: 'Resoluciones', value: 'resoluciones' },
          { title: 'Estatutos', value: 'estatutos' },
          { title: 'Actas', value: 'actas' },
        ],
      },
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'archivo',
      title: 'Archivo PDF',
      type: 'file',
      options: {
        accept: '.pdf',
      },
      validation: (Rule) => Rule.required(),
    },
  ],
};
