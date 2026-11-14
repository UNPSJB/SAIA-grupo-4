import { z } from "zod";

const CLASES_SIN_INS = [
  "aromatizante",
  "saborizante",
  "aromatizante / saborizante",
  "aromatizante/saborizante",
];

const nutrienteOpcional = (etiqueta: string) =>
  z
    .string()
    .optional()
    .refine(
      (val) => !val || val.trim() === "" || (!isNaN(Number(val)) && Number(val) >= 0),
      { message: `${etiqueta} debe ser un número mayor o igual a 0` },
    );

export const insumoSchema = z
  .object({
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
    denominacion_rotulo: z.string().optional(),
    clase_funcional: z.string().optional(),
    numero_ins: z.string().optional(),

    // Nutrición cada 100g / 100ml
    base_calculo: z.enum(["100g", "100ml"]).optional(),
    alimento_referencia_id: z.string().optional(),
    fuente_nutricional: z.string().max(200, "Máximo 200 caracteres").optional(),
    valor_energetico_kcal: nutrienteOpcional("El valor energético"),
    carbohidratos_g: nutrienteOpcional("Los carbohidratos"),
    azucares_totales_g: nutrienteOpcional("Los azúcares totales"),
    azucares_anadidos_g: nutrienteOpcional("Los azúcares añadidos"),
    proteinas_g: nutrienteOpcional("Las proteínas"),
    grasas_totales_g: nutrienteOpcional("Las grasas totales"),
    grasas_saturadas_g: nutrienteOpcional("Las grasas saturadas"),
    grasas_trans_g: nutrienteOpcional("Las grasas trans"),
    fibra_g: nutrienteOpcional("La fibra alimentaria"),
    sodio_mg: nutrienteOpcional("El sodio"),
  })
  .superRefine((data, ctx) => {
    const cat = (data.categoria || "").trim().toLowerCase();
    if (cat === "aditivo") {
      const cf = (data.clase_funcional || "").trim();
      if (!cf) {
        ctx.addIssue({
          code: "custom",
          path: ["clase_funcional"],
          message: "La clase funcional es obligatoria para aditivos",
        });
      } else if (!CLASES_SIN_INS.includes(cf.toLowerCase())) {
        const ins = (data.numero_ins || "").trim();
        if (!ins) {
          ctx.addIssue({
            code: "custom",
            path: ["numero_ins"],
            message: "El número INS es obligatorio (excepto para aromatizantes)",
          });
        }
      }
    }
  });

export type InsumoFormValues = z.infer<typeof insumoSchema>;
