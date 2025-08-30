import { Client } from "pg";
import fs from "fs";
import crypto from "crypto";

const dbConfig = {
  user: "admin",
  host: "0.0.0.0",
  database: "clipes_ai",
  password: crypto.randomBytes(12).toString("hex"),
  port: 5432,
};

const updateEnvFile = () => {
  const envContent = `DATABASE_URL=postgresql://${dbConfig.user}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`;
  fs.writeFileSync(".env", envContent);
};

const createDbClient = () => {
  return new Client(dbConfig);
};

const setupDatabase = async () => {
  const client = createDbClient();
  try {
    await client.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS video (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        caminho VARCHAR(255) NOT NULL,
        largura INT NOT NULL,
        altura INT NOT NULL,
        duracao INT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pronto'
      );
    `);
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'user_crud') THEN
          CREATE ROLE user_crud WITH LOGIN PASSWORD '${dbConfig.password}';
          GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO user_crud;
        END IF;
      END $$;
    `);
    console.log("Banco de dados configurado com sucesso!");
  } catch (err) {
    console.error("Erro ao configurar o banco de dados:", err);
  } finally {
    await client.end();
  }
};

updateEnvFile();
setupDatabase();