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
    // Opcional a nivel de schema: si se informa, respeta los límites del
    // backend (8 a 128). La obligatoriedad condicional (solo para personal
    // con capacidades habilitantes) se valida en PersonalForm, que conoce
    // los nombres de las capacidades seleccionadas.
    password: z
        .string()
        .max(128, "La contraseña no puede superar los 128 caracteres")
        .optional()
        .refine((val) => !val || val.length >= 8, {
            message: "La contraseña debe tener al menos 8 caracteres",
        }),
});

export type PersonalFormValues = z.output<typeof personalSchema>;
export type PersonalFormInput = z.input<typeof personalSchema>;