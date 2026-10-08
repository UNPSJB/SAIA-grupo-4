import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { VStack, Field, Input, Text, Box } from "@chakra-ui/react";
import { FiFileText, FiEdit2, FiEye, FiSave, FiXCircle, FiCheckCircle, FiUpload } from "react-icons/fi";

import { useDocumentoSubmit } from "./hooks/useDocumentoSubmit";
import { documentoSchema } from "./validationSchema";
import type { Documento, DocumentoFormData } from "./types";
import { TIPOS_DOCUMENTO } from "./types";
import { useAuth } from "../auth/useAuth";

import {
  FormContainer,
  FormHeader,
  FormActions,
  TextField,
  SelectField,
  TextAreaField,
  SubmitButton,
  CancelButton,
  AlertMessage,
  AlertConfirm,
  DetalleSection,
  DetalleItem,
} from "../../components/ui";

type DocumentoFormValues = import("zod").output<typeof documentoSchema>;

type DocumentoFormProps = {
  modo: "crear" | "modificar" | "ver";
  documento?: Documento;
  onCancelar?: () => void;
  onGuardado?: () => void;
  enModal?: boolean;
};

// Formato exacto YYYY-MM-DD para el atributo 'min' del calendario (no permite fechas pasadas)
const hoyLocal = new Date().toLocaleDateString("sv-SE");

// Mismo formato que "Fecha de Subida" (toLocaleDateString). Se agrega
// "T00:00:00" para que JS parsee "YYYY-MM-DD" en hora local: sin ese sufijo
// lo interpreta en UTC y en Argentina se mostraría un día anterior.
const formatearFechaISO = (fecha: string) =>
  new Date(`${fecha}T00:00:00`).toLocaleDateString();

export const DocumentoForm = ({
  modo,
  documento,
  onCancelar,
  onGuardado,
  enModal = false,
}: DocumentoFormProps) => {
  const esModoVer = modo === "ver";
  const esModoCrear = modo === "crear";
  const esModoModificar = modo === "modificar";

  const defaultValues: DocumentoFormValues =
    esModoModificar || esModoVer
      ? {
          codigo: documento?.codigo || "",
          titulo: documento!.titulo,
          tipo_documento: documento!.tipo_documento,
          descripcion: documento?.descripcion || "",
        }
      : { 
          codigo: "", 
          titulo: "", 
          // Fuerza a que quede seleccionado el placeholder vacío (se valida en zod)
          tipo_documento: "" as unknown as DocumentoFormValues["tipo_documento"],
          descripcion: "",
          version_inicial: "v1.0",
          fecha_proxima_revision: ""
        };

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    watch,
    formState: { errors }
  } = useForm<DocumentoFormValues>({
    resolver: zodResolver(documentoSchema),
    defaultValues,
  });

  const archivoSeleccionado = watch("archivo");

  const { usuario } = useAuth();

  // Alta con un código que ya pertenece a un documento dado de baja:
  // el backend responde 409 con `documento_id` y aquí se ofrece reactivarlo.
  const [confirmarAltaAbierto, setConfirmarAltaAbierto] = useState(false);
  const [documentoInactivoId, setDocumentoInactivoId] = useState<number | null>(null);
  const [codigoEnviado, setCodigoEnviado] = useState("");
  const [errorConfirmar, setErrorConfirmar] = useState("");

  const { submit, isSubmitting } = useDocumentoSubmit({
    endpoint: "http://127.0.0.1:8000/documentos/", 
    method: esModoCrear ? "POST" : "PATCH",
    id: esModoModificar ? documento!.id : undefined,
    onInactivo: (documento_id) => {
      if (!esModoCrear) return;
      setErrorConfirmar("");
      setDocumentoInactivoId(documento_id);
      setConfirmarAltaAbierto(true);
    },
  });

  // Reactivación del documento existente (PATCH { activo: true })
  const reactivar = useDocumentoSubmit({
    endpoint: "http://127.0.0.1:8000/documentos/",
    method: "PATCH",
    id: documentoInactivoId ?? undefined,
    body: { activo: true },
    onSuccess: () => {
      setConfirmarAltaAbierto(false);
      setDocumentoInactivoId(null);
      onGuardado?.();
    },
  });

  const confirmarReactivacion = async () => {
    if (documentoInactivoId === null) return;
    setErrorConfirmar("");
    const res = await reactivar.submit();
    if (res.status === "error") setErrorConfirmar(res.message);
  };

  const onSubmit = async (values: DocumentoFormValues) => {
    // CASO de ALTA — el backend recibe multipart/form-data con el campo `datos`
    // (JSON con los metadatos + el autor obligatorio) y, si hay PDF, el `archivo`.
    if (esModoCrear) {
      if (!usuario) {
        setError("root", { message: "No se identificó al usuario autenticado." });
        return;
      }

      const datos: DocumentoFormData = {
        titulo: values.titulo,
        tipo_documento: values.tipo_documento,
        creado_por_id: usuario.personaId,
      };
      if (values.codigo && values.codigo.trim() !== "") datos.codigo = values.codigo.trim();
      if (values.descripcion && values.descripcion.trim() !== "") datos.descripcion = values.descripcion.trim();

      // La versión inicial y su fecha de revisión solo aplican si se adjunta el PDF
      if (values.archivo) {
        if (values.version_inicial) datos.version_inicial = values.version_inicial;
        if (values.fecha_proxima_revision) datos.fecha_proxima_revision = values.fecha_proxima_revision;
      }

      const formData = new FormData();
      formData.append("datos", JSON.stringify(datos));
      if (values.archivo) formData.append("archivo", values.archivo);

      // Se guarda para el mensaje del popup de reactivación (si corresponde)
      setCodigoEnviado(datos.codigo ?? "");

      const res = await submit(undefined, formData);
      if (res.status === "error") {
        setError("root", { message: res.message });
      } else if (res.status === "success") {
        onGuardado?.();
      }

    // CASO de MODIFICACIÓN — JSON puro a través del Hook (PATCH)
    } else {
      const payload: DocumentoFormData = {
        titulo: values.titulo,
        tipo_documento: values.tipo_documento,
      };

      // Solo se adjunta código y descripción si realmente escribieron algo
      if (values.codigo && values.codigo.trim() !== "") {
        payload.codigo = values.codigo.trim();
      }
      if (values.descripcion && values.descripcion.trim() !== "") {
        payload.descripcion = values.descripcion.trim();
      }

      const res = await submit(payload);
      if (res.status === "error") {
        setError("root", { message: res.message });
      } else if (res.status === "success") {
        onGuardado?.();
      }
    }
  };

  const opcionesTipo = TIPOS_DOCUMENTO.map(t => ({ label: t.replace('_', ' '), value: t }));


  // MODO LECTURA ("VER")

  if (esModoVer && documento) {
    return (
      <FormContainer modal={enModal}>
        <FormHeader title="Ver Documento" icon={FiEye} />
        
        <VStack gap={6} align="stretch" w="100%" mt={4}>
          <DetalleSection title="Información General" icon={FiFileText}>
            <DetalleItem label="Código">{documento.codigo || "S/C"}</DetalleItem>
            <DetalleItem label="Título">{documento.titulo}</DetalleItem>
            <DetalleItem label="Tipo de Documento">{documento.tipo_documento.replace('_', ' ')}</DetalleItem>
            <DetalleItem label="Descripción">{documento.descripcion || "Sin descripción"}</DetalleItem>
          </DetalleSection>

          {documento.version_vigente && (
            <DetalleSection title="Versión Vigente" icon={FiCheckCircle}>
              <DetalleItem label="Número de Versión">{documento.version_vigente.version}</DetalleItem>
              <DetalleItem label="Próxima Revisión">
                {documento.version_vigente.fecha_proxima_revision
                  ? formatearFechaISO(documento.version_vigente.fecha_proxima_revision)
                  : "No definida"}
              </DetalleItem>
              <DetalleItem label="Fecha de Subida">
                {new Date(documento.version_vigente.fecha_subida).toLocaleDateString()}
              </DetalleItem>
              <DetalleItem label="Subido por">
                {documento.version_vigente.subido_por_nombre || "Usuario desconocido"}
              </DetalleItem>
            </DetalleSection>
          )}
        </VStack>

        <FormActions>
          <CancelButton text="Cerrar" onClick={onCancelar} icon={FiXCircle} />
        </FormActions>
      </FormContainer>
    );
  }


  // MODO FORMULARIO (CREAR O MODIFICAR)

  return (
    <FormContainer modal={enModal}>
      <FormHeader
        title={esModoCrear ? "Nuevo Documento" : "Modificar Documento"}
        icon={esModoModificar ? FiEdit2 : FiFileText}
      />
      
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <VStack gap={4}>
          {errors.root?.message && <AlertMessage type="error" message={errors.root.message} />}

          <TextField
            label="Código (Opcional)"
            defaultValue={defaultValues.codigo}
            placeholder="Ej. POES-001 (Se autogenera)"
            error={errors.codigo?.message}
            {...register("codigo")}
          />

          <TextField
            label="Título"
            defaultValue={defaultValues.titulo}
            placeholder="Ej. Sanitización de Equipos"
            error={errors.titulo?.message}
            {...register("titulo")}
          />

          <SelectField
            label="Tipo de Documento"
            placeholder="Seleccioná un tipo"
            defaultValue={defaultValues.tipo_documento}
            options={opcionesTipo}
            error={errors.tipo_documento?.message}
            {...register("tipo_documento")}
          />

          <TextAreaField
            label="Descripción"
            defaultValue={defaultValues.descripcion}
            placeholder="Breve descripción..."
            error={errors.descripcion?.message}
            {...register("descripcion")}
          />

          {esModoCrear && (
            <Box w="100%" mt={4} pt={4} borderTop="1px solid" borderColor="gray.200">
              <Text fontSize="md" fontWeight="bold" mb={4} color="gray.600">
                Subir PDF (Opcional)
              </Text>
              
              <Field.Root invalid={!!errors.archivo} mb={4}>
                <Box
                  as="label"
                  cursor="pointer"
                  border="2px dashed"
                  borderColor={errors.archivo ? "red.400" : "gray.300"}
                  borderRadius="md"
                  p={4}
                  w="100%"
                  display="flex"
                  flexDirection="row"
                  alignItems="center"
                  justifyContent="center"
                  gap={3}
                  bg={archivoSeleccionado ? "green.50" : "gray.50"}
                  _hover={{ bg: archivoSeleccionado ? "green.100" : "gray.100" }}
                  transition="all 0.2s"
                >
                  {archivoSeleccionado ? (
                    <>
                      <Box color="green.500"><FiFileText size={24} /></Box>
                      <Text fontWeight="semibold" color="green.700">
                        {archivoSeleccionado.name}
                      </Text>
                      <Text fontSize="sm" color="green.600">(Cambiar)</Text>
                    </>
                  ) : (
                    <>
                      <Box color="gray.400"><FiUpload size={24} /></Box>
                      <Text fontWeight="medium" color="gray.600">
                        Haz clic para adjuntar el PDF
                      </Text>
                    </>
                  )}
                  <Input
                    type="file"
                    accept=".pdf"
                    display="none"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setValue('archivo', file, { shouldValidate: true });
                    }}
                  />
                </Box>
                {errors.archivo && (
                  <Text color="red.500" fontSize="sm" mt={1}>
                    {errors.archivo.message as string}
                  </Text>
                )}
              </Field.Root>

              {archivoSeleccionado && (
                <>
                  <Box mb={4}>
                    <TextField
                      label="Número de Versión"
                      defaultValue={defaultValues.version_inicial}
                      placeholder="ej. v1.0"
                      error={errors.version_inicial?.message}
                      {...register("version_inicial")}
                    />
                  </Box>

                  <Field.Root invalid={!!errors.fecha_proxima_revision} mb={6}>
                    <Field.Label fontSize="md" fontFamily="sans-serif">
                      Fecha Próxima Revisión
                    </Field.Label>
                    <Input
                      type="date"
                      min={hoyLocal}
                      defaultValue={defaultValues.fecha_proxima_revision}
                      {...register("fecha_proxima_revision")}
                    />
                    {errors.fecha_proxima_revision && (
                      <Text color="red.500" fontSize="sm">{errors.fecha_proxima_revision.message as string}</Text>
                    )}
                  </Field.Root>
                </>
              )}
            </Box>
          )}

          <FormActions>
            <CancelButton text="Cancelar" onClick={onCancelar} icon={FiXCircle} />
            <SubmitButton
              text={esModoModificar ? "Guardar Cambios" : "Guardar"}
              loading={isSubmitting}
              type="submit"
              icon={FiSave}
            />
          </FormActions>
        </VStack>
      </form>

      {/* El código del alta pertenece a un documento dado de baja: se ofrece reactivarlo */}
      {esModoCrear && (
        <AlertConfirm
          open={confirmarAltaAbierto}
          title="Reactivar Documento"
          message={`Ya existe un documento inactivo con el código "${codigoEnviado}". ¿Querés reactivarlo?`}
          loading={reactivar.isSubmitting}
          error={errorConfirmar}
          onConfirm={confirmarReactivacion}
          onCancel={() => setConfirmarAltaAbierto(false)}
        />
      )}
    </FormContainer>
  );
};