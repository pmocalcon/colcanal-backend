import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { RecursoEconomico } from "../../database/entities/recurso-economico.entity";
import { Company } from "../../database/entities/company.entity";

/** Un proyecto dentro de un año: quién interventora y por cuánto. */
export interface ProyectoAnio {
  /** Firma interventora del año. */
  firma?: string;
  /** Número de salarios mínimos del contrato. */
  smlv?: number | null;
  /** true si el contrato se factura con IVA. */
  iva?: boolean;
  /**
   * Valor escrito a mano. Solo se usa cuando el contrato no sale de SMLV × SMMLV
   * (un otrosí, un valor pactado en firme). Vacío = se calcula.
   */
  valorManual?: number | null;
}

export interface RetencionProyecto {
  /** % de retención en la fuente. `null` = no aplica en ese municipio. */
  rteFte?: number | null;
  rteIca?: number | null;
  timbre?: number | null;
  estampillas?: number | null;
}

/**
 * Un renglón del contraste: lo que decía el sistema y lo que decía el documento.
 *
 * `null` no es cero: en el sistema significa «no aplica en este municipio» y en el
 * documento, «el documento no trae esa cifra». Colapsarlos haría que una retención que
 * la factura no declara se viera como una retención en cero, que es un hecho distinto.
 */
export interface FilaContraste {
  key: string;
  label: string;
  sistema: number | null;
  documento: number | null;
}

/** El contraste de un documento, tal como llega del navegador. */
export interface BloqueContrasteEntrada {
  archivo?: unknown;
  fuente?: unknown;
  referencia?: unknown;
  fecha?: unknown;
  filas?: unknown;
  cuadra?: unknown;
  avisos?: unknown;
}

export interface BloqueContraste {
  /** El nombre del archivo que se cargó. El archivo en sí no se guarda. */
  archivo: string;
  /** De dónde salieron las cifras: 'xml', 'pdf', 'texto' u 'ocr'. */
  fuente: string;
  /** El consecutivo de la factura, o el oficio de la orden. */
  referencia: string | null;
  /** La fecha de emisión, o el mes del servicio que paga la orden. */
  fecha: string | null;
  filas: FilaContraste[];
  cuadra: boolean;
  avisos: string[];
}

const LIMITE_FILAS = 40;
const LIMITE_AVISOS = 20;

const texto = (v: unknown, max: number): string =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

const cifra = (v: unknown): number | null =>
  v === null || v === "" || v === undefined || !Number.isFinite(Number(v)) ? null : Number(v);

/**
 * Deja el bloque en la forma en que se guarda, quedándose solo con lo conocido.
 *
 * Se normaliza en vez de guardar lo que llegue porque esto va a un jsonb que se lee
 * entero en cada carga del módulo: sin un tope, una factura de doscientos renglones o el
 * texto completo de un OCR lo engordarían para siempre. Lo que se recorta —el detalle
 * renglón por renglón, el texto leído— se puede volver a ver cargando el archivo otra
 * vez, que es justo lo que no se puede hacer con el veredicto.
 */
export function normalizarBloque(b: BloqueContrasteEntrada | undefined): BloqueContraste | null {
  if (!b || typeof b !== "object") return null;
  const archivo = texto(b.archivo, 200);
  if (!archivo) return null;

  const filas = Array.isArray(b.filas) ? b.filas.slice(0, LIMITE_FILAS) : [];
  const avisos = Array.isArray(b.avisos) ? b.avisos.slice(0, LIMITE_AVISOS) : [];

  return {
    archivo,
    fuente: texto(b.fuente, 20) || "desconocida",
    referencia: texto(b.referencia, 60) || null,
    fecha: texto(b.fecha, 20) || null,
    filas: filas.map((f: Record<string, unknown>) => ({
      key: texto(f?.key, 40),
      label: texto(f?.label, 80),
      sistema: cifra(f?.sistema),
      documento: cifra(f?.documento),
    })),
    cuadra: b.cuadra === true,
    avisos: avisos.map((a: unknown) => texto(a, 400)).filter(Boolean),
  };
}

/**
 * Los proyectos del módulo, en el orden del cuadro de interventoría.
 *
 * No son todas las empresas del sistema: Canales & Contactos, Inversiones Garcés
 * Escalante y Uniones y Alianzas no son concesiones de alumbrado, y Jamundí
 * todavía no tiene contrato de interventoría. La lista se fija aquí para que la
 * tabla sea la del cuadro y no una lista que crece sola.
 *
 * `buscar` empareja contra el nombre de la empresa sin tildes ni mayúsculas: los
 * datos siguen guardándose por companyId, así que cambiar una etiqueta no mueve
 * ningún valor.
 */
const PROYECTOS: { etiqueta: string; buscar: string }[] = [
  { etiqueta: "El Cerrito", buscar: "el cerrito" },
  { etiqueta: "Circasia", buscar: "circasia" },
  { etiqueta: "Guacarí", buscar: "guacari" },
  { etiqueta: "Puerto Asís", buscar: "puerto asis" },
  { etiqueta: "Quimbaya", buscar: "quimbaya" },
  { etiqueta: "Santa Bárbara", buscar: "santa barbara" },
  { etiqueta: "Jericó", buscar: "jerico" },
  { etiqueta: "Ciudad Bolívar", buscar: "ciudad bolivar" },
  { etiqueta: "Tarso", buscar: "tarso" },
  // "Pueblorico" va con una R por decisión del negocio, aunque la empresa esté
  // registrada con dos: por eso se busca por el prefijo y no por el nombre.
  { etiqueta: "Pueblorico", buscar: "pueblor" },
];

/** Sin tildes, en minúsculas y con los espacios colapsados. */
const normalizar = (s: string): string =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

@Injectable()
export class RecursoEconomicoService {
  constructor(
    @InjectRepository(RecursoEconomico)
    private readonly repo: Repository<RecursoEconomico>,
    @InjectRepository(Company)
    private readonly companies: Repository<Company>,
  ) {}

  /**
   * La fila única del módulo. Se crea vacía la primera vez que alguien entra, en
   * vez de exigir un seed: el módulo nace usable.
   */
  private async fila(): Promise<RecursoEconomico> {
    const existente = await this.repo.findOne({ where: {}, order: { recursoId: "ASC" } });
    if (existente) return existente;
    return this.repo.save(this.repo.create({ data: {} }));
  }

  async get(): Promise<{
    data: Record<string, any>;
    empresas: { companyId: number; name: string }[];
    sinEmpresa: string[];
  }> {
    const fila = await this.fila();
    const empresas = await this.companies.find();

    // Se recorre PROYECTOS y no las empresas: así la tabla sale en el orden del
    // cuadro y no en el que la base devuelva.
    const encontradas: { companyId: number; name: string }[] = [];
    const sinEmpresa: string[] = [];
    for (const p of PROYECTOS) {
      const match = empresas.find((c) => normalizar(c.name).includes(p.buscar));
      if (match) encontradas.push({ companyId: match.companyId, name: p.etiqueta });
      // Un proyecto del cuadro que no tenga empresa se reporta en vez de
      // desaparecer sin más: su fila no se puede guardar contra ningún id.
      else sinEmpresa.push(p.etiqueta);
    }
    return { data: fila.data ?? {}, empresas: encontradas, sinEmpresa };
  }

  /**
   * Valor mensual de interventoría, por año y proyecto, para el Flujo de Caja.
   *
   * Se calcula aquí y no en el cliente para que el FCM no tenga que conocer las
   * reglas del módulo (SMLV, IVA, valor pactado): recibe una cifra por año y ya.
   */
  async interventoria(): Promise<Record<string, Record<string, number>>> {
    const fila = await this.fila();
    const anios = (fila.data ?? {}).anios ?? {};
    const salida: Record<string, Record<string, number>> = {};
    for (const [anio, contenido] of Object.entries<any>(anios)) {
      const smmlv = Number(contenido?.smmlv) || 0;
      const porProyecto: Record<string, number> = {};
      for (const [companyId, p] of Object.entries<any>(contenido?.proyectos ?? {})) {
        const manual = Number(p?.valorManual);
        if (Number.isFinite(manual) && manual > 0) { porProyecto[companyId] = manual; continue; }
        const smlv = Number(p?.smlv);
        if (!Number.isFinite(smlv) || smlv <= 0 || smmlv <= 0) continue;
        porProyecto[companyId] = Math.round(smlv * smmlv * (p?.iva ? 1.19 : 1));
      }
      if (Object.keys(porProyecto).length) salida[anio] = porProyecto;
    }
    return salida;
  }

  async save(data: Record<string, any>): Promise<{ data: Record<string, any> }> {
    const fila = await this.fila();
    fila.data = data ?? {};
    const guardada = await this.repo.save(fila);
    return { data: guardada.data };
  }

  /**
   * Estampa el visto bueno del director sobre **una sola factura**.
   *
   * Existe aparte de `save` porque el módulo guarda todo en un jsonb único: si el
   * director validara con `save`, el servidor recibiría el bloque entero —interventoría,
   * retenciones, todas las facturas de todos los municipios— escrito por alguien que solo
   * tenía que confirmar una cifra. Bastaría con que su pantalla llegara desactualizada
   * para que al validar sobrescribiera lo que el PMO acababa de digitar.
   *
   * Aquí solo se toca `facturas[periodo][companyId].visto`, y el nombre lo pone el
   * servidor con quien está firmado: es una constancia de quién revisó, y una constancia
   * que la puede escribir el cliente no prueba nada.
   */
  async validarFactura(
    periodo: string,
    companyId: number,
    valor: number,
    revisor: { nombre: string; rol?: string },
  ): Promise<{ data: Record<string, any> }> {
    const fila = await this.fila();
    const data = fila.data ?? {};
    const facturas = (data.facturas ?? {}) as Record<string, Record<string, any>>;
    const mes = facturas[periodo] ?? {};
    const factura = mes[String(companyId)];

    if (!factura) {
      throw new NotFoundException(
        `No hay factura de ${periodo} para ese municipio. El PMO tiene que diligenciarla primero.`,
      );
    }

    fila.data = {
      ...data,
      facturas: {
        ...facturas,
        [periodo]: {
          ...mes,
          [String(companyId)]: {
            ...factura,
            visto: {
              nombre: revisor.nombre,
              rol: revisor.rol,
              fecha: new Date().toISOString().slice(0, 10),
              valor: Math.round(valor),
            },
          },
        },
      },
    };
    const guardada = await this.repo.save(fila);
    return { data: guardada.data };
  }

  /**
   * Guarda el resultado de contrastar un mes: la factura, la orden de pago, o las dos.
   *
   * **No guarda los archivos**, que se leen en el navegador y no llegan acá. Guarda lo
   * que el contraste concluyó: qué decía cada documento, qué decía el sistema en ese
   * momento, si cuadraron, y quién lo revisó. Eso es lo que alguien necesita tres meses
   * después, cuando la pregunta es «¿esta factura ya se revisó y contra qué?».
   *
   * Guardar **lo que el sistema tenía entonces** es lo que hace útil el registro y no
   * solo un sello: si después alguien corrige el AOM del mes, la pantalla puede decir que
   * el contraste se hizo contra otras cifras. Un visto bueno que no sabe contra qué se
   * dio es un visto bueno que no prueba nada.
   *
   * Va por su propio endpoint y no por `save` porque el módulo guarda un jsonb único:
   * mandarlo entero desde esta pantalla dejaría que un director, con la pantalla
   * desactualizada, pisara la interventoría y las retenciones sin querer.
   */
  async guardarContraste(
    periodo: string,
    companyId: number,
    cuerpo: { factura?: BloqueContrasteEntrada; orden?: BloqueContrasteEntrada },
    quien: { nombre: string; rol?: string },
  ): Promise<{ data: Record<string, any> }> {
    const factura = normalizarBloque(cuerpo?.factura);
    const orden = normalizarBloque(cuerpo?.orden);
    if (!factura && !orden) {
      throw new BadRequestException(
        "No hay nada que guardar: manda al menos el contraste de la factura o el de la orden.",
      );
    }

    const fila = await this.fila();
    const data = fila.data ?? {};
    const contrastes = (data.contrastes ?? {}) as Record<string, Record<string, any>>;
    const delMes = contrastes[periodo] ?? {};
    const previo = delMes[String(companyId)] ?? {};

    /*
     * Los dos bloques se guardan por separado y no se pisan entre sí: la factura y la
     * orden llegan en momentos distintos —la orden puede tardar semanas— y quien
     * contrasta la segunda no tiene por qué volver a cargar la primera.
     */
    fila.data = {
      ...data,
      contrastes: {
        ...contrastes,
        [periodo]: {
          ...delMes,
          [String(companyId)]: {
            factura: factura ?? previo.factura,
            orden: orden ?? previo.orden,
            quien: {
              nombre: quien.nombre,
              rol: quien.rol,
              fecha: new Date().toISOString(),
            },
          },
        },
      },
    };
    const guardada = await this.repo.save(fila);
    return { data: guardada.data };
  }

  /**
   * Borra el contraste guardado de un mes, entero o solo uno de sus dos bloques.
   *
   * Existe porque un contraste se puede guardar con el archivo equivocado, y dejarlo ahí
   * es peor que no tenerlo: dice que el mes está revisado cuando no lo está.
   */
  async borrarContraste(
    periodo: string,
    companyId: number,
    bloque?: "factura" | "orden",
  ): Promise<{ data: Record<string, any> }> {
    const fila = await this.fila();
    const data = fila.data ?? {};
    const contrastes = (data.contrastes ?? {}) as Record<string, Record<string, any>>;
    const delMes = contrastes[periodo] ?? {};
    const previo = delMes[String(companyId)];
    if (!previo) return { data };

    const quedan = bloque
      ? { ...previo, [bloque]: undefined }
      : {};
    const vacio = !quedan.factura && !quedan.orden;

    const nuevoMes = { ...delMes };
    if (vacio) delete nuevoMes[String(companyId)];
    else nuevoMes[String(companyId)] = quedan;

    fila.data = { ...data, contrastes: { ...contrastes, [periodo]: nuevoMes } };
    const guardada = await this.repo.save(fila);
    return { data: guardada.data };
  }

  /** Quita el visto bueno de una factura, sin tocar nada más. */
  async quitarVistoFactura(
    periodo: string,
    companyId: number,
  ): Promise<{ data: Record<string, any> }> {
    const fila = await this.fila();
    const data = fila.data ?? {};
    const facturas = (data.facturas ?? {}) as Record<string, Record<string, any>>;
    const mes = facturas[periodo] ?? {};
    const factura = mes[String(companyId)];
    if (!factura) return { data };

    fila.data = {
      ...data,
      facturas: {
        ...facturas,
        [periodo]: { ...mes, [String(companyId)]: { ...factura, visto: null } },
      },
    };
    const guardada = await this.repo.save(fila);
    return { data: guardada.data };
  }
}
