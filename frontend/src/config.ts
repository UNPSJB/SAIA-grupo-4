// Configuracion centralizada del frontend.
//
// Todo valor que se repite en varias vistas o hooks vive aca: asi se cambia en
// un solo lugar y las distintas paginas siguen hablando todas igual.

// Direccion unica del backend.
//
// En desarrollo se usa el proxy de Vite (`/api`): las peticiones salen desde el
// mismo origen que la app y la cookie httpOnly de refresh viaja siempre, sin el
// bloqueo de SameSite=Lax que aparece cuando el front esta en localhost:5173 y
// el backend en 127.0.0.1:8000 (sitios distintos). En produccion se toma la
// variable VITE_API_URL para apuntar al dominio real de la API sin tocar el
// codigo; si no esta definida se cae a la URL local del backend.
export const BASE_URL =
  import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

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
