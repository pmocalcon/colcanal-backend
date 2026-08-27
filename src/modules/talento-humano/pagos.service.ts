import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { ThSolicitudPago } from "../../database/entities/th-solicitud-pago.entity";
import { ThSolicitudPagoLinea } from "../../database/entities/th-solicitud-pago-linea.entity";
import { ThBanco } from "../../database/entities/th-banco.entity";
import { ThPersona } from "../../database/entities/th-persona.entity";
import { ThParametroNomina } from "../../database/entities/th-parametro-nomina.entity";
import { ThValidacionNomina } from "../../database/entities/th-validacion-nomina.entity";
import { User } from "../../database/entities/user.entity";
import { NominaService } from "./nomina.service";

/**
 * Solicitudes de pago y archivo plano del banco.
 *
 * Reemplaza el libro «Nómina Banco Formato.xlsm», que hacía tres cosas a la vez: guardaba
 * el catálogo de códigos de banco, armaba el documento interno con el que se pide el giro
 * y producía el archivo que se sube al portal bancario. Acá el catálogo se fue a
 * Parámetros —lo comparte todo el sistema— y las otras dos quedan como **una sola cosa**:
 * el archivo del banco no es un documento aparte, es la misma solicitud con las columnas
 * que el banco pide y en su orden.
 *
 * El libro venía además con todas sus fórmulas rotas —`VLOOKUP(#REF!,#REF!,…)` en cada
 * fila en blanco—: estaba armado para leer de una hoja de nómina que ya no existe, así
 * que las 45 filas buenas eran valores pegados a mano y el resto ruido.
 */

const num = (v: string | number | null | undefined): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const limpio = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/**
 * Traducción del tipo de documento al número que espera el archivo plano.
 * Es del banco, no nuestra: no se cambia sin mirar el instructivo del portal.
 */
const CODIGO_TIPO_ID: Record<string, number> = {
  CC: 1,
  CE: 2,
  NIT: 3,
  TI: 4,
  PA: 5,
};

/** Cuenta de Ahorros / Cuenta Corriente, como los nombra el archivo plano. */
const CODIGO_TIPO_CUENTA: Record<string, string> = {
  AHORROS: "CA",
  CORRIENTE: "CC",
};

const ESTADOS_SOLICITUD = ["BORRADOR", "ENVIADA", "PAGADA"];

/**
 * Parte «APELLIDOS NOMBRES» en apellidos y nombres.
 *
 * Es una **propuesta**, no un dato: con el nombre en una sola cadena no hay forma de
 * saber dónde terminan los apellidos. La regla es la que acierta en la mayoría de la
 * base: cuatro palabras o más son dos apellidos, tres o menos son uno. Falla, por
 * ejemplo, con quien tiene apellido compuesto («DE LA CRUZ») o un solo apellido y tres
 * nombres, y para eso están `nombres`/`apellidos` en la ficha: se corrige una vez y esta
 * función deja de opinar.
 */
export function partirNombre(nombre: string): { apellidos: string; nombres: string } {
  const palabras = limpio(nombre).split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return { apellidos: "", nombres: "" };
  if (palabras.length === 1) return { apellidos: palabras[0], nombres: "" };
  const cuantosApellidos = palabras.length >= 4 ? 2 : 1;
  return {
    apellidos: palabras.slice(0, cuantosApellidos).join(" "),
    nombres: palabras.slice(cuantosApellidos).join(" "),
  };
}

/** Una línea con lo que le impide salir en el archivo del banco. */
export interface LineaConAvisos extends ThSolicitudPagoLinea {
  faltantes: string[];
}

export interface SolicitudDetalle {
  solicitud: ThSolicitudPago;
  lineas: LineaConAvisos[];
  total: number;
  /** Cuántas líneas no se pueden subir todavía. */
  incompletas: number;
}

@Injectable()
export class PagosService {
  constructor(
    @InjectRepository(ThSolicitudPago)
    private readonly solicitudRepo: Repository<ThSolicitudPago>,
    @InjectRepository(ThSolicitudPagoLinea)
    private readonly lineaRepo: Repository<ThSolicitudPagoLinea>,
    @InjectRepository(ThBanco)
    private readonly bancoRepo: Repository<ThBanco>,
    @InjectRepository(ThPersona)
    private readonly personaRepo: Repository<ThPersona>,
    @InjectRepository(ThParametroNomina)
    private readonly parametroRepo: Repository<ThParametroNomina>,
    @InjectRepository(ThValidacionNomina)
    private readonly validacionRepo: Repository<ThValidacionNomina>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly nominaService: NominaService,
  ) {}

  // ── Consulta ──

  async list(): Promise<Array<ThSolicitudPago & { lineas: number; total: number }>> {
    const solicitudes = await this.solicitudRepo.find({
      order: { fecha: "DESC", solicitudId: "DESC" },
    });
    if (solicitudes.length === 0) return [];

    // Un solo viaje por todas las líneas en vez de uno por solicitud.
    const lineas = await this.lineaRepo.find({
      where: { solicitudId: In(solicitudes.map((s) => s.solicitudId)) },
    });
    const resumen = new Map<number, { lineas: number; total: number }>();
    for (const l of lineas) {
      const r = resumen.get(l.solicitudId) ?? { lineas: 0, total: 0 };
      r.lineas += 1;
      r.total += num(l.valor);
      resumen.set(l.solicitudId, r);
    }
    return solicitudes.map((s) => ({
      ...s,
      lineas: resumen.get(s.solicitudId)?.lineas ?? 0,
      total: resumen.get(s.solicitudId)?.total ?? 0,
    }));
  }

  async get(solicitudId: number): Promise<SolicitudDetalle> {
    const solicitud = await this.buscar(solicitudId);
    const lineas = await this.lineaRepo.find({
      where: { solicitudId },
      order: { orden: "ASC", lineaId: "ASC" },
    });
    const conAvisos = lineas.map((l) => ({ ...l, faltantes: this.faltantesDe(l) }));
    return {
      solicitud,
      lineas: conAvisos,
      total: lineas.reduce((s, l) => s + num(l.valor), 0),
      incompletas: conAvisos.filter((l) => l.faltantes.length > 0).length,
    };
  }

  private async buscar(solicitudId: number): Promise<ThSolicitudPago> {
    const solicitud = await this.solicitudRepo.findOne({ where: { solicitudId } });
    if (!solicitud) throw new NotFoundException("Esa solicitud de pago no existe.");
    return solicitud;
  }

  /**
   * Qué le falta a una línea para poder subirse.
   *
   * Se calcula al leer y no se guarda: lo que falta hoy se llena mañana en la ficha de la
   * persona, y un campo guardado se quedaría diciendo que falta algo que ya está.
   */
  private faltantesDe(l: ThSolicitudPagoLinea): string[] {
    const falta: string[] = [];
    if (!l.bancoCodigo) {
      falta.push(l.banco ? `«${l.banco}» no está en el catálogo de bancos` : "banco");
    }
    if (!limpio(l.cuenta)) falta.push("número de cuenta");
    const tipo = limpio(l.tipoCuenta).toUpperCase();
    if (!tipo) falta.push("tipo de cuenta");
    else if (!CODIGO_TIPO_CUENTA[tipo]) falta.push(`tipo de cuenta «${l.tipoCuenta}» desconocido`);
    if (!limpio(l.apellidos)) falta.push("apellidos");
    if (num(l.valor) <= 0) falta.push("valor");
    return falta;
  }

  // ── Armado ──

  /**
   * Crea la solicitud y, si se le pasa un periodo de nómina, la llena con el neto a pagar
   * de cada empleado.
   *
   * Toma la liquidación **guardada** del periodo si ya se generó, y si no la vista previa:
   * en la práctica la solicitud se arma antes de cerrar la nómina, y exigir que se genere
   * primero solo aplazaría el trabajo. Las líneas quedan copiadas, así que reabrir la
   * nómina después no las mueve solas —para eso está regenerar—.
   */
  async crear(
    data: {
      fecha?: string;
      concepto?: string;
      periodo?: string | null;
      observaciones?: string | null;
    },
    userId?: number,
  ): Promise<SolicitudDetalle> {
    const fecha = limpio(data.fecha) || new Date().toISOString().slice(0, 10);
    const periodo = limpio(data.periodo) || null;
    if (periodo && !/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo)) {
      throw new BadRequestException("El periodo va como YYYY-MM.");
    }

    const user = userId ? await this.userRepo.findOne({ where: { userId } }) : null;
    const solicitud = await this.solicitudRepo.save(
      this.solicitudRepo.create({
        fecha,
        concepto: limpio(data.concepto) || "Nómina",
        periodo,
        estado: "BORRADOR",
        observaciones: limpio(data.observaciones) || null,
        creadoPor: user ? user.email : null,
      }),
    );

    if (periodo) {
      try {
        await this.llenarDesdeNomina(solicitud.solicitudId, periodo);
      } catch (e) {
        // Sin líneas la solicitud no sirve de nada y quedaría estorbando en el listado,
        // así que se deshace y se devuelve el porqué en vez de dejar el cascarón.
        await this.solicitudRepo.delete({ solicitudId: solicitud.solicitudId });
        throw e;
      }
    }
    return this.get(solicitud.solicitudId);
  }

  /**
   * La solicitud de pago del periodo, armada al mandar la liquidación revisada.
   *
   * Es el otro extremo del botón «Enviar liquidación»: lo que hasta ahí era una revisión
   * aquí se vuelve el documento con el que se pide el giro. Va con las cifras que el
   * revisor digitó, que son las que él confirmó contra el soporte.
   *
   * Si el periodo ya tiene su solicitud se devuelve esa, sin crear otra ni rehacerle las
   * líneas: un reenvío —anular y volver a mandar— no puede borrar lo que Financiera ya
   * haya corregido a mano en el documento. Para rehacerlas está «Regenerar», que se pulsa
   * sabiendo lo que hace.
   */
  async crearDesdeLiquidacion(periodo: string, userId?: number): Promise<SolicitudDetalle> {
    const yaHay = await this.solicitudRepo.findOne({
      where: { periodo, concepto: "Nómina" },
      order: { solicitudId: "ASC" },
    });
    if (yaHay) return this.get(yaHay.solicitudId);

    return this.crear(
      {
        periodo,
        concepto: "Nómina",
        observaciones: `Nómina de ${periodo}, revisada persona por persona en Validación.`,
      },
      userId,
    );
  }

  /**
   * Vuelve a traer las cifras de la nómina, botando las líneas que había.
   *
   * Bota y rehace en vez de conciliar porque conciliar necesitaría decidir quién gana
   * cuando una línea se editó a mano y la nómina cambió, y no hay una respuesta buena
   * para eso. Se avisa en pantalla antes de llamarla.
   */
  async regenerar(solicitudId: number): Promise<SolicitudDetalle> {
    const solicitud = await this.buscar(solicitudId);
    this.exigirBorrador(solicitud);
    if (!solicitud.periodo) {
      throw new BadRequestException(
        "Esta solicitud no salió de un periodo de nómina, así que no hay de dónde regenerarla.",
      );
    }
    await this.lineaRepo.delete({ solicitudId });
    await this.llenarDesdeNomina(solicitudId, solicitud.periodo);
    return this.get(solicitudId);
  }

  private async llenarDesdeNomina(solicitudId: number, periodo: string): Promise<void> {
    /*
     * Si el periodo ya está generado, `getNomina` devuelve la liquidación guardada y no
     * mira los parámetros. Si no, hace la vista previa, y para eso necesita el salario
     * mínimo y el auxilio del año — los mismos de Parámetros que usa la pantalla de
     * Nómina—. Se le pasan siempre: en la práctica la solicitud se arma antes de cerrar
     * el mes, y sin esto habría que generar la nómina solo para poder pedir el giro.
     */
    const anio = Number(periodo.slice(0, 4));
    const parametros = await this.parametroRepo.findOne({ where: { anio } });
    if (!parametros) {
      throw new BadRequestException(
        `No hay parámetros cargados para ${anio}. Cárgalos en Talento Humano → Parámetros.`,
      );
    }
    const { filas } = await this.nominaService.getNomina(
      periodo,
      Number(parametros.smmlv),
      Number(parametros.auxilioTransporte),
    );
    if (filas.length === 0) {
      throw new BadRequestException(
        `En ${periodo} no hay nadie para liquidar, así que no hay nada que girar.`,
      );
    }

    const personas = await this.personaRepo.find({
      where: { personaId: In(filas.map((f) => f.personaId)) },
    });
    const porPersona = new Map(personas.map((p) => [p.personaId, p]));
    const codigoPorNombre = await this.codigosDeBanco();

    /*
     * Lo que se gira es **lo que el revisor digitó**, no lo que calculó el sistema.
     *
     * Son la misma cifra salvo por el peso de redondeo que la validación perdona, y en
     * ese caso manda la del revisor: es la que él confirmó contra el soporte que tiene en
     * la mano, y es la que va a cuadrar con la contabilidad. Quien no tenga visto bueno
     * —una solicitud armada antes de revisar el mes— va con la del sistema.
     */
    const validaciones = await this.validacionRepo.find({ where: { periodo } });
    const digitadoPorPersona = new Map(
      validaciones.map((v) => [v.personaId, Math.round(Number(v.netoDigitado ?? 0))]),
    );
    const valorDe = (f: { personaId: number; netoPagar: number }): number =>
      digitadoPorPersona.get(f.personaId) ?? Math.round(f.netoPagar);

    // A quien no se le paga nada no se le gira nada: un neto en cero o negativo —pasa
    // cuando la cuota del préstamo se come el sueldo del mes— no puede ir al banco.
    const conPago = filas.filter((f) => valorDe(f) > 0);
    if (conPago.length === 0) {
      throw new BadRequestException(
        `En ${periodo} nadie queda con neto a pagar, así que no hay nada que girar.`,
      );
    }

    const lineas = conPago
      .slice()
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
      .map((f, i) => {
        const p = porPersona.get(f.personaId);
        const partido = partirNombre(f.nombre);
        const banco = limpio(p?.banco) || null;
        return this.lineaRepo.create({
          solicitudId,
          orden: i + 1,
          personaId: f.personaId,
          tipoId: limpio(p?.tipoId).toUpperCase() || "CC",
          identificacion: f.identificacion,
          nombre: f.nombre,
          nombres: limpio(p?.nombres) || partido.nombres,
          apellidos: limpio(p?.apellidos) || partido.apellidos,
          proyecto: f.proyecto ?? null,
          valor: String(valorDe(f)),
          banco,
          bancoCodigo: banco ? codigoPorNombre.get(this.claveBanco(banco)) ?? null : null,
          tipoCuenta: limpio(p?.tipoCuenta).toUpperCase() || null,
          cuenta: limpio(p?.cuenta) || null,
          observacion: null,
        });
      });

    await this.lineaRepo.save(lineas);
  }

  private async codigosDeBanco(): Promise<Map<string, number>> {
    const bancos = await this.bancoRepo.find();
    return new Map(bancos.map((b) => [this.claveBanco(b.nombre), b.codigo]));
  }

  /**
   * Compara nombres de banco sin acentos, sin puntos y sin la razón social del final: en
   * la ficha se escribe «Davivienda» y el catálogo dice «BANCO DAVIVIENDA S.A.».
   */
  private claveBanco(nombre: string): string {
    return limpio(nombre)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/\bS\.?\s?A\.?S?\b\.?/g, "")
      .replace(/[^A-Z0-9]/g, "");
  }

  // ── Edición ──

  private exigirBorrador(s: ThSolicitudPago): void {
    if (s.estado !== "BORRADOR") {
      throw new BadRequestException(
        `Esta solicitud está ${s.estado.toLowerCase()}. Devuélvela a borrador para poder cambiarla.`,
      );
    }
  }

  async actualizar(
    solicitudId: number,
    data: { fecha?: string; concepto?: string; estado?: string; observaciones?: string | null },
  ): Promise<SolicitudDetalle> {
    const solicitud = await this.buscar(solicitudId);

    const estado = limpio(data.estado).toUpperCase();
    if (estado && !ESTADOS_SOLICITUD.includes(estado)) {
      throw new BadRequestException("El estado va como BORRADOR, ENVIADA o PAGADA.");
    }
    if (limpio(data.fecha)) solicitud.fecha = limpio(data.fecha);
    if (limpio(data.concepto)) solicitud.concepto = limpio(data.concepto);
    if (data.observaciones !== undefined) solicitud.observaciones = limpio(data.observaciones) || null;
    if (estado) solicitud.estado = estado;

    await this.solicitudRepo.save(solicitud);
    return this.get(solicitudId);
  }

  async guardarLinea(
    solicitudId: number,
    data: Partial<ThSolicitudPagoLinea> & { lineaId?: number },
  ): Promise<SolicitudDetalle> {
    const solicitud = await this.buscar(solicitudId);
    this.exigirBorrador(solicitud);

    const campos: Partial<ThSolicitudPagoLinea> = {};
    if (data.tipoId !== undefined) campos.tipoId = limpio(data.tipoId).toUpperCase() || "CC";
    if (data.identificacion !== undefined) campos.identificacion = limpio(data.identificacion);
    if (data.nombre !== undefined) campos.nombre = limpio(data.nombre);
    if (data.nombres !== undefined) campos.nombres = limpio(data.nombres) || null;
    if (data.apellidos !== undefined) campos.apellidos = limpio(data.apellidos) || null;
    if (data.proyecto !== undefined) campos.proyecto = limpio(data.proyecto) || null;
    if (data.valor !== undefined) campos.valor = String(Math.round(num(data.valor)));
    if (data.tipoCuenta !== undefined) campos.tipoCuenta = limpio(data.tipoCuenta).toUpperCase() || null;
    if (data.cuenta !== undefined) campos.cuenta = limpio(data.cuenta) || null;
    if (data.observacion !== undefined) campos.observacion = limpio(data.observacion) || null;

    if (data.banco !== undefined) {
      // El código se resuelve acá y no se recibe del navegador: manda el catálogo, y así
      // una entidad renombrada se arregla en un solo sitio.
      const nombre = limpio(data.banco);
      campos.banco = nombre || null;
      campos.bancoCodigo = nombre
        ? (await this.codigosDeBanco()).get(this.claveBanco(nombre)) ?? null
        : null;
    }

    if (data.lineaId) {
      const linea = await this.lineaRepo.findOne({ where: { lineaId: data.lineaId, solicitudId } });
      if (!linea) throw new NotFoundException("Esa línea no está en esta solicitud.");
      await this.lineaRepo.save({ ...linea, ...campos });
    } else {
      if (!campos.identificacion || !campos.nombre) {
        throw new BadRequestException("La línea necesita al menos identificación y nombre.");
      }
      const ultima = await this.lineaRepo.findOne({ where: { solicitudId }, order: { orden: "DESC" } });
      // Sin el nombre partido no habría con qué llenar el archivo del banco; se propone
      // igual que al generar desde nómina y se corrige encima si hace falta.
      const partido = partirNombre(campos.nombre);
      await this.lineaRepo.save(
        this.lineaRepo.create({
          solicitudId,
          orden: (ultima?.orden ?? 0) + 1,
          personaId: data.personaId ?? null,
          tipoId: "CC",
          valor: "0",
          ...campos,
          nombres: campos.nombres ?? partido.nombres,
          apellidos: campos.apellidos ?? partido.apellidos,
        }),
      );
    }
    return this.get(solicitudId);
  }

  async borrarLinea(solicitudId: number, lineaId: number): Promise<SolicitudDetalle> {
    const solicitud = await this.buscar(solicitudId);
    this.exigirBorrador(solicitud);
    await this.lineaRepo.delete({ lineaId, solicitudId });
    return this.get(solicitudId);
  }

  async borrar(solicitudId: number): Promise<{ borrado: boolean }> {
    const solicitud = await this.buscar(solicitudId);
    this.exigirBorrador(solicitud);
    await this.lineaRepo.delete({ solicitudId });
    await this.solicitudRepo.delete({ solicitudId });
    return { borrado: true };
  }

  /**
   * Vuelve a leer de las fichas el banco, la cuenta y el nombre partido de las líneas a
   * las que les falta algo, sin tocar las que ya están completas.
   *
   * Es el arreglo de después de llenar los datos bancarios en Personal: regenerar
   * también los traería, pero botaría de paso todo lo que se hubiera editado a mano en la
   * solicitud, y lo que se está corrigiendo es justamente lo que faltaba.
   */
  async refrescarDatosBancarios(solicitudId: number): Promise<SolicitudDetalle> {
    const solicitud = await this.buscar(solicitudId);
    this.exigirBorrador(solicitud);

    const lineas = await this.lineaRepo.find({ where: { solicitudId } });
    const pendientes = lineas.filter((l) => this.faltantesDe(l).length > 0);
    if (pendientes.length === 0) return this.get(solicitudId);

    const ids = pendientes.map((l) => l.personaId).filter((id): id is number => !!id);
    const personas = ids.length
      ? await this.personaRepo.find({ where: { personaId: In(ids) } })
      : [];
    const porPersona = new Map(personas.map((p) => [p.personaId, p]));
    const codigoPorNombre = await this.codigosDeBanco();

    for (const l of pendientes) {
      const p = l.personaId ? porPersona.get(l.personaId) : undefined;
      if (p) {
        const partido = partirNombre(l.nombre);
        if (!l.banco && limpio(p.banco)) l.banco = limpio(p.banco);
        if (!limpio(l.cuenta) && limpio(p.cuenta)) l.cuenta = limpio(p.cuenta);
        if (!limpio(l.tipoCuenta) && limpio(p.tipoCuenta)) {
          l.tipoCuenta = limpio(p.tipoCuenta).toUpperCase();
        }
        if (!limpio(l.apellidos)) l.apellidos = limpio(p.apellidos) || partido.apellidos;
        if (!limpio(l.nombres)) l.nombres = limpio(p.nombres) || partido.nombres;
        if (limpio(p.tipoId)) l.tipoId = limpio(p.tipoId).toUpperCase();
      }
      // El código se re-resuelve siempre: puede que lo que faltara fuera la entidad en el
      // catálogo, no el banco en la ficha.
      if (l.banco) l.bancoCodigo = codigoPorNombre.get(this.claveBanco(l.banco)) ?? l.bancoCodigo;
    }
    await this.lineaRepo.save(pendientes);
    return this.get(solicitudId);
  }

  // ── Archivo del banco ──

  /**
   * Las filas del archivo plano, en el orden y con los códigos que pide el portal.
   *
   * Solo salen las líneas completas: subir una fila a medias hace que el banco rechace el
   * archivo entero, no esa fila. Las que quedan por fuera se devuelven aparte con el
   * motivo, para que no desaparezcan en silencio.
   */
  async archivoBanco(solicitudId: number): Promise<{
    solicitud: ThSolicitudPago;
    filas: Array<{
      tipoId: number;
      identificacion: string;
      nombres: string;
      apellidos: string;
      codigoBanco: number;
      tipoProducto: string;
      numeroProducto: string;
      valor: number;
    }>;
    total: number;
    excluidas: Array<{ nombre: string; faltantes: string[] }>;
  }> {
    const { solicitud, lineas } = await this.get(solicitudId);
    const filas = lineas
      .filter((l) => l.faltantes.length === 0)
      .map((l) => ({
        tipoId: CODIGO_TIPO_ID[limpio(l.tipoId).toUpperCase()] ?? CODIGO_TIPO_ID.CC,
        identificacion: limpio(l.identificacion),
        nombres: limpio(l.nombres),
        apellidos: limpio(l.apellidos),
        codigoBanco: l.bancoCodigo as number,
        tipoProducto: CODIGO_TIPO_CUENTA[limpio(l.tipoCuenta).toUpperCase()],
        numeroProducto: limpio(l.cuenta),
        valor: Math.round(num(l.valor)),
      }));
    return {
      solicitud,
      filas,
      total: filas.reduce((s, f) => s + f.valor, 0),
      excluidas: lineas
        .filter((l) => l.faltantes.length > 0)
        .map((l) => ({ nombre: l.nombre, faltantes: l.faltantes })),
    };
  }
}
