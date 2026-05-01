export default {
  name: 'tramites_y_proyectos',
  title: 'Trámites y Proyectos',
  type: 'document',
  fields: [
    {
      name: 'titulo',
      title: 'Título del Trámite o Proyecto',
      type: 'string',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'descripcion',
      title: 'Descripción Detallada',
      type: 'text',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'categoria',
      title: 'Categoría',
      type: 'string',
      options: {
        list: [
          { title: 'Trámite Administrativo', value: 'admin' },
          { title: 'Proyecto de Ley / Norma', value: 'proyecto' },
          { title: 'Gestión Institucional', value: 'gestion' },
        ],
      },
    },
    {
      name: 'archivo',
      title: 'Documento Adjunto (PDF)',
      type: 'file',
      options: {
        accept: '.pdf',
      },
    },
    {
      name: 'imagen',
      title: 'Imagen de Referencia',
      type: 'image',
      options: {
        hotspot: true,
      },
    },
  ],
};
