import { z } from "zod";

export const elementoLimpiezaSchema = z.object({
    nombre: z.string().min(1, "El nombre es obligatorio").max(20, "Máximo 20 caracteres"),
    tipo_id: z.coerce.number().min(1, "Debe seleccionar un tipo"),
    sector_id: z.union([z.coerce.number().min(1), z.literal("")]).optional(),
    equipo_id: z.union([z.coerce.number().min(1), z.literal("")]).optional(),
    frecuencia_recambio_dias: z.coerce.string()
      .regex(/^\d+$/, "Solo números")
      .transform((val) => Number(val)),
});

export type ElementoLimpiezaFormValues = z.output<typeof elementoLimpiezaSchema>;
export type ElementoLimpiezaFormInput = z.input<typeof elementoLimpiezaSchema>;