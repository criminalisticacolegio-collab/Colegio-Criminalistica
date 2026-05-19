import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'matriculado',
    title: 'Matriculados',
    type: 'document',
    fields: [
        defineField({
            name: 'numeroMatricula',
            title: 'Número de Matrícula',
            type: 'string',
            description: 'Ej: MP-1024',
            validation: Rule => Rule.required(),
        }),
        defineField({
            name: 'email',
            title: 'Email (Primary Key)',
            type: 'string',
            validation: Rule => Rule.required().email(),
        }),
        defineField({
            name: 'nombreCompleto',
            title: 'Nombre Completo',
            type: 'string',
            validation: Rule => Rule.required(),
        }),
        defineField({
            name: 'estado',
            title: 'Estado',
            type: 'string',
            options: {
                list: [
                    { title: 'Activo', value: 'Activo' },
                    { title: 'Suspendido', value: 'Suspendido' },
                    { title: 'Baja', value: 'Baja' },
                ],
            },
            validation: Rule => Rule.required(),
        }),
        defineField({
            name: 'jurisdiccion',
            title: 'Jurisdicción',
            type: 'reference',
            to: [{ type: 'jurisdiccion' }],
            description: 'Crucial para los filtros',
            validation: Rule => Rule.required(),
        }),
        defineField({
            name: 'especialidad',
            title: 'Especialidad',
            type: 'reference',
            to: [{ type: 'especialidad' }],
            description: 'Crucial para los filtros',
            validation: Rule => Rule.required(),
        }),
        defineField({
            name: 'foto',
            title: 'Foto Profesional',
            type: 'image',
            options: { hotspot: true },
            description: 'Se usa en la página Institucional y Tribunal si la persona ocupa un cargo',
        }),
        defineField({
            name: 'accesoEnviado',
            title: 'Email de acceso enviado',
            type: 'boolean',
            description: 'Activado automáticamente cuando se envía el email de bienvenida.',
            readOnly: true,
        }),
        defineField({
            name: 'fechaEnvioAcceso',
            title: 'Fecha de envío del acceso',
            type: 'date',
            description: 'Fecha en que se envió el email de bienvenida con el link de acceso.',
            readOnly: true,
        }),
    ],
    preview: {
        select: {
            title: 'nombreCompleto',
            subtitle: 'numeroMatricula',
        },
    },
})
