import { config } from "dotenv";
import dataSource from "../data-source";
import { User } from "../entities/user.entity";

config();

/**
 * Script para actualizar el dominio de correo de todos los usuarios
 * De: @canalco.com
 * A: @canalcongroup.com
 */
async function updateEmailDomain() {
  try {
    await dataSource.initialize();
    console.log("✅ Data Source inicializado correctamente\n");

    const userRepository = dataSource.getRepository(User);

    // 1. Obtener todos los usuarios con el dominio antiguo
    const usersToUpdate = await userRepository
      .createQueryBuilder("user")
      .where("user.email LIKE :domain", { domain: "%@canalco.com" })
      .getMany();

    console.log(
      `📧 Usuarios encontrados con @canalco.com: ${usersToUpdate.length}\n`,
    );

    if (usersToUpdate.length === 0) {
      console.log("ℹ️  No hay usuarios para actualizar");
      await dataSource.destroy();
      return;
    }

    // 2. Mostrar vista previa de los cambios
    console.log("Vista previa de cambios:");
    console.log("─".repeat(80));
    usersToUpdate.forEach((user) => {
      const newEmail = user.email.replace("@canalco.com", "@canalcongroup.com");
      console.log(`${user.email} → ${newEmail}`);
    });
    console.log("─".repeat(80));
    console.log();

    // 3. Actualizar los correos
    console.log("🔄 Actualizando correos...\n");

    await userRepository
      .createQueryBuilder()
      .update(User)
      .set({
        email: () => "REPLACE(email, '@canalco.com', '@canalcongroup.com')",
      })
      .where("email LIKE :domain", { domain: "%@canalco.com" })
      .execute();

    console.log("✅ Correos actualizados exitosamente!\n");

    // 4. Verificar los cambios
    const updatedUsers = await userRepository.find({
      order: { email: "ASC" },
    });

    console.log("📋 Usuarios actualizados:");
    console.log("─".repeat(80));
    updatedUsers.forEach((user) => {
      const icon = user.email.includes("@canalcongroup.com") ? "✓" : "✗";
      console.log(`${icon} ${user.email} - ${user.nombre}`);
    });
    console.log("─".repeat(80));

    await dataSource.destroy();
    console.log("\n✅ Proceso completado exitosamente");
  } catch (error) {
    console.error("❌ Error durante la actualización:", error);
    process.exit(1);
  }
}

// Comentado para evitar ejecución automática durante migraciones
// Ejecutar manualmente con: npm run update:emails
// updateEmailDomain();
