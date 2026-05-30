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
            name: 'firebaseUid',
            title: 'Firebase UID',
            type: 'string',
            description: 'Generado automáticamente por el sistema. No editar.',
            readOnly: true,
            hidden: true,
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
                    { title: 'Inactivo / Suspendido', value: 'Suspendido' },
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

        // ── Historial de Pagos ────────────────────────────────
        defineField({
            name: 'historialPagos',
            title: 'Historial de Pagos',
            description: 'Registro mensual de cuotas. Al cargar 3 meses pendientes consecutivos el sistema suspende la matrícula automáticamente.',
            type: 'array',
            of: [
                {
                    type: 'object',
                    preview: {
                        select: { title: 'mes', subtitle: 'anio', media: 'estado' },
                        prepare({ title, subtitle }) {
                            return { title: `${title} ${subtitle}` };
                        },
                    },
                    fields: [
                        {
                            name: 'anio',
                            title: 'Año',
                            type: 'number',
                            description: 'Ej: 2025',
                            validation: R => R.required().integer().min(2020).max(2099),
                        },
                        {
                            name: 'mes',
                            title: 'Mes',
                            type: 'string',
                            options: {
                                list: [
                                    'Enero','Febrero','Marzo','Abril','Mayo','Junio',
                                    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
                                ],
                            },
                            validation: R => R.required(),
                        },
                        {
                            name: 'estado',
                            title: 'Estado',
                            type: 'string',
                            initialValue: 'pendiente',
                            options: {
                                list: [
                                    { title: '✅ Pagado', value: 'pagado' },
                                    { title: '⏳ Pendiente', value: 'pendiente' },
                                ],
                                layout: 'radio',
                            },
                            validation: R => R.required(),
                        },
                        {
                            name: 'fechaPago',
                            title: 'Fecha de pago',
                            type: 'date',
                            description: 'Completar solo si el estado es "Pagado".',
                            options: { dateFormat: 'DD/MM/YYYY' },
                        },
                        {
                            name: 'montoAbonado',
                            title: 'Monto abonado ($)',
                            type: 'number',
                        },
                        {
                            name: 'comprobante',
                            title: 'Comprobante (URL)',
                            type: 'url',
                            description: 'Link al comprobante de pago (opcional).',
                        },
                        {
                            name: 'nota',
                            title: 'Nota interna',
                            type: 'string',
                            description: 'Aclaración para uso administrativo.',
                        },
                    ],
                },
            ],
        }),
    ],
    preview: {
        select: {
            title: 'nombreCompleto',
            subtitle: 'numeroMatricula',
        },
    },
})
