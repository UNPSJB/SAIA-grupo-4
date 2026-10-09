// Helpers compartidos por las vistas y modales de documentos.

// Patrón usado en todo el frontend para hablar con el backend
export const API_BASE = "http://127.0.0.1:8000";

// "uploads/documentos/x.pdf" -> URL absoluta del backend.
// Si ya viene absoluta se devuelve tal cual.
export const urlBackend = (ruta: string): string =>
  ruta.startsWith("http") ? ruta : `${API_BASE}/${ruta}`;

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
