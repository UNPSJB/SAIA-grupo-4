import { z } from "zod";

export const ProductoSchema = z
  .object({
    nombre: z
      .string()
      .trim()
      .min(1, "Por favor, ingrese un nombre valido.")
      .max(100, "El nombre no puede superar los 100 caracteres.")
      .regex(
        /^[A-Za-zÁÉÍÓÚáéíóúÑñ 0-9]{1,100}$/,
        "El nombre solo debe contener numeros o letras mayusculas o minusculas.",
      ),
    
    descripcion: z
      .string()
      .trim()
      .min(1, "Por favor, ingrese una descripción.")
      .max(250, "La descripción no puede superar los 250 caracteres."),

    unidad_medida_id: z
      .string()
      .min(1, "Por favor, ingrese una unidad de medida."),
  })

export type ProductoFormValues = z.infer<typeof ProductoSchema>;