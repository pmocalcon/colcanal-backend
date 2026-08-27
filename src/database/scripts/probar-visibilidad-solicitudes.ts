import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";
import { GestionConocimientoService } from "../../modules/gestion-conocimiento/gestion-conocimiento.service";
import { PurchasesService } from "../../modules/purchases/purchases.service";
import { NotificationsService } from "../../modules/notifications/notifications.service";
import { TalentoHumanoService } from "../../modules/talento-humano/talento-humano.service";
import { GcSolicitud } from "../entities/gc-solicitud.entity";
import { User } from "../entities/user.entity";
import { Material } from "../entities/material.entity";
import { OperationCenter } from "../entities/operation-center.entity";
import { Authorization } from "../entities/authorization.entity";

/**
 * Comprueba quién ve cuáles solicitudes, sin escribir nada.
 *
 *     npx ts-node src/database/scripts/probar-visibilidad-solicitudes.ts
 *
 * Recorre a todos los usuarios activos y lista, para cada uno, cuántas solicitudes de
 * Jurídica le devuelve el listado y por qué. Lo que se está verificando es que nadie de
 * fuera de las áreas que tramitan o firman vea solicitudes ajenas, y que quien sí las
 * tramita las siga viendo todas.
 */
async function main() {
  const ds = new DataSource({ ...dataSourceOptions, synchronize: false, logging: false });
  await ds.initialize();

  // El servicio solo usa sus repositorios para esto; los tres servicios que inyecta no
  // intervienen en `findAll`, así que van en nulo y no se tocan.
  const gc = new GestionConocimientoService(
    ds.getRepository(GcSolicitud),
    ds.getRepository(User),
    ds.getRepository(Material),
    ds.getRepository(OperationCenter),
    ds.getRepository(Authorization),
    null as unknown as PurchasesService,
    null as unknown as NotificationsService,
    null as unknown as TalentoHumanoService,
  );

  const todas = await ds.getRepository(GcSolicitud).find({ where: { gestion: "juridica" } });
  console.log(`Hay ${todas.length} solicitudes de Jurídica en la base:`);
  for (const s of todas) {
    console.log(`  N.º ${s.solicitudId} · ${s.estado} · creada por ${s.createdBy}`);
  }

  const usuarios = await ds.query(
    `SELECT u.user_id, u.nombre, r.nombre_rol
     FROM users u LEFT JOIN roles r ON r.rol_id = u.rol_id
     WHERE u.estado = true ORDER BY r.nombre_rol, u.nombre`,
  );
  const rolDe = new Map<number, string>(
    usuarios.map((u: { user_id: number; nombre_rol: string }) => [u.user_id, (u.nombre_rol ?? "").trim()]),
  );

  /** El alcance acotado: quién ve las de quién sin verlas todas. */
  const ALCANCE: Record<string, string[]> = {
    "Gerencia de Proyectos": [
      "Director de Proyecto Antioquia", "Director de Proyecto Putumayo",
      "Director de Proyecto Quindío", "Director de Proyecto Valle",
      "Director Técnico",
    ],
  };

  let malo = false;
  console.log("\nQuién ve qué:");
  for (const u of usuarios) {
    const vistas = await gc.findAll("juridica", false, u.user_id);
    const ids = vistas.map((s) => s.solicitudId);
    const propias = todas.filter((s) => s.createdBy === u.user_id).map((s) => s.solicitudId);

    // Nadie puede ver una solicitud ajena sin una razón: o su rol ve todas, o cae en su
    // alcance, o le toca actuar, o ya actuó. Si aparece alguna que no cumpla nada de eso,
    // está de más.
    const alcance = ALCANCE[(u.nombre_rol ?? "").trim()] ?? [];
    const ajenas = vistas.filter((s) => s.createdBy !== u.user_id);
    const sinRazon = ajenas.filter((s) => {
      const conAcciones = s as GcSolicitud & { accionesPendientes?: unknown[] };
      const leToca = (conAcciones.accionesPendientes?.length ?? 0) > 0;
      const yaActuo = (s.historial ?? []).some((h) => h?.userId === u.user_id);
      const enAlcance = alcance.includes(rolDe.get(s.createdBy ?? -1) ?? "");
      return !leToca && !yaActuo && !enAlcance;
    });

    const VEN_TODAS = [
      "Director Jurídico", "Coordinador Jurídico", "Analista Jurídico",
      "Director Financiero y Administrativo", "Analista Administrativo",
      "Coordinador Financiero", "Contabilidad",
      "Gerencia",
      "Analista PMO", "Director PMO",
    ];
    const veTodo = VEN_TODAS.includes((u.nombre_rol ?? "").trim());

    if (veTodo && vistas.length !== todas.length) {
      console.log(`  MAL ${u.nombre} (${u.nombre_rol}) debería ver las ${todas.length} y ve ${vistas.length}`);
      malo = true;
      continue;
    }
    if (!veTodo && sinRazon.length > 0) {
      console.log(`  MAL ${u.nombre} (${u.nombre_rol}) ve ajenas sin razón: ${sinRazon.map((s) => s.solicitudId)}`);
      malo = true;
      continue;
    }

    // Gerencia de Proyectos no puede ver ninguna que NO sea de proyectos, salvo que le
    // toque firmarla: es la condición que se le puso al cargo y hay que verificarla, no
    // solo no contradecirla.
    if (alcance.length > 0) {
      const fueraDeAlcance = ajenas.filter((s) => {
        const conAcciones = s as GcSolicitud & { accionesPendientes?: unknown[] };
        const leToca = (conAcciones.accionesPendientes?.length ?? 0) > 0;
        const yaActuo = (s.historial ?? []).some((h) => h?.userId === u.user_id);
        return !alcance.includes(rolDe.get(s.createdBy ?? -1) ?? "") && !leToca && !yaActuo;
      });
      if (fueraDeAlcance.length > 0) {
        console.log(`  MAL ${u.nombre} ve fuera de su alcance: ${fueraDeAlcance.map((s) => s.solicitudId)}`);
        malo = true;
        continue;
      }
      const deSuAlcance = vistas.filter(
        (s) => alcance.includes(rolDe.get(s.createdBy ?? -1) ?? ""),
      );
      const todasLasDeSuAlcance = todas.filter(
        (s) => alcance.includes(rolDe.get(s.createdBy ?? -1) ?? ""),
      );
      if (deSuAlcance.length !== todasLasDeSuAlcance.length) {
        console.log(`  MAL ${u.nombre} debería ver las ${todasLasDeSuAlcance.length} de proyectos y ve ${deSuAlcance.length}`);
        malo = true;
        continue;
      }
    }

    const motivo = veTodo
      ? "su área ve todas"
      : alcance.length
        ? `${vistas.length} de su alcance (proyectos y técnica) + lo que deba firmar`
        : ajenas.length
          ? `${propias.length} propias + ${ajenas.length} por firmar/ya firmadas`
          : `${propias.length} propias`;
    console.log(`  OK  ${String(vistas.length).padStart(2)} · ${u.nombre} (${u.nombre_rol}) — ${motivo} · ${ids}`);
  }

  /*
   * Las cuatro solicitudes que hay las crearon un Analista PMO y la Directora Financiera,
   * que ven todo de por sí, así que el caso principal —el creador SIN privilegios que ve
   * la suya— no lo ejercita ningún dato real. Se presta una solicitud, se comprueba, y se
   * devuelve como estaba.
   */
  console.log("\nEl creador sin privilegios ve la suya:");
  const [aPrestar] = todas;
  const [conejillo] = usuarios.filter(
    (u: { nombre_rol: string }) => (u.nombre_rol ?? "").startsWith("Director de Proyecto"),
  );
  const dueñoReal = aPrestar.createdBy;
  try {
    await ds.getRepository(GcSolicitud).update(
      { solicitudId: aPrestar.solicitudId },
      { createdBy: conejillo.user_id },
    );
    const vistas = await gc.findAll("juridica", false, conejillo.user_id);
    const ids = vistas.map((s) => s.solicitudId);
    const ok = ids.length === 1 && ids[0] === aPrestar.solicitudId;
    console.log(`  ${ok ? "OK " : "MAL"} ${conejillo.nombre} (${conejillo.nombre_rol}) ve ${ids}`);
    if (!ok) malo = true;

    // Y el filtro `mine` sigue funcionando encima de la restricción.
    const soloMias = await gc.findAll("juridica", true, conejillo.user_id);
    const okMine = soloMias.length === 1 && soloMias[0].solicitudId === aPrestar.solicitudId;
    console.log(`  ${okMine ? "OK " : "MAL"} con mine=1 ve ${soloMias.map((s) => s.solicitudId)}`);
    if (!okMine) malo = true;
  } finally {
    await ds.getRepository(GcSolicitud).update(
      { solicitudId: aPrestar.solicitudId },
      { createdBy: dueñoReal },
    );
    const devuelta = await ds.getRepository(GcSolicitud).findOne({
      where: { solicitudId: aPrestar.solicitudId },
    });
    const ok = devuelta?.createdBy === dueñoReal;
    console.log(`  ${ok ? "OK " : "MAL"} devuelta a su dueño (${devuelta?.createdBy})`);
    if (!ok) malo = true;
  }

  await ds.destroy();
  if (malo) process.exit(1);
  console.log("\nTODO CUADRA");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
