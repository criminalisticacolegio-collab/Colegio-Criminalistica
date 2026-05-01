export default {
  name: 'capacitaciones',
  title: 'Capacitaciones y Cursos',
  type: 'document',
  fields: [
    {
      name: 'nombre',
      title: 'Nombre del Curso o Evento',
      type: 'string',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'disertante',
      title: 'Disertante / Profesional a Cargo',
      type: 'string',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'fecha',
      title: 'Fecha del Evento',
      type: 'date',
    },
    {
      name: 'descripcion',
      title: 'Resumen o Temario',
      type: 'text',
    },
    {
      name: 'linkVideo',
      title: 'Enlace a Video o Plataforma LMS',
      type: 'url',
    },
    {
      name: 'material',
      title: 'Material Descargable (PDF/ZIP)',
      type: 'file',
    },
    {
      name: 'portada',
      title: 'Imagen de Portada',
      type: 'image',
      options: {
        hotspot: true,
      },
    },
  ],
};
