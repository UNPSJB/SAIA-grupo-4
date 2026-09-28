"""Datos de demostracion para la base de desarrollo de SAIA.

Uso (desde la carpeta backend/):

    python seed.py
    python seed.py --seed 7
    python seed.py --cantidad 3 --incluir-arhivados
    python seed.py --reset

Sin ``--reset`` el script se niega a escribir si la base ya tiene datos.
Para regenerarla desde cero, borrar backend/db.sqlite3 y volver a ejecutar.

Reglas que respeta el seed, y que son las mismas que valida la app en
plan_poes/schemas.py:

  - Cada tarea va a un Equipo O a un Sector, nunca a ninguno ni a ambos
    (validar_equipo_xor_sector).
  - Cada tarea tiene al menos un insumo quimico o un elemento de limpieza,
    y puede tener ambos (validar_al_menos_un_recurso).
  - ``detalle_frecuencia`` es coherente con la frecuencia: nulo en diaria, dia
    de la semana en semanal, 1-31 en mensual y abreviaturas en dias_especificos
    (validar_detalle_frecuencia).
  - Los dias usan los literales exactos de la app y sin tilde, porque asi los
    compara checklists/services.py::_filtrar_tareas_por_dia.
  - Todo el texto sembrado es ASCII: sin tildes, sin enie y sin simbolos.

``_verificar`` no reimplementa esas reglas: construye un TareaPOESCreate real
por cada tarea y deja que sea pydantic el que rechace lo que no cumpla.
"""

import argparse
import unicodedata
from datetime import date, datetime, time, timedelta
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path

if not (Path.cwd() / "src" / "database.py").is_file():
    raise SystemExit("Ejecutar desde la carpeta backend/: cd backend")

from faker import Faker
from pydantic import ValidationError
from sqlalchemy import String, delete, func, select, text

from src.capacidades.models import Capacidad, TipoCapacidad
from src.checklists.constants import EstadoEjecucion
from src.checklists.models import EjecucionInsumoQuimico, EjecucionTarea
from src.checklists.services import _filtrar_tareas_por_dia
from src.database import SessionLocal, engine
from src.elementos_limpieza.models import ElementoLimpieza
from src.equipos.models import Equipo
from src.insumo_quimico.models import InsumoQuimico
from src.insumos.models import Insumo
from src.models import ModeloBase
from src.personal.models import Persona, PersonaCapacidad
# Sin este import, historial_recambios no entra en ModeloBase.metadata y
# _resetear la dropea como "tabla no mapeada" en vez de truncarla.
from src.recambios.models import Recambio
from src.plan_poes.models import (
    PlanPOES,
    TareaElementoLimpieza,
    TareaInsumoQuimico,
    TareaPOES,
)
from src.plan_poes.schemas import (
    TareaElementoLimpiezaCreate,
    TareaInsumoQuimicoCreate,
    TareaPOESCreate,
)
from src.plan_poes.services import (
    _validar_recursos_activos,
    obtener_plan_activo,
    obtener_plan_borrador,
)
from src.sectores.models import Sector
from src.tipo_elemento_limpieza.models import TipoElementoLimpieza
from src.unidad_medida.models import UnidadMedida

UNIDADES = (
    ("Kilogramo", "kg", "masa"),
    ("Gramo", "g", "masa"),
    ("Litro", "L", "volumen"),
    ("Mililitro", "mL", "volumen"),
    ("Unidad", "u", "cantidad"),
)

SECTORES = (
    "Produccion",
    "Limpieza",
    "Almacen de Insumos",
    "Camara Fria",
    "Embalaje",
)

TIPOS_ELEMENTO = (
    ("Detergente", "DET"),
    ("Desinfectante", "DES"),
    ("Jabon Liquido", "JAB"),
    ("Limpiavidrios", "LIM"),
    ("Repelente / Trampa", "REP"),
)

EQUIPOS = (
    ("Heladera 1", "Fresar", "HF-0001", "heladera", 3, "Sala de frio"),
    ("Horno de coccion", "Rational", "HC-0002", "horno", 0, "Linea de produccion"),
    ("Balanza de plataforma", "Ohaus", "BP-0003", "balanza", 2, "Deposito de insumos"),
    ("Termometro digital", "Testo", "TD-0004", "termometro", 3, "Sala de frio"),
    ("Lavavajillas industrial", "Hobart", "LI-0005", "otro", 4, "Embalaje"),
)

INSUMOS = (
    ("Harina 000", 0, "materia prima", "Harina de trigo para masas."),
    ("Azucar impalpable", 1, "materia prima", "Azucar refinada para scorpia."),
    ("Sal fina", 1, "aditivo", "Sal de mesa para curado."),
    ("Bolsa para rotular", 4, "envase", "Bolsa de polietileno para producto terminado."),
    ("Caja de carton", 4, "envase", "Caja corrugada para transporte."),
)

INSUMOS_QUIMICOS = (
    ("Detergente Neutro Concentrado", "detergente", 3),
    ("Desinfectante a base de Hipoclorito", "desinfectante", 3),
    ("Desengrasante Concentrado", "desengrasante", 3),
    ("Jabon Liquido para Manos", "otro", 3),
    ("Limpiador de Equipamiento", "detergente", 3),
)

ELEMENTOS = (
    ("Esponja Abrasiva Verde", 0, None),
    ("Pano de Microfibra Azul", 3, None),
    ("Cepillo de Escobillas", 0, None),
    ("Trampa Adhesiva para Insectos", 4, 90),
    ("Rociador de Desinfeccion", 1, 30),
)

CAPACIDADES = (
    ("administrar", "Acceso a la gestion completa del sistema", TipoCapacidad.SISTEMA),
    ("operar", "Acceso a la ejecucion del checklist diario", TipoCapacidad.SISTEMA),
    ("Supervisar Limpieza", "Autoriza el cierre de tareas de limpieza", TipoCapacidad.PERSONALIZADA),
    ("Autorizar Desinfeccion", "Habilita las tareas de desinfeccion", TipoCapacidad.PERSONALIZADA),
    ("Gestionar Inventario", "Controla el stock de insumos y productos", TipoCapacidad.PERSONALIZADA),
)

# Deben coincidir con checklists/services.py::_filtrar_tareas_por_dia y con
# plan_poes/schemas.py: minusculas, sin tilde y con las mismas abreviaturas.
DIAS_SEMANA = {
    1: "lunes", 2: "martes", 3: "miercoles", 4: "jueves",
    5: "viernes", 6: "sabado", 7: "domingo",
}
DIAS_ABREVIADOS = {
    1: "lun", 2: "mar", 3: "mie", 4: "jue",
    5: "vie", 6: "sab", 7: "dom",
}

# (nombre, tipo_poes, frecuencia, destino)
# El destino es ("equipo", i) o ("sector", i): exactamente uno de los dos, como
# exige schemas.py::validar_equipo_xor_sector. Las cinco primeras tareas de cada
# plan arrancan con dos diarias mas una semanal, mensual y de dias especificos,
# de modo que el checklist de hoy muestre las cinco.
TAREAS = (
    ("Control de temperatura en camara fria", "pre_operacional", "diaria", ("equipo", 0)),
    ("Verificacion de elementos de limpieza", "pre_operacional", "diaria", ("sector", 0)),
    ("Desinfeccion de superficies", "operacional", "semanal", ("equipo", 1)),
    ("Limpieza de equipos de proceso", "operacional", "mensual", ("sector", 1)),
    ("Control de plagas", "post_operacional", "dias_especificos", ("equipo", 2)),
    ("Verificacion de rotulacion", "operacional", "diaria", ("equipo", 0)),
    ("Limpieza de linea de produccion", "operacional", "semanal", ("sector", 0)),
    ("Desinfeccion de utensilios", "post_operacional", "diaria", ("equipo", 1)),
    ("Inspeccion de embalajes", "operacional", "diaria", ("sector", 4)),
    ("Rotulacion de trazabilidad", "pre_operacional", "mensual", ("equipo", 2)),
)

# (cantidad de insumos, cantidad de elementos) por tarea. Nunca (0, 0), para
# respetar schemas.py::validar_al_menos_un_recurso. La mezcla es a proposito:
# hay tareas solo con insumos, solo con elementos y con ambos. Los perfiles de
# 2 o 3 insumos son los que producen ejecuciones con varios consumos.
PERFILES_RECURSOS = (
    (3, 1),
    (2, 2),
    (1, 0),
    (0, 2),
    (2, 1),
)

PASOS_POR_TIPO = {
    "pre_operacional": (
        "Verificar que el equipo este encendido y en condiciones operativas.",
        "Confirmar la disponibilidad de insumos y elementos de limpieza.",
        "Revisar el estado de higiene de la superficie a intervenir.",
        "Registrar la temperatura inicial del sector.",
    ),
    "operacional": (
        "Aplicar el producto de limpieza con la dosificacion indicada.",
        "Frotar la superficie hasta remover la suciedad visible.",
        "Enjuagar con agua potable si el procedimiento lo requiere.",
        "Verificar el tiempo de contacto del desinfectante.",
    ),
    "post_operacional": (
        "Retirar los residuos y descartar en el contenedor correcto.",
        "Guardar los elementos de limpieza en su lugar asignado.",
        "Cerrar y registrar la intervencion realizada.",
        "Confirmar la senalizacion del sector.",
    ),
}

MOTIVOS_NO_REALIZADA = (
    "No se realizo por falta de tiempo en el turno.",
    "Se omito porque faltaba el insumo requerido.",
    "El equipo se encontraba en uso.",
    "Quedo pendiente para el proximo turno.",
)

OBSERVACIONES_COMPLETADA = (
    "Sin novedad.",
    "Se bloqueo el sector durante la intervencion.",
    "Se retiro el equipo del sector por mantenimiento.",
    "Dosis ajustada por mayor suciedad.",
    None,
)


# --------------------------------------------------------------------------
# Utilidades
# --------------------------------------------------------------------------
def _sin_acentos(valor):
    """Quita tildes y enie de texto que no controlamos.

    Solo se usa sobre la salida de Faker, que viene en letras precompuestas
    ("Nunez" en vez de "Nunez" con enie). Los catalogos de este archivo ya
    estan en ASCII: pasarles por aqui los volveria a corromper.
    """
    if not isinstance(valor, str):
        return valor
    return unicodedata.normalize("NFKD", valor).encode("ascii", "ignore").decode("ascii")


def _ciclar(catalogo, cantidad, campo=0):
    """Repite el catalogo hasta `cantidad`, sufijando el campo pedido."""
    elementos = []
    for indice in range(cantidad):
        base = catalogo[indice % len(catalogo)]
        valores = [base] if isinstance(base, str) else list(base)
        vuelta = indice // len(catalogo)
        if vuelta:
            valores[campo] = f"{valores[campo]} ({vuelta + 1})"
        elementos.append(tuple(valores))
    return elementos


def _alcance_del_recurso(indice, sectores, equipos):
    """Sector y equipo del recurso, en un patron que cubre los destinos de tarea."""
    patron = indice % 5
    if patron in (0, 1):
        return None, None
    if patron == 2:
        return sectores[0], None
    if patron == 3:
        return sectores[1 % len(sectores)], None
    return None, equipos[0]


def _es_compatible(recurso, equipo, sector, es_insumo):
    """Espejo de plan_poes/services.py::_validar_recursos_activos.

    Los insumos heredan del sector; los elementos se aislan y no pueden ser de
    sector si la tarea pertenece a un equipo.
    """
    if recurso.sector is None and recurso.equipo is None:
        return True
    if recurso.equipo is not None:
        return recurso.equipo is equipo
    if recurso.sector is not None:
        tarea_sector = equipo.sector if equipo is not None else sector
        if es_insumo:
            return recurso.sector is tarea_sector
        return equipo is None and recurso.sector is tarea_sector
    return False


def _elegir_recursos(catalogo, desplazamiento, cantidad, equipo, sector, es_insumo):
    """Hasta `cantidad` recursos compatibles y distintos, en orden de rotacion.

    Si el destino de la tarea deja menos compatibles de los pedidos, devuelve
    los que haya: la app solo exige al menos uno.
    """
    if cantidad <= 0:
        return []
    elegidos = []
    for salto in range(len(catalogo)):
        recurso = catalogo[(desplazamiento + salto) % len(catalogo)]
        if any(recurso is otro for otro in elegidos):
            continue
        if _es_compatible(recurso, equipo, sector, es_insumo):
            elegidos.append(recurso)
            if len(elegidos) == cantidad:
                break
    if not elegidos:
        raise RuntimeError("No hay recursos compatibles para la tarea generada.")
    return elegidos


def _detalle_frecuencia(frecuencia, hoy):
    if frecuencia == "semanal":
        return DIAS_SEMANA[hoy.isoweekday()]
    if frecuencia == "mensual":
        return str(hoy.day)
    if frecuencia == "dias_especificos":
        return DIAS_ABREVIADOS[hoy.isoweekday()]
    return None


def _metodo(fake, nombre_tarea, tipo_poes):
    pasos = [f"Verificar condiciones de {tipo_poes.replace('_', ' ')} para: {nombre_tarea}."]
    pasos.extend(fake.random.sample(PASOS_POR_TIPO[tipo_poes], k=3))
    return "\n".join(pasos)


# --------------------------------------------------------------------------
# Reset
# --------------------------------------------------------------------------
def _tablas_no_mapeadas(db):
    """Tablas del archivo SQLite que no pertenecen al metadata.

    Son restos de modulos que viven en otras ramas (ej. historial_recambios).
    Si no se eliminan, el borrado de los datos falla por FK.
    """
    if engine.dialect.name != "sqlite":
        return []
    mapeadas = set(ModeloBase.metadata.tables)
    return [
        fila[0]
        for fila in db.execute(
            text("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
        ).all()
        if fila[0] not in mapeadas
    ]


def _resetear(db):
    for nombre in _tablas_no_mapeadas(db):
        db.execute(text(f'DROP TABLE IF EXISTS "{nombre}"'))
        print(f"    - tabla no mapeada eliminada: {nombre}")

    # Orden topologico inverso: las hijas primero. El alfabetico no sirve,
    # por ejemplo tareas_poes se borraria antes que ejecuciones_tareas.
    for tabla in reversed(ModeloBase.metadata.sorted_tables):
        db.execute(delete(tabla))


def _tablas_con_datos(db):
    ocupadas = []
    for tabla in ModeloBase.metadata.sorted_tables:
        total = db.scalar(select(func.count()).select_from(tabla))
        if total:
            ocupadas.append(f"{tabla.name} ({total})")
    return ocupadas


# --------------------------------------------------------------------------
# Siembra
# --------------------------------------------------------------------------
def _crear_prerrequisitos(db, cantidad):
    unidades = [
        UnidadMedida(nombre=nombre, simbolo=simbolo, tipo_magnitud=magnitud, disponible=True)
        for nombre, simbolo, magnitud in _ciclar(UNIDADES, cantidad)
    ]
    sectores = [
        Sector(nombre=nombre, activo=True) for (nombre,) in _ciclar(SECTORES, cantidad)
    ]
    tipos = [
        TipoElementoLimpieza(nombre=nombre, prefijo=prefijo, activo=True)
        for nombre, prefijo in _ciclar(TIPOS_ELEMENTO, cantidad)
    ]
    db.add_all(unidades + sectores + tipos)
    db.flush()

    equipos = [
        Equipo(
            nombre=nombre,
            marca=marca,
            numero_serie=serie,
            categoria=categoria,
            sector=sectores[indice_sector % len(sectores)],
            ubicacion=ubicacion,
            activo=True,
        )
        for nombre, marca, serie, categoria, indice_sector, ubicacion in _ciclar(EQUIPOS, cantidad)
    ]
    insumos = [
        Insumo(
            nombre=nombre,
            unidad_medida=unidades[indice_unidad % len(unidades)],
            categoria=categoria,
            descripcion=descripcion,
            disponible=True,
        )
        for nombre, indice_unidad, categoria, descripcion in _ciclar(INSUMOS, cantidad)
    ]

    insumos_quimicos = []
    for indice, (nombre, tipo, indice_unidad) in enumerate(_ciclar(INSUMOS_QUIMICOS, cantidad)):
        sector, equipo = _alcance_del_recurso(indice, sectores, equipos)
        insumos_quimicos.append(
            InsumoQuimico(
                nombre=nombre,
                tipo=tipo,
                unidad_medida=unidades[indice_unidad % len(unidades)],
                sector=sector,
                equipo=equipo,
                consumo=Decimal("0"),
                activo=True,
            )
        )

    elementos = []
    for indice, (nombre, indice_tipo, recambio) in enumerate(_ciclar(ELEMENTOS, cantidad)):
        sector, equipo = _alcance_del_recurso(indice, sectores, equipos)
        tipo = tipos[indice_tipo % len(tipos)]
        elementos.append(
            ElementoLimpieza(
                codigo=f"{tipo.prefijo}-{indice + 1:03d}",
                nombre=nombre,
                tipo=tipo,
                sector=sector,
                equipo=equipo,
                frecuencia_recambio_dias=recambio,
                fecha_ultimo_recambio=datetime.combine(
                    date.today() - timedelta(days=recambio or 7), time(9, 0)
                ),
                activo=True,
            )
        )

    db.add_all(equipos + insumos + insumos_quimicos + elementos)
    db.flush()
    return {
        "sectores": sectores,
        "equipos": equipos,
        "insumos_quimicos": insumos_quimicos,
        "elementos": elementos,
    }


def _crear_personas(db, fake, cantidad, hoy):
    capacidades = [
        Capacidad(nombre=nombre, descripcion=descripcion, tipo=tipo, activo=True)
        for nombre, descripcion, tipo in _ciclar(CAPACIDADES, cantidad)
    ]
    db.add_all(capacidades)
    db.flush()

    personas = [
        Persona(
            nombre=_sin_acentos(fake.first_name()),
            apellido=_sin_acentos(fake.last_name()),
            dni=str(fake.unique.random_int(20_000_000, 45_999_999)),
            legajo=1001 + indice,
            email=_sin_acentos(fake.unique.email()),
            telefono=_sin_acentos(fake.phone_number()),
            fecha_alta=datetime.combine(hoy - timedelta(days=400 - indice * 30), time(8, 0)),
            activo=indice < cantidad - 1,
        )
        for indice in range(cantidad)
    ]
    db.add_all(personas)
    db.flush()

    # Cubren las tres ramas de navegacion de App.tsx: administrar+operar,
    # solo operar y solo administrar. La ultima persona queda sin capacidades
    # porque esta dada de baja.
    asignaciones = (
        (0, "administrar"),
        (0, "operar"),
        (1, "operar"),
        (2, "administrar"),
        (3, "Supervisar Limpieza"),
    )
    por_nombre = {capacidad.nombre: capacidad for capacidad in capacidades}
    vinculos = [
        PersonaCapacidad(
            persona=personas[indice_persona],
            capacidad=por_nombre[nombre],
            fecha_desde=datetime.combine(hoy - timedelta(days=365), time(8, 0)),
            activo=True,
        )
        for indice_persona, nombre in asignaciones
        if indice_persona < len(personas)
    ]
    db.add_all(vinculos)
    db.flush()
    return personas


def _crear_planes(db, personas, cantidad, hoy):
    objetivos = (
        "Garantizar la inocuidad en la linea de produccion.",
        "Preparar el plan de limpieza de la linea de embalaje.",
        "Controlar la higiene de la camara fria.",
        "Mantener el orden y la higiene del deposito de insumos.",
        "Verificar las condiciones intermedias de elaboracion.",
    )
    # (etiqueta, dias desde hoy hasta la emision, dias hasta el archivado, activo)
    ventanas = (
        ("Produccion", 60, None, True),
        ("Embalaje", 1, None, False),
        ("Camara Fria", 240, 60, False),
        ("Almacen de Insumos", 365, 240, False),
        ("Limpieza", 420, 365, False),
    )

    planes = []
    for indice, (etiqueta, desde, hasta, activo) in enumerate(ventanas[:cantidad]):
        emision = hoy - timedelta(days=desde)
        planes.append(
            PlanPOES(
                nombre=f"Plan POES {emision.year} - {etiqueta}",
                objetivo=objetivos[indice % len(objetivos)],
                elaborado_por=personas[0],
                fecha_emision=datetime.combine(emision, time(8, 0)),
                fecha_hasta=(
                    None
                    if hasta is None
                    else datetime.combine(hoy - timedelta(days=hasta), time(8, 0))
                ),
                activo=activo,
            )
        )
    db.add_all(planes)
    db.flush()
    return planes


def _crear_tareas(db, fake, planes, cantidad, hoy, equipos, sectores, insumos_quimicos, elementos):
    for indice_plan, plan in enumerate(planes):
        for indice in range(cantidad):
            nombre, tipo_poes, frecuencia, destino = TAREAS[indice % len(TAREAS)]
            if indice >= len(TAREAS):
                nombre = f"{nombre} ({indice // len(TAREAS) + 1})"

            tipo_destino, posicion = destino
            if tipo_destino == "equipo":
                equipo, sector = equipos[posicion % len(equipos)], None
            else:
                equipo, sector = None, sectores[posicion % len(sectores)]

            pedidos = PERFILES_RECURSOS[indice % len(PERFILES_RECURSOS)]

            tarea = TareaPOES(
                plan=plan,
                nombre=nombre,
                tipo_poes=tipo_poes,
                frecuencia=frecuencia,
                detalle_frecuencia=_detalle_frecuencia(frecuencia, hoy),
                equipo=equipo,
                sector=sector,
                metodo=_metodo(fake, nombre, tipo_poes),
                activo=True,
                insumos_quimicos=[
                    TareaInsumoQuimico(
                        insumo_quimico=recurso,
                        dosis_sugerida=round(fake.random.uniform(5, 120), 2),
                        dilucion_especifica=f"{fake.random_int(1, 10)}:1",
                    )
                    for recurso in _elegir_recursos(
                        insumos_quimicos,
                        indice_plan * 2 + indice,
                        pedidos[0],
                        equipo,
                        sector,
                        es_insumo=True,
                    )
                ],
                elementos_limpieza=[
                    TareaElementoLimpieza(
                        elemento_limpieza=recurso,
                        cantidad_requerida=fake.random_int(1, 6),
                    )
                    for recurso in _elegir_recursos(
                        elementos,
                        indice_plan * 3 + indice + 1,
                        pedidos[1],
                        equipo,
                        sector,
                        es_insumo=False,
                    )
                ],
            )
            db.add(tarea)

    db.flush()


def _operadores(personas):
    return [
        persona
        for persona in personas
        if persona.activo
        and any(
            vinculo.activo and vinculo.capacidad.nombre == "operar"
            for vinculo in persona.capacidades
        )
    ]


def _crear_ejecuciones(db, fake, personas, planes, hoy, dias_historia, incluir_arhivados):
    operadores = _operadores(personas)
    consumo_acumulado: dict[int, Decimal] = {}
    estados = {estado: 0 for estado in EstadoEjecucion}

    for plan in planes:
        # Solo el plan vigente genera ejecuciones (get_db usa obtener_plan_activo).
        # El borrador no genera historial y los archivados son opt-in.
        if plan.activo:
            archivado = False
        elif plan.fecha_hasta is not None and incluir_arhivados:
            archivado = True
        else:
            continue

        if archivado:
            fin = plan.fecha_hasta.date()
            inicio = max(plan.fecha_emision.date(), fin - timedelta(days=dias_historia - 1))
        else:
            inicio = hoy - timedelta(days=dias_historia)
            fin = hoy - timedelta(days=1)

        fechas = [inicio + timedelta(days=desfase) for desfase in range((fin - inicio).days + 1)]
        if not archivado:
            # El checklist de hoy tiene que arrancar pendiente para que
            # GET /checklists/hoy muestre las tarjetas.
            fechas.append(hoy)

        for fecha in fechas:
            es_hoy = fecha == hoy
            for tarea in _filtrar_tareas_por_dia(plan.tareas, fecha):
                if es_hoy:
                    # La tarjeta pendiente lista los insumos de la tarea, asi que
                    # una tarea con 3 insumos aparece con 3 campos para cargar.
                    db.add(
                        EjecucionTarea(
                            id_tarea=tarea.id,
                            fecha_programada=fecha,
                            estado=EstadoEjecucion.PENDIENTE,
                        )
                    )
                    estados[EstadoEjecucion.PENDIENTE] += 1
                    continue

                completada = fake.random_int(1, 100) <= 80
                estado = (
                    EstadoEjecucion.COMPLETADA if completada else EstadoEjecucion.NO_REALIZADA
                )
                estados[estado] += 1

                ejecucion = EjecucionTarea(
                    id_tarea=tarea.id,
                    operador_id=fake.random.choice(operadores).id if operadores else None,
                    fecha_programada=fecha,
                    fecha_hora_ejecucion=(
                        datetime.combine(
                            fecha, time(fake.random_int(7, 16), fake.random_int(0, 59))
                        )
                        if completada
                        else None
                    ),
                    estado=estado,
                    observaciones=(
                        fake.random.choice(OBSERVACIONES_COMPLETADA)
                        if completada
                        else fake.random.choice(MOTIVOS_NO_REALIZADA)
                    ),
                )

                # Un consumo por cada insumo de la tarea, asi que las tareas con
                # 2 o 3 insumos rinden ejecuciones con 2 o 3 filas de consumo.
                if completada:
                    for vinculo in tarea.insumos_quimicos:
                        cantidad = round(
                            (vinculo.dosis_sugerida or 10) * fake.random.uniform(0.8, 1.2), 2
                        )
                        ejecucion.consumos_insumos.append(
                            EjecucionInsumoQuimico(
                                insumo_quimico=vinculo.insumo_quimico,
                                cantidad_utilizada=cantidad,
                            )
                        )
                        consumo_acumulado[vinculo.insumo_quimico.id] = (
                            consumo_acumulado.get(vinculo.insumo_quimico.id, Decimal("0"))
                            + Decimal(str(cantidad))
                        )

                db.add(ejecucion)

    db.flush()

    for insumo_id, total in consumo_acumulado.items():
        db.get(InsumoQuimico, insumo_id).consumo = total.quantize(
            Decimal("0.001"), rounding=ROUND_HALF_UP
        )

    db.flush()
    return estados


# --------------------------------------------------------------------------
# Verificacion
# --------------------------------------------------------------------------
def _validar_contra_schema(tarea):
    """Manda la tarea sembrada al schema real de la API.

    Delega en pydantic las tres reglas de POES: XOR de equipo y sector,
    detalle_frecuencia coherente y al menos un insumo o un elemento. Si el seed
    generara algo invalido, revienta aca en vez de en un POST del frontend.
    """
    try:
        TareaPOESCreate(
            nombre=tarea.nombre,
            tipo_poes=tarea.tipo_poes,
            frecuencia=tarea.frecuencia,
            detalle_frecuencia=tarea.detalle_frecuencia,
            equipo_id=tarea.equipo_id,
            sector_id=tarea.sector_id,
            metodo=tarea.metodo,
            insumos_quimicos=[
                TareaInsumoQuimicoCreate(
                    insumo_quimico_id=vinculo.insumo_quimico_id,
                    dosis_sugerida=vinculo.dosis_sugerida,
                    dilucion_especifica=vinculo.dilucion_especifica,
                )
                for vinculo in tarea.insumos_quimicos
            ],
            elementos_limpieza=[
                TareaElementoLimpiezaCreate(
                    elemento_limpieza_id=vinculo.elemento_limpieza_id,
                    cantidad_requerida=vinculo.cantidad_requerida,
                )
                for vinculo in tarea.elementos_limpieza
            ],
        )
    except ValidationError as error:
        raise RuntimeError(f"La tarea {tarea.nombre!r} no pasa el schema: {error}") from error


def _verificar_ascii_fuente():
    """El seed entero tiene que ser ASCII y guardarse sin BOM.

    Es la unica defensa contra la corrupcion que sufrio este archivo antes:
    UTF-8 guardado como cp1252 y vuelto a guardar, que partia cada acento en
    dos caracteres y dejaba 'Produccion' escrito como 'ProducciA3n'.
    """
    datos = Path(__file__).resolve().read_bytes()
    if datos.startswith(b"\xef\xbb\xbf"):
        raise RuntimeError("seed.py arranca con BOM UTF-8: hay que guardarlo sin BOM.")
    crudos = datos.decode("utf-8")
    malos = sorted({caracter for caracter in crudos if ord(caracter) > 127})
    if malos:
        raise RuntimeError(
            f"seed.py tiene {len(malos)} caracteres fuera de ASCII: "
            + ", ".join(f"U+{ord(caracter):04X}" for caracter in malos)
        )


def _verificar_ascii_base(db):
    """Ninguna celda de texto de la base puede tener acentos ni simbolos."""
    problemas = []
    for tabla in ModeloBase.metadata.sorted_tables:
        for columna in tabla.columns:
            # Text hereda de String, asi que esto cubre los dos.
            if not isinstance(columna.type, String):
                continue
            for (valor,) in db.execute(select(columna).distinct()).all():
                if isinstance(valor, str) and not valor.isascii():
                    problemas.append(f"{tabla.name}.{columna.name} = {valor!r}")
                    break
    if problemas:
        raise RuntimeError(
            "La base quedo con texto no ASCII: " + "; ".join(problemas[:5])
        )


def _verificar_multi_insumo(plan_vigente):
    """El plan vigente tiene que incluir tareas con 2 y con 3 insumos.

    Es lo que hace que el checklist de hoy muestre tarjetas pendientes con
    varios insumos y que el historial muestre ejecuciones con varios consumos.
    """
    cantidades = {tarea.nombre: len(tarea.insumos_quimicos) for tarea in plan_vigente.tareas}
    if not any(cantidad >= 3 for cantidad in cantidades.values()):
        raise RuntimeError("El plan vigente no tiene ninguna tarea con 3 insumos.")
    if not any(cantidad == 2 for cantidad in cantidades.values()):
        raise RuntimeError("El plan vigente no tiene ninguna tarea con 2 insumos.")


def _verificar(db, hoy):
    _verificar_ascii_fuente()

    plan_vigente = obtener_plan_activo(db)
    if plan_vigente is None:
        raise RuntimeError("No quedo un plan vigente.")
    if obtener_plan_borrador(db) is None:
        raise RuntimeError("No quedo un plan en borrador.")

    for plan in db.scalars(select(PlanPOES)).all():
        for tarea in plan.tareas:
            _validar_contra_schema(tarea)
            _validar_recursos_activos(
                db=db,
                equipo_id=tarea.equipo_id,
                sector_id=tarea.sector_id,
                insumos=tarea.insumos_quimicos,
                elementos=tarea.elementos_limpieza,
            )

    vencidas = db.scalar(
        select(func.count())
        .select_from(EjecucionTarea)
        .where(
            EjecucionTarea.estado == EstadoEjecucion.PENDIENTE,
            EjecucionTarea.fecha_programada < hoy,
        )
    )
    if vencidas:
        raise RuntimeError(f"Hay {vencidas} ejecuciones PENDIENTE con fecha pasada.")

    repetidas = db.execute(
        select(EjecucionTarea.id_tarea, EjecucionTarea.fecha_programada)
        .group_by(EjecucionTarea.id_tarea, EjecucionTarea.fecha_programada)
        .having(func.count() > 1)
    ).all()
    if repetidas:
        raise RuntimeError(f"Hay {len(repetidas)} pares (tarea, fecha) repetidos.")

    esperadas_hoy = len(_filtrar_tareas_por_dia(plan_vigente.tareas, hoy))
    pendientes_hoy = db.scalar(
        select(func.count())
        .select_from(EjecucionTarea)
        .where(
            EjecucionTarea.fecha_programada == hoy,
            EjecucionTarea.estado == EstadoEjecucion.PENDIENTE,
        )
    )
    if esperadas_hoy != pendientes_hoy:
        raise RuntimeError(
            f"El checklist de hoy espera {esperadas_hoy} tareas pero hay {pendientes_hoy} pendientes."
        )

    _verificar_ascii_base(db)
    _verificar_multi_insumo(plan_vigente)

    return plan_vigente, esperadas_hoy


def _resumen(db, personas, plan_vigente, tareas_hoy, estados):
    print()
    print("  Conteos por tabla")
    for tabla in ModeloBase.metadata.sorted_tables:
        print(f"    {tabla.name:<28} {db.scalar(select(func.count()).select_from(tabla))}")

    print()
    print(f"  Plan vigente: {plan_vigente.nombre}")
    print(f"  Tareas del checklist de hoy: {tareas_hoy}")
    print("  Ejecuciones: " + ", ".join(f"{e.value}={c}" for e, c in estados.items()))

    print()
    print("  Tareas del plan vigente (equipo XOR sector, minimo un recurso)")
    for tarea in sorted(plan_vigente.tareas, key=lambda t: t.id):
        destino = (
            f"equipo={tarea.equipo.nombre}" if tarea.equipo_id else f"sector={tarea.sector.nombre}"
        )
        frecuencia = tarea.frecuencia
        if tarea.detalle_frecuencia:
            frecuencia = f"{frecuencia}({tarea.detalle_frecuencia})"
        print(
            f"    {tarea.nombre:<40} {destino:<28} {frecuencia:<22}"
            f" insumos={len(tarea.insumos_quimicos)} elementos={len(tarea.elementos_limpieza)}"
        )

    consumos_por_ejecucion = (
        select(
            EjecucionInsumoQuimico.ejecucion_tarea_id.label("ejecucion_id"),
            func.count().label("cantidad"),
        )
        .group_by(EjecucionInsumoQuimico.ejecucion_tarea_id)
        .subquery()
    )
    con_dos_o_mas = db.scalar(
        select(func.count())
        .select_from(consumos_por_ejecucion)
        .where(consumos_por_ejecucion.c.cantidad >= 2)
    )
    con_tres = db.scalar(
        select(func.count())
        .select_from(consumos_por_ejecucion)
        .where(consumos_por_ejecucion.c.cantidad == 3)
    )
    print(f"  Ejecuciones completadas con 2 o 3 insumos: {con_dos_o_mas} (de ellas {con_tres} con 3)")

    print()
    print("  Ingreso por DNI (LoginPage compara el documento contra GET /personal/)")
    for persona in personas:
        nombres = ", ".join(
            vinculo.capacidad.nombre for vinculo in persona.capacidades if vinculo.activo
        ) or "sin capacidades"
        estado = "activo" if persona.activo else "dado de baja"
        print(
            f"    DNI {persona.dni}  {persona.nombre} {persona.apellido}"
            f"  [{nombres}] ({estado})"
        )
    print()


def _parsear_argumentos():
    parser = argparse.ArgumentParser(
        description="Genera datos de demostracion para la base de desarrollo de SAIA.",
    )
    parser.add_argument(
        "--reset", action="store_true", help="Vacia la base antes de sembrar."
    )
    parser.add_argument("--cantidad", type=int, default=5, help="Registros por maestro (minimo 3).")
    parser.add_argument("--seed", type=int, default=42, help="Semilla de Faker.")
    parser.add_argument("--dias-historia", type=int, default=30, help="Dias con ejecuciones.")
    parser.add_argument(
        "--incluir-arhivados",
        action="store_true",
        help="Tambien siembra ejecuciones de los planes archivados.",
    )
    args = parser.parse_args()
    if args.cantidad < 3:
        parser.error("--cantidad debe ser al menos 3")
    if args.dias_historia < 2:
        parser.error("--dias-historia debe ser al menos 2")
    return args


def main():
    args = _parsear_argumentos()
    fake = Faker("es_AR")
    Faker.seed(args.seed)

    _verificar_ascii_fuente()

    hoy = date.today()
    print(f"Sembrando datos de SAIA (cantidad={args.cantidad}, seed={args.seed}, hoy={hoy})")

    with SessionLocal() as db:
        db.execute(text("PRAGMA foreign_keys = ON"))
        ModeloBase.metadata.create_all(bind=engine)

        if args.reset:
            _resetear(db)
            db.commit()
        else:
            ocupadas = _tablas_con_datos(db)
            if ocupadas:
                raise SystemExit(
                    "La base ya tiene datos. Borrar db.sqlite3 o usar --reset.\n  "
                    + ", ".join(ocupadas[:6])
                )

        try:
            catalogo = _crear_prerrequisitos(db, args.cantidad)
            personas = _crear_personas(db, fake, args.cantidad, hoy)
            planes = _crear_planes(db, personas, args.cantidad, hoy)
            _crear_tareas(
                db,
                fake,
                planes,
                args.cantidad,
                hoy,
                catalogo["equipos"],
                catalogo["sectores"],
                catalogo["insumos_quimicos"],
                catalogo["elementos"],
            )
            estados = _crear_ejecuciones(
                db,
                fake,
                personas,
                planes,
                hoy,
                args.dias_historia,
                args.incluir_arhivados,
            )
            db.flush()

            plan_vigente, tareas_hoy = _verificar(db, hoy)
            db.commit()
        except Exception:
            db.rollback()
            raise

        _resumen(db, personas, plan_vigente, tareas_hoy, estados)

    print("Listo.")


if __name__ == "__main__":
    main()
