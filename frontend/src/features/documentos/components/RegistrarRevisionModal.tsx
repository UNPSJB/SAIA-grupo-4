import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Box, Field, HStack, Input, Separator, Text, VStack } from "@chakra-ui/react";
import { FiCheckCircle, FiXCircle } from "react-icons/fi";

import {
  AlertMessage,
  CancelButton,
  FormActions,
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

interface RegistrarRevisionModalProps {
  open: boolean;
  documento: Documento;
  onClose: () => void;
  onExito: () => void;
}


// Modal "Registrar Revisión Periódica". El documento se revisó pero SIGUE vigente el mismo PDF: solo se renueva el vencimiento y/o se asientan notas de auditoría.
export const RegistrarRevisionModal = ({
  open,
  documento,
  onClose,
  onExito,
}: RegistrarRevisionModalProps) => {
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
      registrado_por_id: usuario.personaId,
    };

    const res = await registrarRevision(documento.id, versionVigente.id, datos);
    if (res.status === "success") {
      onExito();
    } else {
      setError("root", { message: res.message });
    }
  };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Registrar Revisión Periódica"
      titleIcon={FiCheckCircle}
      showClose
    >
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
            <CancelButton text="Cancelar" onClick={onClose} icon={FiXCircle} />
            <SubmitButton
              text="Confirmar Revisión"
              loading={isSubmitting}
              type="submit"
              icon={FiCheckCircle}
            />
          </FormActions>
        </VStack>
      </form>
    </FormModal>
  );
};
