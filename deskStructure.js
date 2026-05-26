/**
 * Sanity Studio — Estructura del panel de administración
 * Organizada como espejo de la navegación del sitio web CPC CTM
 */

const singleton = (S, title, schemaType, icon = '⚙️') =>
  S.listItem()
    .title(`${icon} ${title}`)
    .schemaType(schemaType)
    .child(
      S.document()
        .title(title)
        .schemaType(schemaType)
        .documentId(schemaType)
    );

const listDocs = (S, title, schemaType, icon = '📋') =>
  S.listItem()
    .title(`${icon} ${title}`)
    .schemaType(schemaType)
    .child(
      S.documentTypeList(schemaType).title(title)
    );

export const deskStructure = (S) =>
  S.list()
    .title('Panel CPC CTM')
    .items([

      // ══════════════════════════════════════════════
      // 👥  PADRÓN OFICIAL
      // ══════════════════════════════════════════════
      S.listItem()
        .title('👥  Padrón Oficial')
        .child(
          S.list()
            .title('Padrón Oficial')
            .items([
              singleton(S, 'Configuración de la Página', 'padronConfig', '⚙️'),
              listDocs(S, 'Matriculados', 'matriculado', '👤'),
              listDocs(S, 'Jurisdicciones', 'jurisdiccion', '📍'),
              listDocs(S, 'Especialidades', 'especialidad', '🎓'),
            ])
        ),

      S.divider(),

      // ══════════════════════════════════════════════
      // 🆕  NUEVOS PROFESIONALES (Aspirantes)
      // ══════════════════════════════════════════════
      S.listItem()
        .title('🆕  Nuevos Profesionales')
        .child(
          S.list()
            .title('Nuevos Profesionales')
            .items([
              singleton(S, 'Configuración del Portal', 'matriculadosConfig', '⚙️'),
              listDocs(S, 'Solicitudes de Aspirantes', 'aspirante', '📋'),
            ])
        ),

      S.divider(),

      // ══════════════════════════════════════════════
      // 💳  MATRICULADOS (Área privada)
      // ══════════════════════════════════════════════
      S.listItem()
        .title('💳  Matriculados')
        .child(
          S.list()
            .title('Matriculados')
            .items([
              singleton(S, 'Configuración de Cobros y Pagos', 'configuracionCobros', '💳'),
            ])
        ),

      S.divider(),

      // ══════════════════════════════════════════════
      // 🏛️  INSTITUCIONAL
      // ══════════════════════════════════════════════
      singleton(S, '🏛️  Institucional', 'institucionalConfig', ''),

      S.divider(),

      // ══════════════════════════════════════════════
      // 📰  NOTICIAS
      // ══════════════════════════════════════════════
      singleton(S, '📰  Noticias y Novedades', 'noticiasConfig', ''),

      // ══════════════════════════════════════════════
      // 🎓  CAPACITACIONES
      // ══════════════════════════════════════════════
      S.listItem()
        .title('🎓  Formación Profesional')
        .child(
          S.list()
            .title('Formación Profesional')
            .items([
              singleton(S, 'Configuración del Campus', 'capacitacionConfig', '⚙️'),
              listDocs(S, 'Inscriptos por curso', 'inscripcionCurso', '📋'),
            ])
        ),

      // ══════════════════════════════════════════════
      // 📚  BIBLIOTECA
      // ══════════════════════════════════════════════
      singleton(S, '📚  Biblioteca Digital', 'bibliotecaConfig', ''),

      // ══════════════════════════════════════════════
      // ⚖️  GESTIÓN Y TRANSPARENCIA
      // ══════════════════════════════════════════════
      singleton(S, '⚖️  Gestión y Transparencia', 'gestionConfig', ''),

      // ══════════════════════════════════════════════
      // 🔨  TRIBUNAL DE DISCIPLINA
      // ══════════════════════════════════════════════
      singleton(S, '🔨  Tribunal de Disciplina', 'tribunalConfig', ''),

      S.divider(),

      // ══════════════════════════════════════════════
      // 💼  BOLSA DE TRABAJO
      // ══════════════════════════════════════════════
      S.listItem()
        .title('💼  Bolsa de Trabajo')
        .child(
          S.list()
            .title('Bolsa de Trabajo')
            .items([
              listDocs(S, 'Oferentes (profesionales disponibles)', 'bolsaTrabajo', '👤'),
              listDocs(S, 'Demandantes (organismos/empresas)', 'bolsaTrabajo', '🏢'),
            ])
        ),

      // ══════════════════════════════════════════════
      // 🚀  PROYECTOS Y PROPUESTAS
      // ══════════════════════════════════════════════
      listDocs(S, '🚀  Proyectos y Propuestas', 'proyectos', ''),

      // ══════════════════════════════════════════════
      // 💰  ARANCELES
      // ══════════════════════════════════════════════
      S.listItem()
        .title('💰  Aranceles Profesionales')
        .child(
          S.list()
            .title('Aranceles')
            .items([
              singleton(S, 'Tabla y Calculadora (JUS)', 'arancelesConfig', '📊'),
              listDocs(S, 'Aranceles Profesionales (legacy)', 'arancelProfesional', '💰'),
            ])
        ),

      S.divider(),

      // ══════════════════════════════════════════════
      // 📞  CONTACTO
      // ══════════════════════════════════════════════
      singleton(S, '📞  Contacto', 'contactoConfig', ''),

      S.divider(),

      // ══════════════════════════════════════════════
      // 🏠  INICIO — TARJETAS
      // ══════════════════════════════════════════════
      singleton(S, '🏠  Inicio — Descripciones de Tarjetas', 'homeConfig', ''),

      S.divider(),

      // ══════════════════════════════════════════════
      // 🔒  ADMINISTRACIÓN INTERNA (no visible en el sitio)
      // ══════════════════════════════════════════════
      S.listItem()
        .title('🔒  Administración Interna')
        .child(
          S.list()
            .title('Administración Interna')
            .items([
              singleton(S, 'Mantenimiento del Sitio Web', 'mantenimientoConfig', '🛠️'),
              singleton(S, 'Configuración IA', 'configuracionIA', '🤖'),
            ])
        ),

    ]);
