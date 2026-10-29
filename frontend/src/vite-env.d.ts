/// <reference types="vite/client" />

// Variables de entorno del frontend (prefijo VITE_ obligatorio para exponerlas).
interface ImportMetaEnv {
  /** URL base del backend. Si no se define, se usa http://127.0.0.1:8000. */
  readonly VITE_API_URL?: string;
  /**
   * URL publica del frontend que se comparte en el enlace y el QR. En un
   * celular no sirve localhost: usar la IP LAN o el dominio publico.
   */
  readonly VITE_PUBLIC_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
