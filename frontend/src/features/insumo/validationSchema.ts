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
});

export type InsumoFormValues = z.infer<typeof insumoSchema>;

export const loteInsumoSchema = z.object({
  codigo_lote: z
    .string()
    .trim()
    .min(1, "Por favor, ingrese el código de lote")
    .max(50, "El código de lote no puede superar los 50 caracteres"),
  fecha_vencimiento: z
    .string()
    .min(1, "Por favor, ingrese la fecha de vencimiento")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha de vencimiento no es válida"),
});

export type LoteInsumoFormValues = z.infer<typeof loteInsumoSchema>;