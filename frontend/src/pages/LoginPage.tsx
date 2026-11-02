/*
 frontend/src/pages/LoginPage.tsx
 Página de login un solo paso (DNI + contraseña).

 - Formulario simple: Documento (DNI) y Contraseña.
 - Llama a authContext.login(dni, password).
 - Muestra mensajes de error del backend (CredencialesIncorrectas,
   CapacidadesNoHabilitadas u otros). Son 401 genéricos por diseño.
 - Tras login exitoso, AuthProvider actualiza el usuario y el router
   (App.tsx) redirige según capacidades (admin → /equipos, operador → /checklist).
*/

import { Box, VStack, Text, Button } from "@chakra-ui/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../features/auth/useAuth";
import {
  FormContainer,
  FormHeader,
  TextField,
  FormActions,
  SubmitButton,
  CancelButton,
  AlertMessage,
} from "../components/ui";
import { FiLogIn, FiXCircle } from "react-icons/fi";

const loginSchema = z.object({
  username: z
    .string()
    .min(1, "El DNI es obligatorio")
    .regex(/^\d+$/, "Solo números"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

type LoginFormInput = z.input<typeof loginSchema>;
type LoginFormValues = z.output<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [errorRoot, setErrorRoot] = useState<string | null>(null);
  const [successRoot, setSuccessRoot] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
  } = useForm<LoginFormInput, unknown, LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const toggleShowPassword = () => setShowPassword((prev) => !prev);

  const onSubmit = handleSubmit(async (values) => {
    setErrorRoot(null);
    setSuccessRoot(null);
    clearErrors("root");
    try {
      await login(values.username, values.password);
      setSuccessRoot("Inicio de sesión exitoso");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Error al iniciar sesión";
      const finalMsg = msg || "Documento o contraseña incorrectos.";
      setErrorRoot(finalMsg);
      setError("root", { message: finalMsg });
    }
  });

  return (
    <Box
      minH='100vh'
      display='flex'
      alignItems='center'
      justifyContent='center'
      bg='gray.50'
      p={4}
    >
      <FormContainer modal={false}>
        <FormHeader title='Iniciar sesión' icon={FiLogIn} />
        <form onSubmit={onSubmit} noValidate>
          <VStack gap={4} align='stretch'>
            <TextField
              label='Documento'
              placeholder='Ingresá tu DNI'
              error={errors.username?.message}
              {...register("username")}
            />
            <Box width='100%'>
              <Text
                fontSize='md'
                fontFamily='sans-serif'
                mb={1}
                fontWeight='bold'
              >
                Contraseña
              </Text>
              <Box position='relative' width='100%'>
                <input
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                  placeholder='Ingresá tu contraseña'
                  autoComplete='current-password'
                  disabled={isSubmitting}
                  style={{
                    width: "100%",
                    padding: "8px 76px 8px 12px",
                    borderRadius: "6px",
                    fontSize: "14px",
                  }}
                />
                <Button
                  position='absolute'
                  right='2'
                  top='50%'
                  transform='translateY(-50%)'
                  h='1.75rem'
                  size='xs'
                  variant='ghost'
                  onClick={toggleShowPassword}
                  disabled={isSubmitting}
                >
                  {showPassword ? "Ocultar" : "Mostrar"}
                </Button>
              </Box>
              {errors.password?.message && (
                <Text color='red.500' fontSize='sm' mt={1}>
                  {errors.password.message}
                </Text>
              )}
            </Box>

            {successRoot && (
              <AlertMessage type='success' message={successRoot} />
            )}
            {errorRoot && <AlertMessage type='error' message={errorRoot} />}

            <FormActions>
              <SubmitButton
                text='Ingresar'
                icon={FiLogIn}
                loading={isSubmitting}
                type='submit'
                colorPalette='green'
              />
              <CancelButton
                text='Limpiar'
                icon={FiXCircle}
                type='reset'
                onClick={() => {
                  clearErrors();
                  setErrorRoot(null);
                  setSuccessRoot(null);
                }}
                colorPalette='red'
                variant='outline'
              />
            </FormActions>
          </VStack>
        </form>
      </FormContainer>
    </Box>
  );
}
