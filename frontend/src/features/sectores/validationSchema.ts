import { z } from "zod";

export const sectorSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, "Por favor, ingrese un nombre para el sector")
    .regex(
      /^[A-Za-zÁÉÍÓÚáéíóúÑñ 0-9]{1,50}$/,
      "El nombre solo debe contener letras o números"
    ),
});

export type SectorFormValues = z.infer<typeof sectorSchema>;