import { toPng } from "html-to-image";
import { marcaDeTiempo, slug } from "../../../utils/exportacion/nombreArchivo";

/** Los elementos con este atributo (por ejemplo, el propio botón) no salen en la imagen. */
export const ATRIBUTO_NO_EXPORTAR = "data-no-exportar";

/**
 * Genera un PNG de la tarjeta del gráfico tal como se ve en pantalla
 * (título, gráfico y leyenda) y lo descarga.
 * Nombre: "cumplimiento-de-tareas_20261113-2142.png".
 */
export async function descargarGraficoPng(elemento: HTMLElement, titulo: string) {
  const dataUrl = await toPng(elemento, {
    backgroundColor: "#ffffff",
    pixelRatio: 2,
    cacheBust: true,
    filter: (nodo) =>
      !(nodo instanceof Element && nodo.hasAttribute(ATRIBUTO_NO_EXPORTAR)),
  });

  const enlace = document.createElement("a");
  enlace.href = dataUrl;
  enlace.download = `${slug(titulo)}_${marcaDeTiempo()}.png`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
}
