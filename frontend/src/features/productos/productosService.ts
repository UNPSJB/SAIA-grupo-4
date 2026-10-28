import { apiFetch } from "../auth/apiFetch";
import type { Producto, ProductoCreate } from "./types";

export const getProductos = async (): Promise<Producto[]> => {
  const res = await apiFetch("/productos/");
  if (!res.ok) {
    throw new Error("Error al consultar productos");
  }
  return await res.json();
};

export const createProducto = async (data: any) => { // Asegúrate de que los tipos sean correctos
  const res = await apiFetch("/productos/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json", 
    },
    body: JSON.stringify(data),
  });
  
  if (!res.ok) {
  }
  
  return await res.json();
};