// Unica implementacion del formateo de fechas "YYYY-MM-DD" del frontend.
//
// No se debe usar `new Date("2026-10-02").toLocaleDateString(...)`: esa cadena
// se interpreta en UTC y en Argentina devuelve el dia anterior.
export const formatearFecha = (fecha: string | null | undefined): string => {
  if (!fecha) return "—";

  const [anio, mes, dia] = fecha.split("-").map(Number);
  if (!anio || !mes || !dia) return fecha;

  return `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${anio}`;
};

export const formatearFechaISO = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return fecha.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};