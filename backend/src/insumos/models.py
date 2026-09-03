from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.models import ModeloBase
import src


class Insumo(ModeloBase):
    __tablename__ = "insumos"
    pass
