import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { esRolPmo } from '../../common/constants/roles.constants';
import { OFFICIAL_DATA_START_DATE } from '../../common/constants';

/** Una cosa esperando la firma de Gerencia. */
export interface ItemAprobacion {
  /** Identificador con el que se ejecuta la acción sobre el registro. */
  id: number;
  titulo: string;
  detalle: string;
  solicitante: string | null;
  fecha: string;
  /** Días que lleva esperando. Es lo que convierte la lista en un control. */
  dias: number;
  valor: number | null;
  /** A dónde ir a ver el detalle completo. */
  ruta: string;
  /** Lo que la acción necesita y no cabe en `id` (p. ej. la llave del acta). */
  extra?: Record<string, unknown>;
}

export interface Bandeja {
  clave: string;
  titulo: string;
  modulo: string;
  /** Cómo se decide: desde aquí mismo, o abriendo la pantalla del módulo. */
  decision: 'directa' | 'en-pantalla';
  total: number;
  items: ItemAprobacion[];
}

/**
 * Todo lo que espera la firma de Gerencia, en un solo lugar.
 *
 * Es **solo lectura**: reúne y ordena, no aprueba. Las acciones siguen pasando por
 * los endpoints de cada módulo, que son los que conocen sus reglas —quién puede,
 * desde qué estado, qué notifica—. Duplicarlas aquí habría creado un segundo
 * camino de aprobación que tarde o temprano se separa del primero.
 */
@Injectable()
export class AprobacionesService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /**
   * El módulo es de Gerencia, con el PMO adentro por su condición de comodín.
   *
   * No hay permiso granular porque no hay grados: se ve todo lo que espera firma
   * o no se entra. Lo que sí varía es qué puede *ejecutar* cada uno, y eso no lo
   * decide este módulo: lo decide cada endpoint de acción. El PMO ve la lista
   * completa, pero aprobar una orden de compra le seguirá exigiendo ser Gerencia.
   */
  async assertPuedeVer(userId: number): Promise<void> {
    const user = await this.userRepo.findOne({
      where: { userId },
      relations: ['role'],
    });
    const rol = user?.role?.nombreRol;
    if (rol !== 'Gerencia' && !esRolPmo(rol)) {
      throw new ForbiddenException('Este módulo es de Gerencia');
    }
  }

  async getPendientes(userId: number): Promise<Bandeja[]> {
    await this.assertPuedeVer(userId);

    const [requisiciones, ordenes, presupuestos, anticipadas, contratos, anticipos, prestamos] =
      await Promise.all([
        this.requisiciones(),
        this.ordenesDeCompra(),
        this.presupuestos(),
        this.comprasAnticipadas(),
        this.contratos(),
        this.anticipos(),
        this.prestamos(),
      ]);

    return [
      {
        clave: 'requisiciones',
        titulo: 'Requisiciones',
        modulo: 'Compras',
        decision: 'directa',
        total: requisiciones.length,
        items: requisiciones,
      },
      {
        clave: 'ordenes-compra',
        titulo: 'Órdenes de compra',
        modulo: 'Compras',
        // Se aprueban ítem por ítem: decidirlas sin ver el detalle sería firmar a ciegas.
        decision: 'en-pantalla',
        total: ordenes.length,
        items: ordenes,
      },
      {
        clave: 'presupuestos',
        titulo: 'Presupuesto del Director',
        modulo: 'Obras',
        decision: 'directa',
        total: presupuestos.length,
        items: presupuestos,
      },
      {
        clave: 'compra-anticipada',
        titulo: 'Compra anticipada sobre acta provisional',
        modulo: 'Obras',
        decision: 'directa',
        total: anticipadas.length,
        items: anticipadas,
      },
      {
        clave: 'contratos',
        titulo: 'Contratos por firmar',
        modulo: 'Gestión jurídica',
        decision: 'directa',
        total: contratos.length,
        items: contratos,
      },
      {
        clave: 'anticipos',
        titulo: 'Anticipos',
        modulo: 'Gestión contable',
        decision: 'directa',
        total: anticipos.length,
        items: anticipos,
      },
      {
        clave: 'prestamos',
        titulo: 'Préstamos a empleados',
        modulo: 'Gestión de talento humano',
        // Aprobar aquí es aprobar por el valor solicitado, que es el caso normal. Para
        // aprobar por menos está «Ver», que abre el formato en el bloque 3.
        decision: 'directa',
        total: prestamos.length,
        items: prestamos,
      },
    ];
  }

  // ── Compras ───────────────────────────────────────────────────────────────

  /**
   * Los tres estados desde los que Gerencia puede aprobar una requisición.
   *
   * Deja fuera los datos de prueba, igual que el resto del módulo de Compras. Sin
   * ese filtro la bandeja mostraba GU-016 y GU-017 —dos requisiciones de prueba
   * fechadas el 2024-01-01— como si llevaran 960 días esperando la firma de
   * Gerencia, que es justo lo que la fecha de corte existe para evitar.
   */
  private requisiciones(): Promise<ItemAprobacion[]> {
    return this.dataSource.query(
      `
      SELECT r.requisition_id                    AS "id",
             r.requisition_number                AS "titulo",
             COALESCE(p.name, c.name)
               || ' · ' || COALESCE(rs.name, rs.code)
               || ' · ' || (SELECT COUNT(*) FROM requisition_items i
                             WHERE i.requisition_id = r.requisition_id) || ' ítem(s)'
                                                 AS "detalle",
             u.nombre                            AS "solicitante",
             r.created_at                        AS "fecha",
             (CURRENT_DATE - r.created_at::date) AS "dias",
             NULL::numeric                       AS "valor",
             '/dashboard/compras/requisiciones/detalle/' || r.requisition_id AS "ruta"
        FROM requisitions r
        JOIN requisition_statuses rs ON rs.status_id = r.status_id
        JOIN companies c             ON c.company_id = r.company_id
        LEFT JOIN projects p         ON p.project_id = r.project_id
        LEFT JOIN users u            ON u.user_id = r.created_by
       WHERE rs.code IN ('pendiente', 'aprobada_revisor', 'autorizado')
         AND r.created_at >= $1
       ORDER BY r.created_at ASC
    `,
      [OFFICIAL_DATA_START_DATE],
    );
  }

  private ordenesDeCompra(): Promise<ItemAprobacion[]> {
    return this.dataSource.query(
      `
      SELECT po.purchase_order_id                 AS "id",
             po.purchase_order_number             AS "titulo",
             COALESCE(s.name, 'Sin proveedor')
               || ' · RQ ' || COALESCE(r.requisition_number, '—') AS "detalle",
             u.nombre                             AS "solicitante",
             po.created_at                        AS "fecha",
             (CURRENT_DATE - po.created_at::date) AS "dias",
             po.total_amount                      AS "valor",
             '/dashboard/compras/ordenes-compra/aprobar' AS "ruta"
        FROM purchase_orders po
        JOIN purchase_order_statuses st ON st.status_id = po.approval_status_id
        LEFT JOIN suppliers s           ON s.supplier_id = po.supplier_id
        LEFT JOIN requisitions r        ON r.requisition_id = po.requisition_id
        LEFT JOIN users u               ON u.user_id = po.created_by
       WHERE st.code = 'pendiente_aprobacion_gerencia'
         AND po.created_at >= $1
       ORDER BY po.created_at ASC
    `,
      [OFFICIAL_DATA_START_DATE],
    );
  }

  // ── Obras ─────────────────────────────────────────────────────────────────

  private presupuestos(): Promise<ItemAprobacion[]> {
    return this.dataSource.query(`
      SELECT b.budget_id                          AS "id",
             COALESCE(NULLIF(btrim(b.work_name), ''), 'Presupuesto ' || b.budget_id) AS "titulo",
             COALESCE(b.company_name, '—')
               || COALESCE(' · acta ' || b.acta_number, '')
               || COALESCE(' · ' || b.department_name, '') AS "detalle",
             u.nombre                             AS "solicitante",
             b.created_at                         AS "fecha",
             (CURRENT_DATE - b.created_at::date)  AS "dias",
             b.valor_actual_excedentes            AS "valor",
             '/dashboard/levantamiento-obras/presupuesto/' || b.budget_id AS "ruta"
        FROM director_budgets b
        LEFT JOIN users u ON u.user_id = b.created_by
       WHERE b.status = 'en_revision'
       ORDER BY b.created_at ASC
    `);
  }

  /** Compras contra actas provisionales, que es lo único que Gerencia autoriza sin código. */
  private async comprasAnticipadas(): Promise<ItemAprobacion[]> {
    const filas = await this.dataSource.query(`
      SELECT a.acta_id                            AS "id",
             'Acta ' || a.acta_number             AS "titulo",
             COALESCE(p.name, c.name)
               || ' · ' || (SELECT COUNT(*) FROM works w
                             WHERE w.company_id = a.company_id
                               AND w.record_number = a.acta_number
                               AND (w.project_id = a.project_id
                                    OR (w.project_id IS NULL AND a.project_id IS NULL)))
               || ' obra(s)'                      AS "detalle",
             u.nombre                             AS "solicitante",
             a.rq_anticipada_solicitada_at        AS "fecha",
             (CURRENT_DATE - a.rq_anticipada_solicitada_at::date) AS "dias",
             NULL::numeric                        AS "valor",
             '/dashboard/levantamiento-obras/actas-provisionales' AS "ruta",
             a.company_id                         AS "companyId",
             a.project_id                         AS "projectId",
             a.acta_number                        AS "actaNumber",
             a.rq_anticipada_justificacion        AS "justificacion"
        FROM work_actas a
        JOIN companies c     ON c.company_id = a.company_id
        LEFT JOIN projects p ON p.project_id = a.project_id
        LEFT JOIN users u    ON u.user_id = a.rq_anticipada_solicitada_por
       WHERE a.rq_anticipada_status = 'pendiente'
       ORDER BY a.rq_anticipada_solicitada_at ASC
    `);

    // La acción necesita la llave del acta —(empresa, proyecto, número)—, no su id.
    return filas.map((f: Record<string, unknown>) => ({
      id: f.id as number,
      titulo: f.titulo as string,
      detalle: f.detalle as string,
      solicitante: f.solicitante as string | null,
      fecha: f.fecha as string,
      dias: f.dias as number,
      valor: null,
      ruta: f.ruta as string,
      extra: {
        companyId: f.companyId,
        projectId: f.projectId,
        actaNumber: f.actaNumber,
        justificacion: f.justificacion,
      },
    }));
  }

  // ── Gestión del Conocimiento ──────────────────────────────────────────────

  /** Contratos esperando la firma, y anticipos esperando el visto bueno. */
  private solicitudes(estado: string, ruta: string): Promise<ItemAprobacion[]> {
    return this.dataSource.query(
      `
      SELECT s.solicitud_id                       AS "id",
             COALESCE(NULLIF(btrim(s.data->>'numeroContrato'), ''),
                      NULLIF(btrim(s.data->>'consecutivo'), ''),
                      s.formato,
                      'Solicitud ' || s.solicitud_id) AS "titulo",
             COALESCE(NULLIF(btrim(s.data->>'objeto'), ''),
                      NULLIF(btrim(s.data->>'nombreContratista'), ''),
                      NULLIF(btrim(s.data->>'concepto'), ''),
                      '—')                       AS "detalle",
             u.nombre                             AS "solicitante",
             s.estado_desde                       AS "fecha",
             (CURRENT_DATE - COALESCE(s.estado_desde, s.created_at)::date) AS "dias",
             NULLIF(regexp_replace(COALESCE(s.data->>'valor', ''), '[^0-9]', '', 'g'), '')::numeric AS "valor",
             $2                                   AS "ruta"
        FROM gc_solicitudes s
        LEFT JOIN users u ON u.user_id = s.created_by
       WHERE s.estado = $1
       ORDER BY COALESCE(s.estado_desde, s.created_at) ASC
    `,
      [estado, ruta],
    );
  }

  private contratos(): Promise<ItemAprobacion[]> {
    return this.solicitudes(
      'pendiente_firma_gerencia',
      '/dashboard/gestion-conocimiento/juridica/contratos',
    );
  }

  private anticipos(): Promise<ItemAprobacion[]> {
    return this.solicitudes(
      'pendiente_aprobacion_gerencia',
      '/dashboard/gestion-conocimiento/contable/anticipos',
    );
  }

  /**
   * Solicitudes de préstamo (GTH-007-F) que ya firmó Dirección Administrativa y
   * esperan a Gerencia.
   *
   * No reusa `solicitudes()` porque lo que identifica un préstamo es otra cosa: el
   * empleado y el valor que pide, no un número de contrato ni un objeto. La ruta va
   * al formato concreto, que es donde Gerencia escribe el valor aprobado.
   */
  private prestamos(): Promise<ItemAprobacion[]> {
    return this.dataSource.query(`
      SELECT s.solicitud_id                        AS "id",
             COALESCE(NULLIF(btrim(s.data->>'nombreCompleto'), ''),
                      'Solicitud ' || s.solicitud_id) AS "titulo",
             COALESCE(NULLIF(btrim(s.data->>'motivo'), ''), '—') AS "detalle",
             u.nombre                              AS "solicitante",
             s.estado_desde                        AS "fecha",
             (CURRENT_DATE - COALESCE(s.estado_desde, s.created_at)::date) AS "dias",
             NULLIF(regexp_replace(COALESCE(s.data->>'valorSolicitado', ''), '[^0-9]', '', 'g'), '')::numeric AS "valor",
             '/dashboard/gestion-conocimiento/talento-humano/prestamo/' || s.solicitud_id AS "ruta"
        FROM gc_solicitudes s
        LEFT JOIN users u ON u.user_id = s.created_by
       WHERE s.gestion = 'talento-humano'
         AND s.formato = 'GTH-007-F'
         AND s.estado  = 'pendiente_gerencia'
       ORDER BY COALESCE(s.estado_desde, s.created_at) ASC
    `);
  }
}
