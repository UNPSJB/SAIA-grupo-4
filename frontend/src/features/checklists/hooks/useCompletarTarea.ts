import { useState } from "react";

export const useCompletarTarea = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const completarTarea = async (tareaId: number, foto: File | null) => {
    setLoading(true);
    setError("");
    
    try {
      const formData = new FormData();
      if (foto) {
        formData.append("foto", foto);
      }

      const response = await fetch(`http://127.0.0.1:8000/checklists/${tareaId}/completar`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Hubo un problema al guardar la evidencia");
      }

      return await response.json();
      
    } catch (err: any) {
      setError(err.message || "Error de conexión");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { completarTarea, loading, error };
};