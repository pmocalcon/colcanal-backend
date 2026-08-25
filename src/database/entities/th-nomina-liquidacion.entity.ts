import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from "typeorm";

/**
 * Talento humano — nómina ya liquidada (hoja "NÓMINA" del Excel de nómina).
 *
 * Tabla nueva y AISLADA, sin llaves foráneas, igual que las demás `th_*`.
 *
 * Nace cuando Talento Humano genera la nómina de un periodo: una fila por empleado, con
 * el cálculo completo tal como quedó — devengado, IBC, deducciones legales y neto a
 * pagar. **Es una fotografía, no una vista.** Si después cambia el salario en
 * `th_personal`, la nómina de un mes ya generado no se recalcula sola: para eso existe
 * reabrir el periodo y volver a generarlo. Sin esto no habría forma de demostrar qué se
 * pagó realmente el mes pasado si el dato maestro cambia después.
 *
 * Una fila por **persona** (`personaId`), no por identificación: quien tiene contrato en
 * varias empresas del grupo a la vez liquida una fila por cada una. Ver el comentario de
 * `ThNovedadNomina` para el porqué.
 */
@Entity("th_nomina_liquidaciones")
@Index(["periodo", "personaId"])
export class ThNominaLiquidacion {
  @PrimaryGeneratedColumn({ name: "liquidacion_id" })
  liquidacionId: number;

  @Index()
  @Column({ type: "varchar", length: 7 })
  periodo: string;

  @Index()
  @Column({ name: "persona_id", type: "int" })
  personaId: number;

  @Column({ type: "varchar", length: 30 })
  identificacion: string;

  @Column({ type: "varchar", length: 160 })
  nombre: string;

  @Column({ type: "varchar", length: 120, nullable: true })
  cargo: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  proyecto: string | null;

  @Column({ name: "salario_basico", type: "numeric", precision: 14, scale: 2 })
  salarioBasico: string;

  @Column({ name: "dias_trabajados", type: "int" })
  diasTrabajados: number;

  // ── Devengado ──
  @Column({ name: "devengado_basico", type: "numeric", precision: 14, scale: 2 })
  devengadoBasico: string;

  @Column({ name: "horas_extras", type: "numeric", precision: 14, scale: 2 })
  horasExtras: string;

  @Column({ name: "recargo_nocturno", type: "numeric", precision: 14, scale: 2 })
  recargoNocturno: string;

  @Column({ name: "auxilio_rodamiento", type: "numeric", precision: 14, scale: 2 })
  auxilioRodamiento: string;

  @Column({ type: "numeric", precision: 14, scale: 2 })
  bonificacion: string;

  @Column({ name: "incapacidad_empresa", type: "numeric", precision: 14, scale: 2 })
  incapacidadEmpresa: string;

  @Column({ name: "incapacidad_empleado", type: "numeric", precision: 14, scale: 2 })
  incapacidadEmpleado: string;

  @Column({ name: "incapacidad_otros", type: "numeric", precision: 14, scale: 2 })
  incapacidadOtros: string;

  @Column({ name: "vacaciones_habiles", type: "numeric", precision: 14, scale: 2 })
  vacacionesHabiles: string;

  @Column({ name: "vacaciones_no_habiles", type: "numeric", precision: 14, scale: 2 })
  vacacionesNoHabiles: string;

  @Column({ name: "auxilio_transporte", type: "numeric", precision: 14, scale: 2 })
  auxilioTransporte: string;

  @Column({ name: "total_devengado", type: "numeric", precision: 14, scale: 2 })
  totalDevengado: string;

  // ── IBC y deducciones ──
  @Column({ type: "numeric", precision: 14, scale: 2 })
  ibc: string;

  @Column({ type: "numeric", precision: 14, scale: 2 })
  salud: string;

  @Column({ type: "numeric", precision: 14, scale: 2 })
  pension: string;

  @Column({ type: "numeric", precision: 14, scale: 2 })
  fsp: string;

  @Column({ name: "retencion_fuente", type: "numeric", precision: 14, scale: 2 })
  retencionFuente: string;

  @Column({ name: "bonificacion_deduccion", type: "numeric", precision: 14, scale: 2 })
  bonificacionDeduccion: string;

  @Column({ type: "numeric", precision: 14, scale: 2 })
  prestamo: string;

  /**
   * true si esta persona tiene más de un contrato activo (varias empresas del grupo) y
   * `prestamo` es la cuota completa de su cartera — sin repartir entre sus proyectos
   * porque todavía no hay una regla de Contabilidad para hacerlo. Sirve de aviso en
   * pantalla: si tiene 3 proyectos, la cuota se está restando 3 veces, una por cada uno.
   */
  @Column({ name: "multi_empresa", type: "boolean", default: false })
  multiEmpresa: boolean;

  @Column({ type: "numeric", precision: 14, scale: 2 })
  embargos: string;

  @Column({ name: "servicios_gruporecordar", type: "numeric", precision: 14, scale: 2 })
  serviciosGruporecordar: string;

  @Column({ name: "total_deduccion", type: "numeric", precision: 14, scale: 2 })
  totalDeduccion: string;

  @Column({ name: "neto_pagar", type: "numeric", precision: 14, scale: 2 })
  netoPagar: string;

  @Column({ name: "generado_por", type: "varchar", length: 160, nullable: true })
  generadoPor: string | null;

  @Column({ name: "generado_en", type: "timestamptz", nullable: true })
  generadoEn: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
