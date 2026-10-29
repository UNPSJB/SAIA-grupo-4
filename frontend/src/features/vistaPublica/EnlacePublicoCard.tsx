import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Card,
  Flex,
  HStack,
  Input,
  Text,
  VStack,
} from "@chakra-ui/react";
import { FiCheck, FiCopy, FiExternalLink } from "react-icons/fi";
import { QRCodeSVG } from "qrcode.react";
import { AlertMessage } from "../../components/ui";

interface EnlacePublicoCardProps {
  url: string;
  activo: boolean;
}

export function EnlacePublicoCard({ url, activo }: EnlacePublicoCardProps) {
  const [copiado, setCopiado] = useState(false);
  const [errorCopiado, setErrorCopiado] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const copiarEnlace = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setErrorCopiado(null);

      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(() => setCopiado(false), 2200);
    } catch {
      setCopiado(false);
      setErrorCopiado(
        "No se pudo copiar automáticamente. Seleccioná el enlace y copialo manualmente.",
      );
    }
  };

  return (
    <Card.Root shadow='md'>
      <Card.Header>
        <Text as='h2' fontSize='lg' fontWeight='semibold' color='gray.800'>
          Enlace y código QR
        </Text>
      </Card.Header>
      <Card.Body>
        <VStack align='stretch' gap={4}>
          <Text fontSize='sm' color='gray.600'>
            Compartí este enlace con las personas que necesiten consultar los
            indicadores. El token es único y se mantiene aunque desactives y
            reactives la vista.
          </Text>

          {!activo && (
            <AlertMessage
              type='warning'
              message='La vista está desactivada: el enlace abrirá un mensaje de vista desactivada, sin indicadores.'
            />
          )}

          <Flex
            direction={{ base: "column", md: "row" }}
            align={{ base: "stretch", md: "flex-start" }}
            gap={6}
          >
            <VStack align='stretch' gap={3} flex='1'>
              <Input
                aria-label='Enlace público'
                value={url}
                readOnly
                fontFamily='mono'
                fontSize='sm'
                onFocus={(event) => event.currentTarget.select()}
              />

              <HStack gap={2} wrap='wrap'>
                <Button
                  colorPalette='green'
                  onClick={() => void copiarEnlace()}
                  aria-live='polite'
                >
                  {copiado ? <FiCheck /> : <FiCopy />}
                  {copiado ? "Copiado" : "Copiar enlace"}
                </Button>

                <Button asChild variant='outline' colorPalette='green'>
                  <a href={url} target='_blank' rel='noopener noreferrer'>
                    <FiExternalLink />
                    Abrir vista pública
                  </a>
                </Button>
              </HStack>

              {errorCopiado && (
                <AlertMessage type='error' message={errorCopiado} />
              )}
            </VStack>

            <Box
              alignSelf={{ base: "center", md: "flex-start" }}
              bg='white'
              p={3}
              borderRadius='lg'
              borderWidth='1px'
              borderColor='gray.200'
              w='fit-content'
            >
              <QRCodeSVG
                value={url}
                size={180}
                level='M'
                marginSize={4}
                title='Código QR del enlace público'
              />
            </Box>
          </Flex>
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}
