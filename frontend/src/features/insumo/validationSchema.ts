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
  unidad_medida_id: z
    .string()
    .min(1, "Por favor, ingrese una unidad de medida"),
  categoria: z.string().min(1, "Por favor, ingrese una categoria"),
  descripcion: z.string(),
  densidad_g_ml: z
    .string()
    .optional()
    .refine((val) => !val || (!isNaN(Number(val)) && Number(val) > 0), {
      message: "La densidad debe ser un número mayor a 0",
    }),
  peso_unitario_g: z
    .string()
    .optional()
    .refine((val) => !val || (!isNaN(Number(val)) && Number(val) > 0), {
      message: "El peso unitario debe ser un número mayor a 0",
    }),
});

export type InsumoFormValues = z.infer<typeof insumoSchema>;