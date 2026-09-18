import { useState } from "react";
import { VStack } from "@chakra-ui/react";
import { useInsumoSubmit } from "./hooks/useInsumoSubmit";
import type { FormValues, Insumo } from "./types";
import {
  FormContainer,
  FormHeader,
  TextField,
  SelectField,
  FormActions,
  SubmitButton,
  CancelButton,
  AlertMessage,
  AlertConfirm,
} from "../../components/ui";
import { FiBox, FiEdit2, FiSave, FiXCircle, FiEye } from "react-icons/fi";

type InsumoFormProps = {
  modo: "crear" | "modificar" | "ver";
  insumo?: Insumo;
  onCancelar?: () => void;
  onGuardado?: (insumo: Insumo) => void;
};

export const InsumoForm = ({
  modo,
  insumo,
  onCancelar,
  onGuardado,
}: InsumoFormProps) => {
  const esModoVer = modo === "ver";
  const esModoCrear = modo === "crear";
  const esModoModificar = modo === "modificar";

  const initialDatos =
    esModoModificar || esModoVer
      ? {
          nombre: insumo!.nombre,
          unidad_medida: insumo!.unidad_medida,
          categoria: insumo!.categoria,
          descripcion: insumo!.descripcion,
        }
      : { nombre: "", unidad_medida: "", categoria: "", descripcion: "" };

  const [datos, setDatos] = useState<FormValues>(initialDatos);
  const [errores, setErrores] = useState<{
    nombre?: string;
    unidad_medida?: string;
    categoria?: string;
    descripcion?: string;
    otros?: string;
  }>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [confirmAltaAbierto, setConfirmAltaAbierto] = useState(false);
  const [insumoInactivoId, setInsumoInactivoId] = useState<number | null>(null);

  const handleSubmit = useInsumoSubmit({
    endpoint: "http://127.0.0.1:8000/insumos/",
    method: esModoCrear ? "POST" : "PUT",
    id: esModoModificar ? insumo!.id : undefined,
    onInactivo: (insumoId) => {
      if (!esModoCrear) return;
      setInsumoInactivoId(insumoId);
      setErrores((prev) => ({ ...prev, otros: undefined }));
      setConfirmAltaAbierto(true);
    },
    onSuccess: () => {
      setSuccess(true);
      onGuardado?.(insumo!);
    },
  });

  const reactivar = useInsumoSubmit({
    endpoint: "http://127.0.0.1:8000/insumos/",
    method: "PUT",
    id: insumoInactivoId ?? undefined,
    body: { disponible: true },
    validar: false,
    onSuccess: () => {
      setConfirmAltaAbierto(false);
      setInsumoInactivoId(null);
      onGuardado?.(insumo!);
    },
  });

  const confirmarAlta = () => {
    if (insumoInactivoId === null) return;
    setErrores((prev) => ({ ...prev, otros: undefined }));
    reactivar(
      { preventDefault: () => {} } as React.FormEvent<HTMLFormElement>,
      { nombre: "", unidad_medida: "", categoria: "", descripcion: "" },
      () => {},
      (erroresAlta) => {
        if (
          erroresAlta &&
          typeof erroresAlta === "object" &&
          !Array.isArray(erroresAlta)
        ) {
          const e = erroresAlta as { otros?: string };
          if (e.otros) setErrores((prev) => ({ ...prev, otros: e.otros }));
        }
      },
      setLoading,
      () => {},
    );
  };

  return (
    <FormContainer>
      <FormHeader
        title={
          esModoVer
            ? "Ver Insumo"
            : modo === "crear"
              ? "Nuevo Insumo"
              : "Modificar Insumo"
        }
        icon={esModoVer ? FiEye : esModoModificar ? FiEdit2 : FiBox}
      />
      <form
        onSubmit={
          esModoVer
            ? undefined
            : (e) =>
                handleSubmit(
                  e as React.FormEvent<HTMLFormElement>,
                  datos,
                  setDatos,
                  setErrores,
                  setLoading,
                  setSuccess,
                )
        }
      >
        <VStack gap={4}>
          <TextField
            label='Nombre'
            disabled={esModoVer}
            value={datos.nombre}
            placeholder='Ej. Harina 0000'
            onChange={(
              e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
            ) => {
              if (esModoVer) return;
              setDatos({ ...datos, nombre: e.target.value });
              setErrores((prev) => ({ ...prev, nombre: undefined }));
            }}
            error={errores.nombre}
          />
          <SelectField
            label='Unidad de medida'
            placeholder='Selecciona una opcion'
            readOnly={esModoVer}
            value={datos.unidad_medida}
            onFocus={esModoVer ? (e) => e.preventDefault() : undefined}
            onClick={esModoVer ? (e) => e.preventDefault() : undefined}
            onChange={
              esModoVer
                ? () => {}
                : (e: React.ChangeEvent<HTMLSelectElement>) => {
                    setDatos({ ...datos, unidad_medida: e.target.value });
                    setErrores((prev) => ({
                      ...prev,
                      unidad_medida: undefined,
                    }));
                  }
            }
            options={[
              { label: "Litros", value: "litros" },
              { label: "Kilogramos", value: "kilogramos" },
              { label: "Gramos", value: "gramos" },
              { label: "Unidades", value: "unidades" },
            ]}
            error={errores.unidad_medida}
          />

          <SelectField
            label='Categoria'
            placeholder='Selecciona una opcion'
            readOnly={esModoVer}
            value={datos.categoria}
            onFocus={esModoVer ? (e) => e.preventDefault() : undefined}
            onClick={esModoVer ? (e) => e.preventDefault() : undefined}
            onChange={
              esModoVer
                ? () => {}
                : (e: React.ChangeEvent<HTMLSelectElement>) => {
                    setDatos({ ...datos, categoria: e.target.value });
                    setErrores((prev) => ({
                      ...prev,
                      categoria: undefined,
                    }));
                  }
            }
            options={[
              { label: "Materia Prima", value: "materia prima" },
              { label: "Aditivo", value: "aditivo" },
              { label: "Envase", value: "envase" },
              { label: "Otro", value: "otro" },
            ]}
            error={errores.categoria}
          />

          <TextField
            label='Descripcion'
            disabled={esModoVer}
            value={datos.descripcion}
            placeholder='Breve descripcion del insumo'
            onChange={(
              e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
            ) => {
              if (esModoVer) return;
              setDatos({ ...datos, descripcion: e.target.value });
              setErrores((prev) => ({ ...prev, descripcion: undefined }));
            }}
            error={errores.descripcion}
          />

          <FormActions>
            {esModoVer ? (
              <CancelButton
                text='Cerrar'
                icon={FiXCircle}
                onClick={onCancelar}
                colorPalette='red'
                variant='outline'
              />
            ) : (
              <>
                <SubmitButton
                  text='Guardar'
                  icon={FiSave}
                  loading={loading}
                  type='submit'
                  colorPalette='green'
                />
                <CancelButton
                  text='Cancelar'
                  icon={FiXCircle}
                  onClick={onCancelar}
                  colorPalette='red'
                  variant='outline'
                />
              </>
            )}
          </FormActions>

          {errores.otros && (
            <AlertMessage type='error' message={errores.otros} />
          )}
          {success && !esModoVer && (
            <AlertMessage
              type='success'
              message={
                esModoCrear
                  ? "El insumo ha sido cargado exitosamente!"
                  : "Insumo modificado exitosamente!"
              }
            />
          )}
        </VStack>
      </form>

      {esModoCrear && (
        <AlertConfirm
          open={confirmAltaAbierto}
          title='Dar de Alta'
          message={`Ya existe un insumo inactivo con ese nombre. ¿Queres darlo de alta a ${datos.nombre}?`}
          loading={loading}
          error={errores.otros}
          onConfirm={confirmarAlta}
          onCancel={() => setConfirmAltaAbierto(false)}
        />
      )}
    </FormContainer>
  );
};
