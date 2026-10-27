import { z } from "zod";

export const recetaSchema = z.object({
  nombre_receta: z
    .string()
    .min(1, "El nombre de la receta es obligatorio")
    .max(150, "El nombre no puede superar los 150 caracteres"),
  producto_id: z
    .union([z.string().min(1, "El producto es obligatorio"), z.number()])
    .transform((val) => Number(val))
    .refine((val) => !Number.isNaN(val) && val > 0, "El producto es obligatorio"),
  rendimiento_estandar: z
    .union([z.string().min(1, "El rendimiento es obligatorio"), z.number()])
    .transform((val) => Number(val))
    .refine((val) => !Number.isNaN(val) && val > 0, "El rendimiento debe ser mayor a 0"),
  tiempo_estimado_total: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => {
      if (val === "" || val === undefined || val === null) return undefined;
      return Number(val);
    })
    .refine(
      (val) => val === undefined || (Number.isInteger(val) && val > 0),
      "El tiempo debe ser un número entero mayor a 0",
    ),
  observaciones: z.string().optional(),
});

export type RecetaFormInput = z.input<typeof recetaSchema>;
export type RecetaFormValues = z.output<typeof recetaSchema>;
