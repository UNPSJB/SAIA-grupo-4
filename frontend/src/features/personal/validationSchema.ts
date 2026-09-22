import { z } from "zod";

export const personalSchema = z.object({
    nombre: z.string().min(1, "El nombre es obligatorio").regex(/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/, "Solo letras"),
    apellido: z.string().min(1, "El apellido es obligatorio").regex(/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/, "Solo letras"),
    dni: z.string().min(1, "El DNI es obligatorio").regex(/^\d+$/, "Solo números"),
    legajo: z.coerce.string()
        .min(1, "El legajo es obligatorio")
        .regex(/^\d+$/, "Solo números")
        .transform((val) => Number(val)),
    email: z.email("Correo electrónico inválido").optional().or(z.literal("")),
    telefono: z.string().optional(),
    capacidades_ids: z.array(z.number()).min(1, "Debe seleccionar al menos una capacidad"),
});

export type PersonalFormValues = z.output<typeof personalSchema>;
export type PersonalFormInput = z.input<typeof personalSchema>;