import { z } from "zod";

export const loginSchema = z.object({
  documento: z
    .string()
    .min(1, "Ingresá tu número de documento")
    .regex(/^\d+$/, "Solo números"),
});

export type LoginFormValues = z.output<typeof loginSchema>;
export type LoginFormInput = z.input<typeof loginSchema>;