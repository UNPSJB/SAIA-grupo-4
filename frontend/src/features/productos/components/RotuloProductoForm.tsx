import { useEffect, useMemo, useState } from "react";
import { Button, HStack, Icon, Text, VStack } from "@chakra-ui/react";
import { FiAlertTriangle, FiSave } from "react-icons/fi";
import { AlertMessage } from "../../../components/ui";
import { formatearFechaISO } from "../../../utils/fecha";
import type {
  CompletitudCAA,
  ItemCompletitudCAA,
  RotuloProductoConsolidado,
  RotuloProductoUpdate,
} from "../types";
import { IndicadorCompletitudCAA } from "./IndicadorCompletitudCAA";
import { norm, normComp } from "./rotulo/RotuloSeccionHelpers";
import {
  generarLeyendaAlergenosLocal,
  SeccionAlergenosConservacion,
} from "./rotulo/SeccionAlergenosConservacion";
import { SeccionIdentificacionContenido } from "./rotulo/SeccionIdentificacionContenido";
import { SeccionIngredientesRotulo } from "./rotulo/SeccionIngredientesRotulo";
import { SeccionLoteConservacion } from "./rotulo/SeccionLoteConservacion";
import { SeccionNutricionSellosRotulo } from "./rotulo/SeccionNutricionSellosRotulo";
import { SeccionOrigenRegistros } from "./rotulo/SeccionOrigenRegistros";

interface RotuloProductoFormProps {
  rotulo: RotuloProductoConsolidado;
  guardando: boolean;
  errorGuardar: string;
  mensajeExito: string;
  onGuardar: (payload: RotuloProductoUpdate) => Promise<void>;
}

const mapFromConsolidado = (
  r: RotuloProductoConsolidado,
): RotuloProductoUpdate => ({
  denominacion_venta: r.denominacion_venta ?? "",
  contenido_neto: r.contenido_neto ?? "",
  aplica_peso_escurrido: r.aplica_peso_escurrido,
  peso_escurrido: r.peso_escurrido ?? "",
  razon_social_elaborador: r.razon_social_elaborador ?? "",
  domicilio_elaborador: r.domicilio_elaborador ?? "",
  pais_origen: r.pais_origen ?? "Argentina",
  rne_elaborador: r.rne_elaborador ?? "",
  rnpa_rppa: r.rnpa_rppa ?? "",
  es_importado: r.es_importado,
  nombre_importador: r.nombre_importador ?? "",
  domicilio_importador: r.domicilio_importador ?? "",
  rne_importador: r.rne_importador ?? "",
  lote_origen_id: r.lote_origen_id ?? null,
  codigo_lote_declarado: r.codigo_lote_declarado ?? "",
  fecha_duracion_minima: r.fecha_duracion_minima ?? "",
  condiciones_conservacion: r.condiciones_conservacion ?? "",
  aplica_instrucciones_uso: r.aplica_instrucciones_uso,
  instrucciones_uso: r.instrucciones_uso ?? "",
  lista_ingredientes_texto: r.lista_ingredientes_texto ?? "",
  tamano_porcion_declarado: r.tamano_porcion_declarado ?? "",
  leyenda_vd_declarada: r.leyenda_vd_declarada ?? "",
  tabla_nutricional_json: r.tabla_nutricional_json.map((f) => ({ ...f })),
  sellos_advertencia_json: r.sellos_advertencia_json.map((s) => ({ ...s })),
  leyendas_precautorias_json: r.leyendas_precautorias_json.map((l) => ({
    ...l,
  })),
  alergenos_presentes_json: r.alergenos_presentes_json.map((a) => ({ ...a })),
  alergenos_contaminacion_cruzada_json:
    r.alergenos_contaminacion_cruzada_json.map((a) => ({ ...a })),
  leyenda_alergenos_declarada: r.leyenda_alergenos_declarada ?? "",
  temp_conservacion_min_c: r.temp_conservacion_min_c ?? null,
  temp_conservacion_max_c: r.temp_conservacion_max_c ?? null,
  durabilidad_antes_abrir: r.durabilidad_antes_abrir ?? "",
  durabilidad_despues_abrir: r.durabilidad_despues_abrir ?? "",
  confirmar_alergenos_conservacion: false,
});

export const RotuloProductoForm = ({
  rotulo,
  guardando,
  errorGuardar,
  mensajeExito,
  onGuardar,
}: RotuloProductoFormProps) => {
  const [form, setForm] = useState<RotuloProductoUpdate>(() =>
    mapFromConsolidado(rotulo),
  );

  useEffect(() => {
    setForm(mapFromConsolidado(rotulo));
  }, [rotulo]);

  const auto = rotulo.autocompletado;

  const hayCambios = useMemo(() => {
    const base = mapFromConsolidado(rotulo);
    return (
      JSON.stringify(form) !== JSON.stringify(base) ||
      Boolean(form.confirmar_alergenos_conservacion)
    );
  }, [form, rotulo]);

  const ingredientesDifiere = useMemo(() => {
    const actual = normComp(form.lista_ingredientes_texto);
    if (!auto.tiene_receta_activa) return actual !== "";
    return actual !== normComp(auto.lista_ingredientes_calculada);
  }, [form.lista_ingredientes_texto, auto]);

  const nutricionDifiere = useMemo(() => {
    const filasForm = form.tabla_nutricional_json ?? [];
    if (!auto.tiene_receta_activa) {
      return (
        filasForm.length > 0 || normComp(form.tamano_porcion_declarado) !== ""
      );
    }
    const serialForm = JSON.stringify(
      filasForm.map((f) => ({
        c: f.codigo_nutriente,
        v100: normComp(f.valor_100g),
        vp: normComp(f.valor_porcion),
        vd: normComp(f.porcentaje_vd),
      })),
    );
    const serialAuto = JSON.stringify(
      auto.tabla_nutricional_calculada.map((f) => ({
        c: f.codigo_nutriente,
        v100: normComp(f.valor_100g),
        vp: normComp(f.valor_porcion),
        vd: normComp(f.porcentaje_vd),
      })),
    );
    return (
      serialForm !== serialAuto ||
      normComp(form.tamano_porcion_declarado) !==
        normComp(auto.tamano_porcion_calculado) ||
      normComp(form.leyenda_vd_declarada) !==
        normComp(auto.leyenda_vd_calculada)
    );
  }, [
    form.tabla_nutricional_json,
    form.tamano_porcion_declarado,
    form.leyenda_vd_declarada,
    auto,
  ]);

  const sellosDifieren = useMemo(() => {
    const sForm = (form.sellos_advertencia_json ?? [])
      .map((s) => s.codigo)
      .sort()
      .join(",");
    const lForm = (form.leyendas_precautorias_json ?? [])
      .map((l) => l.codigo)
      .sort()
      .join(",");
    if (!auto.tiene_receta_activa) {
      return sForm !== "" || lForm !== "";
    }
    const sAuto = auto.sellos_calculados
      .map((s) => s.codigo)
      .sort()
      .join(",");
    const lAuto = auto.leyendas_calculadas
      .map((l) => l.codigo)
      .sort()
      .join(",");
    return sForm !== sAuto || lForm !== lAuto;
  }, [form.sellos_advertencia_json, form.leyendas_precautorias_json, auto]);

  const loteRef = useMemo(
    () =>
      auto.lotes_disponibles.find((l) => l.id === form.lote_origen_id) ??
      auto.ultimo_lote ??
      null,
    [auto.lotes_disponibles, auto.ultimo_lote, form.lote_origen_id],
  );

  const loteDifiere = useMemo(() => {
    if (!loteRef) return false;
    const [yyyy, mm, dd] = loteRef.fecha_vencimiento.split("-");
    const vencStr =
      dd && mm && yyyy ? `${dd}/${mm}/${yyyy}` : loteRef.fecha_vencimiento;
    return (
      norm(form.codigo_lote_declarado) !== norm(loteRef.codigo_lote) ||
      norm(form.fecha_duracion_minima) !== vencStr
    );
  }, [form.codigo_lote_declarado, form.fecha_duracion_minima, loteRef]);

  const alergenosDifiere = useMemo(() => {
    const pres = form.alergenos_presentes_json ?? [];
    const cruz = form.alergenos_contaminacion_cruzada_json ?? [];
    if (auto.tiene_receta_activa) {
      const sPres = JSON.stringify(
        [...pres]
          .sort((a, b) => a.codigo.localeCompare(b.codigo))
          .map((a) => `${a.codigo}:${a.es_derivado}`),
      );
      const sAuto = JSON.stringify(
        [...auto.alergenos_presentes_calculados]
          .sort((a, b) => a.codigo.localeCompare(b.codigo))
          .map((a) => `${a.codigo}:${a.es_derivado}`),
      );
      if (sPres !== sAuto) return true;
    }
    const esperada = generarLeyendaAlergenosLocal(
      auto.tiene_receta_activa ? auto.alergenos_presentes_calculados : pres,
      cruz,
    );
    return normComp(form.leyenda_alergenos_declarada) !== normComp(esperada);
  }, [
    form.alergenos_presentes_json,
    form.alergenos_contaminacion_cruzada_json,
    form.leyenda_alergenos_declarada,
    auto,
  ]);

  const conservacionDifiere = useMemo(() => {
    const sug = auto.conservacion_sugerida;
    if (!sug) return false;
    return (
      (form.temp_conservacion_min_c ?? null) !==
        (sug.temp_conservacion_min_c ?? null) ||
      (form.temp_conservacion_max_c ?? null) !==
        (sug.temp_conservacion_max_c ?? null) ||
      normComp(form.durabilidad_antes_abrir) !==
        normComp(sug.durabilidad_antes_abrir) ||
      normComp(form.durabilidad_despues_abrir) !==
        normComp(sug.durabilidad_despues_abrir) ||
      normComp(form.condiciones_conservacion) !==
        normComp(sug.condiciones_conservacion)
    );
  }, [
    form.temp_conservacion_min_c,
    form.temp_conservacion_max_c,
    form.durabilidad_antes_abrir,
    form.durabilidad_despues_abrir,
    form.condiciones_conservacion,
    auto.conservacion_sugerida,
  ]);

  const estadoValidacionEfectivo =
    rotulo.estado_validacion_alergenos === "CONFIRMADO" ||
    Boolean(form.confirmar_alergenos_conservacion);

  const completitudEnVivo = useMemo<CompletitudCAA>(() => {
    const filas = form.tabla_nutricional_json ?? [];
    const nutriOk =
      norm(form.tamano_porcion_declarado) !== "" &&
      filas.length > 0 &&
      filas.some((f) => norm(f.valor_100g) !== "");

    const reglas: Array<[string, string, string, boolean, string]> = [
      ["denominacion_venta", "Denominación de venta", "Identificación", norm(form.denominacion_venta) !== "", "Falta indicar la denominación de venta."],
      ["lista_ingredientes", "Lista de ingredientes y aditivos", "Composición", norm(form.lista_ingredientes_texto) !== "", "Falta la lista de ingredientes."],
      ["contenido_neto", "Contenido neto", "Contenidos", norm(form.contenido_neto) !== "", "Falta especificar el contenido neto."],
      ["razon_social_elaborador", "Razón social del elaborador", "Origen", norm(form.razon_social_elaborador) !== "", "Falta la razón social del elaborador."],
      ["domicilio_elaborador", "Domicilio del elaborador", "Origen", norm(form.domicilio_elaborador) !== "", "Falta el domicilio del elaborador."],
      ["pais_origen", "País de origen", "Origen", norm(form.pais_origen) !== "", "Falta el país de origen."],
      ["rne_elaborador", "RNE del elaborador", "Registros Sanitarios", norm(form.rne_elaborador) !== "", "Falta el número de RNE."],
      ["rnpa_rppa", "RNPA / RPPA del producto", "Registros Sanitarios", norm(form.rnpa_rppa) !== "", "Falta el número de RNPA/RPPA."],
      ["codigo_lote_declarado", "Identificación del lote", "Trazabilidad y Conservación", norm(form.codigo_lote_declarado) !== "", "Falta la identificación del lote."],
      ["fecha_duracion_minima", "Fecha de duración mínima", "Trazabilidad y Conservación", norm(form.fecha_duracion_minima) !== "", "Falta la fecha de duración mínima o vencimiento."],
      ["condiciones_conservacion", "Condiciones de conservación", "Trazabilidad y Conservación", norm(form.condiciones_conservacion) !== "", "Faltan las condiciones de conservación."],
      ["alergenos_validados", "Declaración de alérgenos y conservación confirmada", "Alérgenos y Conservación", estadoValidacionEfectivo, "Falta confirmar la declaración de alérgenos y conservación."],
      ["informacion_nutricional", "Información nutricional y porción", "Nutrición", nutriOk, "Falta la tabla nutricional o el tamaño de porción."],
    ];

    if (form.aplica_peso_escurrido) {
      reglas.push([
        "peso_escurrido",
        "Peso escurrido",
        "Contenidos",
        norm(form.peso_escurrido) !== "",
        "Falta indicar el peso escurrido.",
      ]);
    }
    if (form.es_importado) {
      reglas.push(
        ["nombre_importador", "Nombre / Razón social del importador", "Importación", norm(form.nombre_importador) !== "", "Falta el nombre o razón social del importador."],
        ["domicilio_importador", "Domicilio del importador", "Importación", norm(form.domicilio_importador) !== "", "Falta el domicilio del importador."],
        ["rne_importador", "RNE del importador", "Importación", norm(form.rne_importador) !== "", "Falta el RNE del importador."],
      );
    }
    if (form.aplica_instrucciones_uso) {
      reglas.push([
        "instrucciones_uso",
        "Instrucciones de uso / preparación",
        "Trazabilidad y Conservación",
        norm(form.instrucciones_uso) !== "",
        "Faltan las instrucciones de uso.",
      ]);
    }

    const detalle: ItemCompletitudCAA[] = reglas.map(
      ([clave, etiqueta, seccion, completado, motivo]) => ({
        clave,
        etiqueta,
        seccion,
        obligatorio: true,
        completado,
        motivo_faltante: completado ? null : motivo,
      }),
    );

    const total = detalle.length;
    const completados = detalle.filter((d) => d.completado).length;

    return {
      porcentaje: total > 0 ? Math.round((completados / total) * 100) : 100,
      total_obligatorios: total,
      total_completados: completados,
      esta_completo: completados === total,
      campos_faltantes: detalle.filter((d) => !d.completado).map((d) => d.etiqueta),
      detalle,
    };
  }, [form, estadoValidacionEfectivo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onGuardar(form);
  };

  return (
    <form onSubmit={handleSubmit}>
      <VStack align="stretch" gap={5}>
        <IndicadorCompletitudCAA completitud={completitudEnVivo} />

        {errorGuardar && <AlertMessage type="error" message={errorGuardar} />}
        {mensajeExito && <AlertMessage type="success" message={mensajeExito} />}

        <SeccionIdentificacionContenido
          form={form}
          setForm={setForm}
          unidadMedidaSimbolo={rotulo.unidad_medida_simbolo}
        />

        <SeccionOrigenRegistros form={form} setForm={setForm} />

        <SeccionLoteConservacion
          form={form}
          setForm={setForm}
          lotesDisponibles={auto.lotes_disponibles}
          loteRef={loteRef}
          loteDifiere={loteDifiere}
        />

        <SeccionIngredientesRotulo
          form={form}
          setForm={setForm}
          autocompletado={auto}
          ingredientesDifiere={ingredientesDifiere}
        />

        <SeccionNutricionSellosRotulo
          form={form}
          setForm={setForm}
          autocompletado={auto}
          nutricionDifiere={nutricionDifiere}
          sellosDifieren={sellosDifieren}
        />

        <SeccionAlergenosConservacion
          form={form}
          setForm={setForm}
          autocompletado={auto}
          alergenosDifiere={alergenosDifiere}
          conservacionDifiere={conservacionDifiere}
          estadoValidacion={rotulo.estado_validacion_alergenos}
          confirmacionInvalidada={rotulo.confirmacion_invalidada_por_cambio_receta}
          confirmadoPorNombre={rotulo.confirmado_alergenos_por_nombre}
          fechaConfirmacion={rotulo.fecha_confirmacion_alergenos}
          confirmacionMarcadaEnForm={Boolean(
            form.confirmar_alergenos_conservacion,
          )}
          onMarcarConfirmacion={() =>
            setForm((p) => ({ ...p, confirmar_alergenos_conservacion: true }))
          }
        />

        <HStack
          justify="space-between"
          align="center"
          flexWrap="wrap"
          gap={3}
          p={4}
          bg="white"
          borderRadius="md"
          borderWidth="1px"
          borderColor="gray.200"
          shadow="xs"
        >
          <VStack align="start" gap={0}>
            {rotulo.guardado_en_bd && rotulo.fecha_actualizacion ? (
              <Text fontSize="xs" color="gray.500">
                Última modificación:{" "}
                {formatearFechaISO(rotulo.fecha_actualizacion)}
                {rotulo.actualizado_por_nombre
                  ? ` por ${rotulo.actualizado_por_nombre}`
                  : ""}
              </Text>
            ) : (
              <HStack gap={1.5} color="orange.600">
                <Icon as={FiAlertTriangle} boxSize={4} />
                <Text fontSize="xs" fontWeight="medium">
                  Este rótulo aún no fue guardado en el sistema.
                </Text>
              </HStack>
            )}
          </VStack>

          <Button
            type="submit"
            colorPalette="green"
            loading={guardando}
            disabled={rotulo.guardado_en_bd && !hayCambios}
          >
            <FiSave />
            {completitudEnVivo.esta_completo
              ? "Guardar datos del rótulo"
              : "Guardar borrador del rótulo"}
          </Button>
        </HStack>
      </VStack>
    </form>
  );
};
