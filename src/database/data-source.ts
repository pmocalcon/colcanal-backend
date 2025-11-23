import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import * as entities from './entities';

config();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'canalco',
  password: process.env.DB_PASSWORD || 'canalco',
  database: process.env.DB_DATABASE || 'canalco',
  entities: Object.values(entities),
  migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
  synchronize: true, // ⚠️ TEMPORAL - Cambiado a true para crear tablas iniciales
  logging: process.env.NODE_ENV === 'development',
  cache: {
    type: 'database',
    tableName: 'typeorm_query_cache',
    duration: 86400000, // 24 horas (estados de catálogo no cambian frecuentemente)
  },
  ssl: process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1'
    ? { rejectUnauthorized: false }
    : false,
  extra: {
    // Configurar zona horaria de Colombia en PostgreSQL
    timezone: 'America/Bogota',
  },
};

const dataSource = new DataSource(dataSourceOptions);

export default dataSource;
