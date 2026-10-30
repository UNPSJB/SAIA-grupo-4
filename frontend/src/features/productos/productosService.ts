import { apiFetch } from "../auth/apiFetch";
import type { Producto, ProductoCreate } from "./types";

export const getProductos = async (): Promise<Producto[]> => {
  const res = await apiFetch("/productos/");
  if (!res.ok) {
    throw new Error("Error al consultar productos");
  }
  return await res.json();
};

export const createProducto = async (data: any) => { 
  const res = await apiFetch("/productos/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json", 
    },
    body: JSON.stringify(data),
  });
  
  if (!res.ok) {
    const errorData = await res.json();
    const mensaje =
      typeof errorData.detail === "string"
        ? errorData.detail
        : "Error al crear producto (${res.status}) al crear producto";
    throw new Error(mensaje);
  }
  
  return await res.json();
};