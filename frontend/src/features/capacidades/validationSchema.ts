import { z } from "zod";

export const capacidadSchema = z.object({
    nombre: z.string()
        .min(1, "El nombre es obligatorio")
        .regex(/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/, "Solo puede contener letras y espacios"),
    descripcion: z.string().optional(),
});

export type CapacidadFormValues = z.output<typeof capacidadSchema>;
export type CapacidadFormInput = z.input<typeof capacidadSchema>;