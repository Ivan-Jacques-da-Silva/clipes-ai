import { db } from "../db.js";

export async function listar_jobs(req, res) {
  const lista = await db.job.findMany({ orderBy: { id: "desc" } });
  res.json(lista);
}
