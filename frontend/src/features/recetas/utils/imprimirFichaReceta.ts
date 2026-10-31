import type { Receta } from "../types";

/**
 * Dispara la impresión nativa del navegador mediante window.print().
 * Configura temporalmente el `document.title` con el código y nombre de la receta
 * para que el navegador sugiera automáticamente ese nombre al "Guardar como PDF".
 * Al terminar la impresión, restaura el título original de la aplicación.
 */
export const imprimirFichaReceta = (receta?: Receta) => {
  const tituloOriginal = document.title;

  if (receta?.codigo_receta && receta?.nombre_receta) {
    document.title = `${receta.codigo_receta} - ${receta.nombre_receta}`;
  } else if (receta?.nombre_receta) {
    document.title = receta.nombre_receta;
  }

  const restaurarTitulo = () => {
    document.title = tituloOriginal;
    window.removeEventListener("afterprint", restaurarTitulo);
  };

  window.addEventListener("afterprint", restaurarTitulo);

  // Fallback por si en algún navegador o entorno no se emite el evento 'afterprint'
  setTimeout(restaurarTitulo, 1000);

  window.print();
};
