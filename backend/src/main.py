from contextlib import asynccontextmanager
from fastapi import FastAPI
from sqlalchemy.orm import Session
from src.database import engine
from src.models import ModeloBase


# Importamos la configuración validada por Pydantic
from src.config import settings

# Importamos configuracion de logger
from src.logger import setup_logging

# Importamos los routers desde nuestros modulos
from src.personal.router import router as personal_router
from src.capacidades.router import router as capacidades_router
from src.equipos.router import router as equipos_router
from src.sectores.router import router as sectores_router
from src.insumos.router import router as insumos_router
from src.unidad_medida.router import router as unidades_de_medidas_router
from src.checklists.router import router as checklists_router
from fastapi.middleware.cors import CORSMiddleware

from src.capacidades.services import inicializar_capacidades_sistema

ENV = settings.ENV.upper()
ROOT_PATH = getattr(settings, f"ROOT_PATH_{ENV}", "")

setup_logging()

@asynccontextmanager
async def db_creation_lifespan(app: FastAPI):
    ModeloBase.metadata.create_all(bind=engine)
    with Session(engine) as db:
        inicializar_capacidades_sistema(db)
    yield


app = FastAPI(root_path=ROOT_PATH, lifespan=db_creation_lifespan)

origins = [
    "http://localhost:5173", # para recibir requests desde app React (puerto: 5173)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# asociamos los routers a nuestra app
app.include_router(personal_router)
app.include_router(capacidades_router)
app.include_router(equipos_router)
app.include_router(sectores_router)
app.include_router(insumos_router)
app.include_router(unidades_de_medidas_router)
app.include_router(checklists_router)
