import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { Center, Text, VStack } from "@chakra-ui/react";
import { FiLogIn, FiShield } from "react-icons/fi";
import { useAuth } from "../features/auth/useAuth";
import { esAdministrador } from "../features/auth/roles";
import {
  loginSchema,
  type LoginFormInput,
  type LoginFormValues,
} from "../features/auth/validationSchema";
import {
  AlertMessage,
  FormActions,
  FormContainer,
  FormHeader,
  SubmitButton,
  TextField,
} from "../components/ui";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginFormInput, unknown, LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { documento: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      // valida el DNI contra el backend y persiste la sesión
      const usuario = await login(values.documento);
      // el destino depende del rol: administrar → gestión, resto → operador
      navigate(esAdministrador(usuario) ? "/equipos" : "/operador", {
        replace: true,
      });
    } catch (err) {
      setError("root", {
        message:
          err instanceof Error ? err.message : "No se pudo iniciar sesión.",
      });
    }
  });

  return (
    <Center minH='100vh' bg='gray.100'>
      <FormContainer>
        <FormHeader title='Iniciar sesión' icon={FiShield} />

        <VStack gap={4} align='stretch'>
          <Text color='gray.500'>Ingresá con tu número de documento</Text>

          <form onSubmit={onSubmit} noValidate>
            <VStack gap={4} align='stretch'>
              <TextField
                label='Número de documento'
                placeholder='Ej. 30123456'
                error={errors.documento?.message}
                {...register("documento")}
              />

              <FormActions>
                <SubmitButton
                  text='Ingresar'
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
      </FormContainer>
    </Center>
  );
}