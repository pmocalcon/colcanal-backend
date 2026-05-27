import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import * as entities from "./entities";

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        host: configService.get("database.host"),
        port: configService.get("database.port"),
        username: configService.get("database.username"),
        password: configService.get("database.password"),
        database: configService.get("database.database"),
        entities: Object.values(entities),
        synchronize: true, // ⚠️ TEMPORAL - Cambiado a true para crear tablas iniciales
        logging: configService.get("nodeEnv") === "development",
        migrations: [__dirname + "/migrations/**/*{.ts,.js}"],
        migrationsRun: false,
        ssl: ["localhost", "127.0.0.1"].includes(
          configService.get<string>("database.host", "localhost"),
        )
          ? false
          : { rejectUnauthorized: false },
        extra: {
          timezone: "America/Bogota",
          keepAlive: true,
          keepAliveInitialDelayMillis: 10000,
          max: 10,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
        },
      }),
    }),
  ],
})
export class DatabaseModule {}
