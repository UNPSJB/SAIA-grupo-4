import { z } from "zod";

export const tareaSchema = z
  .object({
    nombre: z
      .string()
      .trim()
      .min(1, "El nombre de la tarea es obligatorio")
      .regex(
        /^[A-Za-zÁÉÍÓÚáéíóúÑñ0-9\s.,()/-]+$/,
        "Solo puede contener letras, números, espacios y estos signos: . , ( ) / -",
      ),
    destino_tipo: z.enum(["equipo", "sector"]),
    equipo_id: z.coerce.number().int().optional(),
    sector_id: z.coerce.number().int().optional(),
    momento: z.enum(["pre-operacional", "operacional", "post-operacional"]),
    periodicidad: z.enum(["diaria", "semanal", "mensual", "dias-especificos"]),
    dias: z.array(z.string()).default([]),
    dia_mes: z.coerce.number().int().optional(),
    pasos: z
      .string()
      .trim()
      .min(1, "Cargá la guía paso a paso (un paso por línea)"),
    insumos_quimicos: z.array(z.coerce.number().int()).default([]),
    elementos_limpieza: z.array(z.coerce.number().int()).default([]),
  })
  .superRefine((val, ctx) => {
    if (val.destino_tipo === "equipo" && !val.equipo_id) {
      ctx.addIssue({
        code: "custom",
        path: ["equipo_id"],
        message: "Seleccioná un equipo de destino",
      });
    }
    if (val.destino_tipo === "sector" && !val.sector_id) {
      ctx.addIssue({
        code: "custom",
        path: ["sector_id"],
        message: "Seleccioná un sector de destino",
      });
    }
    if (val.periodicidad === "semanal" && val.dias.length !== 1) {
      ctx.addIssue({
        code: "custom",
        path: ["dias"],
        message: "Seleccioná un día de la semana",
      });
    }
    if (
      val.periodicidad === "mensual" &&
      (!val.dia_mes || val.dia_mes < 1 || val.dia_mes > 31)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["dia_mes"],
        message: "Ingresá un día entre 1 y 31",
      });
    }
    if (val.periodicidad === "dias-especificos" && val.dias.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["dias"],
        message: "Seleccioná al menos un día de la semana",
      });
    }
    if (val.insumos_quimicos.length === 0 && val.elementos_limpieza.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["elementos_limpieza"],
        message:
          "La tarea debe incluir al menos un insumo químico o un elemento de limpieza.",
      });
    }
  });

export type TareaFormInput = z.input<typeof tareaSchema>;
export type TareaFormValues = z.output<typeof tareaSchema>;

export const planSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, "El nombre del plan es obligatorio")
    .regex(
      /^[A-Za-zÁÉÍÓÚáéíóúÑñ0-9\s.,()/-]+$/,
      "El nombre solo puede contener letras, números y espacios",
    ),
  objetivo: z.string().optional(),
  elaborado_por_id: z.coerce.number().int().optional(),
});

export type PlanFormInput = z.input<typeof planSchema>;
export type PlanFormValues = z.output<typeof planSchema>;