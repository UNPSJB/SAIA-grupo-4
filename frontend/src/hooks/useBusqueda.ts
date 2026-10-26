import { useState } from "react";
import { useDebounce } from "./useDebounce";

export function useBusqueda(delay = 300) {
  const [busqueda, setBusqueda] = useState("");      // lo que se ve en el input
  const aplicada = useDebounce(busqueda.trim(), delay); // lo que viaja al backend
  return { busqueda, setBusqueda, aplicada };
}