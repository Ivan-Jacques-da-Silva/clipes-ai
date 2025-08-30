// backend/src/setup.js  (pode ser scripts/setup-db.js)
import fs from "fs";
import { Client } from "pg";
import { spawn } from "node:child_process";

const SUPER_USER  = process.env.PG_SUPER_USER || "postgres";
const SUPER_SENHA = process.env.PG_SUPER_PASS || "admin";
const HOST        = process.env.PG_HOST || "127.0.0.1";
const PORTA       = parseInt(process.env.PG_PORT || "5432", 10);

const NOME_BANCO  = process.env.APP_DB_NAME || "clipes_ai";
const USUARIO_APP = process.env.APP_DB_USER || "clipes_user";
const SENHA_APP   = process.env.APP_DB_PASS || "admin";

const log = (...x) => console.log("[setup-db]", ...x);
const rodar = (cmd, args=[]) => new Promise((resolve, reject)=>{
  log("rodando:", cmd, args.join(" "));
  const p = spawn(cmd, args, { stdio:"inherit", shell: process.platform === "win32" });
  p.on("close", c => c===0 ? resolve() : reject(new Error(`${cmd} saiu com código ${c}`)));
});

const escapeLiteral = (s) => String(s).replace(/'/g, "''");             // ' -> ''
const identOk = (s) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(String(s));
const ident = (s) => { if(!identOk(s)) throw new Error("Ident inválido: "+s); return s; };

async function conectar(database="postgres"){
  const c = new Client({ user: SUPER_USER, password: SUPER_SENHA, host: HOST, port: PORTA, database });
  await c.connect();
  return c;
}

async function encerrarConexoesBanco(superClient, banco){
  await superClient.query(
    `SELECT pg_terminate_backend(pid)
     FROM pg_stat_activity
     WHERE datname = $1 AND pid <> pg_backend_pid()`, [banco]
  ).catch(()=>{});
}

async function droparBancoSeExistir(superClient){
  const { rows } = await superClient.query("SELECT 1 FROM pg_database WHERE datname=$1",[NOME_BANCO]);
  if(rows.length){
    log("encerrando conexões…");
    await encerrarConexoesBanco(superClient, NOME_BANCO);
    log("DROP DATABASE", NOME_BANCO);
    await superClient.query(`DROP DATABASE ${ident(NOME_BANCO)}`);
  }
}

async function droparRoleSeExistir(superClient){
  const { rows } = await superClient.query("SELECT 1 FROM pg_roles WHERE rolname=$1",[USUARIO_APP]);
  if(rows.length){
    log("REVOKE privilégios…");
    // evita dependências
    await superClient.query(`REASSIGN OWNED BY ${ident(USUARIO_APP)} TO ${ident(SUPER_USER)}`).catch(()=>{});
    await superClient.query(`DROP OWNED BY ${ident(USUARIO_APP)}`).catch(()=>{});
    log("DROP ROLE", USUARIO_APP);
    await superClient.query(`DROP ROLE ${ident(USUARIO_APP)}`);
  }
}

async function criarRole(superClient){
  const pass = escapeLiteral(SENHA_APP);
  await superClient.query(`CREATE ROLE ${ident(USUARIO_APP)} WITH LOGIN PASSWORD '${pass}'`);
}

async function criarBanco(superClient){
  // já cria com owner = usuário do app
  await superClient.query(`CREATE DATABASE ${ident(NOME_BANCO)} OWNER ${ident(USUARIO_APP)}`);
}

async function concederPermissoes(){
  const app = await conectar(NOME_BANCO);
  await app.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`).catch(()=>{});
  await app.query(`GRANT ALL PRIVILEGES ON DATABASE ${ident(NOME_BANCO)} TO ${ident(USUARIO_APP)};`);
  await app.query(`GRANT USAGE, CREATE ON SCHEMA public TO ${ident(USUARIO_APP)};`);
  await app.query(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${ident(USUARIO_APP)};`);
  await app.query(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${ident(USUARIO_APP)};`);
  await app.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${ident(USUARIO_APP)};`);
  await app.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${ident(USUARIO_APP)};`);
  await app.end();
}

function escreverEnv(){
  const dbUrl = `postgresql://${USUARIO_APP}:${encodeURIComponent(SENHA_APP)}@${HOST}:${PORTA}/${NOME_BANCO}`;
  const shadowUrl = `postgresql://${SUPER_USER}:${encodeURIComponent(SUPER_SENHA)}@${HOST}:${PORTA}/postgres`;
  fs.writeFileSync(".env", `DATABASE_URL=${dbUrl}\nSHADOW_DATABASE_URL=${shadowUrl}\nPORT=3001\n`);
  log("`.env` gravado.");
}

async function main(){
  log("reset TOTAL iniciando…");
  const superClient = await conectar("postgres");

  await droparBancoSeExistir(superClient);
  await droparRoleSeExistir(superClient);
  await criarRole(superClient);
  await criarBanco(superClient);
  await superClient.end();

  await concederPermissoes();
  escreverEnv();

  // Prisma (usa shadowDatabaseUrl pra não precisar CREATEDB no usuário do app)
  await rodar("npx", ["prisma", "generate"]);
  await rodar("npx", ["prisma", "migrate", "dev", "--name", "init"]);

  log("reset + setup concluído ✅");
}

main().catch(e=>{ console.error("[setup-db] erro:", e); process.exit(1); });
