import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Heading,
  HStack,
  Image,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import { FiSave, FiTrash2, FiUpload, FiRotateCcw, FiSettings } from "react-icons/fi";
import {
  AlertMessage,
  LoadingState,
  SubmitButton,
  TextAreaField,
  TextField,
} from "../../components/ui";
import { configuracionApi, resolverLogoUrl } from "./configuracionApi";
import { useConfiguracion } from "./useConfiguracion";
import type { ConfiguracionSistema } from "./types";
import {
  configuracionSchema,
  validarArchivoLogo,
  type ConfiguracionFormValues,
} from "./validationSchema";

const formatearFechaHoraLocal = (iso: string): string => {
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime())
    ? iso
    : fecha.toLocaleString("es-AR", {
        dateStyle: "short",
        timeStyle: "short",
      });
};

const valoresDesdeServidor = (data: ConfiguracionSistema): ConfiguracionFormValues => ({
  nombre_establecimiento: data.nombre_establecimiento ?? "SAIA-4",
  razon_social: data.razon_social ?? "",
  cuit: data.cuit ?? "",
  direccion: data.direccion ?? "",
  localidad: data.localidad ?? "",
  provincia: data.provincia ?? "",
  telefono: data.telefono ?? "",
  email: data.email ?? "",
  sitio_web: data.sitio_web ?? "",
  pie_informes: data.pie_informes ?? "",
});

export const ConfiguracionForm = () => {
  const { recargarConfiguracion } = useConfiguracion();

  const [servidor, setServidor] = useState<ConfiguracionSistema | null>(null);
  const [valores, setValores] = useState<ConfiguracionFormValues>({
    nombre_establecimiento: "SAIA-4",
    razon_social: "",
    cuit: "",
    direccion: "",
    localidad: "",
    provincia: "",
    telefono: "",
    email: "",
    sitio_web: "",
    pie_informes: "",
  });
  const [errores, setErrores] = useState<Record<string, string>>({});

  // Estados de logo (archivo nuevo seleccionado o marcado para quitar antes de guardar)
  const [logoPendiente, setLogoPendiente] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [quitarLogoActual, setQuitarLogoActual] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [cargando, setCargando] = useState<boolean>(true);
  const [guardando, setGuardando] = useState<boolean>(false);
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const valoresIniciales = servidor ? valoresDesdeServidor(servidor) : null;
  const hayCambios = Boolean(
    valoresIniciales &&
      (logoPendiente !== null ||
        (quitarLogoActual && Boolean(servidor?.logo_url)) ||
        (Object.keys(valoresIniciales) as (keyof ConfiguracionFormValues)[]).some(
          (k) => (valores[k] ?? "").trim() !== (valoresIniciales[k] ?? "").trim(),
        )),
  );

  const cargarDatos = async () => {
    setCargando(true);
    setErrorGlobal(null);
    try {
      const data = await configuracionApi.obtenerAdmin();
      setServidor(data);
      setValores(valoresDesdeServidor(data));
      setLogoPendiente(null);
      setQuitarLogoActual(false);
    } catch (err) {
      setErrorGlobal(err instanceof Error ? err.message : "Error al cargar la configuración.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargarDatos();
  }, []);

  useEffect(() => {
    if (!logoPendiente) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(logoPendiente);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [logoPendiente]);

  const handleChange = (campo: keyof ConfiguracionFormValues, valor: string) => {
    setValores((prev) => ({ ...prev, [campo]: valor }));
    setErrores((prev) => {
      if (!prev[campo]) return prev;
      const copia = { ...prev };
      delete copia[campo];
      return copia;
    });
    setMensajeExito(null);
  };

  const handleSeleccionarLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const errorLogo = validarArchivoLogo(file);
    if (errorLogo) {
      setErrores((prev) => ({ ...prev, logo: errorLogo }));
      e.target.value = "";
      return;
    }

    setErrores((prev) => {
      const copia = { ...prev };
      delete copia.logo;
      return copia;
    });
    setLogoPendiente(file);
    setQuitarLogoActual(false);
    setMensajeExito(null);
    e.target.value = "";
  };

  const handleQuitarLogo = () => {
    setLogoPendiente(null);
    setQuitarLogoActual(true);
    setErrores((prev) => {
      const copia = { ...prev };
      delete copia.logo;
      return copia;
    });
    setMensajeExito(null);
  };

  const handleCancelar = () => {
    if (!servidor) return;
    setValores(valoresDesdeServidor(servidor));
    setLogoPendiente(null);
    setQuitarLogoActual(false);
    setErrores({});
    setErrorGlobal(null);
    setMensajeExito(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorGlobal(null);
    setMensajeExito(null);

    const validacion = configuracionSchema.safeParse(valores);
    if (!validacion.success) {
      const nuevosErrores: Record<string, string> = {};
      for (const issue of validacion.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!nuevosErrores[key]) nuevosErrores[key] = issue.message;
      }
      setErrores(nuevosErrores);
      return;
    }

    setGuardando(true);
    try {
      const limpio = validacion.data;
      let actualizado = await configuracionApi.actualizar({
        nombre_establecimiento: limpio.nombre_establecimiento.trim(),
        razon_social: limpio.razon_social?.trim() || null,
        cuit: limpio.cuit ? limpio.cuit.replace(/-/g, "").trim() : null,
        direccion: limpio.direccion?.trim() || null,
        localidad: limpio.localidad?.trim() || null,
        provincia: limpio.provincia?.trim() || null,
        telefono: limpio.telefono?.trim() || null,
        email: limpio.email?.trim() || null,
        sitio_web: limpio.sitio_web?.trim() || null,
        pie_informes: limpio.pie_informes?.trim() || null,
      });

      if (logoPendiente) {
        actualizado = await configuracionApi.subirLogo(logoPendiente);
      } else if (quitarLogoActual && servidor?.logo_url) {
        actualizado = await configuracionApi.eliminarLogo();
      }

      setServidor(actualizado);
      setValores(valoresDesdeServidor(actualizado));
      setLogoPendiente(null);
      setQuitarLogoActual(false);
      await recargarConfiguracion();
      setMensajeExito("La configuración del establecimiento se guardó correctamente.");
    } catch (err) {
      setErrorGlobal(
        err instanceof Error ? err.message : "No se pudo guardar la configuración.",
      );
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return <LoadingState message="Cargando configuración del establecimiento..." />;
  }

  const logoActualUrl = !quitarLogoActual ? resolverLogoUrl(servidor?.logo_url) : null;
  const imagenMostrada = previewUrl ?? logoActualUrl;

  return (
    <Box as="form" onSubmit={handleSubmit}>
      <VStack gap={6} align="stretch">
        <HStack justify="space-between" flexWrap="wrap" gap={2}>
          <Heading size="2xl" color="green.700" display="flex" alignItems="center" gap={2}>
            <FiSettings /> Configuración del Establecimiento
          </Heading>
          {servidor?.fecha_modificacion && (
            <Text fontSize="sm" color="gray.600">
              Última modificación: {formatearFechaHoraLocal(servidor.fecha_modificacion)}
              {servidor.modificado_por_nombre
                ? ` por ${servidor.modificado_por_nombre}`
                : ""}
            </Text>
          )}
        </HStack>

        {errorGlobal && <AlertMessage type="error" message={errorGlobal} />}
        {mensajeExito && <AlertMessage type="success" message={mensajeExito} />}

        {/* SECCIÓN 1: DATOS DEL ESTABLECIMIENTO */}
        <Box p={6} bg="white" borderWidth="1px" borderRadius="lg" boxShadow="sm">
          <HStack justify="space-between" align="center" mb={4} flexWrap="wrap" gap={3}>
            <Heading size="md" color="gray.700">
              Datos institucionales
            </Heading>
            <HStack gap={2}>
              <Button
                type="button"
                variant="outline"
                colorPalette="gray"
                onClick={handleCancelar}
                disabled={guardando || !hayCambios}
              >
                <FiRotateCcw />
                Restaurar
              </Button>
              <SubmitButton
                type="submit"
                text="Guardar configuración"
                icon={FiSave}
                loading={guardando}
                disabled={!hayCambios}
              />
            </HStack>
          </HStack>
          <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
            <TextField
              label="Nombre del establecimiento *"
              placeholder="Ej. SAIA-4"
              value={valores.nombre_establecimiento}
              onChange={(e) => handleChange("nombre_establecimiento", e.target.value)}
              error={errores.nombre_establecimiento}
            />
            <TextField
              label="Razón social"
              placeholder="Ej. Alimentos del Sur S.R.L."
              value={valores.razon_social ?? ""}
              onChange={(e) => handleChange("razon_social", e.target.value)}
              error={errores.razon_social}
            />
            <TextField
              label="CUIT (11 dígitos)"
              placeholder="Ej. 30712345679"
              value={valores.cuit ?? ""}
              onChange={(e) => handleChange("cuit", e.target.value)}
              error={errores.cuit}
            />
          </SimpleGrid>
        </Box>

        {/* SECCIÓN 2: CONTACTO Y UBICACIÓN */}
        <Box p={6} bg="white" borderWidth="1px" borderRadius="lg" boxShadow="sm">
          <Heading size="md" mb={4} color="gray.700">
            Contacto y ubicación
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
            <TextField
              label="Dirección"
              placeholder="Ej. Av. Industrial 123"
              value={valores.direccion ?? ""}
              onChange={(e) => handleChange("direccion", e.target.value)}
              error={errores.direccion}
            />
            <TextField
              label="Localidad"
              placeholder="Ej. Trelew"
              value={valores.localidad ?? ""}
              onChange={(e) => handleChange("localidad", e.target.value)}
              error={errores.localidad}
            />
            <TextField
              label="Provincia"
              placeholder="Ej. Chubut"
              value={valores.provincia ?? ""}
              onChange={(e) => handleChange("provincia", e.target.value)}
              error={errores.provincia}
            />
            <TextField
              label="Teléfono"
              placeholder="Ej. +54 280 4123456"
              value={valores.telefono ?? ""}
              onChange={(e) => handleChange("telefono", e.target.value)}
              error={errores.telefono}
            />
            <TextField
              label="Email de contacto"
              placeholder="Ej. contacto@establecimiento.com"
              value={valores.email ?? ""}
              onChange={(e) => handleChange("email", e.target.value)}
              error={errores.email}
            />
            <TextField
              label="Sitio web"
              placeholder="Ej. https://establecimiento.com"
              value={valores.sitio_web ?? ""}
              onChange={(e) => handleChange("sitio_web", e.target.value)}
              error={errores.sitio_web}
            />
          </SimpleGrid>
        </Box>

        {/* SECCIÓN 3: LOGO DEL ESTABLECIMIENTO */}
        <Box p={6} bg="white" borderWidth="1px" borderRadius="lg" boxShadow="sm">
          <Heading size="md" mb={2} color="gray.700">
            Logo del establecimiento
          </Heading>
          <Text fontSize="sm" color="gray.600" mb={4}>
            Formatos admitidos: PNG, JPG o WebP (máximo 2 MB). Se mostrará en la barra lateral, inicio de sesión, vista pública e informes impresos.
          </Text>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            style={{ display: "none" }}
            onChange={handleSeleccionarLogo}
          />

          <HStack gap={6} align="center" flexWrap="wrap">
            <Box
              w="120px"
              h="120px"
              borderWidth="1px"
              borderRadius="md"
              bg="gray.50"
              display="flex"
              alignItems="center"
              justifyContent="center"
              overflow="hidden"
              p={2}
            >
              {imagenMostrada ? (
                <Image
                  src={imagenMostrada}
                  alt="Vista previa del logo"
                  maxH="100%"
                  maxW="100%"
                  objectFit="contain"
                />
              ) : (
                <Text fontSize="xs" color="gray.400" textAlign="center">
                  Sin logo cargado
                </Text>
              )}
            </Box>

            <VStack align="flex-start" gap={2}>
              <HStack gap={3}>
                <Button
                  type="button"
                  size="sm"
                  colorPalette="green"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FiUpload />
                  {imagenMostrada ? "Reemplazar logo" : "Subir logo"}
                </Button>

                {imagenMostrada && (
                  <Button
                    type="button"
                    size="sm"
                    colorPalette="red"
                    variant="ghost"
                    onClick={handleQuitarLogo}
                  >
                    <FiTrash2 />
                    Quitar logo
                  </Button>
                )}
              </HStack>

              {logoPendiente && (
                <Text fontSize="xs" color="green.700">
                  Nuevo archivo seleccionado: {logoPendiente.name} (se aplicará al guardar)
                </Text>
              )}
              {quitarLogoActual && servidor?.logo_url && (
                <Text fontSize="xs" color="orange.600">
                  El logo actual se eliminará al guardar los cambios.
                </Text>
              )}
              {errores.logo && (
                <Text fontSize="sm" color="red.500">
                  {errores.logo}
                </Text>
              )}
            </VStack>
          </HStack>
        </Box>

        {/* SECCIÓN 4: INFORMES Y DOCUMENTOS EXPORTADOS */}
        <Box p={6} bg="white" borderWidth="1px" borderRadius="lg" boxShadow="sm">
          <Heading size="md" mb={4} color="gray.700">
            Informes y documentos exportados
          </Heading>
          <TextAreaField
            label="Pie de informes"
            placeholder="Texto institucional que aparecerá al pie de la vista pública e informes impresos/PDF..."
            value={valores.pie_informes ?? ""}
            onChange={(e) => handleChange("pie_informes", e.target.value)}
            error={errores.pie_informes}
            rows={3}
          />
        </Box>
      </VStack>
    </Box>
  );
};