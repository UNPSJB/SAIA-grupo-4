import { z } from "zod";

const hoyStr = new Date().toISOString().split("T")[0];

export const equipoSchema = z.object({
  nombre: z
    .string()
    .min(1, "El nombre es obligatorio")
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s]+$/, "Solo puede contener letras y números"),

  marca: z
    .string()
    .min(1, "La marca es obligatoria")
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s]+$/, "Solo puede contener letras y números"),

  numero_serie: z
    .string()
    .min(1, "El número de serie es obligatorio")
    .regex(/^[a-zA-Z0-9\-/]+$/, "Solo puede contener letras, números, guiones (-) y barras (/)"),

  categoria: z.string().min(1, "La categoría es obligatoria"),

  sector_id: z.coerce.number().min(1, "El sector es obligatorio"),

  ubicacion: z.string().optional(),

  frecuencia_calibracion_dias: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? null : Number(val)),
    z.number().positive("La frecuencia debe ser mayor a 0 días").nullable().optional()
  ),

  fecha_ultima_calibracion: z.preprocess(
    (val) => (val === "" || val === undefined ? null : val),
    z
      .string()
      .refine((val) => !val || val <= hoyStr, {
        message: "La fecha de última calibración no puede ser futura",
      })
      .nullable()
      .optional()
  ),
});

export type EquipoFormValues = z.infer<typeof equipoSchema>;