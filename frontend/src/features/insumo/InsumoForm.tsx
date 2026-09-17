import { useState } from "react";
import { VStack } from "@chakra-ui/react";
import { useInsumoSubmit } from "./useInsumoSubmit";
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
  const isModoVer = modo === "ver";
  const esModoCrear = modo === "crear";
  const esModoModificar = modo === "modificar";

  const initialDatos =
    esModoModificar || isModoVer
      ? { nombre: insumo!.nombre, unidad_medida: insumo!.unidad_medida }
      : { nombre: "", unidad_medida: "" };

  const [datos, setDatos] = useState<FormValues>(initialDatos);
  const [errores, setErrores] = useState<{
    nombre?: string;
    unidad_medida?: string;
    otros?: string;
  }>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = useInsumoSubmit({
    endpoint: "http://127.0.0.1:8000/insumos/",
    method: esModoCrear ? "POST" : "PUT",
    id: esModoModificar ? insumo!.id : undefined,
    onSuccess: () => {
      setSuccess(true);
      onGuardado?.(insumo!);
    },
  });

  return (
    <FormContainer>
      <FormHeader
        title={
          isModoVer
            ? "Ver Insumo"
            : modo === "crear"
              ? "Nuevo Insumo"
              : "Modificar Insumo"
        }
        icon={isModoVer ? FiEye : esModoModificar ? FiEdit2 : FiBox}
      />
      <form
        onSubmit={
          isModoVer
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
            disabled={isModoVer}
            value={datos.nombre}
            placeholder='Ej. Harina 0000'
            onChange={(
              e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
            ) => {
              if (isModoVer) return;
              setDatos({ ...datos, nombre: e.target.value });
              setErrores((prev) => ({ ...prev, nombre: undefined }));
            }}
            error={errores.nombre}
          />
          <SelectField
            label='Unidad de medida'
            readOnly={isModoVer}
            value={datos.unidad_medida}
            onFocus={isModoVer ? (e) => e.preventDefault() : undefined}
            onClick={isModoVer ? (e) => e.preventDefault() : undefined}
            onChange={
              isModoVer
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
          <FormActions>
            {isModoVer ? (
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
          {success && !isModoVer && (
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
    </FormContainer>
  );
};
