import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { VStack } from "@chakra-ui/react";
import { FiBookOpen, FiEdit3, FiSave, FiXCircle } from "react-icons/fi";
import {
  AlertMessage,
  CancelButton,
  FormActions,
  FormContainer,
  FormHeader,
  SelectField,
  SubmitButton,
  TextField,
} from "../../components/ui";
import { recetaSchema, type RecetaFormInput, type RecetaFormValues } from "./validationSchema";
import type { Receta } from "./types";
import type { Producto } from "../productos/types";
import { recetasApi } from "./hooks/recetaApi";

interface RecetaFormProps {
  modo?: "crear" | "modificar";
  receta?: Receta;
  onCancelar?: () => void;
  onGuardado?: (receta: Receta) => void;
  enModal?: boolean;
}

export const RecetaForm = ({
  modo = "modificar",
  receta,
  onCancelar,
  onGuardado,
  enModal = false,
}: RecetaFormProps) => {
  const esModoCrear = modo === "crear";
  const [success, setSuccess] = useState(false);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargandoProductos, setCargandoProductos] = useState(false);

  useEffect(() => {
    if (esModoCrear) {
      setCargandoProductos(true);
      recetasApi
        .obtenerProductosActivos()
        .then(setProductos)
        .catch(() => setProductos([]))
        .finally(() => setCargandoProductos(false));
    }
  }, [esModoCrear]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
  } = useForm<RecetaFormInput, unknown, RecetaFormValues>({
    resolver: zodResolver(recetaSchema),
    defaultValues: {
      nombre_receta: receta?.nombre_receta || "",
      producto_id: receta?.producto_id || ("" as unknown as number),
      rendimiento_estandar: receta?.rendimiento_estandar || ("" as unknown as number),
      tiempo_estimado_total: receta?.tiempo_estimado_total || ("" as unknown as number),
      observaciones: receta?.observaciones || "",
    },
  });

  const productoIdSeleccionado = watch("producto_id");

  const simboloUnidad = useMemo(() => {
    if (productoIdSeleccionado) {
      const prod = productos.find(
        (p) => String(p.id) === String(productoIdSeleccionado),
      );
      if (prod?.unidad_medida) {
        return prod.unidad_medida.simbolo || prod.unidad_medida.nombre || "";
      }
    }
    if (receta?.producto?.unidad_medida) {
      return (
        receta.producto.unidad_medida.simbolo ||
        receta.producto.unidad_medida.nombre ||
        ""
      );
    }
    return "";
  }, [productoIdSeleccionado, productos, receta]);

  const onSubmit = handleSubmit(async (values) => {
    clearErrors("root");
    try {
      if (esModoCrear) {
        const creada = await recetasApi.crearReceta({
          nombre_receta: values.nombre_receta.trim(),
          producto_id: Number(values.producto_id),
          rendimiento_estandar: Number(values.rendimiento_estandar),
          tiempo_estimado_total: values.tiempo_estimado_total ? Number(values.tiempo_estimado_total) : undefined,
          observaciones: values.observaciones?.trim() || undefined,
        });
        setSuccess(true);
        onGuardado?.(creada);
      } else {
        if (!receta) return;
        const modificada = await recetasApi.modificarReceta(receta.id, {
          nombre_receta: values.nombre_receta.trim(),
          rendimiento_estandar: Number(values.rendimiento_estandar),
          tiempo_estimado_total: values.tiempo_estimado_total ? Number(values.tiempo_estimado_total) : undefined,
          observaciones: values.observaciones?.trim() || undefined,
        });
        setSuccess(true);
        onGuardado?.(modificada);
      }
    } catch (e) {
      setError("root", {
        message: e instanceof Error ? e.message : "Ocurrió un error al guardar la receta.",
      });
    }
  });

  return (
    <FormContainer modal={enModal}>
      <FormHeader title={esModoCrear ? "Nueva Receta" : "Modificar Receta"} icon={esModoCrear ? FiBookOpen : FiEdit3} />
      <form onSubmit={onSubmit} noValidate>
        <VStack gap={4}>
          <TextField
            label="Nombre de la receta"
            defaultValue={receta?.nombre_receta || ""}
            placeholder="Ej. Receta Pan de Molde Sésamo"
            error={errors.nombre_receta?.message}
            {...register("nombre_receta")}
          />
          {esModoCrear ? (
            <SelectField
              label="Producto elaborado"
              placeholder={cargandoProductos ? "Cargando productos..." : "Seleccione un producto"}
              defaultValue={receta?.producto_id ? String(receta.producto_id) : ""}
              error={errors.producto_id?.message}
              options={productos.map((p) => ({
                value: String(p.id),
                label: p.unidad_medida?.simbolo
                  ? `${p.nombre} (${p.unidad_medida.simbolo})`
                  : p.nombre,
              }))}
              disabled={cargandoProductos}
              {...register("producto_id")}
            />
          ) : (
            <TextField
              label="Producto elaborado"
              defaultValue={
                receta?.producto?.nombre
                  ? `${receta.producto.nombre}${
                      receta.producto.unidad_medida?.simbolo
                        ? ` (${receta.producto.unidad_medida.simbolo})`
                        : ""
                    }`
                  : receta?.producto_id
                  ? String(receta.producto_id)
                  : ""
              }
              disabled
            />
          )}
          <TextField
            label={
              simboloUnidad
                ? `Rendimiento estándar (${simboloUnidad})`
                : "Rendimiento estándar"
            }
            defaultValue={receta?.rendimiento_estandar ? String(receta.rendimiento_estandar) : ""}
            placeholder={simboloUnidad ? `Ej. 100.00 ${simboloUnidad}` : "Ej. 100.00"}
            error={errors.rendimiento_estandar?.message}
            {...register("rendimiento_estandar")}
          />
          <TextField
            label="Tiempo estimado total (minutos)"
            type="number"
            min={1}
            step={1}
            hideSpinners
            defaultValue={receta?.tiempo_estimado_total ? String(receta.tiempo_estimado_total) : ""}
            placeholder="Ej. 90"
            error={errors.tiempo_estimado_total?.message}
            onKeyDown={(e) => {
              if (["e", "E", "+", "-", ".", ","].includes(e.key)) {
                e.preventDefault();
              }
            }}
            onPaste={(e) => {
              const texto = e.clipboardData.getData("text");
              if (!/^\d+$/.test(texto)) {
                e.preventDefault();
              }
            }}
            {...register("tiempo_estimado_total")}
          />
          <TextField
            label="Observaciones (Opcional)"
            defaultValue={receta?.observaciones || ""}
            placeholder="Indicaciones o notas generales de preparación"
            error={errors.observaciones?.message}
            {...register("observaciones")}
          />

          <FormActions>
            <SubmitButton text={esModoCrear ? "Guardar Receta" : "Guardar"} icon={FiSave} loading={isSubmitting} type="submit" colorPalette="green" />
            <CancelButton text="Cancelar" icon={FiXCircle} onClick={onCancelar} colorPalette="red" variant="outline" />
          </FormActions>

          {errors.root?.message && <AlertMessage type="error" message={errors.root.message} />}
          {success && (
            <AlertMessage type="success" message={esModoCrear ? "Receta creada exitosamente." : "Receta modificada exitosamente."} />
          )}
        </VStack>
      </form>
    </FormContainer>
  );
};
