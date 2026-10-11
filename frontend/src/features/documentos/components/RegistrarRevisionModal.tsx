import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Box, Field, HStack, Input, Separator, Text, VStack } from "@chakra-ui/react";
import { FiCheckCircle, FiXCircle } from "react-icons/fi";

import {
  AlertMessage,
  CancelButton,
  FormActions,
  FormContainer,
  FormHeader,
  FormModal,
  SubmitButton,
  TextAreaField,
} from "../../../components/ui";
import { registrarRevisionSchema } from "../validationSchema";
import { useDocumentoVersiones } from "../hooks/useDocumentoVersiones";
import { useAuth } from "../../auth/useAuth";
import { ProximaRevision } from "../ProximaRevision";
import { hoyLocalISO, sumarUnAnio } from "../utils";
import type { Documento, RegistrarRevisionFormData } from "../types";

type RegistrarRevisionFormValues = import("zod").output<typeof registrarRevisionSchema>;

type RegistrarRevisionFormProps = {
  documento: Documento;
  onCancelar?: () => void;
  onGuardado?: () => void;
  /** Sirve igual dentro del modal propio o dentro del modal del tablero. */
  enModal?: boolean;
};

/**
 * Formulario de revisión periódica, sin overlay.
 *
 * Es la implementación única: `RegistrarRevisionModal` (acá abajo, módulo de
 * documentos) y el tablero de vencimientos la reusan. El documento se revisó
 * pero SIGUE vigente el mismo PDF: solo se renueva el vencimiento y/o se
 * asientan notas de auditoría.
 */
export const RegistrarRevisionForm = ({
  documento,
  onCancelar,
  onGuardado,
  enModal = false,
}: RegistrarRevisionFormProps) => {
  const { usuario } = useAuth();
  const { registrarRevision, isSubmitting } = useDocumentoVersiones();

  const versionVigente = documento.version_vigente;

  // Sugerencia +1 año: sobre el vencimiento actual si no está vencido, si no se parte desde hoy (no se puede sugerir una fecha que ya pasó)
  const fechaSugerida = (() => {
    const actual = versionVigente?.fecha_proxima_revision;
    const base = actual && actual >= hoyLocalISO ? actual : hoyLocalISO;
    return sumarUnAnio(base);
  })();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegistrarRevisionFormValues>({
    resolver: zodResolver(registrarRevisionSchema),
    defaultValues: {
      // Precargada con vencimiento actual + 1 año (el usuario puede cambiarla o vaciarla)
      fecha_proxima_revision: fechaSugerida,
      observaciones: "",
    },
  });

  const onSubmit = async (values: RegistrarRevisionFormValues) => {
    if (!usuario) {
      setError("root", { message: "No se identificó al usuario autenticado." });
      return;
    }
    if (!versionVigente) {
      setError("root", { message: "El documento no tiene una versión vigente para revisar." });
      return;
    }

    const datos: RegistrarRevisionFormData = {
      fecha_proxima_revision: values.fecha_proxima_revision || undefined,
      observaciones: values.observaciones || undefined,
      registrado_por_id: usuario.id,
    };

    const res = await registrarRevision(documento.id, versionVigente.id, datos);
    if (res.status === "success") {
      onGuardado?.();
    } else {
      setError("root", { message: res.message });
    }
  };

  return (
    <FormContainer modal={enModal}>
      <FormHeader title="Registrar Revisión Periódica" icon={FiCheckCircle} />

      <form onSubmit={handleSubmit(onSubmit)}>
        <VStack gap={4} align="stretch">
          {/* Cabecera de solo lectura */}
          <Box bg="gray.50" borderWidth="1px" borderColor="gray.200" borderRadius="md" p={4}>
            <Text fontSize="sm" color="gray.700">
              <Text as="span" fontWeight="bold">Documento:</Text>{" "}
              {documento.codigo ? `${documento.codigo} - ` : ""}
              {documento.titulo}
            </Text>
            <Text fontSize="sm" color="gray.700" mt={1}>
              <Text as="span" fontWeight="bold">Validando Versión Vigente:</Text>{" "}
              {versionVigente?.version ?? "—"}
            </Text>
            <HStack gap={2} mt={1} align="center">
              <Text fontSize="sm" fontWeight="bold" color="gray.700">
                Vencimiento Actual:
              </Text>
              <ProximaRevision fecha={versionVigente?.fecha_proxima_revision ?? null} />
            </HStack>
          </Box>

          <Separator />

          {errors.root?.message && <AlertMessage type="error" message={errors.root.message} />}

          {/* Nueva fecha (precargada +1 año) */}
          <Field.Root invalid={!!errors.fecha_proxima_revision}>
            <Field.Label fontSize="md" fontFamily="sans-serif">
              Nueva Fecha de Próxima Revisión
            </Field.Label>
            <Input type="date" min={hoyLocalISO} {...register("fecha_proxima_revision")} />
            <Text fontSize="sm" color="gray.500" mt={1}>
              (Sugerida: +1 año)
            </Text>
            {errors.fecha_proxima_revision && (
              <Field.ErrorText>
                {errors.fecha_proxima_revision.message as string}
              </Field.ErrorText>
            )}
          </Field.Root>

          <TextAreaField
            label="Observaciones de la Revisión (Notas de Auditoría)"
            placeholder="ej. Revisión anual de BPM/POES realizada por Control de Calidad. El procedimiento se mantiene vigente sin modificaciones."
            error={errors.observaciones?.message}
            {...register("observaciones")}
          />

          <FormActions>
            <CancelButton text="Cancelar" onClick={onCancelar} icon={FiXCircle} />
            <SubmitButton
              text="Confirmar Revisión"
              loading={isSubmitting}
              type="submit"
              icon={FiCheckCircle}
            />
          </FormActions>
        </VStack>
      </form>
    </FormContainer>
  );
};

interface RegistrarRevisionModalProps {
  open: boolean;
  documento: Documento;
  onClose: () => void;
  onExito: () => void;
}

/**
 * Overlay del módulo de documentos para registrar una revisión.
 *
 * Solo aporta el Dialog; la lógica y el PATCH viven en
 * `RegistrarRevisionForm`, que está en este mismo archivo y que el tablero de
 * vencimientos reusa dentro de su propio modal para la renovación.
 */
export const RegistrarRevisionModal = ({
  open,
  documento,
  onClose,
  onExito,
}: RegistrarRevisionModalProps) => {
  if (!open || !documento) return null;

  return (
    <FormModal open onClose={onClose}>
      <RegistrarRevisionForm
        documento={documento}
        enModal
        onCancelar={onClose}
        onGuardado={() => {
          onExito();
          onClose();
        }}
      />
    </FormModal>
  );
};