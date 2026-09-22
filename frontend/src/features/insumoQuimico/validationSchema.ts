import { z } from "zod";

export const insumoQuimicoSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, "Por favor, ingrese un nombre valido")
    .regex(
        /^[A-Za-zÁÉÍÓÚáéíóúÑñ 0-9]{1,100}$/,
        "El nombre solo debe contener letras mayusculas o minusculas",
    ),

  unidad_medida_id: z
    .string()
    .min(1, "Por favor, ingrese una unidad de medida"),

  tipo: z
    .string()
    .min(1, "Por favor, ingrese un tipo"),

});

export type InsumoQuimicoFormValues = z.infer<typeof insumoQuimicoSchema>;