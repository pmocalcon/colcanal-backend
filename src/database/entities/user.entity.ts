import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Role } from './role.entity';
import { Authorization } from './authorization.entity';
import { Requisition } from './requisition.entity';
import { RequisitionLog } from './requisition-log.entity';
import { RequisitionApproval } from './requisition-approval.entity';
import { RequisitionItemApproval } from './requisition-item-approval.entity';
import { RequisitionItemQuotation } from './requisition-item-quotation.entity';
import { PurchaseOrder } from './purchase-order.entity';
import { PurchaseOrderApproval } from './purchase-order-approval.entity';
import { Invoice } from './invoice.entity';
import { MaterialReceipt } from './material-receipt.entity';
import { MaterialPriceHistory } from './material-price-history.entity';
import { UserGestion } from './user-gestion.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ name: 'user_id' })
  userId: number;

  @Column({ type: 'varchar', length: 120, unique: true })
  email: string;

  @Column({ name: 'email_notificacion', type: 'varchar', length: 120, nullable: true })
  emailNotificacion: string;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  @Column({ type: 'varchar', length: 120 })
  nombre: string;

  @Column({ type: 'varchar', length: 120 })
  cargo: string;

  @Column({ name: 'rol_id' })
  rolId: number;

  @Column({ type: 'boolean', default: true, nullable: true })
  estado: boolean;

  @CreateDateColumn({
    name: 'creado_en',
    type: 'timestamptz',
  })
  creadoEn: Date;

  @Column({ name: 'refresh_token', type: 'text', nullable: true })
  refreshToken: string;

  @ManyToOne(() => Role, (role) => role.users)
  @JoinColumn({ name: 'rol_id' })
  role: Role;

  @OneToMany(
    () => Authorization,
    (authorization) => authorization.usuarioAutorizador,
  )
  authorizationsGranted: Authorization[];

  @OneToMany(
    () => Authorization,
    (authorization) => authorization.usuarioAutorizado,
  )
  authorizationsReceived: Authorization[];

  // ============================================
  // Relaciones inversas con otras entidades
  // ============================================

  // Requisiciones creadas por este usuario
  @OneToMany(() => Requisition, (req) => req.creator)
  createdRequisitions: Requisition[];

  // Requisiciones revisadas por este usuario
  @OneToMany(() => Requisition, (req) => req.reviewer)
  reviewedRequisitions: Requisition[];

  // Requisiciones aprobadas por este usuario
  @OneToMany(() => Requisition, (req) => req.approver)
  approvedRequisitions: Requisition[];

  // Logs de requisiciones creados por este usuario
  @OneToMany(() => RequisitionLog, (log) => log.user)
  requisitionLogs: RequisitionLog[];

  // Aprobaciones de requisiciones hechas por este usuario
  @OneToMany(() => RequisitionApproval, (approval) => approval.user)
  requisitionApprovals: RequisitionApproval[];

  // Aprobaciones de items de requisiciones hechas por este usuario
  @OneToMany(() => RequisitionItemApproval, (approval) => approval.user)
  requisitionItemApprovals: RequisitionItemApproval[];

  // Cotizaciones creadas por este usuario
  @OneToMany(() => RequisitionItemQuotation, (quotation) => quotation.creator)
  createdQuotations: RequisitionItemQuotation[];

  // Órdenes de compra creadas por este usuario
  @OneToMany(() => PurchaseOrder, (po) => po.creator)
  createdPurchaseOrders: PurchaseOrder[];

  // Órdenes de compra donde este usuario es el aprobador actual
  @OneToMany(() => PurchaseOrder, (po) => po.currentApprover)
  purchaseOrdersToApprove: PurchaseOrder[];

  // Aprobaciones de órdenes de compra hechas por este usuario
  @OneToMany(() => PurchaseOrderApproval, (approval) => approval.approver)
  purchaseOrderApprovals: PurchaseOrderApproval[];

  // Facturas creadas por este usuario
  @OneToMany(() => Invoice, (invoice) => invoice.creator)
  createdInvoices: Invoice[];

  // Recepciones de materiales creadas por este usuario
  @OneToMany(() => MaterialReceipt, (receipt) => receipt.creator)
  createdReceipts: MaterialReceipt[];

  // Historial de precios creado por este usuario
  @OneToMany(() => MaterialPriceHistory, (price) => price.creator)
  createdPriceHistory: MaterialPriceHistory[];

  // Gestiones/módulos asignados directamente a este usuario
  @OneToMany(() => UserGestion, (userGestion) => userGestion.user)
  userGestiones: UserGestion[];
}
