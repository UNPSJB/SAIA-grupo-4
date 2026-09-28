import { z } from "zod";

// El select de Sector/Equipo usa "" como centinela de "Sin asignar", pero al
// precargar desde la API el valor llega como null. Aceptamos ambos y siempre
// emitimos number | null, que es lo que espera el payload.
const opcionalId = z
  .union([
    z.literal(""),
    z.null(),
    z.coerce.number().int().min(1, "Seleccione una opción válida"),
  ])
  .optional()
  .transform((v) => (v === "" || v === null || v === undefined ? null : v));

export const elementoLimpiezaSchema = z
  .object({
    nombre: z.string().trim().min(1, "El nombre es obligatorio"),
    tipo_id: z.coerce.number().int().min(1, "Debe seleccionar un tipo"),
    sector_id: opcionalId,
    equipo_id: opcionalId,
    // Opcional: vacío se envía como null. Si tiene valor debe ser un entero
    // >= 1, igual que el gt=0 del backend.
    frecuencia_recambio_dias: z
      .union([z.literal(""), z.null(), z.string().regex(/^-?\d+$/, "Solo números")])
      .optional()
      .transform((v) =>
        v === "" || v === null || v === undefined ? null : Number(v),
      )
      .refine((v) => v === null || v >= 1, {
        message: "Debe ser un número entero mayor a 0",
      }),
  })
  // Espejo de validar_ubicacion_exclusiva en backend/src/elementos_limpieza/schemas.py
  .refine((v) => v.sector_id === null || v.equipo_id === null, {
    message:
      "No se puede asignar un sector y un equipo al mismo tiempo. Elegí uno o ninguno.",
    path: ["equipo_id"],
  });

export type ElementoLimpiezaFormValues = z.output<typeof elementoLimpiezaSchema>;
export type ElementoLimpiezaFormInput = z.input<typeof elementoLimpiezaSchema>;
