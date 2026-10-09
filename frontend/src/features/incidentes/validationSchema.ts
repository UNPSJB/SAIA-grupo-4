import { z } from "zod";

export const incidenteSchema = z.object({
  titulo: z
    .string()
    .trim()
    .min(1, "Por favor, ingrese un título valido")
    .max(100, "El título no puede superar los 100 caracteres")
    .regex(
      /^[A-Za-zÁÉÍÓÚáéíóúÑñ 0-9]{1,100}$/,
      "El título solo debe contener letras mayusculas o minusculas",
    ),

  descripcion: z
    .string()
    .trim()
    .min(1, "Por favor, ingrese una descripción valida")
    .max(500, "La descripción no puede superar los 500 caracteres"),

  foto_url: z
    .string()
    .max(255)
    .optional(),

  fecha_hora_reporte: z
    .iso
    .datetime(),

  reportante_id: z
    .number()
    .int()
    .positive(),

  tipo_id: z
    .string()
    .min(1, "Seleccione un tipo")
    .transform(Number)
    .pipe(z.number().int().positive()),

  })
  .superRefine((data, ctx) => {
    // Validación adicional si es necesario
    });

export type IncidenteFormValues = z.infer<typeof incidenteSchema>;
export type IncidenteFormInput = z.input<typeof incidenteSchema>;