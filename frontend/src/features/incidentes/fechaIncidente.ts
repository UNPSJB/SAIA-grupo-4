const conZona = (fecha: string) =>
  // Verifica si la fecha tiene zona horaria, si no la tiene, le agrega la zona horaria 'Z' (UTC)
  /(?:Z|[+-]\d{2}:\d{2})$/i.test(fecha) ? fecha : `${fecha}Z`;

// Se encarga de convertir la fecha en un objeto Date
export const parsearFechaIncidente = (fecha: string): Date => new Date(conZona(fecha));

export const formatearFechaHoraIncidente = (fecha: string): string =>
  parsearFechaIncidente(fecha).toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
