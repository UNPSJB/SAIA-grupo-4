import type { jsPDF } from "jspdf";

export const SUBTITULO_SISTEMA = "Sistema de Apoyo para la Inocuidad Alimentaria";
export const COLOR_VERDE_OSCURO: [number, number, number] = [34, 84, 61]; // green.800
export const COLOR_VERDE_LINEA: [number, number, number] = [39, 103, 73]; // green.700
export const COLOR_VERDE_ACENTO: [number, number, number] = [47, 133, 90]; // green.600
export const COLOR_TEXTO_PRINCIPAL: [number, number, number] = [31, 41, 55];
export const COLOR_TEXTO_SECUNDARIO: [number, number, number] = [75, 85, 99];
export const COLOR_TEXTO_TENUE: [number, number, number] = [107, 114, 128];

export interface ImagenCargada {
  dataUrl: string;
  width: number;
  height: number;
}

export interface BadgeEncabezadoPdf {
  texto: string;
  relleno: [number, number, number];
  borde: [number, number, number];
  textoColor: [number, number, number];
}

export interface OpcionesEncabezadoPdf {
  titulo: string;
  nombreEstablecimiento: string;
  logo: ImagenCargada | null;
  textoFecha: string;
  badge?: BadgeEncabezadoPdf;
  margenX: number;
  margenY: number;
}

/**
 * Descarga una imagen externa o local y la rasteriza a PNG para incrustarla en jsPDF
 * preservando sus proporciones. Devuelve null si falla para no bloquear el PDF.
 */
export async function cargarImagenComoPng(src: string): Promise<ImagenCargada | null> {
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
 * Dibuja la cabecera institucional unificada (logo, nombre del establecimiento,
 * subtítulo SAIA, título verde, badge opcional, fecha y línea divisoria) y
 * devuelve la coordenada Y debajo de la línea divisoria.
 */
export function dibujarEncabezadoInstitucionalPdf(
  doc: jsPDF,
  {
    titulo,
    nombreEstablecimiento,
    logo,
    textoFecha,
    badge,
    margenX,
    margenY,
  }: OpcionesEncabezadoPdf,
): number {
  const anchoPagina = doc.internal.pageSize.getWidth();

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const anchoFecha = doc.getTextWidth(textoFecha);

  let anchoBadge = 0;
  if (badge) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    anchoBadge = doc.getTextWidth(badge.texto) + 7;
  }

  const anchoDerecha = Math.max(anchoBadge, anchoFecha) + 6;
  const badgeY = margenY;

  if (badge) {
    const badgeX = anchoPagina - margenX - anchoBadge;
    const badgeAlto = 5.8;
    doc.setFillColor(...badge.relleno);
    doc.setDrawColor(...badge.borde);
    doc.setLineWidth(0.3);
    doc.roundedRect(badgeX, badgeY, anchoBadge, badgeAlto, 1.2, 1.2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...badge.textoColor);
    doc.text(badge.texto, badgeX + anchoBadge / 2, badgeY + 3.9, {
      align: "center",
    });
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(90, 90, 90);
  doc.text(
    textoFecha,
    anchoPagina - margenX,
    badge ? badgeY + 10.5 : badgeY + 4,
    { align: "right" },
  );

  let xTextoIzq = margenX;
  let altoLogo = 0;
  if (logo) {
    const ratio = Math.min(26 / logo.width, 13 / logo.height);
    const logoW = logo.width * ratio;
    const logoH = logo.height * ratio;
    altoLogo = logoH;
    doc.addImage(
      logo.dataUrl,
      "PNG",
      margenX,
      margenY + (13 - logoH) / 2,
      logoW,
      logoH,
    );
    xTextoIzq = margenX + logoW + 4;
  }

  const anchoTextoIzq = Math.max(60, anchoPagina - margenX - anchoDerecha - xTextoIzq);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_TEXTO_SECUNDARIO);
  const textoEyebrow = `${nombreEstablecimiento} · ${SUBTITULO_SISTEMA}`.toUpperCase();
  const lineasEyebrow: string[] = doc.splitTextToSize(textoEyebrow, anchoTextoIzq);
  let yIzq = margenY + 3.2;
  doc.text(lineasEyebrow, xTextoIzq, yIzq);
  yIzq += lineasEyebrow.length * 3.5 + 1.8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(...COLOR_VERDE_OSCURO);
  const lineasTitulo: string[] = doc.splitTextToSize(titulo, anchoTextoIzq);
  doc.text(lineasTitulo, xTextoIzq, yIzq);
  const yFinIzq = yIzq + (lineasTitulo.length - 1) * 6.5 + 1.5;

  const yHeaderLinea =
    Math.max(yFinIzq, margenY + altoLogo, badge ? badgeY + 13 : badgeY + 8) + 2.5;
  doc.setDrawColor(...COLOR_VERDE_LINEA);
  doc.setLineWidth(0.7);
  doc.line(margenX, yHeaderLinea, anchoPagina - margenX, yHeaderLinea);

  return yHeaderLinea;
}

export interface PieInstitucionalCalculado {
  lineasPie: string[];
  lineasContacto: string[];
  yLineaPie: number;
  yBarraPagina: number;
  altoTotalPie: number;
}

export function prepararPieInstitucionalPdf(
  doc: jsPDF,
  {
    pieInformes,
    datosContacto,
    margenX,
  }: {
    pieInformes?: string | null;
    datosContacto?: string | null;
    margenX: number;
  },
): PieInstitucionalCalculado {
  const anchoPagina = doc.internal.pageSize.getWidth();
  const altoPagina = doc.internal.pageSize.getHeight();
  const anchoUtil = anchoPagina - margenX * 2;

  const pieLimpio = pieInformes?.trim() || "";
  const contactoLimpio = datosContacto?.trim() || "";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  const lineasPie: string[] = pieLimpio
    ? doc.splitTextToSize(pieLimpio, anchoUtil)
    : [];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const lineasContacto: string[] = contactoLimpio
    ? doc.splitTextToSize(contactoLimpio, anchoUtil)
    : [];

  const yBarraPagina = altoPagina - 7.5;
  const altoInstitucional =
    (lineasPie.length > 0 ? lineasPie.length * 3.8 + 1.5 : 0) +
    (lineasContacto.length > 0 ? lineasContacto.length * 3.5 + 1.5 : 0);
  const yLineaPie =
    altoInstitucional > 0
      ? yBarraPagina - 5.5 - altoInstitucional - 3
      : yBarraPagina - 5.5;

  return {
    lineasPie,
    lineasContacto,
    yLineaPie,
    yBarraPagina,
    altoTotalPie: altoPagina - yLineaPie + 4,
  };
}

export function dibujarPieInstitucionalPdf(
  doc: jsPDF,
  pie: PieInstitucionalCalculado,
  {
    margenX,
    textoIzquierdaBarra,
    textoDerechaBarra,
  }: {
    margenX: number;
    textoIzquierdaBarra: string;
    textoDerechaBarra: string;
  },
): void {
  const anchoPagina = doc.internal.pageSize.getWidth();

  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(margenX, pie.yLineaPie, anchoPagina - margenX, pie.yLineaPie);

  let yPieTexto = pie.yLineaPie + 4.5;
  if (pie.lineasPie.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR_TEXTO_PRINCIPAL);
    doc.text(pie.lineasPie, margenX, yPieTexto);
    yPieTexto += pie.lineasPie.length * 3.8 + 1.5;
  }

  if (pie.lineasContacto.length > 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_TEXTO_SECUNDARIO);
    doc.text(pie.lineasContacto, margenX, yPieTexto);
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(textoIzquierdaBarra, margenX, pie.yBarraPagina);
  doc.text(textoDerechaBarra, anchoPagina - margenX, pie.yBarraPagina, {
    align: "right",
  });
}
