import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { Center, Text, VStack } from "@chakra-ui/react";
import { FiCheck, FiLogIn, FiShield, FiUserCheck } from "react-icons/fi";
import { useAuth } from "../features/auth/useAuth";
import { esAdministrador } from "../features/auth/roles";
import { verificarDocumento } from "../features/auth/authService";
import type { Persona } from "../features/personal/types";
import {
  loginSchema,
  type LoginFormInput,
  type LoginFormValues,
} from "../features/auth/validationSchema";
import {
  AlertMessage,
  CancelButton,
  FormActions,
  FormContainer,
  FormHeader,
  SubmitButton,
  TextField,
} from "../components/ui";

type Paso = "formulario" | "verificar";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  // Paso 1: formulario → Paso 2: confirmación de identidad.
  const [paso, setPaso] = useState<Paso>("formulario");
  const [personaVerificada, setPersonaVerificada] = useState<Persona | null>(
    null,
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
  } = useForm<LoginFormInput, unknown, LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { documento: "" },
  });

  // Paso 1: verifica que el DNI exista y esté activo (sin persistir sesión).
  const verificarIdentidad = handleSubmit(async (values) => {
    try {
      const persona = await verificarDocumento(values.documento);
      setPersonaVerificada(persona);
      setPaso("verificar");
    } catch (err) {
      setError("root", {
        message:
          err instanceof Error ? err.message : "No se pudo iniciar sesión.",
      });
    }
  });

  // Paso 2: recién acá se persiste la sesión y se navega por rol.
  const confirmarIngreso = () => {
    if (!personaVerificada) return;
    const usuario = login(personaVerificada);
    navigate(esAdministrador(usuario) ? "/equipos" : "/operador", {
      replace: true,
    });
  };

  const volverAlFormulario = () => {
    setPersonaVerificada(null);
    setPaso("formulario");
    clearErrors("root");
  };

  return (
    <Center minH='100vh' bg='gray.100'>
      <FormContainer>
        {paso === "formulario" ? (
          <>
            <FormHeader title='Iniciar sesión' icon={FiShield} />

            <VStack gap={4} align='stretch'>
              <Text color='gray.500'>Ingresá con tu número de documento</Text>

              <form onSubmit={verificarIdentidad} noValidate>
                <VStack gap={4} align='stretch'>
                  <TextField
                    label='Número de documento'
                    placeholder='Ej. 30123456'
                    error={errors.documento?.message}
                    {...register("documento")}
                  />

                  <FormActions>
                    <SubmitButton
                      text='Continuar'
                      icon={FiLogIn}
                      type='submit'
                      loading={isSubmitting}
                      colorPalette='green'
                    />
                  </FormActions>

                  {errors.root?.message && (
                    <AlertMessage type='error' message={errors.root.message} />
                  )}
                </VStack>
              </form>
            </VStack>
          </>
        ) : (
          personaVerificada && (
            <>
              <FormHeader title='Verificar identidad' icon={FiUserCheck} />

              <VStack gap={4} align='stretch'>
                <Text color='gray.500'>
                  Se encontró la siguiente persona:
                </Text>
                <Text fontWeight='bold' fontSize='lg'>
                  {personaVerificada.nombre} {personaVerificada.apellido}
                </Text>
                <Text color='gray.600'>
                  DNI {personaVerificada.dni} · Legajo{" "}
                  {personaVerificada.legajo}
                </Text>
                <Text color='gray.600'>
                  Capacidades:{" "}
                  {personaVerificada.capacidades
                    .filter((pc) => pc.activo)
                    .map((pc) => pc.capacidad.nombre)
                    .join(", ")}
                </Text>
                <Text color='gray.500'>
                  ¿Confirmás que sos vos e iniciás sesión?
                </Text>

                <FormActions>
                  <SubmitButton
                    text='Confirmar ingreso'
                    icon={FiCheck}
                    colorPalette='green'
                    onClick={confirmarIngreso}
                  />
                  <CancelButton
                    text='Volver'
                    icon={FiLogIn}
                    onClick={volverAlFormulario}
                  />
                </FormActions>
              </VStack>
            </>
          )
        )}
      </FormContainer>
    </Center>
  );
}