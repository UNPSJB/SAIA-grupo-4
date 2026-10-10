import { z } from "zod";

export const documentoPersonalSchema = z.object({
    nombre: z.string()
        .min(1, "El nombre es obligatorio")
        .max(100, "El nombre no puede superar los 100 caracteres"),
    vigencia_dias: z.coerce.string()
        .min(1, "La vigencia es obligatoria")
        .regex(/^\d+$/, "Solo números")
        .transform((val) => Number(val))
        .refine((val) => val > 0, "La vigencia debe ser mayor a cero"),
});

export type DocumentoPersonalFormValues = z.output<typeof documentoPersonalSchema>;
export type DocumentoPersonalFormInput = z.input<typeof documentoPersonalSchema>;
