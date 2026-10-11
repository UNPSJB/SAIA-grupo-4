// Configuracion centralizada del frontend.
//
// Todo valor que se repite en varias vistas o hooks vive aca: asi se cambia en
// un solo lugar y las distintas paginas siguen hablando todas igual.

// Direccion unica del backend.
//
// Se centraliza aca para que la campana y el resto de las vistas hablen con el mismo servidor
// sin que haya dos lugares donde cambiarla.
export const BASE_URL = "http://127.0.0.1:8000";

// Filas por pagina en los listados con paginacion.
export const ITEMS_POR_PAGINA = 6;

// Tope de registros pedidos al backend para poblar desplegables (combos).
export const ITEMS_SELECT = 100;

// Headers de las peticiones que envian JSON.
export const JSON_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
};

// Dias de ventana que cubre la campana de notificaciones. Espeja
// `Constantes.DIAS_AVISO_PROXIMO` del backend: si cambia uno, cambia el otro.
export const DIAS_AVISO_NOTIFICACIONES = 15;
