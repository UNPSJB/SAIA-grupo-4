import { z } from "zod";

const nutrienteField = (etiqueta: string) =>
  z
    .string()
    .trim()
    .refine(
      (val) => val !== "" && !isNaN(Number(val)) && Number(val) >= 0,
      { message: `${etiqueta} debe ser un número mayor o igual a 0` },
    );

export const alimentoReferenciaSchema = z.object({
  codigo: z
    .string()
    .trim()
    .max(20, "El código no debe superar los 20 caracteres")
    .optional(),
  alimento: z
    .string()
    .trim()
    .min(1, "El nombre del alimento es obligatorio")
    .max(200, "El nombre no debe superar los 200 caracteres"),
  categoria: z.string().optional(),
  energia_kcal: nutrienteField("La energía"),
  carbohidratos_g: nutrienteField("Los carbohidratos"),
  proteinas_g: nutrienteField("Las proteínas"),
  grasas_totales_g: nutrienteField("Las grasas totales"),
  grasas_saturadas_g: nutrienteField("Las grasas saturadas"),
  fibra_g: nutrienteField("La fibra"),
  sodio_mg: nutrienteField("El sodio"),
});

export type AlimentoReferenciaFormValues = z.infer<typeof alimentoReferenciaSchema>;
