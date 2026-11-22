import { formatearFechaHora } from "../fecha";
import {
  COLOR_VERDE_ACENTO,
  cargarImagenComoPng,
  dibujarEncabezadoInstitucionalPdf,
  dibujarPieInstitucionalPdf,
  prepararPieInstitucionalPdf,
} from "./cabeceraPdf";
import type {
  DatosEstablecimientoPdf,
  FiltroAplicado,
  TablaExportable,
} from "./tipos";

interface OpcionesPdf {
  titulo: string;
  tabla: TablaExportable;
  filtros?: FiltroAplicado[];
  fecha?: Date;
  establecimiento?: DatosEstablecimientoPdf;
}

const MARGEN = 12;

/**
 * Genera un PDF A4 con cabecera institucional del establecimiento, fecha,
 * filtros aplicados, total de registros, la tabla y pie institucional + "Página X de Y".
 */
export const generarPdf = async ({
  titulo,
  tabla,
  filtros = [],
  fecha = new Date(),
  establecimiento,
}: OpcionesPdf): Promise<Blob> => {
  const [{ jsPDF }, { autoTable }, logo] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
    establecimiento?.logoSrc
      ? cargarImagenComoPng(establecimiento.logoSrc)
      : Promise.resolve(null),
  ]);

  const nombreEstablecimiento =
    establecimiento?.nombre?.trim() || "SAIA-4";

  // Con muchas columnas se usa horizontal para que no queden demasiado angostas.
  const doc = new jsPDF({
    orientation: tabla.encabezados.length > 5 ? "landscape" : "portrait",
    unit: "mm",
    format: "a4",
  });
  const ancho = doc.internal.pageSize.getWidth();
  const anchoUtil = ancho - MARGEN * 2;

  doc.setProperties({ title: `${titulo} - ${nombreEstablecimiento}` });

  const datosContacto = [
    establecimiento?.direccion,
    establecimiento?.localidad,
    establecimiento?.provincia,
    establecimiento?.telefono,
    establecimiento?.email,
    establecimiento?.sitioWeb,
  ]
    .filter(Boolean)
    .join(" · ");

  const pie = prepararPieInstitucionalPdf(doc, {
    pieInformes: establecimiento?.pieInformes,
    datosContacto,
    margenX: MARGEN,
  });

  const total = tabla.filas.length;
  const yHeaderLinea = dibujarEncabezadoInstitucionalPdf(doc, {
    titulo,
    nombreEstablecimiento,
    logo,
    textoFecha: `Exportado el ${formatearFechaHora(fecha)}`,
    badge: {
      texto: `${total} ${total === 1 ? "REGISTRO" : "REGISTROS"}`,
      relleno: [230, 255, 250], // teal.50
      borde: [129, 230, 217], // teal.200
      textoColor: [35, 78, 82], // teal.800
    },
    margenX: MARGEN,
    margenY: MARGEN,
  });

  // Filtros debajo de la cabecera institucional
  let y = yHeaderLinea + 5.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(75, 85, 99);
  const textoFiltros = filtros.length
    ? `Filtros: ${filtros.map((f) => `${f.etiqueta}: ${f.valor}`).join(" / ")}`
    : "Filtros: ninguno (se exportan todos los registros)";
  const lineasFiltros: string[] = doc.splitTextToSize(textoFiltros, anchoUtil);
  doc.text(lineasFiltros, MARGEN, y);
  y += lineasFiltros.length * 4 + 1.5;

  const fuente = tabla.encabezados.length > 9 ? 7 : 8;

  autoTable(doc, {
    head: [tabla.encabezados],
    body: tabla.filas.map((fila) => fila.map((celda) => celda || "—")),
    startY: y,
    margin: { left: MARGEN, right: MARGEN, bottom: Math.max(MARGEN + 4, pie.altoTotalPie) },
    styles: {
      font: "helvetica",
      fontSize: fuente,
      cellPadding: 1.8,
      overflow: "linebreak",
      valign: "top",
    },
    headStyles: { fillColor: COLOR_VERDE_ACENTO, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 248, 246] },
  });

  // Pie institucional y numeración en todas las páginas
  const paginas = doc.getNumberOfPages();
  for (let pagina = 1; pagina <= paginas; pagina++) {
    doc.setPage(pagina);
    dibujarPieInstitucionalPdf(doc, pie, {
      margenX: MARGEN,
      textoIzquierdaBarra: `${titulo} · ${nombreEstablecimiento}`,
      textoDerechaBarra: `Página ${pagina} de ${paginas}`,
    });
  }

  return doc.output("blob");
};
