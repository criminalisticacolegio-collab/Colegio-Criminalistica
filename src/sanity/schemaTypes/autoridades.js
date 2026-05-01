export default {
  name: 'autoridades',
  title: 'Autoridades',
  type: 'document',
  fields: [
    {
      name: 'primerNombre',
      title: 'Primer Nombre',
      type: 'string',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'segundoNombre',
      title: 'Segundo Nombre',
      type: 'string',
    },
    {
      name: 'apellido',
      title: 'Apellido',
      type: 'string',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'profesion',
      title: 'Profesión / Título',
      type: 'string',
    },
    {
      name: 'cargo',
      title: 'Cargo / Función',
      type: 'string',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'lista',
      title: 'Nombre de la Lista',
      type: 'string',
      description: 'Ej: Renovación y Transparencia Profesional',
    },
    {
      name: 'foto',
      title: 'Fotografía',
      type: 'image',
      options: {
        hotspot: true,
      },
      validation: (Rule) => Rule.required(),
    },
  ],
};
