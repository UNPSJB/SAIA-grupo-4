"""Reglas de autenticación y autorización basadas en las capacidades del personal.

Solo el personal con la capacidad 'administrar' u 'operar' (las capacidades de
sistema) puede iniciar sesión y, por lo tanto, es el único que posee contraseña.
Este módulo es la fuente de verdad de ese concepto: lo consumen el módulo auth
(login/refresh) y los servicios de personal (alta y modificación).
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.auth import exceptions
from src.auth.utils import verify_password
from src.capacidades.constants import RolesSistema
from src.capacidades.models import Capacidad
from src.personal.models import Persona, PersonaCapacidad

# Capacidades que habilitan el ingreso al sistema.
CAPACIDADES_HABILITANTES = {RolesSistema.ADMINISTRAR, RolesSistema.OPERAR}


# Indica si la persona tiene vigente (activa) una capacidad habilitante.
def tiene_capacidad_habilitante(db: Session, persona: Persona) -> bool:
    asignacion = db.scalar(
        select(PersonaCapacidad)
        .join(Capacidad)
        .where(
            PersonaCapacidad.persona_id == persona.id,
            PersonaCapacidad.activo == True,
            Capacidad.activo == True,
            Capacidad.nombre.in_(CAPACIDADES_HABILITANTES),
        )
    )
    return asignacion is not None


# Indica si entre los ids de capacidades recibidos hay alguna habilitante.
# Se usa al crear o modificar una persona para decidir si la operación exige
# contraseña (el request trae los ids de las capacidades, no sus nombres).    
def incluye_capacidad_habilitante(db: Session, capacidades_ids: list[int]) -> bool:
    if not capacidades_ids:
        return False
    nombres = db.scalars(
        select(Capacidad.nombre).where(
            Capacidad.id.in_(capacidades_ids),
            Capacidad.activo == True,
            Capacidad.nombre.in_(CAPACIDADES_HABILITANTES),
        )
    ).all()
    return len(nombres) > 0

# Devuelve los nombres de las capacidades vigentes de la persona.
def nombres_capacidades_activas(db: Session, persona_id: int) -> set[str]:
    return set(
        db.scalars(
            select(Capacidad.nombre)
            .join(PersonaCapacidad)
            .where(
                PersonaCapacidad.persona_id == persona_id,
                PersonaCapacidad.activo == True,
                Capacidad.activo == True,
            )
        ).all()
    )

# Valida DNI + contraseña y que la persona esté habilitada para ingresar.
# Se distinguen dos errores 401:
#   - CredencialesIncorrectas: DNI inexistente, sin contraseña asignada,
#     contraseña incorrecta o persona dada de baja. El mensaje es el mismo a
#     propósito: no revela si el DNI existe ni en qué falló exactamente.
#   
#   - CapacidadesNoHabilitadas: la contraseña es correcta pero la persona no
#     tiene vigente 'administrar' ni 'operar' (perdió la capacidad o nunca
#     tuvo una habilitante).
def authenticate_user(db: Session, dni: str, password: str) -> Persona:
    persona = db.scalar(select(Persona).where(Persona.dni == dni))
    if persona is None or persona.password_hash is None:
        raise exceptions.CredencialesIncorrectas()
    if not verify_password(password, persona.password_hash):
        raise exceptions.CredencialesIncorrectas()
    if not persona.activo:
        raise exceptions.CredencialesIncorrectas()
    if not tiene_capacidad_habilitante(db, persona):
        raise exceptions.CapacidadesNoHabilitadas()
    return persona
