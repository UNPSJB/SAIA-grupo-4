import { useState } from "react";
import type { ReactNode } from "react";
import {
  cerrarSesion,
  construirUsuario,
  guardarSesion,
  obtenerSesion,
} from "./authService";
import { AuthContext } from "./useAuth";
import type { Persona } from "../personal/types";
import type { UsuarioLogueado } from "./types";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Estado inicial = lo que haya persistido en localStorage.
  // Así, al refrescar (F5) la sesión se mantiene.
  const [usuario, setUsuario] = useState<UsuarioLogueado | null>(
    () => obtenerSesion(),
  );

  const login = (persona: Persona) => {
    const nuevoUsuario = construirUsuario(persona); // mapea la persona a sesión
    guardarSesion(nuevoUsuario); // persiste en localStorage
    setUsuario(nuevoUsuario); // React re-renderiza App → muestra NavBar y rutas
    return nuevoUsuario;
  };

  const logout = () => {
    cerrarSesion(); // borra localStorage
    setUsuario(null); // React re-renderiza App → vuelve a la vista login
  };

  return (
    <AuthContext.Provider value={{ usuario, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};