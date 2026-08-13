import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

/**
 * Talento humano — incapacidades y su recobro.
 *
 * Tabla nueva y AISLADA, sin llaves foráneas, igual que `th_personal`.
 *
 * Lo que se sigue acá **no es la incapacidad sino la plata**: cuántos días asume la
 * empresa y cuántos la EPS o la ARL, cuánto hay que recobrar, a quién, en qué estado va
 * y cuánto se recuperó. Por eso el modelo sale de la hoja de seguimiento del archivo y no
 * de los exportes crudos de CGUNO, que traen el dato clínico pero no el cobro.
 */
@Entity("th_incapacidades")
export class ThIncapacidad {
  @PrimaryGeneratedColumn({ name: "incapacidad_id" })
  incapacidadId: number;

  // ── Quién ──
  @Index()
  @Column({ type: "varchar", length: 30 })
  identificacion: string;

  @Column({ type: "varchar", length: 160 })
  nombre: string;

  /** Empresa o proyecto al que se carga (CANALES, una UTAP…). */
  @Column({ type: "varchar", length: 120, nullable: true })
  proyecto: string | null;

  @Column({ type: "numeric", precision: 14, scale: 2, nullable: true })
  salario: string | null;

  // ── Qué ──
  /** ENFERMEDAD GENERAL, ACCIDENTE DE TRABAJO, LICENCIA DE MATERNIDAD… */
  @Column({ type: "varchar", length: 80, nullable: true })
  tipo: string | null;

  @Column({ name: "tipo_afectacion", type: "varchar", length: 80, nullable: true })
  tipoAfectacion: string | null;

  @Column({ name: "numero_incapacidad", type: "varchar", length: 60, nullable: true })
  numeroIncapacidad: string | null;

  @Column({ name: "fecha_inicio", type: "date", nullable: true })
  fechaInicio: string | null;

  @Column({ name: "fecha_fin", type: "date", nullable: true })
  fechaFin: string | null;

  /**
   * El periodo tal como se escribió («08 MAYO AL 06 JUNIO 2023»).
   *
   * Se conserva además de las dos fechas porque en el archivo es texto libre y no siempre
   * se deja convertir; perderlo sería perder el único dato de periodo de esos registros.
   */
  @Column({ name: "periodo_texto", type: "varchar", length: 120, nullable: true })
  periodoTexto: string | null;

  // ── Días ──
  @Column({ name: "total_dias", type: "int", nullable: true })
  totalDias: number | null;

  /** Los que paga la empresa y no se recobran. */
  @Column({ name: "dias_empresa", type: "int", nullable: true })
  diasEmpresa: number | null;

  /** Los que asume la EPS o la ARL: la base del recobro. */
  @Column({ name: "dias_entidad", type: "int", nullable: true })
  diasEntidad: number | null;

  // ── Plata ──
  @Column({ name: "valor_asumido_empresa", type: "numeric", precision: 14, scale: 2, nullable: true })
  valorAsumidoEmpresa: string | null;

  @Column({ name: "valor_recobro", type: "numeric", precision: 14, scale: 2, nullable: true })
  valorRecobro: string | null;

  @Column({ name: "valor_proyectado_recuperar", type: "numeric", precision: 14, scale: 2, nullable: true })
  valorProyectadoRecuperar: string | null;

  @Column({ name: "valor_recuperado", type: "numeric", precision: 14, scale: 2, nullable: true })
  valorRecuperado: string | null;

  // ── Ante quién y cómo va ──
  /** EPS o ARL a la que se cobra. */
  @Column({ type: "varchar", length: 120, nullable: true })
  entidad: string | null;

  /** AUTORIZADA · EN PROCESO · PAGADO · … (las del archivo). */
  @Index()
  @Column({ type: "varchar", length: 60, nullable: true })
  estado: string | null;

  @Column({ name: "numero_radicacion", type: "varchar", length: 80, nullable: true })
  numeroRadicacion: string | null;

  /** Texto libre: en el archivo se escribe «Pagada 22 febrero 2024». */
  @Column({ name: "fecha_pago", type: "varchar", length: 80, nullable: true })
  fechaPago: string | null;

  @Column({ type: "text", nullable: true })
  observaciones: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
