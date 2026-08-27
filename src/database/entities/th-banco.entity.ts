import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

/**
 * Catálogo de bancos con el **código con que los identifica el archivo plano** que se
 * sube al portal bancario (hoja «COD Bancos» del formato de dispersión).
 *
 * Vive acá y no como una lista quemada en el código porque el código no es nuestro: lo
 * define el banco pagador y cambia cuando entra una entidad nueva —NEQUI es 507 y no
 * existía hace unos años— o cuando una se fusiona. Cuando eso pasa, el archivo que se
 * sube sale con un código viejo, el banco lo rechaza y no hay dónde corregirlo sin tocar
 * el código fuente.
 *
 * Tabla nueva y AISLADA, sin llaves foráneas, igual que el resto de las `th_*`. La
 * relación con la persona es por **nombre** (`th_personal.banco`), no por id: así el dato
 * de la ficha sigue siendo legible por sí solo y borrar una fila del catálogo no deja
 * huérfanas las cuentas de nadie —solo deja de resolverse el código, que es visible y se
 * arregla volviendo a cargar la entidad—.
 */
@Entity("th_bancos")
export class ThBanco {
  @PrimaryGeneratedColumn({ name: "banco_id" })
  bancoId: number;

  /**
   * El código del archivo plano. Único: dos entidades con el mismo código harían
   * ambiguo el archivo que se sube.
   */
  @Index({ unique: true })
  @Column({ type: "int" })
  codigo: number;

  @Index()
  @Column({ type: "varchar", length: 120 })
  nombre: string;

  /**
   * Se apaga en vez de borrarse cuando una entidad deja de operar: las solicitudes de
   * pago viejas guardan el nombre y el código que tenían, y perder la fila del catálogo
   * dejaría sin explicación un código que sí se usó.
   */
  @Column({ type: "boolean", default: true })
  activo: boolean;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
