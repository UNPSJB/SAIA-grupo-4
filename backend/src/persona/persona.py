from sqlalchemy import Column, Integer, String
from ..database import Base

class Persona (Base):
    __tablename__ = "personal"

    id = Column(Integer, primary_key=True)
    nombre = Column(String, nullable=False)
    legajo = Column(Integer, nullable=False, unique = True)
    fechaAlta = Column(String, nullable=False)
    