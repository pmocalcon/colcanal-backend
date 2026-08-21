/* SOLO LECTURA — compara la dirección de notificación de cada usuario activo:
   dominio, espacios invisibles y caracteres raros. No escribe nada. */
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source";

const sospechoso = (s: string) => {
  const notas: string[] = [];
  if (s !== s.trim()) notas.push("ESPACIOS AL BORDE");
  if (/\s/.test(s.trim())) notas.push("ESPACIO INTERNO");
  if (/[^\x20-\x7E]/.test(s)) notas.push("CARACTER NO ASCII");
  if ((s.match(/@/g) || []).length !== 1) notas.push("ARROBAS != 1");
  if (/[A-Z]/.test(s)) notas.push("mayúsculas");
  return notas;
};

async function main() {
  const ds = new DataSource({ ...dataSourceOptions, logging: false });
  await ds.initialize();

  const users = await ds.query(`
    SELECT u.user_id, u.nombre, u.email, u.email_notificacion, r.nombre_rol
      FROM users u LEFT JOIN roles r ON r.rol_id = u.rol_id
     WHERE u.estado = true
     ORDER BY u.user_id
  `);

  const porDominio = new Map<string, number>();
  console.log("== Direcciones a las que realmente se envía ==\n");
  for (const u of users) {
    const usada: string = u.email_notificacion || u.email || "";
    const dominio = (usada.split("@")[1] || "(sin dominio)").toLowerCase().trim();
    porDominio.set(dominio, (porDominio.get(dominio) || 0) + 1);

    const notas = sospechoso(usada);
    const marca = notas.length ? "  <-- " + notas.join(", ") : "";
    const cual = u.email_notificacion ? "notif" : "corp ";
    if (notas.length || dominio !== "canalcongroup.com") {
      console.log(`  #${String(u.user_id).padEnd(3)} ${(u.nombre || "").padEnd(22)} [${cual}] ${JSON.stringify(usada)}${marca}`);
      console.log(`        rol=${u.nombre_rol}  largo=${usada.length}  hex=${Buffer.from(usada, "utf8").toString("hex").slice(0, 90)}`);
    }
  }

  console.log("\n== Reparto por dominio (usuarios activos) ==");
  for (const [d, n] of [...porDominio.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(3)}  ${d}`);
  }

  await ds.destroy();
}

main().catch((e) => { console.error(e); process.exit(1); });
