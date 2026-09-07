from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from models import ModeloBase

class Persona(ModeloBase):
    __tablename__ = "personal"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String, nullable=False)
    legajo: Mapped[int] = mapped_column(Integer, nullable=False, unique = True)
