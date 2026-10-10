// Helpers compartidos por las vistas y modales de documentos.

// Patrón usado en todo el frontend para hablar con el backend
export const API_BASE = "http://127.0.0.1:8000";

// "uploads/documentos/x.pdf" -> URL absoluta del backend.
// Si ya viene absoluta se devuelve tal cual.
export const urlBackend = (ruta: string): string =>
  ruta.startsWith("http") ? ruta : `${API_BASE}/${ruta}`;

// Arma el nombre de archivo sugerido al descargar: prioriza el código del documento y cae al título si no tiene. Ej: "POES-0001_v1.0.pdf".
export const nombreArchivoDocumento = (
  codigo: string | null,
  titulo: string,
  version: string,
): string => {
  const base = (codigo?.trim() || titulo.trim() || "documento")
    .replace(/\s+/g, "_")
    .replace(/[^\w.-]/g, "");
  return `${base}_${version}.pdf`;
};

// Fuerza la descarga de un archivo servido por el backend.
// El atributo `download` de un <a> se ignora cuando el archivo viene de otro
// origen (front 5173 -> API 8000), por eso se baja el contenido como blob y se
// dispara la descarga apuntando a una URL local. Si el fetch falla (p. ej.
// CORS), se cae al comportamiento de abrir en una pestaña nueva.
export const descargarDocumento = async (
  url: string,
  nombreArchivo: string,
): Promise<void> => {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Error ${res.status}`);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = objectUrl;
    enlace.download = nombreArchivo;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(url, "_blank");
  }
};

export const formatearFecha = (fecha: string): string =>
  new Date(`${fecha.slice(0, 10)}T00:00:00`).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

// Fecha y hora corta: "8/10/2026 14:32" (para diferenciar revisiones del mismo día)
export const formatearFechaHora = (fechaHora: string): string => {
  const hora = fechaHora.slice(11, 16);
  return hora ? `${formatearFecha(fechaHora)} ${hora}` : formatearFecha(fechaHora);
};

// Formato exacto YYYY-MM-DD para el atributo 'min' de los input date
// (sv-locale devuelve ISO sin separadores)
export const hoyLocalISO = new Date().toLocaleDateString("sv-SE");

// Suma un año a una fecha "YYYY-MM-DD".
// 29/02 se ajusta a 28/02 cuando el año siguiente no es bisiesto.
export const sumarUnAnio = (fechaISO: string): string => {
  const [anio, mes, dia] = fechaISO.split("-").map(Number);
  const siguiente = anio + 1;
  const ultimoDiaDelMes = new Date(siguiente, mes, 0).getDate();
  return [
    siguiente,
    String(mes).padStart(2, "0"),
    String(Math.min(dia, ultimoDiaDelMes)).padStart(2, "0"),
  ].join("-");
};
