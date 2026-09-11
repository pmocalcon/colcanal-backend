import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { WorkLog } from "../../database/entities/work-log.entity";
import { WorkActa } from "../../database/entities/work-acta.entity";
import { Work } from "../../database/entities/work.entity";
import { colombianHolidayDates } from "../../utils/business-days.util";

/**
 * Un movimiento de la línea de tiempo de obras.
 *
 * `origen` es la parte que no se puede omitir. Un movimiento **registrado** lo anotó la
 * bitácora en el instante en que ocurrió y responde por su fecha y por su autor. Uno
 * **reconstruido** se dedujo de las columnas de la fila (`approved_at`, `review_date`…)
 * porque es anterior a la bitácora: la fecha es buena, pero de cada carril solo sobrevive
 * el último movimiento —los intermedios se pisaron— y de algunos no se sabe quién.
 *
 * Mezclarlos sin distinguirlos sería el peor resultado posible: una pantalla de auditoría
 * afirmando con el mismo aplomo lo que le consta y lo que dedujo.
 */
export interface MovimientoObra {
  logId: number | null;
  fecha: string;
  ambito: "obra" | "levantamiento" | "acta";
  eje: string | null;
  action: string;
  previousStatus: string | null;
  newStatus: string | null;
  comments: string | null;
  usuario: { userId: number; nombre: string; cargo: string | null } | null;
  origen: "registrado" | "reconstruido";
  workId: number | null;
  obra: string | null;
}

/** El estado de hoy de uno de los carriles del acta, y desde cuándo. */
export interface EjeActa {
  eje: "acta" | "presupuesto" | "cronograma" | "rq_anticipada";
  titulo: string;
  estado: string;
  /** Null cuando la columna no guarda fecha: se dice, no se inventa. */
  desde: string | null;
  quien: string | null;
  motivo: string | null;
}

const LIMITE_PAGINA = 200;

/**
 * El valor de una obra con el factor IPP, igual que el «Resumen de Acta».
 *
 * Es la misma cuenta de `SurveysService.getWorksValue` y tiene que seguir siéndolo: si la
 * auditoría sumara de otra forma, diría que un acta vale una cosa mientras la pantalla
 * del acta dice otra, y el auditor no tendría cómo saber a cuál hacerle caso.
 *
 * Va como fragmento y no como vista porque se engancha con `LATERAL` a la obra en curso
 * (`w.work_id`), que es lo que lo hace barato en un listado.
 */
const SQL_VALOR_OBRA = `
    SELECT COALESCE(SUM(
             sub.total_base *
             CASE WHEN bi.base_ipp > 0 AND s.previous_month_ipp > 0
                  THEN s.previous_month_ipp / bi.base_ipp ELSE 1 END
           ), 0)::float AS valor
      FROM surveys s
      JOIN LATERAL (
        SELECT COALESCE(SUM(sbi.quantity * sbi.unit_value), 0)::float AS total_base
          FROM survey_budget_items sbi WHERE sbi.survey_id = s.survey_id
      ) sub ON true
      JOIN LATERAL (
        SELECT COALESCE(pr.ipp_initial_value, co.ipp_initial_value)::float AS base_ipp
          FROM works w2
          LEFT JOIN projects  pr ON pr.project_id = w2.project_id
          LEFT JOIN companies co ON co.company_id = w2.company_id
         WHERE w2.work_id = w.work_id
      ) bi ON true
     WHERE s.work_id = w.work_id`;

/**
 * Junta lo anotado con lo deducido, **sin duplicar ni perder**.
 *
 * La regla: en cada carril, lo reconstruido vale solo hasta el primer movimiento anotado;
 * desde ahí manda la bitácora. Así la aprobación de un acta no sale dos veces —una por la
 * columna `approved_at` y otra por su renglón anotado— y la historia anterior a la
 * bitácora tampoco desaparece.
 *
 * El corte es **por carril** y no por acta: el acta puede llevar años con el presupuesto
 * sin tocar y haberse movido ayer en el cronograma. Un corte único borraría el
 * presupuesto viejo o duplicaría el cronograma nuevo.
 *
 * Va suelta y exportada para poder comprobarla sin base de datos: es la única regla de
 * este archivo que puede equivocarse en silencio, escondiendo un movimiento o mostrando
 * dos veces el mismo.
 */
export function fundirMovimientos(
  registrados: MovimientoObra[],
  reconstruidos: MovimientoObra[],
): MovimientoObra[] {
  const corte = new Map<string, number>();
  for (const m of registrados) {
    const carril = m.eje ?? m.ambito;
    const t = Date.parse(m.fecha);
    const previo = corte.get(carril);
    if (previo == null || t < previo) corte.set(carril, t);
  }

  const admitidos = reconstruidos.filter((m) => {
    const desde = corte.get(m.eje ?? m.ambito);
    return desde == null || Date.parse(m.fecha) < desde;
  });

  return [...registrados, ...admitidos].sort(
    (a, b) => Date.parse(a.fecha) - Date.parse(b.fecha),
  );
}

/** Arma el WHERE sin repetir el conteo de marcadores en cada consulta. */
class Filtro {
  readonly params: unknown[] = [];
  private readonly partes: string[] = [];

  /** `sql` lleva `$n` donde va el valor; devuelve el índice para poder reutilizarlo. */
  agregar(sql: (n: number) => string, valor: unknown): void {
    this.params.push(valor);
    this.partes.push(sql(this.params.length));
  }

  get where(): string {
    return this.partes.length ? `WHERE ${this.partes.join(" AND ")}` : "";
  }
}

@Injectable()
export class ObrasAuditService {
  constructor(
    @InjectRepository(WorkLog)
    private readonly workLogRepository: Repository<WorkLog>,
    @InjectRepository(WorkActa)
    private readonly workActaRepository: Repository<WorkActa>,
    @InjectRepository(Work)
    private readonly workRepository: Repository<Work>,
  ) {}

  // ══════════════════════════════════════════════════════════════════════════
  // Listados
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Una fila por acta, con sus cuatro carriles y su último movimiento.
   *
   * El acta se identifica por (empresa, proyecto, número) y agrupa obras por
   * `works.record_number`. `IS NOT DISTINCT FROM` compara el proyecto porque es nulo en
   * las empresas que no lo usan, y `= NULL` no une nada.
   */
  async getActas(filtros: {
    page?: number;
    limit?: number;
    companyName?: string;
    actaNumber?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
  }) {
    const page = Math.max(1, filtros.page || 1);
    const limit = Math.min(LIMITE_PAGINA, Math.max(1, filtros.limit || 50));

    const f = new Filtro();
    if (filtros.companyName) f.agregar((n) => `c.name ILIKE $${n}`, `%${filtros.companyName}%`);
    if (filtros.actaNumber) f.agregar((n) => `a.acta_number ILIKE $${n}`, `%${filtros.actaNumber}%`);
    if (filtros.status) f.agregar((n) => `a.status = $${n}`, filtros.status);
    if (filtros.fromDate) f.agregar((n) => `a.created_at >= $${n}::date`, filtros.fromDate);
    if (filtros.toDate) f.agregar((n) => `a.created_at < $${n}::date + 1`, filtros.toDate);

    const total: { n: number }[] = await this.workActaRepository.query(
      `SELECT COUNT(*)::int AS n
         FROM work_actas a
         LEFT JOIN companies c ON c.company_id = a.company_id
         ${f.where}`,
      f.params,
    );
    const n = total[0]?.n ?? 0;

    const actas: Record<string, unknown>[] = await this.workActaRepository.query(
      `SELECT a.acta_id                   AS "actaId",
              a.company_id                AS "companyId",
              a.project_id                AS "projectId",
              a.acta_number               AS "actaNumber",
              a.status                    AS "estado",
              a.presupuesto_status        AS "presupuesto",
              a.cronograma_status         AS "cronograma",
              a.rq_anticipada_status      AS "compraAnticipada",
              a.es_provisional            AS "provisional",
              a.project_code              AS "codigoContabilidad",
              a.created_at                AS "creada",
              a.reviewed_at               AS "revisada",
              a.approved_at               AS "aprobada",
              c.name                      AS "municipio",
              p.name                      AS "proyecto",
              creador.nombre              AS "creadaPor",
              obras.n                     AS "obras",
              obras.valor                 AS "valor",
              mov.ultima                  AS "ultimoMovimiento",
              COALESCE(mov.n, 0)          AS "movimientos"
         FROM work_actas a
         LEFT JOIN companies c ON c.company_id = a.company_id
         LEFT JOIN projects  p ON p.project_id = a.project_id
         LEFT JOIN users creador ON creador.user_id = a.created_by
         LEFT JOIN LATERAL (
           SELECT COUNT(*)::int AS n, COALESCE(SUM(v.valor), 0)::float AS valor
             FROM works w
             LEFT JOIN LATERAL (${SQL_VALOR_OBRA}) v ON true
            WHERE w.record_number = a.acta_number
              AND w.company_id = a.company_id
              AND w.project_id IS NOT DISTINCT FROM a.project_id
         ) obras ON true
         LEFT JOIN LATERAL (
           SELECT MAX(l.created_at) AS ultima, COUNT(*)::int AS n
             FROM work_logs l WHERE l.acta_id = a.acta_id
         ) mov ON true
         ${f.where}
         ORDER BY COALESCE(mov.ultima, a.updated_at, a.created_at) DESC
         LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
      f.params,
    );

    return { actas, total: n, page, limit, totalPages: Math.ceil(n / limit) };
  }

  /** Una fila por obra, con el estado de su levantamiento y el acta que la agrupa. */
  async getObras(filtros: {
    page?: number;
    limit?: number;
    companyName?: string;
    actaNumber?: string;
    busqueda?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
  }) {
    const page = Math.max(1, filtros.page || 1);
    const limit = Math.min(LIMITE_PAGINA, Math.max(1, filtros.limit || 50));

    const f = new Filtro();
    if (filtros.companyName) f.agregar((n) => `c.name ILIKE $${n}`, `%${filtros.companyName}%`);
    if (filtros.actaNumber) f.agregar((n) => `w.record_number ILIKE $${n}`, `%${filtros.actaNumber}%`);
    // El código y el nombre se buscan con el mismo texto: quien audita teclea «PA-12» o
    // «parque principal» sin saber cuál de los dos campos está mirando.
    if (filtros.busqueda) {
      f.agregar(
        (n) => `(w.work_code ILIKE $${n} OR w.name ILIKE $${n})`,
        `%${filtros.busqueda}%`,
      );
    }
    if (filtros.status) f.agregar((n) => `lev.status = $${n}`, filtros.status);
    if (filtros.fromDate) f.agregar((n) => `w.created_at >= $${n}::date`, filtros.fromDate);
    if (filtros.toDate) f.agregar((n) => `w.created_at < $${n}::date + 1`, filtros.toDate);

    const total: { n: number }[] = await this.workRepository.query(
      `SELECT COUNT(*)::int AS n
         FROM works w
         LEFT JOIN companies c ON c.company_id = w.company_id
         LEFT JOIN LATERAL (
           SELECT s.status FROM surveys s WHERE s.work_id = w.work_id
            ORDER BY s.survey_id DESC LIMIT 1
         ) lev ON true
         ${f.where}`,
      f.params,
    );
    const n = total[0]?.n ?? 0;

    const obras: Record<string, unknown>[] = await this.workRepository.query(
      `SELECT w.work_id              AS "workId",
              w.work_code            AS "codigo",
              w.name                 AS "nombre",
              w.record_number        AS "acta",
              w.request_type         AS "tipoSolicitud",
              w.created_at           AS "creada",
              c.name                 AS "municipio",
              p.name                 AS "proyecto",
              creador.nombre         AS "creadaPor",
              lev.survey_id          AS "surveyId",
              lev.status             AS "levantamiento",
              lev.review_date        AS "revisado",
              revisor.nombre         AS "revisadoPor",
              lev.bloques_aprobados  AS "bloquesAprobados",
              COALESCE(val.valor, 0) AS "valor",
              acta.acta_id           AS "actaId",
              acta.status            AS "estadoActa",
              mov.ultima             AS "ultimoMovimiento",
              COALESCE(mov.n, 0)     AS "movimientos"
         FROM works w
         LEFT JOIN companies c ON c.company_id = w.company_id
         LEFT JOIN projects  p ON p.project_id = w.project_id
         LEFT JOIN users creador ON creador.user_id = w.created_by
         LEFT JOIN LATERAL (
           SELECT s.survey_id, s.status, s.review_date, s.reviewed_by,
                  ((s.work_info_status = 'approved')::int
                 + (s.budget_status = 'approved')::int
                 + (s.investment_status = 'approved')::int
                 + (s.materials_status = 'approved')::int
                 + (s.travel_expenses_status = 'approved')::int) AS bloques_aprobados
             FROM surveys s WHERE s.work_id = w.work_id
            ORDER BY s.survey_id DESC LIMIT 1
         ) lev ON true
         LEFT JOIN users revisor ON revisor.user_id = lev.reviewed_by
         LEFT JOIN LATERAL (${SQL_VALOR_OBRA}) val ON true
         LEFT JOIN work_actas acta
                ON acta.acta_number = w.record_number
               AND acta.company_id = w.company_id
               AND acta.project_id IS NOT DISTINCT FROM w.project_id
         LEFT JOIN LATERAL (
           SELECT MAX(l.created_at) AS ultima, COUNT(*)::int AS n
             FROM work_logs l WHERE l.work_id = w.work_id
         ) mov ON true
         ${f.where}
         ORDER BY COALESCE(mov.ultima, w.updated_at, w.created_at) DESC
         LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
      f.params,
    );

    return { obras, total: n, page, limit, totalPages: Math.ceil(n / limit) };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Detalle
  // ══════════════════════════════════════════════════════════════════════════

  /** La historia de un acta: sus carriles, las obras que agrupa y la línea de tiempo. */
  async getActaDetalle(actaId: number) {
    const acta = await this.workActaRepository.findOne({ where: { actaId } });
    if (!acta) return null;

    const [ficha]: Record<string, unknown>[] = await this.workActaRepository.query(
      `SELECT c.name AS municipio, p.name AS proyecto,
              creador.nombre      AS "creadaPor",
              revisor.nombre      AS "revisadaPor",
              aprobador.nombre    AS "aprobadaPor",
              cronorevisor.nombre AS "cronogramaRevisadoPor",
              solicitante.nombre  AS "anticipadaSolicitadaPor",
              resolutor.nombre    AS "anticipadaResueltaPor"
         FROM work_actas a
         LEFT JOIN companies c ON c.company_id = a.company_id
         LEFT JOIN projects  p ON p.project_id = a.project_id
         LEFT JOIN users creador      ON creador.user_id      = a.created_by
         LEFT JOIN users revisor      ON revisor.user_id      = a.reviewed_by
         LEFT JOIN users aprobador    ON aprobador.user_id    = a.approved_by
         LEFT JOIN users cronorevisor ON cronorevisor.user_id = a.cronograma_reviewed_by
         LEFT JOIN users solicitante  ON solicitante.user_id  = a.rq_anticipada_solicitada_por
         LEFT JOIN users resolutor    ON resolutor.user_id    = a.rq_anticipada_resuelta_por
        WHERE a.acta_id = $1`,
      [actaId],
    );

    const obras: Record<string, unknown>[] = await this.workRepository.query(
      `SELECT w.work_id AS "workId", w.work_code AS "codigo", w.name AS "nombre",
              w.address AS "direccion", w.request_type AS "tipoSolicitud",
              w.created_at AS "creada",
              lev.survey_id AS "surveyId", lev.status AS "levantamiento",
              COALESCE(val.valor, 0) AS "valor"
         FROM works w
         LEFT JOIN LATERAL (
           SELECT s.survey_id, s.status FROM surveys s
            WHERE s.work_id = w.work_id ORDER BY s.survey_id DESC LIMIT 1
         ) lev ON true
         LEFT JOIN LATERAL (${SQL_VALOR_OBRA}) val ON true
        WHERE w.record_number = $1 AND w.company_id = $2
          AND w.project_id IS NOT DISTINCT FROM $3
        ORDER BY w.work_id`,
      [acta.actaNumber, acta.companyId, acta.projectId],
    );

    const movimientos = this.fundir(
      await this.movimientosRegistrados({ actaId }),
      this.reconstruirActa(acta, ficha),
    );

    return {
      acta: {
        actaId: acta.actaId,
        actaNumber: acta.actaNumber,
        companyId: acta.companyId,
        projectId: acta.projectId,
        municipio: ficha?.municipio ?? null,
        proyecto: ficha?.proyecto ?? null,
        estado: acta.status,
        provisional: acta.esProvisional,
        codigoContabilidad: acta.projectCode,
        creada: acta.createdAt,
        creadaPor: ficha?.creadaPor ?? null,
      },
      ejes: this.ejesDelActa(acta, ficha),
      obras,
      valor: obras.reduce((s, o) => s + Number(o.valor || 0), 0),
      movimientos,
      resumen: this.resumir(movimientos),
      holidays: colombianHolidayDates(),
    };
  }

  /** La historia de una obra: su levantamiento, sus bloques y la línea de tiempo. */
  async getObraDetalle(workId: number) {
    const [obra]: Record<string, unknown>[] = await this.workRepository.query(
      `SELECT w.work_id AS "workId", w.work_code AS "codigo", w.name AS "nombre",
              w.address AS "direccion", w.neighborhood AS "barrio",
              w.sector_village AS "sector", w.zone AS "zona",
              w.request_type AS "tipoSolicitud", w.record_number AS "acta",
              w.requesting_entity AS "entidadSolicitante",
              w.created_at AS "creada", w.updated_at AS "actualizada",
              c.name AS "municipio", p.name AS "proyecto",
              creador.nombre AS "creadaPor",
              acta.acta_id AS "actaId", acta.status AS "estadoActa",
              acta.project_code AS "codigoContabilidad",
              COALESCE(val.valor, 0) AS "valor"
         FROM works w
         LEFT JOIN companies c ON c.company_id = w.company_id
         LEFT JOIN projects  p ON p.project_id = w.project_id
         LEFT JOIN users creador ON creador.user_id = w.created_by
         LEFT JOIN work_actas acta
                ON acta.acta_number = w.record_number
               AND acta.company_id = w.company_id
               AND acta.project_id IS NOT DISTINCT FROM w.project_id
         LEFT JOIN LATERAL (${SQL_VALOR_OBRA}) val ON true
        WHERE w.work_id = $1`,
      [workId],
    );
    if (!obra) return null;

    const levantamientos: Record<string, unknown>[] = await this.workRepository.query(
      `SELECT s.survey_id AS "surveyId", s.project_code AS "codigo", s.status AS "estado",
              s.created_at AS "creado", s.review_date AS "revisado",
              s.previous_month_ipp AS "ipp", s.rejection_comments AS "motivo",
              autor.nombre AS "creadoPor", revisor.nombre AS "revisadoPor",
              asignado.nombre AS "revisorAsignado",
              s.work_info_status AS "bloqueInformacion", s.work_info_comments AS "reparoInformacion",
              s.budget_status AS "bloquePresupuesto", s.budget_comments AS "reparoPresupuesto",
              s.investment_status AS "bloqueInversion", s.investment_comments AS "reparoInversion",
              s.materials_status AS "bloqueMateriales", s.materials_comments AS "reparoMateriales",
              s.travel_expenses_status AS "bloqueViaticos", s.travel_expenses_comments AS "reparoViaticos"
         FROM surveys s
         LEFT JOIN users autor    ON autor.user_id    = s.created_by
         LEFT JOIN users revisor  ON revisor.user_id  = s.reviewed_by
         LEFT JOIN users asignado ON asignado.user_id = s.assigned_reviewer_id
        WHERE s.work_id = $1
        ORDER BY s.survey_id`,
      [workId],
    );

    const movimientos = this.fundir(
      await this.movimientosRegistrados({ workId }),
      this.reconstruirObra(obra, levantamientos),
    );

    return {
      obra,
      levantamientos,
      movimientos,
      resumen: this.resumir(movimientos),
      holidays: colombianHolidayDates(),
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Bitácora y reconstrucción
  // ══════════════════════════════════════════════════════════════════════════

  private async movimientosRegistrados(llave: {
    actaId?: number;
    workId?: number;
  }): Promise<MovimientoObra[]> {
    const filas: Record<string, any>[] = await this.workLogRepository.query(
      `SELECT l.log_id, l.ambito, l.eje, l.action, l.previous_status, l.new_status,
              l.comments, l.created_at, l.work_id,
              u.user_id, u.nombre, u.cargo, w.name AS obra
         FROM work_logs l
         LEFT JOIN users u ON u.user_id = l.user_id
         LEFT JOIN works w ON w.work_id = l.work_id
        WHERE ${llave.actaId != null ? "l.acta_id = $1" : "l.work_id = $1"}
        ORDER BY l.created_at ASC, l.log_id ASC`,
      [llave.actaId ?? llave.workId],
    );

    return filas.map((f) => ({
      logId: Number(f.log_id),
      fecha: new Date(f.created_at).toISOString(),
      ambito: f.ambito,
      eje: f.eje ?? null,
      action: f.action,
      previousStatus: f.previous_status ?? null,
      newStatus: f.new_status ?? null,
      comments: f.comments ?? null,
      usuario: f.user_id
        ? { userId: Number(f.user_id), nombre: f.nombre, cargo: f.cargo ?? null }
        : null,
      origen: "registrado" as const,
      workId: f.work_id != null ? Number(f.work_id) : null,
      obra: f.obra ?? null,
    }));
  }

  private fundir = fundirMovimientos;

  private evento(
    // `fecha` se saca del Partial antes de volver a declararla: intersecar `fecha?:
    // string` con `fecha: string | Date` da `string`, y las columnas llegan como Date.
    base: Omit<Partial<MovimientoObra>, "fecha" | "ambito" | "action"> & {
      fecha: string | Date;
      ambito: MovimientoObra["ambito"];
      action: string;
    },
  ): MovimientoObra {
    return {
      logId: null,
      fecha: new Date(base.fecha).toISOString(),
      ambito: base.ambito,
      eje: base.eje ?? null,
      action: base.action,
      previousStatus: base.previousStatus ?? null,
      newStatus: base.newStatus ?? null,
      comments: base.comments ?? null,
      usuario: base.usuario ?? null,
      origen: "reconstruido",
      workId: base.workId ?? null,
      obra: base.obra ?? null,
    };
  }

  /** Un nombre suelto, sin id: es todo lo que deja una columna `*_by` reconstruida. */
  private porNombre(nombre: unknown): MovimientoObra["usuario"] {
    return nombre ? { userId: 0, nombre: String(nombre), cargo: null } : null;
  }

  /**
   * Lo que se puede deducir de las columnas del acta.
   *
   * No se deduce el envío a revisión ni el rechazo: el acta no guarda su fecha, y
   * `updated_at` es la del último cambio de cualquier cosa. Poner ahí un movimiento sería
   * fechar un hecho con la hora de otro, que es peor que no mostrarlo.
   */
  private reconstruirActa(
    acta: WorkActa,
    ficha: Record<string, unknown> | undefined,
  ): MovimientoObra[] {
    const eventos: MovimientoObra[] = [
      this.evento({
        fecha: acta.createdAt,
        ambito: "acta",
        eje: "acta",
        action: "crear",
        newStatus: "borrador",
        usuario: this.porNombre(ficha?.creadaPor),
      }),
    ];

    if (acta.reviewedAt) {
      eventos.push(
        this.evento({
          fecha: acta.reviewedAt,
          ambito: "acta",
          eje: "acta",
          action: "revisar",
          previousStatus: "en_revision",
          newStatus: "en_aprobacion",
          usuario: this.porNombre(ficha?.revisadaPor),
        }),
      );
    }

    if (acta.approvedAt) {
      eventos.push(
        this.evento({
          fecha: acta.approvedAt,
          ambito: "acta",
          eje: "acta",
          action: "aprobar",
          previousStatus: "en_aprobacion",
          newStatus: "aprobada",
          comments: acta.projectCode
            ? `Código de contabilidad: ${acta.projectCode}`
            : null,
          usuario: this.porNombre(ficha?.aprobadaPor),
        }),
      );
    }

    if (acta.cronogramaReviewedAt) {
      eventos.push(
        this.evento({
          fecha: acta.cronogramaReviewedAt,
          ambito: "acta",
          eje: "cronograma",
          action:
            acta.cronogramaStatus === "rechazado"
              ? "rechazar_cronograma"
              : "aprobar_cronograma",
          previousStatus: "en_revision",
          newStatus: acta.cronogramaStatus,
          comments: acta.cronogramaRechazoMotivo,
          usuario: this.porNombre(ficha?.cronogramaRevisadoPor),
        }),
      );
    }

    if (acta.rqAnticipadaSolicitadaAt) {
      eventos.push(
        this.evento({
          fecha: acta.rqAnticipadaSolicitadaAt,
          ambito: "acta",
          eje: "rq_anticipada",
          action: "solicitar_compra_anticipada",
          newStatus: "pendiente",
          comments: acta.rqAnticipadaJustificacion,
          usuario: this.porNombre(ficha?.anticipadaSolicitadaPor),
        }),
      );
    }

    if (acta.rqAnticipadaResueltaAt) {
      eventos.push(
        this.evento({
          fecha: acta.rqAnticipadaResueltaAt,
          ambito: "acta",
          eje: "rq_anticipada",
          action:
            acta.rqAnticipadaStatus === "aprobada"
              ? "autorizar_compra_anticipada"
              : "negar_compra_anticipada",
          previousStatus: "pendiente",
          newStatus: acta.rqAnticipadaStatus,
          comments: acta.rqAnticipadaMotivo,
          usuario: this.porNombre(ficha?.anticipadaResueltaPor),
        }),
      );
    }

    return eventos;
  }

  private reconstruirObra(
    obra: Record<string, unknown>,
    levantamientos: Record<string, unknown>[],
  ): MovimientoObra[] {
    const workId = Number(obra.workId);
    const nombre = (obra.nombre as string) ?? null;

    const eventos: MovimientoObra[] = [
      this.evento({
        fecha: obra.creada as string,
        ambito: "obra",
        action: "crear",
        newStatus: "creada",
        comments: obra.acta ? `Acta ${obra.acta}` : null,
        usuario: this.porNombre(obra.creadaPor),
        workId,
        obra: nombre,
      }),
    ];

    for (const lev of levantamientos) {
      eventos.push(
        this.evento({
          fecha: lev.creado as string,
          ambito: "levantamiento",
          action: "crear",
          newStatus: "pending",
          comments: lev.codigo ? `Código ${lev.codigo}` : null,
          usuario: this.porNombre(lev.creadoPor),
          workId,
          obra: nombre,
        }),
      );

      // `review_date` guarda **la última** revisión: si el levantamiento se rechazó y
      // después se aprobó, del rechazo no quedó fecha. De ahí que vaya como reconstruido.
      if (lev.revisado) {
        eventos.push(
          this.evento({
            fecha: lev.revisado as string,
            ambito: "levantamiento",
            action: lev.estado === "rejected" ? "rechazar" : "aprobar",
            newStatus: lev.estado as string,
            comments: (lev.motivo as string) ?? null,
            usuario: this.porNombre(lev.revisadoPor),
            workId,
            obra: nombre,
          }),
        );
      }
    }

    return eventos;
  }

  /**
   * El estado de hoy de los cuatro carriles del acta.
   *
   * `desde` va nulo a propósito donde la columna no guarda fecha —el presupuesto es el
   * caso—: decir «no se sabe» es información; poner `updated_at` sería una fecha falsa
   * con aspecto de verdadera.
   */
  private ejesDelActa(
    acta: WorkActa,
    ficha: Record<string, unknown> | undefined,
  ): EjeActa[] {
    const nombre = (v: unknown) => (v == null ? null : String(v));
    return [
      {
        eje: "acta",
        titulo: "Acta",
        estado: acta.status,
        desde:
          (acta.approvedAt ?? acta.reviewedAt ?? acta.createdAt)?.toISOString() ?? null,
        quien: nombre(ficha?.aprobadaPor ?? ficha?.revisadaPor ?? ficha?.creadaPor),
        motivo: acta.rejectionComment,
      },
      {
        eje: "presupuesto",
        titulo: "Presupuesto",
        estado: acta.presupuestoStatus,
        desde: null,
        quien: null,
        motivo: acta.presupuestoRechazoMotivo,
      },
      {
        eje: "cronograma",
        titulo: "Cronograma",
        estado: acta.cronogramaStatus,
        desde: acta.cronogramaReviewedAt?.toISOString() ?? null,
        quien: nombre(ficha?.cronogramaRevisadoPor),
        motivo: acta.cronogramaRechazoMotivo,
      },
      {
        eje: "rq_anticipada",
        titulo: "Compra anticipada",
        estado: acta.rqAnticipadaStatus,
        desde:
          (acta.rqAnticipadaResueltaAt ?? acta.rqAnticipadaSolicitadaAt)?.toISOString() ??
          null,
        quien: nombre(ficha?.anticipadaResueltaPor ?? ficha?.anticipadaSolicitadaPor),
        motivo: acta.rqAnticipadaMotivo ?? acta.rqAnticipadaJustificacion,
      },
    ];
  }

  /** El marco del trámite. El tiempo hábil lo cuenta el navegador, igual que en compras. */
  private resumir(movimientos: MovimientoObra[]) {
    if (movimientos.length === 0) return null;
    return {
      inicio: movimientos[0].fecha,
      ultimo: movimientos[movimientos.length - 1].fecha,
      movimientos: movimientos.length,
      registrados: movimientos.filter((m) => m.origen === "registrado").length,
      reconstruidos: movimientos.filter((m) => m.origen === "reconstruido").length,
      personas: new Set(movimientos.map((m) => m.usuario?.nombre).filter(Boolean)).size,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Estadísticas
  // ══════════════════════════════════════════════════════════════════════════

  async getStats() {
    const [actas]: Record<string, unknown>[] = await this.workActaRepository.query(
      `SELECT COUNT(*)::int                                                  AS total,
              COUNT(*) FILTER (WHERE status = 'borrador')::int               AS borrador,
              COUNT(*) FILTER (WHERE status = 'en_revision')::int            AS "enRevision",
              COUNT(*) FILTER (WHERE status = 'en_aprobacion')::int          AS "enAprobacion",
              COUNT(*) FILTER (WHERE status = 'aprobada')::int               AS aprobadas,
              COUNT(*) FILTER (WHERE es_provisional)::int                    AS provisionales,
              COUNT(*) FILTER (WHERE presupuesto_status = 'en_revision')::int AS "presupuestoEnRevision",
              COUNT(*) FILTER (WHERE cronograma_status = 'en_revision')::int  AS "cronogramaEnRevision",
              COUNT(*) FILTER (WHERE rq_anticipada_status = 'pendiente')::int AS "anticipadaPendiente"
         FROM work_actas`,
    );

    const [obras]: Record<string, unknown>[] = await this.workRepository.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE record_number IS NULL OR btrim(record_number) = '')::int AS "sinActa"
         FROM works`,
    );

    const levantamientos: Record<string, unknown>[] = await this.workRepository.query(
      `SELECT status AS estado, COUNT(*)::int AS n FROM surveys GROUP BY status ORDER BY n DESC`,
    );

    const porAccion: Record<string, unknown>[] = await this.workLogRepository.query(
      `SELECT action AS accion, COUNT(*)::int AS n
         FROM work_logs GROUP BY action ORDER BY n DESC`,
    );

    // `desde` es la fecha del primer renglón anotado, y la pantalla la necesita para
    // poder decir hasta dónde llega lo que consta y desde dónde empieza lo deducido.
    const [bitacora]: Record<string, unknown>[] = await this.workLogRepository.query(
      `SELECT COUNT(*)::int AS total,
              MIN(created_at) AS desde,
              COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::int AS "ultimos7dias"
         FROM work_logs`,
    );

    return { actas, obras, levantamientos, porAccion, bitacora };
  }
}
