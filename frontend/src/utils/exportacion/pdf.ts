import type { FiltroAplicado, TablaExportable } from "./tipos";

interface OpcionesPdf {
  titulo: string;
  tabla: TablaExportable;
  filtros?: FiltroAplicado[];
  fecha?: Date;
}

const MARGEN = 12;

const dos = (n: number) => String(n).padStart(2, "0");
/** 09/11/2026 17:42 */
const fechaHora = (f: Date) =>
  `${dos(f.getDate())}/${dos(f.getMonth() + 1)}/${f.getFullYear()} ${dos(f.getHours())}:${dos(f.getMinutes())}`;
const COLOR_ENCABEZADO: [number, number, number] = [47, 133, 90]; // green.600

/**
 * Genera un PDF A4 con título, fecha, filtros aplicados, total de registros,
 * la tabla y "Página X de Y" al pie. jsPDF y autotable se cargan recién acá
 * (import dinámico) para no sumarlos al bundle inicial.
 */
export const generarPdf = async ({
  titulo,
  tabla,
  filtros = [],
  fecha = new Date(),
}: OpcionesPdf): Promise<Blob> => {
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  // Con muchas columnas se usa horizontal para que no queden demasiado angostas.
  const doc = new jsPDF({
    orientation: tabla.encabezados.length > 5 ? "landscape" : "portrait",
    unit: "mm",
    format: "a4",
  });
  const ancho = doc.internal.pageSize.getWidth();
  const altoPagina = doc.internal.pageSize.getHeight();
  const anchoUtil = ancho - MARGEN * 2;

  doc.setProperties({ title: titulo });

  // Encabezado
  let y = MARGEN + 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(31, 41, 55);
  doc.text(titulo, MARGEN, y);

  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  doc.text(`Exportado el ${fechaHora(fecha)}`, MARGEN, y);

  // Filtros
  y += 5;
  const textoFiltros = filtros.length
    ? `Filtros: ${filtros.map((f) => `${f.etiqueta}: ${f.valor}`).join(" / ")}`
    : "Filtros: ninguno (se exportan todos los registros)";
  const lineasFiltros: string[] = doc.splitTextToSize(textoFiltros, anchoUtil);
  doc.text(lineasFiltros, MARGEN, y);
  y += lineasFiltros.length * 4;

  // Total
  const total = tabla.filas.length;
  doc.setFont("helvetica", "bold");
  doc.text(`Total: ${total} ${total === 1 ? "registro" : "registros"}`, MARGEN, y);
  y += 4;

  const fuente = tabla.encabezados.length > 9 ? 7 : 8;

  autoTable(doc, {
    head: [tabla.encabezados],
    body: tabla.filas.map((fila) => fila.map((celda) => celda || "—")),
    startY: y,
    margin: { left: MARGEN, right: MARGEN, bottom: MARGEN + 4 },
    styles: { font: "helvetica", fontSize: fuente, cellPadding: 1.8, overflow: "linebreak", valign: "top" },
    headStyles: { fillColor: COLOR_ENCABEZADO, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 248, 246] },
    // El encabezado de la tabla se repite en cada página por defecto.
  });

  // Numeración: se escribe al final, cuando ya se sabe cuántas páginas hay.
  const paginas = doc.getNumberOfPages();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  for (let pagina = 1; pagina <= paginas; pagina++) {
    doc.setPage(pagina);
    doc.text(`Página ${pagina} de ${paginas}`, ancho - MARGEN, altoPagina - MARGEN / 2, { align: "right" });
    doc.text(titulo, MARGEN, altoPagina - MARGEN / 2);
  }

  return doc.output("blob");
};
