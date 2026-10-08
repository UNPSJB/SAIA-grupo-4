/**
   frontend/src/features/auth/AuthContext.ts

   Contexto de autenticación (parte "datos" del AuthProvider).

   Vive en un archivo sin componentes porque react-refresh exige que los
   archivos que exportan componentes no exporten contextos: la regla pide
   moverlos a un módulo aparte. AuthProvider.tsx provee el valor y useAuth.ts
   expone el hook, que es lo que consumen el resto de las vistas.
 */

import { createContext } from "react";
import type { Persona } from "../personal/types";
import type { TokenResponse } from "./authService";

export interface AuthContextType {
  // Estado de autenticación
  usuario: Persona | null;
  isAuthenticated: boolean;
  loading: boolean; // true durante la inicialización asíncrona

  // Acciones
  login: (dni: string, password: string) => Promise<TokenResponse>;
  logout: () => Promise<void>;
  refresh: () => Promise<TokenResponse>;

  // Helpers por capacidades
  esAdmin: boolean;
  esOp: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);
