import { z } from "zod";

export const insumoQuimicoSchema = z
  .object({
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

    equipo_id: z
      .string()
      .optional()
      .or(z.literal("")),

    sector_id: z
      .string()
      .optional()
      .or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    const tieneEquipo = !!data.equipo_id && data.equipo_id !== "";
    const tieneSector = !!data.sector_id && data.sector_id !== "";

    if (tieneEquipo && tieneSector) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["equipo_id"],
        message: "Debe elegir solo un equipo o solo un sector.",
      });
    }
  });

export type InsumoQuimicoFormValues = z.infer<typeof insumoQuimicoSchema>;