import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Box, Field, HStack, Input, Separator, Text, VStack } from "@chakra-ui/react";
import { FiUpload, FiXCircle } from "react-icons/fi";

import {
  AlertMessage,
  CancelButton,
  FormActions,
  FormModal,
  SubmitButton,
  TextAreaField,
  TextField,
} from "../../../components/ui";
import { subirVersionSchema } from "../validationSchema";
import { useDocumentoVersiones } from "../hooks/useDocumentoVersiones";
import { useAuth } from "../../auth/useAuth";
import { PdfArchivoField } from "./PdfArchivoField";
import { hoyLocalISO } from "../utils";
import type { Documento, SubirVersionFormData } from "../types";

type SubirVersionFormValues = import("zod").output<typeof subirVersionSchema>;

interface SubirVersionModalProps {
  open: boolean;
  documento: Documento;
  onClose: () => void;
  onExito: () => void;
}

// Modal "Subir Nueva Versión de Documento". Cabecera de solo lectura (documento + versión vigente actual) y luego los campos de la nueva versión.
export const SubirVersionModal = ({
  open,
  documento,
  onClose,
  onExito,
}: SubirVersionModalProps) => {
  const { usuario } = useAuth();
  const { subirNuevaVersion, isSubmitting } = useDocumentoVersiones();

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    watch,
    formState: { errors },
  } = useForm<SubirVersionFormValues>({
    resolver: zodResolver(subirVersionSchema),
    defaultValues: {
      version: "",
      fecha_proxima_revision: "",
      observaciones_cambio: "",
    },
  });

  const archivo = watch("archivo") ?? null;

  const onSubmit = async (values: SubirVersionFormValues) => {
    if (!usuario) {
      setError("root", { message: "No se identificó al usuario autenticado." });
      return;
    }

    const datos: SubirVersionFormData = {
      archivo: values.archivo ?? null,
      version: values.version.trim(),
      fecha_proxima_revision: values.fecha_proxima_revision || undefined,
      observaciones_cambio: values.observaciones_cambio || undefined,
    };

    const res = await subirNuevaVersion(documento.id, datos, usuario.personaId);
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
      title="Subir Nueva Versión de Documento"
      titleIcon={FiUpload}
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
              <Text as="span" fontWeight="bold">Versión Vigente Actual:</Text>{" "}
              {documento.version_vigente?.version ?? "—"}
            </Text>
          </Box>

          <Separator />

          {errors.root?.message && <AlertMessage type="error" message={errors.root.message} />}

          {/* Versión (obligatoria) + fecha de próxima revisión (opcional) */}
          <HStack gap={4} align="start" flexWrap="wrap">
            <Box flex="1" minW="150px">
              <TextField
                label="Número de Nueva Versión (*)"
                placeholder="ej. v1.3"
                error={errors.version?.message}
                {...register("version")}
              />
            </Box>
            <Box flex="1" minW="170px">
              <Field.Root invalid={!!errors.fecha_proxima_revision}>
                <Field.Label fontSize="md" fontFamily="sans-serif">
                  Fecha de Próxima Revisión
                </Field.Label>
                <Input type="date" min={hoyLocalISO} {...register("fecha_proxima_revision")} />
                {errors.fecha_proxima_revision && (
                  <Field.ErrorText>
                    {errors.fecha_proxima_revision.message as string}
                  </Field.ErrorText>
                )}
              </Field.Root>
            </Box>
          </HStack>

          {/* Mismo dropzone que en el alta de documentos (obligatorio acá) */}
          <PdfArchivoField
            label="Nuevo Archivo PDF Oficial (*)"
            value={archivo}
            onChange={(file) => {
              if (file) setValue("archivo", file, { shouldValidate: true });
            }}
            error={errors.archivo?.message as string | undefined}
          />

          <TextAreaField
            label="Observaciones del Cambio / Motivo"
            placeholder="ej. Se actualizó el producto sanitante y se modificó la dosis del paso 2 de desinfección."
            error={errors.observaciones_cambio?.message}
            {...register("observaciones_cambio")}
          />

          <FormActions>
            <CancelButton text="Cancelar" onClick={onClose} icon={FiXCircle} />
            <SubmitButton
              text="Subir y Activar"
              loading={isSubmitting}
              type="submit"
              icon={FiUpload}
            />
          </FormActions>
        </VStack>
      </form>
    </FormModal>
  );
};
