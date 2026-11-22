import type { ConfiguracionPublica } from "../configuracion/types";
import {
  COLOR_TEXTO_SECUNDARIO,
  COLOR_TEXTO_TENUE,
  COLOR_VERDE_ACENTO,
  COLOR_VERDE_LINEA,
  COLOR_VERDE_OSCURO,
  cargarImagenComoPng,
  dibujarEncabezadoInstitucionalPdf,
  dibujarPieInstitucionalPdf,
  prepararPieInstitucionalPdf,
} from "../../utils/exportacion/cabeceraPdf";
import { nombreArchivo } from "../../utils/exportacion/nombreArchivo";
import { formatearFechaHora } from "../../utils/fecha";
import { NOMBRE_BASE_QR } from "./nombreArchivoInforme";

const MARGEN_X = 16;
const MARGEN_Y = 14;
const TITULO_DOCUMENTO = "Vista pública de cumplimiento";

const COLOR_FONDO_SUAVE: [number, number, number] = [245, 248, 246];
const COLOR_BORDE: [number, number, number] = [209, 213, 219];

export interface OpcionesQrPdf {
  qrDataUrl: string;
  url: string;
  activo: boolean;
  configuracion: ConfiguracionPublica;
  logoSrc: string | null;
  fecha?: Date;
}

/**
 * Genera y descarga el PDF A4 del código QR de la vista pública respetando la
 * estética, paleta verde institucional, encabezado, pie y numeración de los demás
 * PDF del sistema.
 */
export async function descargarQrPdf({
  qrDataUrl,
  url,
  activo,
  configuracion,
  logoSrc,
  fecha = new Date(),
}: OpcionesQrPdf): Promise<void> {
  const [{ jsPDF }, logo] = await Promise.all([
    import("jspdf"),
    logoSrc ? cargarImagenComoPng(logoSrc) : Promise.resolve(null),
  ]);

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const anchoPagina = doc.internal.pageSize.getWidth();
  const anchoUtil = anchoPagina - MARGEN_X * 2;
  const nombreEstablecimiento =
    configuracion.nombre_establecimiento?.trim() || "SAIA-4";

  doc.setProperties({
    title: `${TITULO_DOCUMENTO} - ${nombreEstablecimiento}`,
  });

  // --- Pre-cálculo del pie institucional para garantizar que nunca se superponga ---
  const datosContacto = [
    configuracion.direccion,
    configuracion.localidad,
    configuracion.provincia,
    configuracion.telefono,
    configuracion.email,
    configuracion.sitio_web,
  ]
    .filter(Boolean)
    .join(" · ");

  const pie = prepararPieInstitucionalPdf(doc, {
    pieInformes: configuracion.pie_informes,
    datosContacto,
    margenX: MARGEN_X,
  });

  // --- Encabezado institucional (compartido con pdf.ts) ---
  const yHeaderLinea = dibujarEncabezadoInstitucionalPdf(doc, {
    titulo: TITULO_DOCUMENTO,
    nombreEstablecimiento,
    logo,
    textoFecha: `Generado: ${formatearFechaHora(fecha)}`,
    badge: activo
      ? {
          texto: "VISTA ACTIVA",
          relleno: [230, 255, 250],
          borde: [129, 230, 217],
          textoColor: [35, 78, 82],
        }
      : {
          texto: "VISTA DESACTIVADA",
          relleno: [255, 250, 240],
          borde: [251, 211, 141],
          textoColor: [156, 66, 33],
        },
    margenX: MARGEN_X,
    margenY: MARGEN_Y,
  });

  // --- Introducción y aviso de estado ---
  let y = yHeaderLinea + 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...COLOR_TEXTO_SECUNDARIO);
  const lineasIntro: string[] = doc.splitTextToSize(
    "Escaneá este código QR con la cámara de tu teléfono para consultar los indicadores públicos de buenas prácticas del establecimiento.",
    anchoUtil,
  );
  doc.text(lineasIntro, MARGEN_X, y);
  y += lineasIntro.length * 4.6 + 3;

  if (!activo) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    const lineasAviso: string[] = doc.splitTextToSize(
      "Atención: la vista pública se encuentra desactivada. Quien escanee este código verá el aviso de vista desactivada hasta que vuelva a activarse.",
      anchoUtil - 8,
    );
    const altoAviso = lineasAviso.length * 4 + 5;
    doc.setFillColor(255, 250, 240);
    doc.setDrawColor(251, 211, 141);
    doc.setLineWidth(0.3);
    doc.roundedRect(MARGEN_X, y, anchoUtil, altoAviso, 1.5, 1.5, "FD");
    doc.setTextColor(156, 66, 33);
    doc.text(lineasAviso, MARGEN_X + 4, y + 4.5);
    y += altoAviso + 4;
  }

  // --- Tarjeta central con el código QR ---
  const anchoCard = 148;
  const xCard = (anchoPagina - anchoCard) / 2;

  doc.setFont("courier", "normal");
  doc.setFontSize(8.5);
  const lineasUrl: string[] = doc.splitTextToSize(url, anchoCard - 20);
  const altoUrl = lineasUrl.length * 4;

  const textoPrivacidad =
    "Indicadores agregados. No incluyen datos internos ni identifican al personal.";
  const altoPrivacidad = 7;
  const altoFijoCard = 36 + altoUrl;
  const espacioDisponible = pie.yLineaPie - y - altoPrivacidad - 6;
  const tamMarcoQr = Math.min(104, Math.max(66, espacioDisponible - altoFijoCard));
  const tamQr = tamMarcoQr - 10;
  const altoCard = altoFijoCard + tamMarcoQr;

  const yCard = y + Math.max(4, (espacioDisponible - altoCard) / 2);

  // Contenedor de la tarjeta
  doc.setFillColor(...COLOR_FONDO_SUAVE);
  doc.setDrawColor(...COLOR_BORDE);
  doc.setLineWidth(0.35);
  doc.roundedRect(xCard, yCard, anchoCard, altoCard, 2.5, 2.5, "FD");

  // Banda superior verde institucional (green.600)
  doc.setFillColor(...COLOR_VERDE_ACENTO);
  doc.roundedRect(xCard, yCard, anchoCard, 2, 1.5, 1.5, "F");
  doc.rect(xCard, yCard + 1, anchoCard, 1, "F");

  // Título de la tarjeta
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLOR_VERDE_OSCURO);
  doc.text("Acceso directo a indicadores públicos", anchoPagina / 2, yCard + 11, {
    align: "center",
  });

  // Marco blanco del QR
  const xMarcoQr = (anchoPagina - tamMarcoQr) / 2;
  const yMarcoQr = yCard + 16;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...COLOR_BORDE);
  doc.setLineWidth(0.3);
  doc.roundedRect(xMarcoQr, yMarcoQr, tamMarcoQr, tamMarcoQr, 2, 2, "FD");
  doc.addImage(qrDataUrl, "PNG", xMarcoQr + 5, yMarcoQr + 5, tamQr, tamQr);

  // Enlace directo debajo del QR (clicable en el PDF)
  const yEtiquetaUrl = yMarcoQr + tamMarcoQr + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_TEXTO_TENUE);
  doc.text("ENLACE PÚBLICO", anchoPagina / 2, yEtiquetaUrl, { align: "center" });

  const yUrl = yEtiquetaUrl + 5;
  doc.setFont("courier", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR_VERDE_LINEA);
  lineasUrl.forEach((linea, indice) => {
    const yLinea = yUrl + indice * 4;
    const anchoLinea = doc.getTextWidth(linea);
    doc.text(linea, anchoPagina / 2, yLinea, { align: "center" });
    doc.link((anchoPagina - anchoLinea) / 2, yLinea - 3, anchoLinea, 4, { url });
  });

  // Nota de privacidad debajo de la tarjeta
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR_TEXTO_TENUE);
  doc.text(textoPrivacidad, anchoPagina / 2, yCard + altoCard + 6.5, {
    align: "center",
  });

  // --- Pie institucional y numeración (compartido con pdf.ts) ---
  dibujarPieInstitucionalPdf(doc, pie, {
    margenX: MARGEN_X,
    textoIzquierdaBarra: `${TITULO_DOCUMENTO} · ${nombreEstablecimiento}`,
    textoDerechaBarra: "Página 1 de 1",
  });

  doc.save(nombreArchivo(NOMBRE_BASE_QR, "pdf", fecha));
}
