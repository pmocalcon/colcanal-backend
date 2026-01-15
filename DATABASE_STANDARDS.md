# Estándares de Base de Datos - Colcanal Backend

Este documento define las convenciones y buenas prácticas para crear y mantener entidades de TypeORM en el proyecto.

---

## Tabla de Contenidos

1. [Naming Conventions](#1-naming-conventions)
2. [Estructura de Entidades](#2-estructura-de-entidades)
3. [Tipos de Datos](#3-tipos-de-datos)
4. [Relaciones](#4-relaciones)
5. [Índices](#5-índices)
6. [Constraints](#6-constraints)
7. [Timestamps y Auditoría](#7-timestamps-y-auditoría)
8. [Checklist de Nueva Entidad](#8-checklist-de-nueva-entidad)
9. [Plantilla de Entidad](#9-plantilla-de-entidad)
10. [Errores Comunes a Evitar](#10-errores-comunes-a-evitar)

---

## 1. Naming Conventions

### Tablas
- Usar **inglés** para todos los nombres
- Usar **snake_case** y **plural**
- Ejemplos: `users`, `purchase_orders`, `material_categories`

```typescript
// ✅ Correcto
@Entity('purchase_orders')

// ❌ Incorrecto
@Entity('PurchaseOrder')
@Entity('purchaseOrders')
@Entity('ordenes_compra')
```

### Columnas
- Usar **snake_case** en la base de datos
- Usar **camelCase** en TypeScript
- Siempre especificar `name` explícitamente

```typescript
// ✅ Correcto
@Column({ name: 'created_by', type: 'int' })
createdBy: number;

@Column({ name: 'is_active', type: 'boolean', default: true })
isActive: boolean;

// ❌ Incorrecto
@Column()
createdBy: number;  // Generará "createdBy" en la DB, no "created_by"
```

### Primary Keys
- Formato: `{tabla_singular}_id`
- Ejemplos: `user_id`, `purchase_order_id`, `material_id`

```typescript
// ✅ Correcto
@PrimaryGeneratedColumn({ name: 'user_id' })
userId: number;

// ❌ Incorrecto
@PrimaryGeneratedColumn()
id: number;
```

### Foreign Keys
- Formato: `{tabla_referenciada_singular}_id`
- Siempre declarar la columna FK explícitamente

```typescript
// ✅ Correcto
@Column({ name: 'company_id' })
companyId: number;

@ManyToOne(() => Company)
@JoinColumn({ name: 'company_id' })
company: Company;

// ❌ Incorrecto (sin columna explícita)
@ManyToOne(() => Company)
company: Company;
```

---

## 2. Estructura de Entidades

Organizar las entidades en este orden:

```typescript
import { ... } from 'typeorm';
import { ... } from './otras-entidades';

@Entity('nombre_tabla')
@Index([...])  // Índices compuestos primero
export class NombreEntidad {
  // 1. Primary Key
  @PrimaryGeneratedColumn({ name: 'entidad_id' })
  entidadId: number;

  // 2. Foreign Keys (columnas)
  @Column({ name: 'parent_id' })
  parentId: number;

  // 3. Campos requeridos
  @Column({ type: 'varchar', length: 100 })
  name: string;

  // 4. Campos opcionales
  @Column({ type: 'text', nullable: true })
  description: string;

  // 5. Campos de estado
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  // 6. Timestamps
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // 7. Relaciones ManyToOne
  @ManyToOne(() => Parent)
  @JoinColumn({ name: 'parent_id' })
  parent: Parent;

  // 8. Relaciones OneToMany
  @OneToMany(() => Child, (child) => child.parent)
  children: Child[];
}
```

---

## 3. Tipos de Datos

### Strings

| Caso de Uso | Tipo | Ejemplo |
|-------------|------|---------|
| Códigos, identificadores | `varchar(50)` | SKU, códigos de proyecto |
| Nombres cortos | `varchar(100)` | Nombres de usuario |
| Nombres/títulos | `varchar(200)` | Nombres de empresas |
| Direcciones, descripciones cortas | `varchar(500)` | Direcciones |
| Texto largo (comentarios, notas) | `text` | Observaciones, justificaciones |

```typescript
// ✅ Correcto
@Column({ type: 'varchar', length: 100 })
name: string;

@Column({ type: 'text', nullable: true })
comments: string;

// ❌ Incorrecto
@Column({ type: 'text' })  // No usar TEXT para campos cortos
code: string;
```

### Números

| Caso de Uso | Tipo | Ejemplo |
|-------------|------|---------|
| IDs, contadores | `int` | foreignKeys, quantities enteras |
| Cantidades con decimales | `decimal(10, 2)` | Cantidades de material |
| Precios/montos | `decimal(15, 2)` | Precios, totales |
| Porcentajes | `decimal(5, 2)` | IVA, descuentos |
| Coordenadas | `decimal(12, 8)` | Latitud, longitud |

```typescript
// ✅ Correcto
@Column({ type: 'decimal', precision: 15, scale: 2 })
totalAmount: number;

@Column({ type: 'decimal', precision: 5, scale: 2, default: 19 })
ivaPercentage: number;
```

### Fechas

```typescript
// ✅ Siempre usar timestamptz para fechas con hora
@Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
approvedAt: Date;

// ✅ Usar date para fechas sin hora
@Column({ name: 'issue_date', type: 'date' })
issueDate: Date;
```

### Booleanos

```typescript
// ✅ Siempre especificar default
@Column({ name: 'is_active', type: 'boolean', default: true })
isActive: boolean;

@Column({ name: 'has_iva', type: 'boolean', default: false })
hasIva: boolean;
```

---

## 4. Relaciones

### ManyToOne (Obligatorio)

```typescript
// ✅ Correcto - Con columna FK explícita e índice
@Column({ name: 'company_id' })
@Index()  // IMPORTANTE: Siempre indexar FKs
companyId: number;

@ManyToOne(() => Company, (company) => company.projects)
@JoinColumn({ name: 'company_id' })
company: Company;
```

### ManyToOne (Opcional)

```typescript
// ✅ Correcto - FK nullable
@Column({ name: 'project_id', nullable: true })
@Index()
projectId: number | null;

@ManyToOne(() => Project, { nullable: true })
@JoinColumn({ name: 'project_id' })
project: Project | null;
```

### OneToMany

```typescript
// ✅ Correcto - Siempre especificar la relación inversa
@OneToMany(() => RequisitionItem, (item) => item.requisition)
items: RequisitionItem[];

// Con cascade para crear/actualizar hijos automáticamente
@OneToMany(() => RequisitionItem, (item) => item.requisition, {
  cascade: true,
})
items: RequisitionItem[];
```

### Política de onDelete

| Relación | onDelete | Cuándo Usar |
|----------|----------|-------------|
| Items de un documento | `CASCADE` | Eliminar items cuando se elimina el padre |
| Referencias a usuarios | `RESTRICT` (default) | Usuarios no deben eliminarse si tienen referencias |
| Referencias opcionales | `SET NULL` | Mantener el registro pero limpiar la referencia |

```typescript
// Hijos que deben eliminarse con el padre
@ManyToOne(() => Requisition, { onDelete: 'CASCADE' })
@JoinColumn({ name: 'requisition_id' })
requisition: Requisition;

// Referencias opcionales que pueden limpiarse
@ManyToOne(() => RequisitionItem, { nullable: true, onDelete: 'SET NULL' })
@JoinColumn({ name: 'requisition_item_id' })
requisitionItem: RequisitionItem | null;
```

### OneToOne

```typescript
// ✅ Usar PrimaryColumn cuando es 1:1 estricto
@Entity('requisition_sequences')
export class RequisitionSequence {
  @PrimaryColumn({ name: 'prefix_id' })
  prefixId: number;

  @OneToOne(() => RequisitionPrefix, (prefix) => prefix.requisitionSequence)
  @JoinColumn({ name: 'prefix_id' })
  requisitionPrefix: RequisitionPrefix;
}
```

---

## 5. Índices

### Regla de Oro
> **TODA foreign key debe tener un índice**

TypeORM NO crea índices automáticamente en foreign keys.

```typescript
// ✅ Correcto
@Column({ name: 'company_id' })
@Index()  // OBLIGATORIO
companyId: number;

// ❌ Incorrecto - Sin índice
@Column({ name: 'company_id' })
companyId: number;
```

### Índices Compuestos

Para búsquedas frecuentes con múltiples columnas:

```typescript
@Entity('requisitions')
@Index(['companyId', 'statusId'])  // Búsquedas por empresa y estado
@Index(['companyId', 'createdAt']) // Búsquedas por empresa y fecha
export class Requisition {
  // ...
}
```

### Índices Únicos

```typescript
// En una sola columna
@Column({ type: 'varchar', length: 50, unique: true })
code: string;

// Compuesto
@Entity('operation_centers')
@Index(['companyId', 'projectId', 'code'], { unique: true })
export class OperationCenter {
  // ...
}
```

---

## 6. Constraints

### Unique Constraints

```typescript
// Opción 1: En la columna (una sola columna)
@Column({ type: 'varchar', length: 50, unique: true })
nitCc: string;

// Opción 2: Decorador @Unique (múltiples columnas)
@Entity('role_permissions')
@Unique(['rolId', 'permisoId'])
export class RolePermission {
  // ...
}

// Opción 3: @Index con unique (equivalente)
@Entity('operation_centers')
@Index(['companyId', 'projectId', 'code'], { unique: true })
export class OperationCenter {
  // ...
}
```

### Cuándo Usar UNIQUE

- Códigos de identificación (NIT, SKU, etc.)
- Combinaciones que no deben repetirse (usuario + rol + gestión)
- Números de documento (requisitionNumber, purchaseOrderNumber)

---

## 7. Timestamps y Auditoría

### Timestamps Obligatorios

**Toda entidad debe tener:**

```typescript
@CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
createdAt: Date;

@UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
updatedAt: Date;
```

### Auditoría de Usuario

Para entidades que requieren saber quién creó/modificó:

```typescript
@Column({ name: 'created_by' })
@Index()
createdBy: number;

@ManyToOne(() => User)
@JoinColumn({ name: 'created_by' })
creator: User;

// Opcional: quién actualizó
@Column({ name: 'updated_by', nullable: true })
updatedBy: number | null;

@ManyToOne(() => User, { nullable: true })
@JoinColumn({ name: 'updated_by' })
updater: User | null;
```

### Soft Delete

Para entidades que no deben eliminarse físicamente:

```typescript
@Column({ name: 'is_active', type: 'boolean', default: true })
isActive: boolean;

// O usando DeleteDateColumn de TypeORM
@DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
deletedAt: Date;
```

---

## 8. Checklist de Nueva Entidad

Antes de crear un PR con una nueva entidad, verificar:

### Naming
- [ ] Nombre de tabla en inglés, snake_case, plural
- [ ] Primary key con formato `{tabla_singular}_id`
- [ ] Columnas con `name` explícito en snake_case
- [ ] Foreign keys con formato `{tabla_referenciada}_id`

### Tipos de Datos
- [ ] VARCHAR con length apropiado (no TEXT para campos cortos)
- [ ] DECIMAL con precision/scale para montos
- [ ] TIMESTAMPTZ para fechas con hora
- [ ] Defaults especificados para booleanos

### Relaciones
- [ ] Columna FK declarada explícitamente
- [ ] @Index() en cada foreign key
- [ ] onDelete especificado según reglas de negocio
- [ ] Relación inversa definida en entidad padre (si aplica)

### Constraints
- [ ] UNIQUE en campos que lo requieren
- [ ] Índices compuestos para búsquedas frecuentes

### Timestamps
- [ ] createdAt con @CreateDateColumn
- [ ] updatedAt con @UpdateDateColumn
- [ ] createdBy si aplica auditoría de usuario

---

## 9. Plantilla de Entidad

Copiar y adaptar para nuevas entidades:

```typescript
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
  Unique,
} from 'typeorm';
import { User } from './user.entity';
// Importar otras entidades relacionadas

@Entity('nombre_tablas')  // plural, snake_case
@Index(['campoFrecuente1', 'campoFrecuente2'])  // Índices compuestos si necesario
@Unique(['campo1', 'campo2'])  // Constraints únicos compuestos si necesario
export class NombreEntidad {
  // ==========================================
  // PRIMARY KEY
  // ==========================================
  @PrimaryGeneratedColumn({ name: 'nombre_entidad_id' })
  nombreEntidadId: number;

  // ==========================================
  // FOREIGN KEYS
  // ==========================================
  @Column({ name: 'parent_id' })
  @Index()
  parentId: number;

  @Column({ name: 'optional_parent_id', nullable: true })
  @Index()
  optionalParentId: number | null;

  // ==========================================
  // CAMPOS REQUERIDOS
  // ==========================================
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  // ==========================================
  // CAMPOS OPCIONALES
  // ==========================================
  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  observations: string;

  // ==========================================
  // CAMPOS DE ESTADO
  // ==========================================
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  // ==========================================
  // AUDITORÍA
  // ==========================================
  @Column({ name: 'created_by' })
  @Index()
  createdBy: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // ==========================================
  // RELACIONES - ManyToOne
  // ==========================================
  @ManyToOne(() => ParentEntity, (parent) => parent.children)
  @JoinColumn({ name: 'parent_id' })
  parent: ParentEntity;

  @ManyToOne(() => OptionalParent, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'optional_parent_id' })
  optionalParent: OptionalParent | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  // ==========================================
  // RELACIONES - OneToMany
  // ==========================================
  @OneToMany(() => ChildEntity, (child) => child.parent, { cascade: true })
  children: ChildEntity[];
}
```

---

## 10. Errores Comunes a Evitar

### ❌ No indexar Foreign Keys

```typescript
// ❌ MAL - Sin índice, queries lentas
@Column({ name: 'company_id' })
companyId: number;

// ✅ BIEN - Con índice
@Column({ name: 'company_id' })
@Index()
companyId: number;
```

### ❌ Usar TEXT para campos cortos

```typescript
// ❌ MAL - TEXT sin límite
@Column({ type: 'text' })
code: string;

// ✅ BIEN - VARCHAR con límite apropiado
@Column({ type: 'varchar', length: 50 })
code: string;
```

### ❌ No especificar name en columnas

```typescript
// ❌ MAL - TypeORM genera "companyId" en la DB
@Column()
companyId: number;

// ✅ BIEN - Genera "company_id" en la DB
@Column({ name: 'company_id' })
companyId: number;
```

### ❌ FK sin columna explícita

```typescript
// ❌ MAL - No se puede acceder al ID sin cargar la relación
@ManyToOne(() => Company)
company: Company;

// ✅ BIEN - Se puede usar companyId directamente
@Column({ name: 'company_id' })
@Index()
companyId: number;

@ManyToOne(() => Company)
@JoinColumn({ name: 'company_id' })
company: Company;
```

### ❌ Olvidar timestamps

```typescript
// ❌ MAL - Sin auditoría temporal
@Entity('products')
export class Product {
  @PrimaryGeneratedColumn({ name: 'product_id' })
  productId: number;

  @Column()
  name: string;
}

// ✅ BIEN - Con timestamps
@Entity('products')
export class Product {
  @PrimaryGeneratedColumn({ name: 'product_id' })
  productId: number;

  @Column()
  name: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
```

### ❌ Nullable en UNIQUE compuesto

```typescript
// ❌ PROBLEMÁTICO - NULL en PostgreSQL permite duplicados
@Entity('authorizations')
@Unique(['userId', 'gestionId', 'type'])
export class Authorization {
  @Column({ name: 'gestion_id', nullable: true })  // Puede causar duplicados
  gestionId: number;
}

// ✅ MEJOR - Usar valor default o tabla separada para casos sin gestión
```

### ❌ Mezclar idiomas

```typescript
// ❌ MAL - Mezcla español e inglés
@Entity('usuarios')
export class User {
  @Column({ name: 'nombre_completo' })
  fullName: string;
}

// ✅ BIEN - Todo en inglés
@Entity('users')
export class User {
  @Column({ name: 'full_name' })
  fullName: string;
}
```

---

## Recursos Adicionales

- [TypeORM Documentation](https://typeorm.io/)
- [PostgreSQL Data Types](https://www.postgresql.org/docs/current/datatype.html)
- [Database Normalization](https://en.wikipedia.org/wiki/Database_normalization)

---

*Última actualización: Enero 2026*
*Mantener este documento actualizado cuando se agreguen nuevas convenciones.*
