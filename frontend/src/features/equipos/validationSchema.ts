import { z } from "zod";

/**
 * Fecha de hoy en formato `yyyy-mm-dd` usando la zona horaria local.
 *
 * `toISOString()` devuelve la fecha en UTC, por lo que de noche en Argentina
 * (UTC-3) adelantaba un día y dejaba cargar una fecha futura. Se arma con los
 * componentes locales para evitar ese corrimiento. Se exporta para reusarla
 * como `max` del input de fecha.
 */
const hoyLocalISO = () => {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
};

export const HOY_ISO = hoyLocalISO();

export const equipoSchema = z.object({
  nombre: z
    .string()
    .min(1, "El nombre es obligatorio")
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s]+$/, "Solo puede contener letras y números"),

  marca: z
    .string()
    .min(1, "La marca es obligatoria")
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s]+$/, "Solo puede contener letras y números"),

  numero_serie: z
    .string()
    .min(1, "El número de serie es obligatorio")
    .regex(/^[a-zA-Z0-9\-/]+$/, "Solo puede contener letras, números, guiones (-) y barras (/)"),

  categoria: z.string().min(1, "La categoría es obligatoria"),

  sector_id: z.coerce.number().min(1, "El sector es obligatorio"),

  ubicacion: z.string().optional(),

  frecuencia_calibracion_dias: z.preprocess(
    (val) =>
      val === "" || val === undefined || val === null ? null : Number(val),
    z
      .number("La frecuencia de calibración debe ser un número")
      .positive("La frecuencia de calibración debe ser mayor a 0 días")
      .nullable()
      .optional(),
  ),

  fecha_ultima_calibracion: z.preprocess(
    (val) => (val === "" || val === undefined ? null : val),
    z
      .string()
      .refine((val) => !val || val <= HOY_ISO, {
        message: "La fecha de última calibración no puede ser futura",
      })
      .nullable()
      .optional(),
  ),
});

export type EquipoFormValues = z.infer<typeof equipoSchema>;