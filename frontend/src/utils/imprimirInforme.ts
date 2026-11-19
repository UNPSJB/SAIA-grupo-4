/**
 * Dispara la impresión nativa del navegador mediante window.print() para un informe.
 *
 * El contenido a imprimir ya tiene que estar montado en la página (oculto en
 * pantalla y visible solo con @media print), igual que FichaRecetaPrint.
 *
 * Configura temporalmente el `document.title` con el nombre recibido para que el
 * navegador lo sugiera al "Guardar como PDF", y al terminar restaura el título
 * original de la aplicación.
 *
 * Ejemplo: imprimirInforme("Dashboard SAIA - 01-03-2026 a 31-03-2026")
 */
export const imprimirInforme = (nombreArchivo?: string) => {
  const tituloOriginal = document.title;

  if (nombreArchivo?.trim()) {
    document.title = nombreArchivo.trim();
  }

  let restaurado = false;
  const restaurarTitulo = () => {
    if (restaurado) return;
    restaurado = true;
    document.title = tituloOriginal;
    window.removeEventListener("afterprint", restaurarTitulo);
  };

  window.addEventListener("afterprint", restaurarTitulo);

  // Fallback por si en algún navegador o entorno no se emite el evento 'afterprint'
  setTimeout(restaurarTitulo, 1000);

  window.print();
};
