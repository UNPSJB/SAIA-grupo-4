/// <reference types="vite/client" />

// Variables de entorno del frontend (prefijo VITE_ obligatorio para exponerlas).
interface ImportMetaEnv {
  /** URL base del backend. Si no se define, se usa http://127.0.0.1:8000. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
