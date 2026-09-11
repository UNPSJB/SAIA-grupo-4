import { useState } from "react";
import { VStack } from "@chakra-ui/react";
import { FiSave, FiXCircle, FiEdit2 } from "react-icons/fi";
import { useInsumoSubmit } from '../../utils/insumo/useInsumoSubmit';
import type { FormValues, Insumo} from '../../utils/insumo/types';
// UI components
import {
  FormHeader,
  TextField,
  SelectField,
  SubmitButton,
  CancelButton,
  FormActions,
  AlertMessage,
  FormContainer,
} from '../../components/ui/form';



interface ModificarInsumoProps {
    insumo: Insumo;
    onCancelar?: () => void;
    onGuardado?: () => void;
}

export const ModificarInsumo = ({ insumo, onCancelar, onGuardado }: ModificarInsumoProps) => {
    const [datos, setDatos] = useState<FormValues>({
        nombre: insumo.nombre,
        unidad_medida: insumo.unidad_medida
    });
    const [errores, setErrores] = useState<{ nombre?: string; unidad_medida?: string; otros?: string }>({});
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);


    const handleSubmit = useInsumoSubmit({
      endpoint: 'http://127.0.0.1:8000/insumos/',
      method: 'PUT',
      id: insumo.id,
      onSuccess: () => {
        onGuardado?.();
      }
    });

    return (
      <FormContainer>
        <FormHeader title="Modificar Insumo" icon={FiEdit2} />
        <form onSubmit={(e) => handleSubmit(e, datos, setDatos, setErrores, setLoading, setSuccess)}>
          <VStack gap={4}>
            <TextField
              label="Nombre"
              placeholder="Ej: Arroz"
              value={datos.nombre}
              onChange={(e) => {
                setDatos({ ...datos, nombre: e.target.value });
                setErrores((prev) => ({ ...prev, nombre: undefined }));
              }}
              error={errores.nombre}
            />
            <SelectField
              label="Unidad de medida"
              placeholder="Selecciona una opción"
              value={datos.unidad_medida}
              onChange={(e) => {
                setDatos({ ...datos, unidad_medida: e.target.value });
                setErrores((prev) => ({ ...prev, unidad_medida: undefined }));
              }}
              options={[
                { label: 'Litros', value: 'litros' },
                { label: 'Kilogramos', value: 'kilogramos' },
                { label: 'Gramos', value: 'gramos' },
                { label: 'Unidades', value: 'unidades' },
              ]}
              error={errores.unidad_medida}
            />
            <FormActions>
              <SubmitButton text="Guardar" icon={FiSave} loading={loading} type="submit" />
              <CancelButton text="Cancelar" icon={FiXCircle} onClick={onCancelar} />
            </FormActions>

            {errores.otros && <AlertMessage type="error" message={errores.otros} />}
            {success && <AlertMessage type="success" message="Insumo modificado exitosamente!" />}
          </VStack>
        </form>
      </FormContainer>
    );
};