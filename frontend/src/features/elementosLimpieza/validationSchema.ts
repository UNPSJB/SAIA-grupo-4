import { z } from "zod";

export const elementoLimpiezaSchema = z.object({
    tipo_id: z.coerce.number().min(1, "Debe seleccionar un tipo"),
    sector_id: z.union([z.coerce.number().min(1), z.literal("")]).optional(),
    equipo_id: z.union([z.coerce.number().min(1), z.literal("")]).optional(),
    frecuencia_recambio_dias: z.union([z.coerce.number().positive("Debe ser mayor a 0"), z.literal("")]).optional(),
});

export type ElementoLimpiezaFormValues = z.output<typeof elementoLimpiezaSchema>;
export type ElementoLimpiezaFormInput = z.input<typeof elementoLimpiezaSchema>;