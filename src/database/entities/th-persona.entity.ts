import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

/**
 * Talento humano — base de personal.
 *
 * Tabla nueva y AISLADA, sin llaves foráneas: crear una tabla es aditivo y seguro con
 * synchronize:true, igual que el patrón de las entidades CREG y de `gc_solicitudes`.
 *
 * Arranca importando "Base de personal 2026.xlsx" y de ahí en adelante se vive acá: el
 * Excel deja de ser la fuente.
 *
 * **La identificación no es única a propósito.** Es la llave natural y así se busca, pero
 * en el archivo hay cédulas repetidas —una persona que salió y volvió a entrar— y una
 * restricción única haría fallar la importación completa por un caso que el negocio
 * considera válido.
 */
@Entity("th_personal")
export class ThPersona {
  @PrimaryGeneratedColumn({ name: "persona_id" })
  personaId: number;

  /** ACTIVO / INACTIVO. Texto libre: el archivo trae variantes con espacios. */
  @Column({ type: "varchar", length: 40, nullable: true })
  estado: string | null;

  @Column({ name: "tipo_contrato", type: "varchar", length: 60, nullable: true })
  tipoContrato: string | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  ubicacion: string | null;

  /** Empresa o proyecto al que está cargada la persona (CANALES, una UTAP…). */
  @Column({ name: "empresa_proyecto", type: "varchar", length: 120, nullable: true })
  empresaProyecto: string | null;

  @Index()
  @Column({ type: "varchar", length: 30 })
  identificacion: string;

  @Index()
  @Column({ type: "varchar", length: 160 })
  nombre: string;

  @Column({ type: "varchar", length: 120, nullable: true })
  cargo: string | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  area: string | null;

  /** OPERACIÓN / ADMINISTRATIVO. */
  @Column({ name: "operacion_fge", type: "varchar", length: 60, nullable: true })
  operacionFge: string | null;

  /** Centro de costo abreviado del archivo: OP, AD, PS. */
  @Column({ name: "centro_costo", type: "varchar", length: 20, nullable: true })
  centroCosto: string | null;

  @Column({ name: "tipo_gasto", type: "varchar", length: 20, nullable: true })
  tipoGasto: string | null;

  @Column({ name: "fecha_ingreso", type: "date", nullable: true })
  fechaIngreso: string | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  escalafon: string | null;

  @Column({ name: "formacion_profesional", type: "varchar", length: 80, nullable: true })
  formacionProfesional: string | null;

  /*
   * Remuneración **vigente**, no la historia.
   *
   * El archivo trae bloques de 2024, 2025 y 2026, pero los dos primeros están llenos de
   * `#REF!` —fórmulas rotas apuntando a hojas que ya no existen—, así que importarlos
   * sería traer basura con apariencia de dato. Se importa el bloque vigente y la historia
   * se queda en el Excel, que es donde está (rota) hoy.
   */
  @Column({ type: "numeric", precision: 14, scale: 2, nullable: true })
  salario: string | null;

  @Column({ name: "auxilio_transporte", type: "numeric", precision: 14, scale: 2, nullable: true })
  auxilioTransporte: string | null;

  @Column({ name: "auxilio_rodamiento", type: "numeric", precision: 14, scale: 2, nullable: true })
  auxilioRodamiento: string | null;

  @Column({ name: "total_salarios", type: "numeric", precision: 14, scale: 2, nullable: true })
  totalSalarios: string | null;

  /** Tarifa de riesgo ARL. Fracción, no porcentaje: 0.0435 es el 4,35 %. */
  @Column({ name: "nivel_riesgo", type: "numeric", precision: 8, scale: 6, nullable: true })
  nivelRiesgo: string | null;

  /** Fracción, no porcentaje: 0.3783 es el 37,83 %. Así viene del archivo. */
  @Column({ name: "carga_prestacional_pct", type: "numeric", precision: 8, scale: 6, nullable: true })
  cargaPrestacionalPct: string | null;

  @Column({ name: "carga_prestacional", type: "numeric", precision: 14, scale: 2, nullable: true })
  cargaPrestacional: string | null;

  @Column({ name: "costo_total", type: "numeric", precision: 14, scale: 2, nullable: true })
  costoTotal: string | null;

  /** Año al que corresponden las cifras de arriba. */
  @Column({ name: "anio_vigencia", type: "int", nullable: true })
  anioVigencia: number | null;

  @Column({ type: "text", nullable: true })
  observaciones: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
