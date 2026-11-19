export type FormatoExportacion = "pdf" | "csv";

/** Valor que puede devolver una columna para exportar. */
export type ValorCelda = string | number | boolean | Date | null | undefined;

/** Columna lista para exportar: ya sin JSX, solo etiqueta y cómo obtener el valor. */
export interface ColumnaExportable<T> {
  etiqueta: string;
  valor: (item: T) => ValorCelda;
}

/** Filtro aplicado que se muestra en el encabezado del PDF. */
export interface FiltroAplicado {
  etiqueta: string;
  valor: string;
}

export interface OpcionesExportacion<T> {
  formato: FormatoExportacion;
  titulo: string;
  columnas: ColumnaExportable<T>[];
  datos: T[];
  filtros?: FiltroAplicado[];
  /** Base del nombre del archivo. Si no se indica se usa el título. */
  nombreBase?: string;
}

/** Tabla ya normalizada a texto, común a CSV y PDF. */
export interface TablaExportable {
  encabezados: string[];
  filas: string[][];
}
