import { z } from "zod";

export const unidadMedidaSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, "Por favor, ingrese un nombre valido")
    .regex(
      /^[A-Za-zÁÉÍÓÚáéíóúÑñ 0-9]{1,50}$/,
      "El nombre solo debe contener letras mayusculas o minusculas",
    ),
  simbolo: z
    .string()
    .trim()
    .min(1, "Por favor, ingrese un simbolo valido")
    .max(4, "El simbolo no debe superar los 4 caracteres"),
  tipo_magnitud: z.string().min(1, "Por favor, ingrese un tipo de magnitud"),
});

export type UnidadMedidaFormValues = z.infer<typeof unidadMedidaSchema>;
