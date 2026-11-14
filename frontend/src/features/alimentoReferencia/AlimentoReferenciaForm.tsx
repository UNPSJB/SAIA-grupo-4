import { BASE_URL } from "../../config";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FiDatabase, FiEdit2, FiSave, FiXCircle } from "react-icons/fi";
import { apiFetch } from "../auth/apiFetch";
import { useAlimentoReferenciaSubmit } from "./hooks/useAlimentoReferenciaSubmit";
import {
  alimentoReferenciaSchema,
  type AlimentoReferenciaFormValues,
} from "./validationSchema";
import type { AlimentoReferencia } from "./types";
import {
  AlertMessage,
  CancelButton,
  FormActions,
  FormContainer,
  FormGrid,
  FormHeader,
  SelectField,
  SubmitButton,
  TextField,
} from "../../components/ui";

const CATEGORIAS_POR_DEFECTO = [
  "Cereales, legumbres y derivados",
  "Bebidas",
  "Carnes y derivados",
  "Dulces",
  "Alimentos pre-elaborados",
  "Frutas",
  "Grasas y aceites",
  "Hortalizas",
  "Leche y postres lácteos",
  "Condimentos, productos copetín, caldos y sopas",
  "Pescados",
  "Quesos",
  "Suplementos vitamínicos y nutricionales",
  "Huevos",
  "Yogures",
];

interface AlimentoReferenciaFormProps {
  modo: "crear" | "modificar";
  alimento?: AlimentoReferencia;
  onCancelar?: () => void;
  onGuardado?: () => void;
  enModal?: boolean;
}

export const AlimentoReferenciaForm = ({
  modo,
  alimento,
  onCancelar,
  onGuardado,
  enModal = false,
}: AlimentoReferenciaFormProps) => {
  const esModoModificar = modo === "modificar";
  const [categorias, setCategorias] = useState<string[]>(CATEGORIAS_POR_DEFECTO);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let activo = true;
    apiFetch(`${BASE_URL}/alimentos-referencia/categorias`)
      .then((r) => (r.ok ? r.json() : []))
      .then((lista: string[]) => {
        if (activo && Array.isArray(lista) && lista.length > 0) {
          setCategorias(lista);
        }
      })
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, []);

  const defaultValues: AlimentoReferenciaFormValues = esModoModificar && alimento
    ? {
        codigo: alimento.codigo ?? "",
        alimento: alimento.alimento,
        categoria: alimento.categoria ?? "",
        energia_kcal: String(alimento.energia_kcal ?? "0"),
        carbohidratos_g: String(alimento.carbohidratos_g ?? "0"),
        proteinas_g: String(alimento.proteinas_g ?? "0"),
        grasas_totales_g: String(alimento.grasas_totales_g ?? "0"),
        grasas_saturadas_g: String(alimento.grasas_saturadas_g ?? "0"),
        fibra_g: String(alimento.fibra_g ?? "0"),
        sodio_mg: String(alimento.sodio_mg ?? "0"),
      }
    : {
        codigo: "",
        alimento: "",
        categoria: "",
        energia_kcal: "0",
        carbohidratos_g: "0",
        proteinas_g: "0",
        grasas_totales_g: "0",
        grasas_saturadas_g: "0",
        fibra_g: "0",
        sodio_mg: "0",
      };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
    setError,
    clearErrors,
  } = useForm<AlimentoReferenciaFormValues>({
    resolver: zodResolver(alimentoReferenciaSchema),
    defaultValues,
    mode: "onChange",
  });

  const { submit } = useAlimentoReferenciaSubmit({
    endpoint: `${BASE_URL}/alimentos-referencia/`,
    method: esModoModificar ? "PUT" : "POST",
    id: esModoModificar ? alimento?.id : undefined,
    onSuccess: () => {
      setSuccess(true);
      onGuardado?.();
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSuccess(false);
    clearErrors("root");
    const res = await submit(values);
    if (res.status === "error") {
      setError("root", { message: res.message });
    }
  });

  return (
    <FormContainer modal={enModal}>
      <FormHeader
        title={
          esModoModificar
            ? "Modificar Alimento de Referencia"
            : "Nuevo Alimento de Referencia"
        }
        icon={esModoModificar ? FiEdit2 : FiDatabase}
      />

      <form onSubmit={onSubmit} noValidate>
        <FormGrid>
          <TextField
            label='Nombre del Alimento'
            placeholder='Ej. Harina de Almendras Integral'
            error={errors.alimento?.message}
            {...register("alimento")}
          />

          <SelectField
            label='Categoría (opcional)'
            placeholder='Selecciona una categoría'
            options={categorias.map((c) => ({ label: c, value: c }))}
            error={errors.categoria?.message}
            {...register("categoria")}
          />

          <TextField
            label='Código interno / externo (opcional)'
            placeholder='Ej. PROP-001'
            error={errors.codigo?.message}
            {...register("codigo")}
          />

          <TextField
            label='Energía (kcal / 100 g)'
            type='number'
            step='0.01'
            min='0'
            hideSpinners
            error={errors.energia_kcal?.message}
            {...register("energia_kcal")}
          />

          <TextField
            label='Carbohidratos (g / 100 g)'
            type='number'
            step='0.01'
            min='0'
            hideSpinners
            error={errors.carbohidratos_g?.message}
            {...register("carbohidratos_g")}
          />

          <TextField
            label='Proteínas (g / 100 g)'
            type='number'
            step='0.01'
            min='0'
            hideSpinners
            error={errors.proteinas_g?.message}
            {...register("proteinas_g")}
          />

          <TextField
            label='Grasas Totales (g / 100 g)'
            type='number'
            step='0.01'
            min='0'
            hideSpinners
            error={errors.grasas_totales_g?.message}
            {...register("grasas_totales_g")}
          />

          <TextField
            label='Grasas Saturadas (g / 100 g)'
            type='number'
            step='0.01'
            min='0'
            hideSpinners
            error={errors.grasas_saturadas_g?.message}
            {...register("grasas_saturadas_g")}
          />

          <TextField
            label='Fibra Alimentaria (g / 100 g)'
            type='number'
            step='0.01'
            min='0'
            hideSpinners
            error={errors.fibra_g?.message}
            {...register("fibra_g")}
          />

          <TextField
            label='Sodio (mg / 100 g)'
            type='number'
            step='0.01'
            min='0'
            hideSpinners
            error={errors.sodio_mg?.message}
            {...register("sodio_mg")}
          />

          <FormActions>
            <SubmitButton
              text='Guardar'
              icon={FiSave}
              loading={isSubmitting}
              type='submit'
              colorPalette='green'
              disabled={!isValid}
            />
            <CancelButton
              text='Cancelar'
              icon={FiXCircle}
              onClick={onCancelar}
              colorPalette='red'
              variant='outline'
            />
          </FormActions>

          {errors.root?.message && (
            <AlertMessage type='error' message={errors.root.message} />
          )}
          {success && (
            <AlertMessage
              type='success'
              message={
                esModoModificar
                  ? "Alimento de referencia actualizado."
                  : "Alimento de referencia creado exitosamente."
              }
            />
          )}
        </FormGrid>
      </form>
    </FormContainer>
  );
};
