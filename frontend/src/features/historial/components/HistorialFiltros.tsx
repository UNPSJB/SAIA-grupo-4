import { useRef, useState, useEffect } from "react";
import { Box, Flex, HStack, Text, Input, Button, Badge, IconButton } from "@chakra-ui/react";
import { FiCalendar, FiFilter, FiRefreshCw } from "react-icons/fi";

interface HistorialFiltrosProps {
  fechaDesde: string; 
  fechaHasta: string; 
  fechaMax?: string; // tope
  onCambiarFechaDesde: (fecha: string) => void;
  onCambiarFechaHasta: (fecha: string) => void;
  onAplicarFiltro: () => void;
  onResetFiltro: () => void;
  onSeleccionarRapido: (dias: number) => void;
}

export function HistorialFiltros({
  fechaDesde,
  fechaHasta,
  fechaMax,
  onCambiarFechaDesde,
  onCambiarFechaHasta,
  onAplicarFiltro,
  onResetFiltro,
  onSeleccionarRapido,
}: HistorialFiltrosProps) {
  const parseDate = (dStr: string) => {
    if (!dStr) return { d: "", m: "", y: "" };
    const parts = dStr.split("-");
    if (parts.length === 3) {
      return { y: parts[0], m: parts[1], d: parts[2] };
    }
    return { d: "", m: "", y: "" };
  };

  const initialDesde = parseDate(fechaDesde);
  const initialHasta = parseDate(fechaHasta);

  const [diaDesde, setDiaDesde] = useState(initialDesde.d);
  const [mesDesde, setMesDesde] = useState(initialDesde.m);
  const [anioDesde, setAnioDesde] = useState(initialDesde.y);

  const [diaHasta, setDiaHasta] = useState(initialHasta.d);
  const [mesHasta, setMesHasta] = useState(initialHasta.m);
  const [anioHasta, setAnioHasta] = useState(initialHasta.y);

  useEffect(() => {
    const p = parseDate(fechaDesde);
    setDiaDesde(p.d);
    setMesDesde(p.m);
    setAnioDesde(p.y);
  }, [fechaDesde]);

  useEffect(() => {
    const p = parseDate(fechaHasta);
    setDiaHasta(p.d);
    setMesHasta(p.m);
    setAnioHasta(p.y);
  }, [fechaHasta]);

  const updateDesde = (d: string, m: string, y: string) => {
    if (d.length === 2 && m.length === 2 && y.length === 4) {
      onCambiarFechaDesde(`${y}-${m}-${d}`);
    }
  };

  const updateHasta = (d: string, m: string, y: string) => {
    if (d.length === 2 && m.length === 2 && y.length === 4) {
      const fechaArmada = `${y}-${m}-${d}`;

      if (fechaMax && fechaArmada > fechaMax) {
        const pMax = parseDate(fechaMax);
        setDiaHasta(pMax.d);
        setMesHasta(pMax.m);
        setAnioHasta(pMax.y);
        onCambiarFechaHasta(fechaMax);
        return;
      }

      onCambiarFechaHasta(fechaArmada);
    }
  };

  // Referencias para inputs visibles y ocultos del picker nativo
  const pickerDesdeRef = useRef<HTMLInputElement>(null);
  const pickerHastaRef = useRef<HTMLInputElement>(null);

  const refDiaDesde = useRef<HTMLInputElement>(null);
  const refMesDesde = useRef<HTMLInputElement>(null);
  const refAnioDesde = useRef<HTMLInputElement>(null);

  const refDiaHasta = useRef<HTMLInputElement>(null);
  const refMesHasta = useRef<HTMLInputElement>(null);
  const refAnioHasta = useRef<HTMLInputElement>(null);

  const refBotonFiltrar = useRef<HTMLButtonElement>(null);

  const abrirPickerDesde = () => {
    try {
      pickerDesdeRef.current?.showPicker();
    } catch {
      pickerDesdeRef.current?.focus();
    }
  };

  const abrirPickerHasta = () => {
    try {
      pickerHastaRef.current?.showPicker();
    } catch {
      pickerHastaRef.current?.focus();
    }
  };

  return (
    <Box
      bg="white"
      p={{ base: 4, md: 5 }}
      borderRadius="xl"
      boxShadow="sm"
      border="1px solid"
      borderColor="gray.200"
      mb={4}
    >
      <Flex
        direction={{ base: "column", lg: "row" }}
        justify="space-between"
        align={{ base: "stretch", lg: "center" }}
        gap={4}
      >
        <Flex
          direction={{ base: "column", sm: "row" }}
          align={{ sm: "center" }}
          gap={3}
          wrap="wrap"
        >
          {/* Grupo Desde */}
          <HStack gap={1.5} align="center">
            <Text fontSize="xs" fontWeight="bold" color="gray.600" mr={0.5}>
              Desde:
            </Text>

            <HStack
              bg="gray.50"
              px={1.5}
              py={0.5}
              borderRadius="md"
              border="1px solid"
              borderColor="gray.300"
              gap={1}
            >
              <Input
                ref={refDiaDesde}
                placeholder="DD"
                value={diaDesde}
                maxLength={2}
                h="28px"
                w="34px"
                p={0}
                textAlign="center"
                fontSize="xs"
                variant="subtle"
                bg="transparent"
                border="none"
                _focus={{ bg: "white", outline: "none" }}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setDiaDesde(val);
                  updateDesde(val, mesDesde, anioDesde);
                  if (val.length === 2) refMesDesde.current?.focus();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    refMesDesde.current?.focus();
                  }
                }}
              />
              <Text fontSize="2xs" color="gray.400">/</Text>
              <Input
                ref={refMesDesde}
                placeholder="MM"
                value={mesDesde}
                maxLength={2}
                h="28px"
                w="34px"
                p={0}
                textAlign="center"
                fontSize="xs"
                variant="subtle"
                bg="transparent"
                border="none"
                _focus={{ bg: "white", outline: "none" }}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setMesDesde(val);
                  updateDesde(diaDesde, val, anioDesde);
                  if (val.length === 2) refAnioDesde.current?.focus();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    refAnioDesde.current?.focus();
                  }
                }}
              />
              <Text fontSize="2xs" color="gray.400">/</Text>
              <Input
                ref={refAnioDesde}
                placeholder="AAAA"
                value={anioDesde}
                maxLength={4}
                h="28px"
                w="48px"
                p={0}
                textAlign="center"
                fontSize="xs"
                variant="subtle"
                bg="transparent"
                border="none"
                _focus={{ bg: "white", outline: "none" }}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setAnioDesde(val);
                  updateDesde(diaDesde, mesDesde, val);
                  if (val.length === 4) refDiaHasta.current?.focus();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    refDiaHasta.current?.focus();
                  }
                }}
              />

              {/* Botón interactivo para desplegar el calendario */}
              <IconButton
                aria-label="Abrir calendario desde"
                size="2xs"
                variant="ghost"
                color="gray.500"
                _hover={{ color: "green.600", bg: "white" }}
                onClick={abrirPickerDesde}
              >
                <FiCalendar size={13} />
              </IconButton>

              <input
                ref={pickerDesdeRef}
                type="date"
                value={fechaDesde}
                onChange={(e) => {
                  if (e.target.value) {
                    onCambiarFechaDesde(e.target.value);
                  }
                }}
                style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 0, height: 0 }}
              />
            </HStack>
          </HStack>

          {/* Grupo Hasta */}
          <HStack gap={1.5} align="center">
            <Text fontSize="xs" fontWeight="bold" color="gray.600" mr={0.5}>
              Hasta:
            </Text>

            <HStack
              bg="gray.50"
              px={1.5}
              py={0.5}
              borderRadius="md"
              border="1px solid"
              borderColor="gray.300"
              gap={1}
            >
              <Input
                ref={refDiaHasta}
                placeholder="DD"
                value={diaHasta}
                maxLength={2}
                h="28px"
                w="34px"
                p={0}
                textAlign="center"
                fontSize="xs"
                variant="subtle"
                bg="transparent"
                border="none"
                _focus={{ bg: "white", outline: "none" }}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setDiaHasta(val);
                  updateHasta(val, mesHasta, anioHasta);
                  if (val.length === 2) refMesHasta.current?.focus();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    refMesHasta.current?.focus();
                  }
                }}
              />
              <Text fontSize="2xs" color="gray.400">/</Text>
              <Input
                ref={refMesHasta}
                placeholder="MM"
                value={mesHasta}
                maxLength={2}
                h="28px"
                w="34px"
                p={0}
                textAlign="center"
                fontSize="xs"
                variant="subtle"
                bg="transparent"
                border="none"
                _focus={{ bg: "white", outline: "none" }}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setMesHasta(val);
                  updateHasta(diaHasta, val, anioHasta);
                  if (val.length === 2) refAnioHasta.current?.focus();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    refAnioHasta.current?.focus();
                  }
                }}
              />
              <Text fontSize="2xs" color="gray.400">/</Text>
              <Input
                ref={refAnioHasta}
                placeholder="AAAA"
                value={anioHasta}
                maxLength={4}
                h="28px"
                w="48px"
                p={0}
                textAlign="center"
                fontSize="xs"
                variant="subtle"
                bg="transparent"
                border="none"
                _focus={{ bg: "white", outline: "none" }}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setAnioHasta(val);
                  updateHasta(diaHasta, mesHasta, val);
                  if (val.length === 4) refBotonFiltrar.current?.focus();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    refBotonFiltrar.current?.focus();
                    onAplicarFiltro();
                  }
                }}
              />

              {/* Botón interactivo para desplegar el calendario */}
              <IconButton
                aria-label="Abrir calendario hasta"
                size="2xs"
                variant="ghost"
                color="gray.500"
                _hover={{ color: "green.600", bg: "white" }}
                onClick={abrirPickerHasta}
              >
                <FiCalendar size={13} />
              </IconButton>

              <input
                ref={pickerHastaRef}
                type="date"
                max={fechaHasta}
                value={fechaHasta}
                onChange={(e) => {
                  if (e.target.value) {
                    const val = fechaMax && e.target.value > fechaMax ? fechaMax : e.target.value;
                    onCambiarFechaHasta(val);
                  }
                }}
                style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 0, height: 0 }}
              />
            </HStack>
          </HStack>

          {/* Botones de acción */}
          <HStack gap={2}>
            <Button
              ref={refBotonFiltrar}
              size="sm"
              colorPalette="green"
              bg="green.600"
              _hover={{ bg: "green.700" }}
              color="white"
              fontSize="xs"
              onClick={onAplicarFiltro}
            >
              <HStack gap={1.5}>
                <FiFilter />
                <Text as="span">Filtrar</Text>
              </HStack>
            </Button>

            <Button
              size="sm"
              variant="outline"
              fontSize="xs"
              onClick={onResetFiltro}
            >
              <HStack gap={1.5}>
                <FiRefreshCw />
                <Text as="span">Limpiar</Text>
              </HStack>
            </Button>
          </HStack>
        </Flex>

        {/* Atajos rápidos */}
        <HStack gap={2} wrap="wrap">
          <Text fontSize="xs" color="gray.500">
            Período:
          </Text>
          <Badge
            as="button"
            cursor="pointer"
            colorPalette="gray"
            variant="subtle"
            px={2.5}
            py={1}
            borderRadius="md"
            fontSize="xs"
            onClick={() => onSeleccionarRapido(7)}
          >
            Últimos 7 días
          </Badge>
          <Badge
            as="button"
            cursor="pointer"
            colorPalette="gray"
            variant="subtle"
            px={2.5}
            py={1}
            borderRadius="md"
            fontSize="xs"
            onClick={() => onSeleccionarRapido(30)}
          >
            Últimos 30 días
          </Badge>
        </HStack>
      </Flex>
    </Box>
  );
}