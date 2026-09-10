# -*- coding: utf-8 -*-
"""Vuelca un «01. Control de Excedentes XX.xlsm» a JSON.

    python src/database/scripts/leer-cep-excel.py <ruta-xlsm> <ruta-json> [--desde AAAA-MM]

Solo lee el libro. El JSON que produce es lo que come `importar-cep-desde-hoja.ts`, que
es el que sí escribe en la base.

Se hace en dos pasos —y no todo en el script de TypeScript— para poder mirar el volcado
antes de que nada toque producción, y porque el libro trae once años de historia de la
que solo se carga el tramo que se pida.

De cada mes se sacan **tres cosas**:

- `capturado`: lo que alguien digitó del extracto de la fiducia. Es lo único que se
  guarda en el sistema.
- `giros`: lo que el libro trae en las cinco columnas que salen de las órdenes de pago.
  No se carga —el sistema las vuelve a sumar de las órdenes—, pero sirve para comprobar
  que las órdenes volcadas den lo mismo que el Excel.
- `excel`: las veinticinco columnas derivadas, tal como las calculó Excel. Tampoco se
  cargan: son el patrón contra el que el importador coteja sus propias cuentas.

**El mes se toma de la columna A («Mes») y no de la C («Periodo»).** En el libro de
Guacarí la fila de mayo de 2026 trae la C con el mes de abril, así que la C repite un
periodo y se pierde uno. La A está bien en las 139 filas.
"""
import argparse
import datetime
import io
import json
import re
import sys

import openpyxl

# ── Las columnas del CEP, por letra ──────────────────────────────────────────
# Van por letra y no por número porque así es como se habla de ellas cuando alguien
# tiene el libro abierto al lado: «lo de la AH», «la BD es el extracto».

INGRESOS = {
    "celsia": "D", "vatia": "E", "ingenioPichichi": "F", "qiEnergy": "G",
    "neuEnergy": "H", "otro": "I", "enertotal": "J", "emmesa": "K",
    "municipio": "L", "municipio2": "M",
}

CAPTURADO = {
    "energiaAforo": "P",
    "caom": "T",
    "cinv": "U",
    "comision": "Y",
    "gmf": "Z",
    "otrosEgresos": "AA",
    "pendienteEnergia": "AI",
    "pendienteInterventoria": "AJ",
    "pendienteObras": "AO",
    "pendienteNavideno": "AP",
    "pendienteOtros": "AQ",
    "rendimientos": "AZ",
    "saldoFiducia": "BD",
}

# Las derivadas, con el nombre que tienen en `cep-calculo.ts`.
DERIVADAS = {
    "totalIngresos": "N", "ingresoFiducia": "O", "energia": "R", "interventoria": "S",
    "concesion": "V", "obras": "W", "navideno": "X", "totalEgresos": "AB",
    "otrosGirosConcesion": "AD", "giroFiduciaConcesion": "AE",
    "derechosConcesionarioEnFiducia": "AF", "saldo": "AG", "saldoAcumulado": "AH",
    "pendienteCaom": "AK", "pendienteCinv": "AL", "pendienteConcesion": "AM",
    "pendienteComision": "AN", "egresosCancelados": "AR",
    "totalEgresosPendientes": "AS", "egresosPendientesAcumulado": "AT",
    "saldoFinal": "AU", "saldoFinalAcumulado": "AV", "recursosDelImpuesto": "AY",
    "rendimientosAcumulados": "BA", "saldoRecursosDelImpuesto": "BB",
    "saldoFiduciaValidado": "BE", "control": "BF",
}

# Los saldos con los que arranca el municipio: el último mes que NO se carga.
ARRANQUE = {
    "saldoAcumulado": "AH",
    "egresosPendientesAcumulado": "AT",
    "saldoFinalAcumulado": "AV",
    "rendimientosAcumulados": "BA",
    "saldoFiduciaAnterior": "BD",
}

# Los conceptos de las órdenes, con el texto exacto de `cep-conceptos.ts`.
CONCEPTO_CAOM_CINV = "Concesión AOM - INV"
CONCEPTO_INTERVENTORIA = "Interventoría"
CONCEPTO_ENERGIA_MEDICION = "Energía Medición"
CONCEPTO_OBRA = "Concesión Obra"
CONCEPTO_NAVIDENO = "Concesión AN"
# El emparejamiento va sin distinguir mayúsculas pero **sí tildes**, que es exactamente
# como compara el SUMIFS de Excel. Importa: en el libro de Santa Bárbara la interventoría
# está escrita «INTERVENTORÍA» y Excel sí la suma, mientras que el «INTERVENTORIA» sin
# tilde de Guacarí —que son las retenciones— no la suma ni allá ni acá.
CONCEPTOS = {
    c.upper(): c for c in (
        CONCEPTO_CAOM_CINV, CONCEPTO_INTERVENTORIA, CONCEPTO_ENERGIA_MEDICION,
        CONCEPTO_OBRA, CONCEPTO_NAVIDENO,
    )
}


def indice(letra):
    """'AH' -> 33 (base 0), que es como openpyxl entrega la fila."""
    n = 0
    for ch in letra:
        n = n * 26 + (ord(ch) - 64)
    return n - 1


def num(v):
    """Lo que no sea un número vale cero. Las celdas con #VALUE! llegan como texto."""
    if isinstance(v, bool) or not isinstance(v, (int, float)):
        return 0.0
    return float(v)


def periodo_de(v):
    """La celda de mes, en 'AAAA-MM'. None si no es una fecha."""
    if isinstance(v, (datetime.datetime, datetime.date)):
        return v.strftime("%Y-%m")
    return None


def mes_siguiente(periodo):
    a, m = (int(x) for x in periodo.split("-"))
    return f"{a + 1}-01" if m == 12 else f"{a}-{m + 1:02d}"


def municipio_de_hoja(ws):
    """El municipio escrito en una hoja de órdenes: fila 5, columna B.

    Ahí lo pone el formato, al lado del nombre del contrato («GUACARÍ», «SANTA BARBARA»).
    Se busca solo en esa celda y no barriendo el encabezado: barriéndolo, el primer texto
    en mayúscula que aparece es «FECHA», y en la hoja oculta es «UTAP».
    """
    for fila in ws.iter_rows(min_row=4, max_row=6, max_col=2, values_only=True):
        v = fila[1] if len(fila) > 1 else None
        if isinstance(v, str) and v.strip():
            return v.strip().upper()
    return None


def municipio_de(wb):
    """El municipio del libro: el de su hoja «Ordenes de Pago»."""
    for hoja in wb.sheetnames:
        if hoja.strip().lower() == "ordenes de pago":
            return municipio_de_hoja(wb[hoja])
    return None


def leer_ordenes(wb, municipio, avisos):
    """Las órdenes de pago del libro, **solo las del municipio del libro**.

    Un libro puede traer varias hojas de órdenes, y no todas son suyas: el de Santa
    Bárbara trae una hoja visible «ORDENES PAGO (3)» con las órdenes de Tarso, copiada
    en algún momento y nunca borrada. Barriendo todas las hojas, esos giros entrarían al
    CEP de Santa Bárbara y le cambiarían el saldo sin que nada avisara.

    Por eso cada hoja tiene que decir de quién es —el municipio de su fila 5— y coincidir
    con el del libro. La que no lo diga se salta y se avisa cuántas filas quedaron por
    fuera, para que nadie las dé por cargadas.

    Se descartan además las órdenes con un concepto que el sistema no conoce: en el libro
    hay «INTERVENTORIA» en mayúscula para las retenciones, que no suma en ninguna columna
    del CEP.
    """
    ordenes = []
    descartadas = {}
    for hoja in wb.sheetnames:
        if "orden" not in hoja.lower():
            continue
        ws = wb[hoja]
        dueno = municipio_de_hoja(ws)
        filas = [
            f for f in ws.iter_rows(min_row=1, max_row=2000, max_col=13, values_only=True)
            if periodo_de(f[6]) and isinstance(f[2], (int, float))
        ]
        if not filas:
            continue
        if dueno != municipio:
            avisos.append(
                f"La hoja «{hoja}» dice ser de {dueno or 'nadie'} y el libro es de "
                f"{municipio}: sus {len(filas)} orden(es) NO se cargan."
            )
            continue
        for f in filas:
            escrito = f[4].strip() if isinstance(f[4], str) else None
            if not escrito:
                continue
            # Se guarda con la grafía canónica, no con la del libro: es la que el CEP
            # empareja, y una orden escrita de otra forma no sumaría en ninguna columna.
            concepto = CONCEPTOS.get(escrito.upper())
            if not concepto:
                descartadas[escrito] = descartadas.get(escrito, 0) + 1
                continue
            ordenes.append({
                "periodo": periodo_de(f[6]),
                "fecha": f[1].strftime("%Y-%m-%d") if isinstance(f[1], datetime.datetime) else None,
                "valor": float(f[2]),
                "concepto": concepto,
                "tipo": f[5].strip() if isinstance(f[5], str) else None,
                "numeroOrden": str(f[3]).strip() if f[3] not in (None, "") else None,
                "detalle": f[7].strip() if isinstance(f[7], str) else None,
                "tercero": f[8].strip() if isinstance(f[8], str) else None,
            })
    for concepto, cuantas in sorted(descartadas.items()):
        avisos.append(
            f"{cuantas} orden(es) con el concepto «{concepto}», que no es de los cinco "
            "que suma el CEP: no se cargan."
        )
    return ordenes


def main():
    ap = argparse.ArgumentParser(description="Vuelca un Control de Excedentes a JSON.")
    ap.add_argument("xlsm")
    ap.add_argument("json")
    ap.add_argument(
        "--desde", default=None,
        help="Primer mes que se carga, AAAA-MM. Por defecto, enero del último año del libro.",
    )
    args = ap.parse_args()

    wb = openpyxl.load_workbook(args.xlsm, data_only=True, read_only=True)
    if "CEP" not in wb.sheetnames:
        sys.exit(f"«{args.xlsm}» no tiene hoja CEP: ¿es un Control de Excedentes?")

    avisos = []
    codigo = re.search(r"([A-Z]{2})\s*\.?\s*xlsm$", args.xlsm, re.I)
    codigo = codigo.group(1).upper() if codigo else None

    # ── Las filas del CEP, en orden ──
    crudas = []
    vistos = set()
    for fila in wb["CEP"].iter_rows(min_row=5, max_row=600, max_col=70, values_only=True):
        periodo = periodo_de(fila[indice("A")])
        alterno = periodo_de(fila[indice("C")])
        if not periodo:
            # Las filas de 2015 traen la A en blanco. Se acepta la C, pero se avisa:
            # es la columna que en Guacarí tiene un mes repetido.
            if not alterno:
                continue
            periodo = alterno
            avisos.append(f"La fila de {periodo} no tiene «Mes»: se tomó de «Periodo».")
        if periodo != alterno and alterno:
            avisos.append(
                f"En {periodo} la columna «Periodo» dice {alterno}. Se usó «Mes», "
                "que es la que va bien."
            )
        if periodo in vistos:
            avisos.append(f"{periodo} aparece dos veces en el libro: se tomó la primera.")
            continue
        vistos.add(periodo)
        crudas.append((periodo, fila))

    if not crudas:
        sys.exit("La hoja CEP no tiene ninguna fila con mes.")

    desde = args.desde or f"{crudas[-1][0][:4]}-01"
    if not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", desde):
        sys.exit(f"«{desde}» no tiene la forma AAAA-MM.")

    municipio = municipio_de(wb)
    if not municipio:
        sys.exit(
            f"«{args.xlsm}» no dice de qué municipio es (hoja «Ordenes de Pago», "
            "fila 5). Sin eso no se puede saber qué órdenes son suyas."
        )
    ordenes = leer_ordenes(wb, municipio, avisos)
    interventoria_girada = {}
    for o in ordenes:
        if o["concepto"] == CONCEPTO_INTERVENTORIA:
            interventoria_girada[o["periodo"]] = interventoria_girada.get(o["periodo"], 0.0) + o["valor"]

    # ── El arranque: el último mes que queda por fuera ──
    anteriores = [f for p, f in crudas if p < desde]
    if anteriores:
        previa = anteriores[-1]
        arranque = {k: num(previa[indice(c)]) for k, c in ARRANQUE.items()}
    else:
        arranque = {k: 0.0 for k in ARRANQUE}
        avisos.append(
            f"No hay ningún mes anterior a {desde} en el libro: el arranque va en ceros. "
            "Si el municipio venía con saldos, hay que ponerlos a mano."
        )

    # ── Los meses que sí se cargan ──
    meses = []
    for periodo, fila in crudas:
        if periodo < desde:
            continue
        capturado = {"ingresos": {k: num(fila[indice(c)]) for k, c in INGRESOS.items()}}
        for k, c in CAPTURADO.items():
            capturado[k] = num(fila[indice(c)])

        # La interventoría del costo (S) es, en el libro, la suma de las órdenes del mes
        # SIGUIENTE más una constante escrita a mano, que es la causación del mes. Acá se
        # despeja esa constante, que es lo que el sistema guarda.
        girada = interventoria_girada.get(mes_siguiente(periodo), 0.0)
        capturado["interventoriaCausada"] = round(num(fila[indice("S")]) - girada, 2)

        meses.append({
            "periodo": periodo,
            "capturado": capturado,
            "excel": {k: round(num(fila[indice(c)]), 2) for k, c in DERIVADAS.items()},
            "estadoExcel": fila[indice("AW")] if isinstance(fila[indice("AW")], str) else None,
        })

    salida = {
        "archivo": args.xlsm,
        "codigo": codigo,
        "municipio": municipio,
        "desde": desde,
        "arranque": arranque,
        "meses": meses,
        "ordenes": [o for o in ordenes if o["periodo"] >= desde],
        "avisos": avisos,
    }

    with io.open(args.json, "w", encoding="utf-8") as f:
        json.dump(salida, f, ensure_ascii=False, indent=1)

    print(f"Libro:     {args.xlsm}")
    print(f"Municipio: {salida['municipio']} ({codigo})")
    print(f"Desde:     {desde}")
    print(f"Meses:     {len(meses)}")
    print(f"Órdenes:   {len(salida['ordenes'])}")
    print(f"Arranque:  " + ", ".join(f"{k}={v:,.2f}" for k, v in arranque.items()))
    if avisos:
        print("\nAvisos:")
        for a in avisos:
            print(f"  - {a}")
    print(f"\nEscrito en {args.json}")


if __name__ == "__main__":
    main()
