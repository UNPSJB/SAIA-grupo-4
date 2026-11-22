import type { ConfiguracionPublica } from "../configuracion/types";
import { nombreArchivo } from "../../utils/exportacion/nombreArchivo";
import { formatearFechaHora } from "../../utils/fecha";
import { NOMBRE_BASE_QR } from "./nombreArchivoInforme";

const MARGEN_X = 16;
const MARGEN_Y = 14;
const TITULO_DOCUMENTO = "Vista pública de cumplimiento";
const SUBTITULO_SISTEMA = "Sistema de Apoyo para la Inocuidad Alimentaria";

const COLOR_VERDE_OSCURO: [number, number, number] = [34, 84, 61]; // green.800
const COLOR_VERDE_LINEA: [number, number, number] = [39, 103, 73]; // green.700
const COLOR_VERDE_ACENTO: [number, number, number] = [47, 133, 90]; // green.600
const COLOR_FONDO_SUAVE: [number, number, number] = [245, 248, 246];
const COLOR_BORDE: [number, number, number] = [209, 213, 219];
const COLOR_BORDE_SUAVE: [number, number, number] = [229, 231, 235];
const COLOR_TEXTO_PRINCIPAL: [number, number, number] = [31, 41, 55];
const COLOR_TEXTO_SECUNDARIO: [number, number, number] = [75, 85, 99];
const COLOR_TEXTO_TENUE: [number, number, number] = [107, 114, 128];

interface ImagenCargada {
  dataUrl: string;
  width: number;
  height: number;
}

export interface OpcionesQrPdf {
  qrDataUrl: string;
  url: string;
  activo: boolean;
  configuracion: ConfiguracionPublica;
  logoSrc: string | null;
  fecha?: Date;
}

/**
 * Descarga una imagen externa o local y la rasteriza a PNG para incrustarla en jsPDF
 * preservando sus proporciones. Devuelve null si falla para no bloquear el PDF.
 */
async function cargarImagenComoPng(src: string): Promise<ImagenCargada | null> {
  let objectUrl: string | null = null;
  try {
    const respuesta = await fetch(src);
    if (!respuesta.ok) return null;

    const blob = await respuesta.blob();
    objectUrl = URL.createObjectURL(blob);

    const imagen = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("No se pudo decodificar el logo."));
      img.src = objectUrl!;
    });

    if (!imagen.naturalWidth || !imagen.naturalHeight) return null;

    const canvas = document.createElement("canvas");
    canvas.width = imagen.naturalWidth;
    canvas.height = imagen.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(imagen, 0, 0);
    return {
      dataUrl: canvas.toDataURL("image/png"),
      width: imagen.naturalWidth,
      height: imagen.naturalHeight,
    };
  } catch {
    return null;
  } finally {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }
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
  const altoPagina = doc.internal.pageSize.getHeight();
  const anchoUtil = anchoPagina - MARGEN_X * 2;
  const nombreEstablecimiento =
    configuracion.nombre_establecimiento?.trim() || "SAIA-4";

  doc.setProperties({
    title: `${TITULO_DOCUMENTO} - ${nombreEstablecimiento}`,
  });

  // --- Pre-cálculo del pie institucional para garantizar que nunca se superponga ---
  const pieInformes = configuracion.pie_informes?.trim() || "";
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

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  const lineasPie: string[] = pieInformes
    ? doc.splitTextToSize(pieInformes, anchoUtil)
    : [];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const lineasContacto: string[] = datosContacto
    ? doc.splitTextToSize(datosContacto, anchoUtil)
    : [];

  const yBarraPagina = altoPagina - 7.5;
  const altoInstitucional =
    (lineasPie.length > 0 ? lineasPie.length * 3.8 + 1.5 : 0) +
    (lineasContacto.length > 0 ? lineasContacto.length * 3.5 + 1.5 : 0);
  const yLineaPie =
    altoInstitucional > 0 ? yBarraPagina - 5.5 - altoInstitucional - 3 : yBarraPagina - 5.5;

  // --- Encabezado institucional (equivalente a InformePrintLayout / FichaRecetaPrint) ---
  const badgeTexto = activo ? "VISTA ACTIVA" : "VISTA DESACTIVADA";
  const textoFecha = `Generado: ${formatearFechaHora(fecha)}`;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  const anchoBadge = doc.getTextWidth(badgeTexto) + 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const anchoFecha = doc.getTextWidth(textoFecha);
  const anchoDerecha = Math.max(anchoBadge, anchoFecha) + 6;

  const badgeX = anchoPagina - MARGEN_X - anchoBadge;
  const badgeY = MARGEN_Y;
  const badgeAlto = 5.8;

  if (activo) {
    doc.setFillColor(230, 255, 250); // teal.50
    doc.setDrawColor(129, 230, 217); // teal.200
  } else {
    doc.setFillColor(255, 250, 240); // orange.50
    doc.setDrawColor(251, 211, 141); // orange.200
  }
  doc.setLineWidth(0.3);
  doc.roundedRect(badgeX, badgeY, anchoBadge, badgeAlto, 1.2, 1.2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  if (activo) {
    doc.setTextColor(35, 78, 82); // teal.800
  } else {
    doc.setTextColor(156, 66, 33); // orange.800
  }
  doc.text(badgeTexto, badgeX + anchoBadge / 2, badgeY + 3.9, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(90, 90, 90);
  doc.text(textoFecha, anchoPagina - MARGEN_X, badgeY + 10.5, { align: "right" });

  let xTextoIzq = MARGEN_X;
  let altoLogo = 0;
  if (logo) {
    const ratio = Math.min(26 / logo.width, 13 / logo.height);
    const logoW = logo.width * ratio;
    const logoH = logo.height * ratio;
    altoLogo = logoH;
    doc.addImage(
      logo.dataUrl,
      "PNG",
      MARGEN_X,
      MARGEN_Y + (13 - logoH) / 2,
      logoW,
      logoH,
    );
    xTextoIzq = MARGEN_X + logoW + 4;
  }

  const anchoTextoIzq = Math.max(60, anchoPagina - MARGEN_X - anchoDerecha - xTextoIzq);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_TEXTO_SECUNDARIO);
  const textoEyebrow = `${nombreEstablecimiento} · ${SUBTITULO_SISTEMA}`.toUpperCase();
  const lineasEyebrow: string[] = doc.splitTextToSize(textoEyebrow, anchoTextoIzq);
  let yIzq = MARGEN_Y + 3.2;
  doc.text(lineasEyebrow, xTextoIzq, yIzq);
  yIzq += lineasEyebrow.length * 3.5 + 1.8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(...COLOR_VERDE_OSCURO);
  const lineasTitulo: string[] = doc.splitTextToSize(TITULO_DOCUMENTO, anchoTextoIzq);
  doc.text(lineasTitulo, xTextoIzq, yIzq);
  const yFinIzq = yIzq + (lineasTitulo.length - 1) * 6.5 + 1.5;

  const yHeaderLinea = Math.max(yFinIzq, MARGEN_Y + altoLogo, badgeY + 13) + 2.5;
  doc.setDrawColor(...COLOR_VERDE_LINEA);
  doc.setLineWidth(0.7);
  doc.line(MARGEN_X, yHeaderLinea, anchoPagina - MARGEN_X, yHeaderLinea);

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
  const espacioDisponible = yLineaPie - y - altoPrivacidad - 6;
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

  // --- Pie institucional y numeración (consistente con pdf.ts y VistaPublicaVisitantePage) ---
  doc.setDrawColor(...COLOR_BORDE_SUAVE);
  doc.setLineWidth(0.3);
  doc.line(MARGEN_X, yLineaPie, anchoPagina - MARGEN_X, yLineaPie);

  let yPieTexto = yLineaPie + 4.5;
  if (lineasPie.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR_TEXTO_PRINCIPAL);
    doc.text(lineasPie, MARGEN_X, yPieTexto);
    yPieTexto += lineasPie.length * 3.8 + 1.5;
  }

  if (lineasContacto.length > 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_TEXTO_SECUNDARIO);
    doc.text(lineasContacto, MARGEN_X, yPieTexto);
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`${TITULO_DOCUMENTO} · ${nombreEstablecimiento}`, MARGEN_X, yBarraPagina);
  doc.text("Página 1 de 1", anchoPagina - MARGEN_X, yBarraPagina, { align: "right" });

  doc.save(nombreArchivo(NOMBRE_BASE_QR, "pdf", fecha));
}
