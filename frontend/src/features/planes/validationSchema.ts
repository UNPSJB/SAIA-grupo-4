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
    quimicos: z.array(z.string()).default([]),
    elementos: z.array(z.string()).default([]),
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
  });

export type TareaFormInput = z.input<typeof tareaSchema>;
export type TareaFormValues = z.output<typeof tareaSchema>;

export const planSchema = z.object({
  nombre_plan: z
    .string()
    .trim()
    .min(1, "El nombre del plan es obligatorio")
    .regex(
      /^[A-Za-zÁÉÍÓÚáéíóúÑñ0-9\s.,()/-]+$/,
      "El nombre solo puede contener letras, números y espacios",
    ),
  version: z
    .string()
    .trim()
    .min(1, "La versión es obligatoria")
    .regex(/^v?\d+\.\d+$/, "Formato esperado, por ejemplo: v1.2 o 1.2"),
  objetivo: z.string().optional(),
  descripcion: z.string().optional(),
});

export type PlanFormInput = z.input<typeof planSchema>;
export type PlanFormValues = z.output<typeof planSchema>;