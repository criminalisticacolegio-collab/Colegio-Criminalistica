export default {
  name: 'configuracion_global',
  title: 'Configuración Global del Sitio',
  type: 'document',
  fields: [
    {
      name: 'logo_institucional',
      title: 'Logo Institucional',
      type: 'image',
      options: { hotspot: true },
    },
    {
      name: 'nombreColegio',
      title: 'Nombre del Colegio',
      type: 'string',
      initialValue: 'Colegio de Profesionales en Ciencias Criminalísticas de Catamarca',
    },
    {
      name: 'subtitulo_principal',
      title: 'Subtítulo Principal (Lema)',
      type: 'string',
      description: 'Frase que aparece debajo del título principal en la web.',
    },
    {
      name: 'direccion',
      title: 'Dirección Sede Central',
      type: 'string',
    },
    {
      name: 'telefonos',
      title: 'Teléfonos de Contacto',
      type: 'array',
      of: [{ type: 'string' }],
    },
    {
      name: 'email',
      title: 'Email Institucional',
      type: 'string',
    },
    {
      name: 'horarios',
      title: 'Horarios de Atención',
      type: 'string',
    },
    {
      name: 'redesSociales',
      title: 'Redes Sociales',
      type: 'object',
      fields: [
        { name: 'facebook', type: 'url', title: 'Facebook' },
        { name: 'instagram', type: 'url', title: 'Instagram' },
        { name: 'twitter', type: 'url', title: 'Twitter (X)' },
      ],
    },
  ],
};
