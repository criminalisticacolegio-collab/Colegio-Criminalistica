import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'capacitacionConfig',
    title: 'Formación Profesional',
    type: 'document',
    __experimental_actions: ['update', 'publish'],
    fields: [
        defineField({
            name: 'descripcion',
            title: 'Descripción de la sección',
            type: 'text',
            rows: 3,
        }),

        // ── Curso Destacado ───────────────────────────────────────
        defineField({
            name: 'cursoDestacado',
            title: 'Curso Destacado (Hero superior)',
            type: 'object',
            fields: [
                {
                    name: 'activo',
                    title: 'Mostrar curso destacado',
                    type: 'boolean',
                    initialValue: false,
                },
                {
                    name: 'badge',
                    title: 'Badge (ej: "En Vivo", "Nuevo", "Próximo")',
                    type: 'string',
                    initialValue: 'Destacado',
                },
                {
                    name: 'titulo',
                    title: 'Título del Curso',
                    type: 'string',
                },
                {
                    name: 'descripcion',
                    title: 'Descripción',
                    type: 'text',
                    rows: 3,
                },
                {
                    name: 'videoUrl',
                    title: 'URL del Video (YouTube o Vimeo)',
                    type: 'url',
                    description: 'Ej: https://www.youtube.com/watch?v=XXXXX o https://vimeo.com/XXXXX',
                },
                {
                    name: 'duracion',
                    title: 'Duración total',
                    type: 'string',
                    placeholder: 'Ej: 40hs',
                },
                {
                    name: 'modulos',
                    title: 'Cantidad de Módulos',
                    type: 'number',
                },
                {
                    name: 'caracteristicas',
                    title: 'Características (aparecen con ✅)',
                    type: 'array',
                    of: [{ type: 'string' }],
                    description: 'Ej: "40 Horas de contenido", "Certificación oficial"',
                },
            ],
        }),

        // ── Cursos y Seminarios ───────────────────────────────────
        defineField({
            name: 'cursos',
            title: 'Cursos y Seminarios',
            type: 'array',
            of: [
                {
                    type: 'object',
                    preview: {
                        select: { title: 'titulo', subtitle: 'categoria', media: 'imagen' },
                    },
                    fields: [
                        {
                            name: 'activo',
                            title: 'Publicado',
                            type: 'boolean',
                            initialValue: true,
                            description: 'Desactivar para ocultar sin borrar',
                        },
                        {
                            name: 'titulo',
                            title: 'Título del Curso',
                            type: 'string',
                        },
                        {
                            name: 'descripcion',
                            title: 'Descripción breve',
                            type: 'text',
                            rows: 2,
                        },
                        {
                            name: 'imagen',
                            title: 'Imagen de portada',
                            type: 'image',
                            options: { hotspot: true },
                        },
                        {
                            name: 'videoUrl',
                            title: 'URL del Video (YouTube o Vimeo)',
                            type: 'url',
                            description: 'Si tiene video, aparece el botón ▶ Ver Video en la tarjeta',
                        },
                        {
                            name: 'duracion',
                            title: 'Duración',
                            type: 'string',
                            placeholder: 'Ej: 15hs',
                        },
                        {
                            name: 'modulos',
                            title: 'Cantidad de Módulos',
                            type: 'number',
                        },
                        {
                            name: 'categoria',
                            title: 'Categoría',
                            type: 'string',
                            options: {
                                list: [
                                    { title: 'Pericial', value: 'Pericial' },
                                    { title: 'Legal', value: 'Legal' },
                                    { title: 'Técnico', value: 'Técnico' },
                                    { title: 'Digital', value: 'Digital' },
                                ],
                            },
                        },
                        {
                            name: 'orden',
                            title: 'Orden de aparición',
                            type: 'number',
                            initialValue: 99,
                        },

                        // ── Inscripción ───────────────────────────────
                        {
                            name: 'tipoAcceso',
                            title: 'Tipo de Acceso',
                            type: 'string',
                            initialValue: 'gratuito',
                            options: {
                                list: [
                                    { title: 'Gratuito', value: 'gratuito' },
                                    { title: 'Pago', value: 'pago' },
                                ],
                                layout: 'radio',
                            },
                        },
                        {
                            name: 'precioNormal',
                            title: 'Precio Normal ($)',
                            type: 'number',
                            description: 'Requerido para cursos pagos',
                        },
                        {
                            name: 'precioMatriculado',
                            title: 'Precio Matriculado ($)',
                            type: 'number',
                            description: 'Puede ser 0 para gratuito. Requerido para pago_matriculados',
                        },
                        {
                            name: 'cupoMaximo',
                            title: 'Cupo máximo (opcional)',
                            type: 'number',
                            description: 'Dejar vacío para cupo ilimitado',
                        },
                        {
                            name: 'fechaLimiteInscripcion',
                            title: 'Fecha límite de inscripción (opcional)',
                            type: 'datetime',
                            options: { dateFormat: 'DD/MM/YYYY', timeFormat: 'HH:mm' },
                        },
                        {
                            name: 'linkPagoExterno',
                            title: 'Link de pago externo (opcional)',
                            type: 'url',
                            description: 'Si se ingresa, el botón "Inscribirse" redirige directamente a este link (ej: link.mercadopago.com.ar/...). Tiene prioridad sobre el pago automático por API.',
                        },
                        {
                            name: 'linkPagoMatriculado',
                            title: 'Link de pago — Matriculados',
                            type: 'url',
                            description: 'Link de MercadoPago con precio especial para matriculados del CPCC.',
                        },
                        {
                            name: 'linkPagoPublico',
                            title: 'Link de pago — Público general',
                            type: 'url',
                            description: 'Link de MercadoPago con precio de lista para el público en general.',
                        },
                        {
                            name: 'linkClassroom',
                            title: 'Link de acceso — Google Classroom',
                            type: 'url',
                            description: 'Pegá el enlace de invitación del curso en Google Classroom. Se envía automáticamente al inscripto.',
                        },
                        {
                            name: 'codigoClassroom',
                            title: 'Código del aula (Google Classroom)',
                            type: 'string',
                            description: 'Código de 6-7 caracteres del aula (ej: abc1234). Alternativa al link para unirse a la clase.',
                        },
                        {
                            name: 'fechaInicio',
                            title: 'Fecha de inicio',
                            type: 'date',
                            options: { dateFormat: 'DD/MM/YYYY' },
                        },
                        {
                            name: 'fechaCierre',
                            title: 'Fecha de cierre de inscripción (opcional)',
                            type: 'date',
                            options: { dateFormat: 'DD/MM/YYYY' },
                        },
                        {
                            name: 'proximamente',
                            title: 'Próximamente (aún no disponible)',
                            type: 'boolean',
                            initialValue: false,
                            description: 'Si está activo, muestra badge "PRÓXIMAMENTE" y solo permite pre-inscripción.',
                        },
                        {
                            name: 'inscriptosActivos',
                            title: 'Inscriptos activos (contador)',
                            type: 'number',
                            readOnly: true,
                            initialValue: 0,
                        },
                    ],
                },
            ],
        }),

        // ── Centros Criminalísticos de Referencia ─────────────────
        defineField({
            name: 'centrosForenses',
            title: 'Centros Criminalísticos de Referencia',
            type: 'array',
            description: 'Links externos a instituciones de referencia para ampliar la formación profesional.',
            of: [
                {
                    type: 'object',
                    preview: { select: { title: 'nombre', subtitle: 'url' } },
                    fields: [
                        { name: 'nombre',      title: 'Nombre de la institución', type: 'string', validation: R => R.required() },
                        { name: 'descripcion', title: 'Descripción breve',        type: 'string' },
                        { name: 'url',         title: 'URL del sitio',            type: 'url', validation: R => R.required() },
                        { name: 'icono',       title: 'Ícono (emoji)',            type: 'string', initialValue: '🔬' },
                    ],
                },
            ],
        }),

        // ── Materiales Descargables ───────────────────────────────
        defineField({
            name: 'materiales',
            title: 'Materiales Descargables',
            type: 'array',
            of: [
                {
                    type: 'object',
                    preview: {
                        select: { title: 'titulo', subtitle: 'descripcion' },
                    },
                    fields: [
                        {
                            name: 'titulo',
                            title: 'Título del Material',
                            type: 'string',
                        },
                        {
                            name: 'descripcion',
                            title: 'Descripción corta',
                            type: 'string',
                        },
                        {
                            name: 'icono',
                            title: 'Ícono (emoji)',
                            type: 'string',
                            initialValue: '📄',
                        },
                        {
                            name: 'archivo',
                            title: 'Archivo',
                            type: 'file',
                            description: 'PDF, ZIP, DOCX, etc.',
                        },
                    ],
                },
            ],
        }),
    ],
})
