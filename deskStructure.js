export const deskStructure = (S) =>
  S.list()
    .title('Menú Principal')
    .items([
      // Grupo: Gestión de Matriculados
      S.listItem()
        .title('Gestión de Matriculados')
        .child(
          S.list()
            .title('Gestión de Matriculados')
            .items([
              // Singleton: matriculadosConfig
              S.listItem()
                .title('Configuración de Página')
                .schemaType('matriculadosConfig')
                .child(
                  S.document()
                    .title('Configuración de Página')
                    .schemaType('matriculadosConfig')
                    .documentId('matriculadosConfig')
                ),
              // Lista: aspirante
              S.listItem()
                .title('Legajos de Aspirantes')
                .schemaType('aspirante')
                .child(
                  S.documentTypeList('aspirante')
                    .title('Legajos de Aspirantes')
                ),
            ])
        ),

      // Separador
      S.divider(),

      // El resto de los documentos (filtramos los que ya pusimos arriba)
      ...S.documentTypeListItems().filter(
        (listItem) => !['matriculadosConfig', 'aspirante'].includes(listItem.getId())
      ),
    ]);
