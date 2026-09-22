import { useState, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { VStack, Text, Checkbox, Box } from "@chakra-ui/react";
import { usePersonalSubmit, type PersonalPayload } from "./hooks/usePersonalSubmit"; 
import { useListadoData } from "../../hooks/useListadoData";
import { personalSchema, type PersonalFormInput, type PersonalFormValues } from "./validationSchema";
import type { Persona } from "./types";
import type { Capacidad } from "../capacidades/types";
import { FormContainer, FormHeader, TextField, FormActions, SubmitButton, CancelButton, AlertMessage, AlertConfirm } from "../../components/ui";
import { FiUser, FiEdit2, FiSave, FiXCircle, FiEye } from "react-icons/fi";

type PersonalFormProps = {
    modo: "crear" | "modificar" | "ver";
    persona?: Persona;
    onCancelar?: () => void;
    onGuardado?: (persona: Persona) => void;
    enModal?: boolean;
};

export const PersonalForm = ({ modo, persona, onCancelar, onGuardado, enModal = false }: PersonalFormProps) => {
    const esModoVer = modo === "ver";
    const esModoCrear = modo === "crear";
    const esModoModificar = modo === "modificar";

    const defaultValues: PersonalFormInput = esModoModificar || esModoVer
        ? {
              nombre: persona!.nombre,
              apellido: persona!.apellido,
              dni: persona!.dni,
              legajo: String(persona!.legajo),
              email: persona!.email || "",
              telefono: persona!.telefono || "",
              capacidades_ids: persona!.capacidades.filter(c => c.activo).map(c => c.capacidad_id),
          }
        : { nombre: "", apellido: "", dni: "", legajo: "", email: "", telefono: "", capacidades_ids: [] };

    const { register, handleSubmit, control, formState: { errors, isSubmitting }, setError, clearErrors, reset } = useForm<PersonalFormInput, unknown, PersonalFormValues>({
        resolver: zodResolver(personalSchema),
        defaultValues,
    });

    const { data: capacidades } = useListadoData<Capacidad>({ endpoint: "http://127.0.0.1:8000/capacidades/" });
    const capacidadesActivas = useMemo(() => capacidades.filter((c) => c.activo), [capacidades]);

    const [success, setSuccess] = useState(false);
    const [confirmAltaAbierto, setConfirmAltaAbierto] = useState(false);
    const [personaInactivaId, setPersonaInactivaId] = useState<number | null>(null);
    const [errorConfirmar, setErrorConfirmar] = useState("");

    const { submit } = usePersonalSubmit({
        endpoint: "http://127.0.0.1:8000/personal/",
        method: esModoCrear ? "POST" : "PUT",
        id: esModoModificar ? persona!.id : undefined,
        onInactivo: (pId) => {
            if (!esModoCrear) return;
            setPersonaInactivaId(pId);
            setErrorConfirmar("");
            setConfirmAltaAbierto(true);
        },
        onSuccess: () => {
            setSuccess(true);
            onGuardado?.(persona!);
        },
    });

    const reactivar = usePersonalSubmit({
        endpoint: "http://127.0.0.1:8000/personal/",
        method: "PUT",
        id: personaInactivaId ?? undefined,
        body: { activo: true },
        onSuccess: () => {
            setConfirmAltaAbierto(false);
            setPersonaInactivaId(null);
            onGuardado?.(persona!);
        },
    });

    const confirmarAlta = async () => {
        if (personaInactivaId === null) return;
        setErrorConfirmar("");
        const res = await reactivar.submit();
        if (res.status === "error") setErrorConfirmar(res.message);
    };

    const onSubmit = handleSubmit(async (values) => {
        setSuccess(false);
        clearErrors("root");
        const res = await submit(values as PersonalPayload);
        if (res.status === "error") setError("root", { message: res.message });
        else if (res.status === "success" && esModoCrear) reset();
    });

    return (
        <FormContainer modal={enModal}>
            <FormHeader
                title={esModoVer ? "Ver Persona" : esModoCrear ? "Nueva Persona" : "Modificar Persona"}
                icon={esModoVer ? FiEye : esModoModificar ? FiEdit2 : FiUser}
            />
            <form onSubmit={esModoVer ? undefined : onSubmit} noValidate>
                <VStack gap={4}>
                    <TextField label="Nombre" disabled={esModoVer} error={errors.nombre?.message} {...register("nombre")} />
                    <TextField label="Apellido" disabled={esModoVer} error={errors.apellido?.message} {...register("apellido")} />
                    <TextField label="DNI" disabled={esModoVer} error={errors.dni?.message} {...register("dni")} />
                    <TextField label="Legajo" disabled={esModoVer} error={errors.legajo?.message} {...register("legajo")} />
                    <TextField label="Email (Opcional)" disabled={esModoVer} error={errors.email?.message} {...register("email")} />
                    <TextField label="Teléfono (Opcional)" disabled={esModoVer} error={errors.telefono?.message} {...register("telefono")} />

                    <Box width="100%" textAlign="left">
                        <Text fontSize="md" fontFamily="sans-serif" mb={2} fontWeight="bold">
                            Capacidades:
                        </Text>
                        <Controller
                            name="capacidades_ids"
                            control={control}
                            render={({ field }) => (
                                <Checkbox.Group value={field.value.map(String)} onValueChange={(vals) => field.onChange(vals.map(Number))}>
                                    <VStack align="flex-start" gap={2}>
                                        {capacidadesActivas.map((cap) => (
                                            <Checkbox.Root key={cap.id} value={String(cap.id)} disabled={esModoVer}>
                                                <Checkbox.HiddenInput />
                                                <Checkbox.Control />
                                                <Checkbox.Label textTransform="capitalize">{cap.nombre}</Checkbox.Label>
                                            </Checkbox.Root>
                                        ))}
                                    </VStack>
                                </Checkbox.Group>
                            )}
                        />
                        {errors.capacidades_ids && <Text color="red.500" fontSize="sm" mt={1}>{errors.capacidades_ids.message}</Text>}
                    </Box>

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
                    {success && !esModoVer && <AlertMessage type="success" message={esModoCrear ? "Persona creada exitosamente." : "Persona modificada exitosamente."} />}
                </VStack>
            </form>
            
            {esModoCrear && (
                <AlertConfirm
                    open={confirmAltaAbierto}
                    title="Reactivar Personal"
                    message="Ya existe una persona inactiva con ese DNI o Legajo. ¿Querés reactivarla?"
                    loading={reactivar.isSubmitting}
                    error={errorConfirmar}
                    onConfirm={confirmarAlta}
                    onCancel={() => setConfirmAltaAbierto(false)}
                />
            )}
        </FormContainer>
    );
};