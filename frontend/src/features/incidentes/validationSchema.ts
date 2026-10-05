import { z } from "zod";

export const incidenteSchema = z.object({
  titulo: z
    .string()
    .trim()
    .min(1, "Por favor, ingrese un título valido")
    .max(100, "El título no puede superar los 100 caracteres")
    .regex(
      /^[A-Za-zÁÉÍÓÚáéíóúÑñ 0-9]{1,100}$/,
      "El título solo debe contener letras mayusculas o minusculas",
    ),

  descripcion: z
    .string()
    .trim()
    .min(1, "Por favor, ingrese una descripción valida")
    .max(500, "La descripción no puede superar los 500 caracteres"),
  })
  .superRefine((data, ctx) => {
    // Validación adicional si es necesario
    });

export type IncidenteFormValues = z.infer<typeof incidenteSchema>;