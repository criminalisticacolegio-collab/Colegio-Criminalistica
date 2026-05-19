import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'aspirante',
    title: 'Aspirantes',
    type: 'document',
    fields: [
        defineField({
            name: 'nombre',
            title: 'Nombre',
            type: 'string',
        }),
        defineField({
            name: 'apellido',
            title: 'Apellido',
            type: 'string',
        }),
        defineField({
            name: 'dni',
            title: 'DNI',
            type: 'string',
        }),
        defineField({
            name: 'email',
            title: 'Correo Electrónico',
            type: 'string',
        }),
        defineField({
            name: 'tituloProfesional',
            title: 'Título Profesional',
            type: 'string',
        }),
        defineField({
            name: 'documentacion',
            title: 'Documentación',
            type: 'file',
            options: {
                accept: '.pdf,.doc,.docx,.jpg,.png'
            }
        }),
        defineField({
            name: 'cuil',
            type: 'string',
            title: 'CUIL/CUIT'
        }),
        defineField({
            name: 'telefono',
            type: 'string',
            title: 'Teléfono de Contacto'
        }),
        defineField({
            name: 'jurisdiccion',
            type: 'string',
            title: 'Jurisdicción de Ejercicio'
        }),
        defineField({
            name: 'archivoTitulo',
            type: 'file',
            title: 'Documento: Título Profesional'
        }),
        defineField({
            name: 'archivoDNI',
            type: 'file',
            title: 'Documento: DNI'
        }),
        defineField({
            name: 'archivoCertificado',
            type: 'file',
            title: 'Documento: Certificado de Antecedentes'
        }),
        defineField({
            name: 'archivoAntecedentes',
            type: 'file',
            title: 'Documento: Antecedentes Nacionales'
        }),
        defineField({
            name: 'archivoComprobante',
            type: 'file',
            title: 'Documento: Comprobante de Pago de Matrícula'
        }),
    ],
    preview: {
        select: {
            nombre: 'nombre',
            apellido: 'apellido',
        },
        prepare(selection) {
            const { nombre, apellido } = selection
            return {
                title: `${apellido}, ${nombre}`,
            }
        },
    },
})
