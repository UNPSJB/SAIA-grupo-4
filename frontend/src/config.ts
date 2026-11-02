// URL base del backend FastAPI.
//
// En desarrollo (Vite) apunta a "/api" para que las peticiones pasen por el
// proxy configurado en vite.config.ts hacia http://127.0.0.1:8000. Al ser una
// peticion al mismo origen (localhost:5173), el navegador considera la cookie
// de refresh token (httpOnly) como de primer origen y la envia siempre,
// resolviendo el bloqueo de SameSite=Lax en navegadores modernos.
//
// En produccion (build) usa una ruta relativa vacia si el backend sirve los
// estaticos o lee la variable de entorno VITE_API_URL.
//
// En despliegue (produccion/staging) se define en el archivo .env la
// variable VITE_API_URL para apuntar al dominio real de la API sin tocar el
// codigo; si no esta definida se cae a la URL local del backend.
export const BASE_URL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? "/api" : "http://127.0.0.1:8000");

// URL publica del frontend. Es la base que se comparte en el enlace y el QR de
// la vista publica. En desarrollo, para probar desde un celular, tiene que ser
// la IP LAN de la maquina (no `localhost`), por ejemplo http://192.168.1.50:5173.
// Si no se define, se usa el origen desde el que se abrio la app.
export const PUBLIC_APP_URL = (
  import.meta.env.VITE_PUBLIC_URL?.trim() ||
  (typeof window !== "undefined" ? window.location.origin : "")
).replace(/\/+$/, "");

// Filas por pagina en los listados con paginacion.
export const ITEMS_POR_PAGINA = 6;

// Filas por pagina en los desplegables (select) que cargan entidades del backend.
// Se usa un limite mas alto que ITEMS_POR_PAGINA para mostrar suficientes opciones
// sin obligar al usuario a paginar dentro de un select.
export const ITEMS_SELECT = 100;

// Headers de las peticiones que envian JSON.
export const JSON_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
};

// Dias de ventana que cubre la campana de notificaciones. Espeja
// `Constantes.DIAS_AVISO_PROXIMO` del backend: si cambia uno, cambia el otro.
export const DIAS_AVISO_NOTIFICACIONES = 15;
