/* SOLO LECTURA — este script no escribe nada en la base. */
/**
 * Cómo sale el nombre de cada persona en los formatos, antes y después.
 *
 *     npx ts-node src/database/scripts/probar-nombre-ficha.ts
 *
 * El nombre del formato se arma «nombres + apellidos» a partir de la ficha. Se equivocaba
 * con quien tiene dos apellidos y un solo nombre: «TOBON LOPEZ YOHANNA» salía «LOPEZ
 * YOHANNA TOBON». Esto recorre la base entera y enseña **solo las fichas donde el nombre
 * cambia**, para que ningún arreglo arregle a tres y descomponga a otro sin que se vea.
 */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";
import { partirNombreDeFicha } from "../../modules/talento-humano/nombre-ficha";

let malo = false;
const revisar = (que: string, ok: boolean, detalle: string) => {
  console.log(`${ok ? "OK " : "MAL"}  ${que}: ${detalle}`);
  if (!ok) malo = true;
};

/** Como se imprime en el formato: nombres y después apellidos. */
const enFormato = (c: { apellidos: string; nombres: string }) =>
  [c.nombres, c.apellidos].filter(Boolean).join(" ");

/** La regla anterior, tal cual, para comparar. */
function reglaAnterior(nombre: string, apellidos: string | null, nombres: string | null) {
  const norm = (v: string) =>
    v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase().split(/\s+/).filter(Boolean).sort();
  const g = { apellidos: (apellidos ?? "").trim(), nombres: (nombres ?? "").trim() };
  if (g.apellidos || g.nombres) {
    const a = norm(nombre);
    const b = norm(`${g.apellidos} ${g.nombres}`);
    if (a.length === b.length && a.every((x, i) => x === b[i])) return g;
  }
  const p = nombre.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return { apellidos: "", nombres: "" };
  if (p.length === 1) return { apellidos: p[0], nombres: "" };
  const c = p.length >= 4 ? 2 : 1;
  return { apellidos: p.slice(0, c).join(" "), nombres: p.slice(c).join(" ") };
}

async function main() {
  // ── Casos sin base: lo que la regla tiene que respetar ──
  const casos: Array<[string, string | null, string | null, string]> = [
    ["TOBON LOPEZ YOHANNA", "TOBON", "YOHANA", "YOHANNA TOBON LOPEZ"],
    ["SWANN TORRES DANIELA", "SWAN", "DANIELA", "DANIELA SWANN TORRES"],
    ["SALCEDO ARANGO YAZMIN", "SALCEDO", "YAZMIN", "YAZMIN SALCEDO ARANGO"],
    // Cuatro palabras, casilla del banco con el primer apellido: ya salía bien.
    ["TORRES MORALES DANIEL ESTEBAN", "TORRES", "DANIEL ESTEBAN", "DANIEL ESTEBAN TORRES MORALES"],
    // Corrección completa hecha a mano: manda ella.
    ["CASTILLO JORGE EDUARDO", "CASTILLO", "JORGE EDUARDO", "JORGE EDUARDO CASTILLO"],
    // Sin casillas: se cuenta.
    ["CHAMORRO CARVAJAL CARLOS", null, null, "CARVAJAL CARLOS CHAMORRO"],
    // Las tildes de la ficha se conservan en el formato.
    ["HERNÁNDEZ GÓMEZ OMAR ANDRÉS", "HERNANDEZ", "OMAR ANDRES", "OMAR ANDRÉS HERNÁNDEZ GÓMEZ"],
    // Nombres cortos: una letra de diferencia no basta para darlos por iguales.
    ["PAZ RUIZ ANA", "PAZ", "AN", "RUIZ ANA PAZ"],
  ];
  for (const [nombre, ape, nom, esperado] of casos) {
    const sale = enFormato(partirNombreDeFicha(nombre, ape, nom));
    revisar(`«${nombre}»`, sale === esperado, `sale «${sale}»${sale === esperado ? "" : `, se esperaba «${esperado}»`}`);
  }

  // ── La base entera: qué cambia ──
  const ds = new DataSource({
    ...dataSourceOptions,
    synchronize: false,
    migrationsRun: false,
    cache: false,
    logging: false,
  });
  await ds.initialize();
  try {
    const fichas: { nombre: string; apellidos: string | null; nombres: string | null; estado: string }[] =
      await ds.query(`SELECT nombre, apellidos, nombres, estado FROM th_personal ORDER BY nombre`);

    const cambian = fichas
      .map((f) => ({
        f,
        antes: enFormato(reglaAnterior(f.nombre ?? "", f.apellidos, f.nombres)),
        ahora: enFormato(partirNombreDeFicha(f.nombre, f.apellidos, f.nombres)),
      }))
      .filter((x) => x.antes !== x.ahora);

    console.log(`\n== Fichas cuyo nombre en los formatos cambia: ${cambian.length} de ${fichas.length} ==`);
    for (const { f, antes, ahora } of cambian) {
      console.log(`        ${String(f.estado).padEnd(8)} ${antes.padEnd(34)} → ${ahora}`);
    }
    console.log("");

    // Cada nombre que sale tiene que usar las palabras de la ficha, sin quitar ni agregar
    // ninguna. Se compara sin tildes: una corrección hecha a mano puede venir sin ellas y
    // eso no es perder una palabra.
    const clave = (v: string) =>
      v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim().split(/\s+/).filter(Boolean).sort().join(" ");
    const pierden = fichas.filter((f) => {
      const c = partirNombreDeFicha(f.nombre, f.apellidos, f.nombres);
      return clave(`${c.apellidos} ${c.nombres}`) !== clave(f.nombre ?? "");
    });
    revisar(
      "nadie pierde ni gana palabras en su nombre",
      pierden.length === 0,
      pierden.length === 0 ? "las 87 fichas conservan su nombre completo" : pierden.map((f) => f.nombre).join(" · "),
    );

    // Becerra: su casilla del banco trae nombres = «ALEXANDER», sin «JOHN». Con esa pista
    // la regla lo imprime «ALEXANDER BECERRA JOHN». No es la regla, es el dato: tiene la
    // misma forma que Yohanna. Se deja a la vista para que se corrija en su ficha.
    const becerra = cambian.find((x) => /BECERRA/.test(x.f.nombre));
    if (becerra) {
      console.log(
        `AVISO  ${becerra.f.nombre}: su ficha dice nombres = «${becerra.f.nombres}». ` +
          `Hay que completar sus nombres en Personal; hasta entonces sale «${becerra.ahora}».`,
      );
    }
  } finally {
    await ds.destroy();
  }

  console.log(malo ? "\nHay algo mal en el nombre de los formatos." : "\nEl nombre de los formatos está bien.");
  process.exit(malo ? 1 : 0);
}

main().catch((e) => {
  console.error("MAL ", e.message);
  process.exit(1);
});
