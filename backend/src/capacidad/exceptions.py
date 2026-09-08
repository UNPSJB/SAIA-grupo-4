from fastapi import HTTPException, status


class CapacidadNoEncontrada(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Capacidad no encontrada"
        )


class PersonaCapacidadNoEncontrada(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registro de capacidad de persona no encontrado"
        )