import { z } from "zod";

export const equipoSchema = z.object({
    nombre: z.string()
        .min(1, "El nombre es obligatorio")
        .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s]+$/, "Solo puede contener letras y números"),
    
    marca: z.string()
        .min(1, "La marca es obligatoria")
        .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s]+$/, "Solo puede contener letras y números"),
    
    numero_serie: z.string()
        .min(1, "El número de serie es obligatorio")
        .regex(/^[a-zA-Z0-9\-/]+$/, "Solo puede contener letras, números, guiones (-) y barras (/)"),
    
    categoria: z.string().min(1, "La categoría es obligatoria"),
    
    sector_id: z.coerce.number().min(1, "El sector es obligatorio"),
    
    ubicacion: z.string().optional(),
});

export type EquipoFormValues = z.output<typeof equipoSchema>;
export type EquipoFormInput = z.input<typeof equipoSchema>;