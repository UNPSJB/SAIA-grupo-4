import { z } from "zod";

export const configuracionSchema = z.object({
  nombre_establecimiento: z
    .string()
    .trim()
    .min(1, "El nombre del establecimiento es obligatorio.")
    .max(150, "Máximo 150 caracteres."),
  razon_social: z.string().max(150, "Máximo 150 caracteres.").optional().or(z.literal("")),
  cuit: z
    .string()
    .trim()
    .refine((val) => val === "" || /^\d{11}$/.test(val.replace(/-/g, "")), {
      message: "El CUIT debe contener exactamente 11 dígitos numéricos.",
    })
    .optional()
    .or(z.literal("")),
  direccion: z.string().max(200, "Máximo 200 caracteres.").optional().or(z.literal("")),
  localidad: z.string().max(100, "Máximo 100 caracteres.").optional().or(z.literal("")),
  provincia: z.string().max(100, "Máximo 100 caracteres.").optional().or(z.literal("")),
  telefono: z.string().max(50, "Máximo 50 caracteres.").optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .refine((val) => val === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
      message: "Ingrese un correo electrónico válido.",
    })
    .max(150, "Máximo 150 caracteres.")
    .optional()
    .or(z.literal("")),
  sitio_web: z.string().max(200, "Máximo 200 caracteres.").optional().or(z.literal("")),
  pie_informes: z.string().max(500, "Máximo 500 caracteres.").optional().or(z.literal("")),
});

export type ConfiguracionFormValues = z.infer<typeof configuracionSchema>;

export const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 MB
export const TIPOS_LOGO_PERMITIDOS = ["image/png", "image/jpeg", "image/webp"];

export const validarArchivoLogo = (file: File): string | null => {
  if (!TIPOS_LOGO_PERMITIDOS.includes(file.type)) {
    return "El logo debe ser una imagen en formato PNG, JPG o WebP.";
  }
  if (file.size > MAX_LOGO_BYTES) {
    return "El tamaño del logo no puede superar los 2 MB.";
  }
  return null;
};