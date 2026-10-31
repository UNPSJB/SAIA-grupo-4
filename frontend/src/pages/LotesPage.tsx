import { useState, useEffect, useCallback } from "react";
import { VStack, Container } from "@chakra-ui/react";
import { RegistrarLoteForm } from "../features/lotes/RegistrarLoteForm";
import { ListadoLotes } from "../features/lotes/ListadoLotes";
import { apiFetch } from "../features/auth/apiFetch";
import type { Lote } from "../features/lotes/types";

export const LotesPage = () => {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const cargarLotes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/lotes/");
      if (res.ok) {
        const data = await res.json();
        // Aseguramos que siempre sea un array
        setLotes(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error al cargar lotes:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarLotes();
  }, [cargarLotes]);

  return (
    <Container maxW="4xl" py={8}>
      <VStack gap={8} align="stretch">
        <RegistrarLoteForm onLoteCreado={cargarLotes} />
        <ListadoLotes lotes={lotes} loading={loading} />
      </VStack>
    </Container>
  );
};