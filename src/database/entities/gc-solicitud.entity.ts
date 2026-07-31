import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

/**
 * Gestión del conocimiento — solicitudes diligenciadas desde los formatos por gestión
 * (el primero: G. jurídica · GTH-002-F "Solicitud de prestación de servicios…").
 *
 * Tabla nueva y AISLADA, sin llaves foráneas: crear una tabla es aditivo y seguro con
 * synchronize:true, igual que el patrón de las entidades CREG. El cuerpo del formato
 * vive en `data` (jsonb) para poder evolucionar los campos sin migraciones; solo se
 * dejan como columnas los metadatos por los que se consulta/lista.
 */
@Entity("gc_solicitudes")
export class GcSolicitud {
  @PrimaryGeneratedColumn({ name: "solicitud_id" })
  solicitudId: number;

  /** Gestión a la que pertenece el formato. Ej.: "juridica". */
  @Column({ name: "gestion", type: "varchar", length: 60 })
  gestion: string;

  /** Código del formato. Ej.: "GTH-002-F". */
  @Column({ name: "formato", type: "varchar", length: 40 })
  formato: string;

  /** Estado del flujo (máquina de estados de Jurídica). */
  @Column({ name: "estado", type: "varchar", length: 40, default: "borrador" })
  estado: string;

  /** Momento en que entró al estado actual (base para calcular el SLA en días hábiles). */
  @Column({ name: "estado_desde", type: "timestamptz", nullable: true })
  estadoDesde: Date | null;

  /** Bitácora de transiciones: [{ estado, accion, fecha, userId, userName, motivo? }]. */
  @Column({ name: "historial", type: "jsonb", nullable: true })
  historial: Array<Record<string, any>> | null;

  /** Cuerpo completo del formato tal como se diligenció. */
  @Column({ name: "data", type: "jsonb", nullable: true })
  data: Record<string, any> | null;

  /** Usuario que creó la solicitud (id plano, sin relación, para no tocar otras tablas). */
  @Column({ name: "created_by", type: "int", nullable: true })
  createdBy: number | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
