import { z } from "zod";

export const insumoSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, "Por favor, ingrese un nombre valido")
    .regex(
      /^[A-Za-zÁÉÍÓÚáéíóúÑñ 0-9]{1,50}$/,
      "El nombre solo debe contener letras mayusculas o minusculas",
    ),
  unidad_medida: z
    .string()
    .min(1, "Por favor, ingrese una unidad de medida"),
  categoria: z.string().min(1, "Por favor, ingrese una categoria"),
  descripcion: z.string(),
});

export type InsumoFormValues = z.infer<typeof insumoSchema>;