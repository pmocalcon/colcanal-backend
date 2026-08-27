/**
 * El prellenado tal como lo pide el formato: por rol, con y sin salario.
 *
 * SOLO LECTURA. Recorre a los usuarios reales para ver a quién le viaja el salario.
 */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";
import { GestionConocimientoService } from "../../modules/gestion-conocimiento/gestion-conocimiento.service";
import { TalentoHumanoService } from "../../modules/talento-humano/talento-humano.service";
import { ROLES_TALENTO_HUMANO } from "../../modules/talento-humano/talento-humano.roles";
import { ThPersona } from "../entities/th-persona.entity";
import { User } from "../entities/user.entity";

async function main() {
  const ds = new DataSource({ ...dataSourceOptions, synchronize: false, logging: false } as any);
  await ds.initialize();

  let malo = false;
  const revisar = (que: string, ok: boolean, detalle: string) => {
    console.log(`${ok ? "OK " : "MAL"}  ${que}: ${detalle}`);
    if (!ok) malo = true;
  };

  /*
   * Se arma el servicio a mano con lo justo: el prellenado solo usa `userRepo` para saber
   * el rol y delega el resto en Talento Humano. Los demás repos no se tocan en este
   * camino, y montar el módulo entero para esto pediría la mitad de la aplicación.
   */
  const th = Object.create(TalentoHumanoService.prototype) as TalentoHumanoService;
  (th as any).personaRepo = ds.getRepository(ThPersona);
  const gc = Object.create(GestionConocimientoService.prototype) as GestionConocimientoService;
  (gc as any).userRepo = ds.getRepository(User);
  (gc as any).talentoHumano = th;

  const [persona] = await ds.getRepository(ThPersona).find({
    where: {}, order: { personaId: "ASC" }, take: 1,
  });

  const usuarios = await ds.getRepository(User).find({ relations: ["role"], where: { estado: true } });
  let bienTh = 0;
  let bienResto = 0;
  for (const u of usuarios) {
    const rol = (u.role?.nombreRol ?? "").trim();
    const ficha = await gc.fichaParaFormato(persona.identificacion, u.userId);
    const deberiaVer = (ROLES_TALENTO_HUMANO as readonly string[]).includes(rol);
    const ve = ficha?.salario != null;
    if (ve !== deberiaVer) {
      malo = true;
      console.log(`  MAL  ${u.nombre} (${rol}) ${ve ? "ve" : "no ve"} el salario y debería ${deberiaVer ? "verlo" : "no verlo"}`);
    } else if (deberiaVer) bienTh += 1;
    else bienResto += 1;

    // A nadie se le esconde el resto: sin nombre ni cargo el formato no se prellena.
    if (!ficha?.primerApellido || !ficha?.identificacion) {
      malo = true;
      console.log(`  MAL  ${u.nombre} (${rol}) no recibió ni el nombre`);
    }
  }
  revisar("el salario solo le viaja a Talento Humano",
    !malo, `${bienTh} lo ven · ${bienResto} no · ${usuarios.length} usuarios`);

  const sinSesion = await gc.fichaParaFormato(persona.identificacion);
  revisar("sin usuario tampoco viaja el salario", sinSesion?.salario === null, "en nulo");

  const inexistente = await gc.fichaParaFormato("99999999999", usuarios[0].userId);
  revisar("una cédula que no está devuelve nulo", inexistente === null,
    "el formato se sigue llenando a mano");

  console.log(`     ejemplo (${persona.nombre}):`);
  const m = await gc.fichaParaFormato(persona.identificacion, usuarios[0].userId);
  console.log(`       «${m?.primerApellido}» «${m?.segundoApellido}» «${m?.primerNombre}» «${m?.segundoNombre}»`);
  console.log(`       ${m?.cargo} · ${m?.area} · ingreso ${m?.fechaIngreso}`);

  await ds.destroy();
  console.log(malo ? "HAY ALGO MAL" : "TODO CUADRA");
  if (malo) process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); });
