import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'inscripcionCurso',
    title: 'Inscripción a Curso',
    type: 'document',
    fields: [
        defineField({ name: 'cursoId',       title: 'ID del Curso (key)',       type: 'string',   readOnly: true }),
        defineField({ name: 'cursoNombre',   title: 'Nombre del Curso',         type: 'string',   readOnly: true }),
        defineField({ name: 'nombreCompleto',title: 'Nombre y Apellido',        type: 'string' }),
        defineField({ name: 'dni',           title: 'DNI',                      type: 'string' }),
        defineField({ name: 'email',         title: 'Email',                    type: 'string' }),
        defineField({ name: 'telefono',      title: 'Teléfono',                 type: 'string' }),
        defineField({ name: 'profesion',        title: 'Profesión / Título',      type: 'string' }),
        defineField({ name: 'institucion',      title: 'Institución / Organismo', type: 'string' }),
        defineField({ name: 'cargo',            title: 'Cargo',                   type: 'string' }),
        defineField({ name: 'numeroMatricula',  title: 'N° Matrícula (opcional)', type: 'string' }),
        defineField({
            name: 'tipoInscripto',
            title: 'Tipo de Inscripto',
            type: 'string',
            options: {
                list: [
                    { title: '🎓 Matriculado activo', value: 'matriculado' },
                    { title: '👤 Público general',    value: 'publico' },
                    { title: '⏳ Pre-inscripto',      value: 'preinscripto' },
                ],
            },
        }),
        defineField({ name: 'precioAbonado', title: 'Precio Abonado ($)', type: 'number', readOnly: true }),
        defineField({
            name: 'estadoPago',
            title: 'Estado del Pago',
            type: 'string',
            initialValue: 'pendiente',
            options: {
                list: [
                    { title: '🆓 Gratuito',  value: 'gratuito' },
                    { title: '✅ Aprobado',  value: 'aprobado' },
                    { title: '⏳ Pendiente', value: 'pendiente' },
                    { title: '❌ Rechazado', value: 'rechazado' },
                ],
            },
        }),
        defineField({ name: 'fechaInscripcion', title: 'Fecha de Inscripción', type: 'datetime', readOnly: true }),
        defineField({ name: 'accesoEnviado',    title: 'Email de acceso enviado', type: 'boolean', readOnly: true }),
        defineField({ name: 'fechaEnvioAcceso', title: 'Fecha de envío del acceso', type: 'datetime', readOnly: true }),
    ],
    preview: {
        select: { title: 'nombreCompleto', subtitle: 'cursoNombre' },
        prepare({ title, subtitle }) {
            return { title: title || 'Sin nombre', subtitle: subtitle || 'Sin curso' };
        },
    },
})
