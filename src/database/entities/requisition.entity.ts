import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { Company } from "./company.entity";
import { Project } from "./project.entity";
import { OperationCenter } from "./operation-center.entity";
import { ProjectCode } from "./project-code.entity";
import { User } from "./user.entity";
import { RequisitionItem } from "./requisition-item.entity";
import { RequisitionLog } from "./requisition-log.entity";
import { RequisitionStatus } from "./requisition-status.entity";
import { PurchaseOrder } from "./purchase-order.entity";
import { RequisitionApproval } from "./requisition-approval.entity";

/**
 * Requisición de compra: empresa, proyecto, código, prioridad y estado; origen del flujo de compras.
 *
 * Sobre el índice de abajo: va declarado aquí y no solo en la migración que lo creó.
 *
 * La conexión corre con `synchronize: true`, y en cada arranque TypeORM borra de
 * la tabla todo índice que no encuentre declarado en la entidad. Un índice creado
 * únicamente por migración vive hasta el siguiente despliegue y desaparece sin que
 * nadie se entere: hoy `requisitions` no tiene un solo índice secundario, solo la
 * llave primaria y el único de `requisition_number`, que sobreviven por ser
 * constraints.
 *
 * Es parcial porque `acta_number` solo lo llena el camino de requisición
 * anticipada; en el resto está vacío y no hay nada que indexar. Con las tres
 * columnas se resuelve la identidad del acta —(empresa, proyecto, número)—, que es
 * por donde se busca al aprobarla para bajarle el código de contabilidad.
 */
@Index("IDX_requisitions_acta", ["companyId", "projectId", "actaNumber"], {
  where: '"acta_number" IS NOT NULL',
})
@Entity("requisitions")
export class Requisition {
  @PrimaryGeneratedColumn({ name: "requisition_id" })
  requisitionId: number;

  @Column({
    name: "requisition_number",
    type: "varchar",
    length: 20,
    unique: true,
  })
  requisitionNumber: string;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ name: "project_id", nullable: true })
  projectId: number;

  @Column({ name: "operation_center_id" })
  operationCenterId: number;

  @Column({ name: "project_code_id", nullable: true })
  projectCodeId: number;

  @Column({ name: "created_by" })
  createdBy: number;

  @Column({ name: "status_id", default: 1 })
  statusId: number;

  @Column({ name: "priority", type: "varchar", length: 10, default: "normal" })
  priority: "alta" | "normal";

  @Column({ name: "reviewed_by", nullable: true })
  reviewedBy: number;

  @Column({ name: "approved_by", nullable: true })
  approvedBy: number;

  @CreateDateColumn({
    name: "created_at",
    type: "timestamptz",
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: "updated_at",
    type: "timestamptz",
  })
  updatedAt: Date;

  @Column({ name: "reviewed_at", type: "timestamptz", nullable: true })
  reviewedAt: Date;

  @Column({ name: "approved_at", type: "timestamptz", nullable: true })
  approvedAt: Date;

  @Column({ name: "obra", type: "varchar", length: 100, nullable: true })
  obra: string;

  @Column({ name: "codigo_obra", type: "varchar", length: 50, nullable: true })
  codigoObra: string;

  /**
   * Numero del acta a la que se imputa la compra. Solo lo llena el camino
   * anticipado —Gerencia de Proyectos comprando contra un acta provisional—,
   * porque ahi la requisicion nace sin `codigoObra` y hay que saber a que acta
   * pertenece para estamparselo cuando se apruebe.
   *
   * La identidad del acta es (empresa, proyecto, numero) y la requisicion ya
   * trae las dos primeras: con este numero queda completa.
   */
  @Column({ name: "acta_number", type: "varchar", length: 100, nullable: true })
  actaNumber: string | null;

  // Relaciones
  @ManyToOne(() => Company)
  @JoinColumn({ name: "company_id" })
  company: Company;

  @ManyToOne(() => Project, { nullable: true })
  @JoinColumn({ name: "project_id" })
  project: Project;

  @ManyToOne(() => OperationCenter)
  @JoinColumn({ name: "operation_center_id" })
  operationCenter: OperationCenter;

  @ManyToOne(() => ProjectCode, { nullable: true })
  @JoinColumn({ name: "project_code_id" })
  projectCode: ProjectCode;

  @ManyToOne(() => User)
  @JoinColumn({ name: "created_by" })
  creator: User;

  @ManyToOne(() => RequisitionStatus)
  @JoinColumn({ name: "status_id" })
  status: RequisitionStatus;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "reviewed_by" })
  reviewer: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "approved_by" })
  approver: User;

  @OneToMany(() => RequisitionItem, (item) => item.requisition, {
    cascade: true,
  })
  items: RequisitionItem[];

  @OneToMany(() => RequisitionLog, (log) => log.requisition, {
    cascade: true,
  })
  logs: RequisitionLog[];

  @OneToMany(() => PurchaseOrder, (purchaseOrder) => purchaseOrder.requisition)
  purchaseOrders: PurchaseOrder[];

  @OneToMany(() => RequisitionApproval, (approval) => approval.requisition)
  approvals: RequisitionApproval[];
}
