import { createContext, useContext } from "react";
import type { Persona } from "../personal/types";
import type { UsuarioLogueado } from "./types";

export interface AuthContextValue {
  usuario: UsuarioLogueado | null; // null = sin sesión
  // Recibe la persona ya verificada (paso 2 del login) y inicia la sesión.
  login: (persona: Persona) => UsuarioLogueado;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

// Hook de acceso. Lanza error si se usa fuera del <AuthProvider>.
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
};