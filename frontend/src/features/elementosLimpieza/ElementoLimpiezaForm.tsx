import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { VStack } from "@chakra-ui/react";
import { FiTrash2, FiEdit2, FiSave, FiXCircle, FiEye } from "react-icons/fi";
import { useState } from "react";
import { useElementoLimpiezaSubmit, type ElementoLimpiezaPayload } from "./hooks/useElementoLimpiezaSubmit";
import { useListadoData } from "../../hooks/useListadoData";
import { elementoLimpiezaSchema, type ElementoLimpiezaFormInput, type ElementoLimpiezaFormValues } from "./validationSchema";
import type { ElementoLimpieza, TipoElementoLimpieza, Sector, Equipo } from "./types";
import { FormContainer, FormHeader, TextField, SelectField, FormActions, SubmitButton, CancelButton, AlertMessage } from "../../components/ui";

type ElementoLimpiezaFormProps = {
    modo: "crear" | "modificar" | "ver";
    elemento?: ElementoLimpieza;
    onCancelar?: () => void;
    onGuardado?: (elemento: ElementoLimpieza) => void;
    enModal?: boolean;
};

export const ElementoLimpiezaForm = ({ modo, elemento, onCancelar, onGuardado, enModal = false }: ElementoLimpiezaFormProps) => {
    const esModoVer = modo === "ver";
    const esModoCrear = modo === "crear";
    const esModoModificar = modo === "modificar";

    const defaultValues: ElementoLimpiezaFormInput = esModoModificar || esModoVer
        ? {
              tipo_id: elemento!.tipo_id,
              sector_id: elemento!.sector_id ?? "",
              equipo_id: elemento!.equipo_id ?? "",
              frecuencia_recambio_dias: elemento!.frecuencia_recambio_dias ?? "",
          }
        : { tipo_id: 0, sector_id: "", equipo_id: "", frecuencia_recambio_dias: "" };

    const { register, handleSubmit, formState: { errors, isSubmitting }, setError, clearErrors, reset } =
        useForm<ElementoLimpiezaFormInput, unknown, ElementoLimpiezaFormValues>({
            resolver: zodResolver(elementoLimpiezaSchema),
            defaultValues,
        });

    const { data: tiposIniciales } = useListadoData<TipoElementoLimpieza>({ endpoint: "http://127.0.0.1:8000/tipos-elemento-limpieza/" });
    const { data: sectores } = useListadoData<Sector>({ endpoint: "http://127.0.0.1:8000/sectores/" });
    const { data: equipos } = useListadoData<Equipo>({ endpoint: "http://127.0.0.1:8000/equipos/" });

    const tiposActivos = tiposIniciales.filter((t) => t.activo);
    const sectoresActivos = sectores.filter((s) => s.activo);
    const equiposActivos = equipos.filter((e) => e.activo);

    const [success, setSuccess] = useState(false);

    const { submit } = useElementoLimpiezaSubmit({
        endpoint: "http://127.0.0.1:8000/elementos-limpieza/",
        method: esModoCrear ? "POST" : "PUT",
        id: esModoModificar ? elemento!.id : undefined,
        onSuccess: () => {
            setSuccess(true);
            onGuardado?.(elemento!);
        },
    });

    const onSubmit = handleSubmit(async (values) => {
        setSuccess(false);
        clearErrors("root");
        const payload: ElementoLimpiezaPayload = {
            tipo_id: values.tipo_id,
            sector_id: values.sector_id === "" ? null : Number(values.sector_id),
            equipo_id: values.equipo_id === "" ? null : Number(values.equipo_id),
            frecuencia_recambio_dias: values.frecuencia_recambio_dias === "" ? null : Number(values.frecuencia_recambio_dias),
        };
        const res = await submit(payload);
        if (res.status === "error") setError("root", { message: res.message });
        else if (res.status === "success" && esModoCrear) reset();
    });

    return (
        <FormContainer modal={enModal}>
            <FormHeader
                title={esModoVer ? "Ver Elemento de Limpieza" : esModoCrear ? "Nuevo Elemento de Limpieza" : "Modificar Elemento de Limpieza"}
                icon={esModoVer ? FiEye : esModoModificar ? FiEdit2 : FiTrash2}
            />
            <form onSubmit={esModoVer ? undefined : onSubmit} noValidate>
                <VStack gap={4}>
                    <SelectField
                        label="Tipo"
                        placeholder="Seleccioná un tipo"
                        options={tiposActivos.map((t) => ({ label: t.nombre, value: String(t.id) }))}
                        error={errors.tipo_id?.message}
                        disabled={esModoVer}
                        {...register("tipo_id")}
                    />

                    <SelectField
                        label="Sector (Opcional)"
                        placeholder="Sin asignar"
                        options={[{ label: "Sin asignar", value: "" }, ...sectoresActivos.map((s) => ({ label: s.nombre, value: String(s.id) }))]}
                        disabled={esModoVer}
                        {...register("sector_id")}
                    />

                    <SelectField
                        label="Equipo (Opcional)"
                        placeholder="Sin asignar"
                        options={[{ label: "Sin asignar", value: "" }, ...equiposActivos.map((e) => ({ label: e.nombre, value: String(e.id) }))]}
                        disabled={esModoVer}
                        {...register("equipo_id")}
                    />

                    <TextField
                        label="Frecuencia de recambio en días (Opcional)"
                        disabled={esModoVer}
                        error={errors.frecuencia_recambio_dias?.message}
                        {...register("frecuencia_recambio_dias")}
                    />

                    {esModoVer && (
                        <TextField
                            label="Último recambio"
                            disabled
                            value={elemento?.fecha_ultimo_recambio ? new Date(elemento.fecha_ultimo_recambio).toLocaleString("es-AR") : "—"}
                        />
                    )}

                    <FormActions>
                        {esModoVer ? (
                            <CancelButton text="Cerrar" icon={FiXCircle} onClick={onCancelar} colorPalette="gray" />
                        ) : (
                            <>
                                <SubmitButton text="Guardar" icon={FiSave} loading={isSubmitting} type="submit" colorPalette="green" />
                                <CancelButton text="Cancelar" icon={FiXCircle} onClick={onCancelar} colorPalette="red" variant="outline" />
                            </>
                        )}
                    </FormActions>

                    {errors.root?.message && <AlertMessage type="error" message={errors.root.message} />}
                    {success && !esModoVer && <AlertMessage type="success" message={esModoCrear ? "Elemento creado exitosamente." : "Elemento modificado exitosamente."} />}
                </VStack>
            </form>
        </FormContainer>
    );
};