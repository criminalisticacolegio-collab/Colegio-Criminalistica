import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'homeConfig',
    title: 'Inicio — Descripciones de Tarjetas',
    type: 'document',
    __experimental_actions: ['update', 'publish'],
    description: 'Cada campo controla el texto descriptivo de una tarjeta en la página de inicio. El orden aquí refleja el orden de aparición en el grid.',
    fields: [
        defineField({
            name: 'descInstitucional',
            title: '1 · Institucional',
            type: 'string',
            initialValue: 'Misión, visión y autoridades del Colegio.',
        }),
        defineField({
            name: 'descNuevosProfesionales',
            title: '2 · Nuevos Profesionales',
            type: 'string',
            initialValue: 'Solicitud de matrícula, carga de documentación y seguimiento de tu legajo.',
        }),
        defineField({
            name: 'descPadron',
            title: '3 · Padrón Oficial',
            type: 'string',
            initialValue: 'Buscador oficial de profesionales habilitados en la provincia.',
        }),
        defineField({
            name: 'descCapacitacion',
            title: '4 · Capacitaciones',
            type: 'string',
            initialValue: 'Cursos, videos formativos e inscripción a capacitaciones.',
        }),
        defineField({
            name: 'descGestion',
            title: '5 · Gestión y Transparencia',
            type: 'string',
            initialValue: 'Balances, memorias y evaluación institucional con inteligencia artificial.',
        }),
        defineField({
            name: 'descTribunal',
            title: '6 · Tribunal de Disciplina',
            type: 'string',
            initialValue: 'Resoluciones disciplinarias con análisis normativo por inteligencia artificial.',
        }),
        defineField({
            name: 'descNoticias',
            title: '7 · Noticias',
            type: 'string',
            initialValue: 'Novedades, comunicados institucionales y galería de eventos.',
        }),
        defineField({
            name: 'descBiblioteca',
            title: '8 · Biblioteca Legal',
            type: 'string',
            initialValue: 'Legislación, protocolos, normativa vigente y asistente jurídico IA.',
        }),
        defineField({
            name: 'descMatriculados',
            title: '9 · Matriculados',
            type: 'string',
            initialValue: 'Área privada: pagos, constancias y certificados profesionales.',
        }),
        defineField({
            name: 'descBolsaTrabajo',
            title: '10 · Bolsa de Trabajo',
            type: 'string',
            initialValue: 'Profesionales disponibles y organismos con búsquedas activas.',
        }),
        defineField({
            name: 'descProyectos',
            title: '11 · Proyectos y Propuestas',
            type: 'string',
            initialValue: 'Presentá iniciativas, proyectos e ideas para la institución.',
        }),
        defineField({
            name: 'descAranceles',
            title: '12 · Aranceles',
            type: 'string',
            initialValue: 'Calculadora de honorarios y tabla de aranceles basada en el valor JUS.',
        }),
    ],
})
