import { useState } from "react";
import {
  Badge,
  Box,
  Button,
  Collapsible,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import type { PasoMemoriaCalculo } from "../types";

export const resolverVeredictoSello = (paso: PasoMemoriaCalculo) => {
  if (!paso.se_evalua) {
    return {
      label: "No aplica",
      colorPalette: "gray",
      printColor: "gray.500",
      printWeight: "medium",
    } as const;
  }
  if (paso.supera_umbral) {
    return {
      label: "Exceso",
      colorPalette: "red",
      printColor: "red.800",
      printWeight: "bold",
    } as const;
  }
  return {
    label: "Cumple",
    colorPalette: "green",
    printColor: "green.800",
    printWeight: "semibold",
  } as const;
};

interface MemoriaCalculoSellosProps {
  pasos: PasoMemoriaCalculo[];
}

export const MemoriaCalculoSellos = ({ pasos }: MemoriaCalculoSellosProps) => {
  const [mostrarMemoria, setMostrarMemoria] = useState(false);

  return (
    <Box>
      <Button
        type='button'
        size='xs'
        variant='outline'
        colorPalette='gray'
        onClick={() => setMostrarMemoria((prev) => !prev)}
      >
        {mostrarMemoria ? <FiChevronUp /> : <FiChevronDown />}
        {mostrarMemoria
          ? "Ocultar memoria de cálculo paso a paso"
          : "Ver memoria de cálculo paso a paso"}
      </Button>

      <Collapsible.Root open={mostrarMemoria}>
        <Collapsible.Content>
          <Box
            mt={3}
            overflowX='auto'
            borderWidth='1px'
            borderColor='gray.200'
            borderRadius='md'
          >
            <Table.Root size='sm' variant='line'>
              <Table.Header bg='gray.50'>
                <Table.Row>
                  <Table.ColumnHeader fontSize='sm' fontWeight='bold' color='gray.700'>
                    Nutriente / Criterio
                  </Table.ColumnHeader>
                  <Table.ColumnHeader fontSize='sm' fontWeight='bold' color='gray.700'>
                    Fórmula y Cálculo Paso a Paso
                  </Table.ColumnHeader>
                  <Table.ColumnHeader fontSize='sm' fontWeight='bold' color='gray.700'>
                    Umbral Legal
                  </Table.ColumnHeader>
                  <Table.ColumnHeader fontSize='sm' fontWeight='bold' color='gray.700'>
                    Veredicto
                  </Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {pasos.map((paso) => (
                  <Table.Row key={paso.codigo}>
                    <Table.Cell>
                      <Text
                        fontSize='sm'
                        fontWeight='semibold'
                        color='gray.800'
                      >
                        {paso.nutriente_etiqueta}
                      </Text>
                      <Text fontSize='xs' color='gray.500'>
                        {paso.motivo_evaluacion}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      {paso.se_evalua ? (
                        <VStack align='start' gap={0.5}>
                          {paso.formula_aplicada && (
                            <Text fontSize='xs' color='gray.500'>
                              Fórmula: {paso.formula_aplicada}
                            </Text>
                          )}
                          {paso.calculo_sustituido && (
                            <Text
                              fontSize='sm'
                              fontWeight='medium'
                              color='gray.800'
                            >
                              {paso.calculo_sustituido}
                            </Text>
                          )}
                        </VStack>
                      ) : (
                        <Text fontSize='sm' color='gray.400'>
                          No corresponde evaluar
                        </Text>
                      )}
                    </Table.Cell>
                    <Table.Cell fontSize='sm' color='gray.700'>
                      {paso.umbral_normativo}
                    </Table.Cell>
                    <Table.Cell>
                      {(() => {
                        const veredicto = resolverVeredictoSello(paso);
                        return (
                          <Badge
                            colorPalette={veredicto.colorPalette}
                            variant='subtle'
                            size='sm'
                            textTransform='uppercase'
                          >
                            {veredicto.label}
                          </Badge>
                        );
                      })()}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Box>
        </Collapsible.Content>
      </Collapsible.Root>
    </Box>
  );
};
