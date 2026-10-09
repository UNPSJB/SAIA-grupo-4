import { useNavigate, useParams } from "react-router-dom";
import { Box, Button, Heading, HStack, Icon, Text, VStack } from "@chakra-ui/react";
import { FiArrowLeft, FiExternalLink, FiFileText } from "react-icons/fi";

import { AlertMessage, LoadingState } from "../components/ui";
import { useDocumentoDetalle } from "../features/documentos/hooks/useDocumentoDetalle";
import { urlBackend } from "../features/documentos/utils";


// Visor de PDF del documento (versión vigente o histórica). Vista propia dentro de la app. Ofrece "Abrir en pestaña nueva" para quien prefiera el visor nativo del navegador a pantalla completa.
export default function VisorPdfPage() {
  const navigate = useNavigate();
  const params = useParams<{ id: string; versionId: string }>();
  const documentoId = Number(params.id);
  const versionId = Number(params.versionId);

  const { documento, loading, error } = useDocumentoDetalle({
    documentoId,
    errorMessage: "No se pudo cargar el documento.",
  });

  const version = documento?.versiones.find((v) => v.id === versionId);
  const urlPdf = version?.archivo_url ? urlBackend(version.archivo_url) : "";

  return (
    <Box h="100vh" bg="gray.100" p={6} display="flex" flexDirection="column" gap={4} overflow="hidden">
      <HStack justify="space-between" flexWrap="wrap" gap={3} flexShrink={0}>
        <HStack gap={3} flexWrap="wrap">
          <Button variant="outline" colorPalette="green" onClick={() => navigate(-1)}>
            <FiArrowLeft /> Volver
          </Button>
          <Heading size="lg" color="green" display="flex" alignItems="center" gap={2} flexWrap="wrap">
            <Icon as={FiFileText} />
            {documento?.titulo ?? "Documento"}
            {version && <Text fontSize="md" color="gray.500" fontWeight="normal">· {version.version}</Text>}
          </Heading>
        </HStack>

        {urlPdf && (
          <Button
            variant="outline"
            colorPalette="orange"
            onClick={() => window.open(urlPdf, "_blank")}
          >
            <FiExternalLink /> Abrir en pestaña nueva
          </Button>
        )}
      </HStack>

      {loading && <LoadingState message="Cargando documento..." />}

      {!loading && error && <AlertMessage type="error" message={error} />}

      {!loading && !error && documento && (
        <Box
          flex="1"
          minH={0}
          bg="white"
          borderWidth="1px"
          borderColor="gray.300"
          borderRadius="lg"
          overflow="hidden"
          boxShadow="sm"
        >
          {version && urlPdf ? (
            <iframe
              src={urlPdf}
              title={`PDF de ${documento.titulo} (${version.version})`}
              width="100%"
              height="100%"
              style={{ border: "none", height: "100%" }}
            />
          ) : (
            <VStack gap={3} py={10}>
              <AlertMessage
                type="info"
                message={
                  version
                    ? "Esta versión no tiene un PDF adjunto."
                    : "La versión solicitada no existe para este documento."
                }
              />
            </VStack>
          )}
        </Box>
      )}
    </Box>
  );
}
