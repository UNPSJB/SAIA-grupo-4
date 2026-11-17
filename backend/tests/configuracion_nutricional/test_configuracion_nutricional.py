from fastapi.testclient import TestClient

from src.main import app
from tests.database import session  # noqa: F401

client = TestClient(app)


def test_listar_parametros_nutricionales_seed_defecto(session):
    res = client.get("/configuracion-nutricional/")
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 10

    por_codigo = {p["codigo_nutriente"]: p for p in data}
    assert por_codigo["valor_energetico"]["vdr"] == "2000.00"
    assert por_codigo["valor_energetico"]["factor_conversion_kj"] == "4.1840"
    assert por_codigo["valor_energetico"]["decimales"] == 0
    assert por_codigo["azucares_totales"]["vdr"] is None
    assert por_codigo["azucares_totales"]["permite_vdr"] is False
    assert por_codigo["grasas_trans"]["vdr"] is None
    assert por_codigo["grasas_trans"]["permite_vdr"] is False


def test_actualizar_y_restaurar_parametros_nutricionales(session):
    # Obtener actuales
    res_get = client.get("/configuracion-nutricional/")
    assert res_get.status_code == 200

    # Actualizar sodio y valor energético
    payload = {
        "parametros": [
            {
                "codigo_nutriente": "sodio",
                "vdr": "2300.00",
                "decimales": 1,
                "umbral_no_significativo": "5.00",
                "texto_no_significativo": "No significativo",
                "factor_conversion_kj": None,
            },
            {
                "codigo_nutriente": "valor_energetico",
                "vdr": "2000.00",
                "decimales": 0,
                "umbral_no_significativo": "4.00",
                "texto_no_significativo": "0",
                "factor_conversion_kj": "4.1840",
            },
        ]
    }
    res_put = client.put("/configuracion-nutricional/", json=payload)
    assert res_put.status_code == 200
    por_codigo = {p["codigo_nutriente"]: p for p in res_put.json()}
    assert por_codigo["sodio"]["vdr"] == "2300.00"
    assert por_codigo["sodio"]["decimales"] == 1
    assert por_codigo["sodio"]["texto_no_significativo"] == "No significativo"

    # Rechazar VDR en grasas_trans
    res_bad_vdr = client.put(
        "/configuracion-nutricional/",
        json={
            "parametros": [
                {
                    "codigo_nutriente": "grasas_trans",
                    "vdr": "2.00",
                    "decimales": 1,
                    "umbral_no_significativo": "0.20",
                    "texto_no_significativo": "0",
                    "factor_conversion_kj": None,
                }
            ]
        },
    )
    assert res_bad_vdr.status_code == 400

    # Restaurar defecto
    res_rest = client.post("/configuracion-nutricional/restaurar-defecto")
    assert res_rest.status_code == 200
    por_codigo_rest = {p["codigo_nutriente"]: p for p in res_rest.json()}
    assert por_codigo_rest["sodio"]["vdr"] == "2400.00"
    assert por_codigo_rest["sodio"]["decimales"] == 0
    assert por_codigo_rest["sodio"]["texto_no_significativo"] == "0"
