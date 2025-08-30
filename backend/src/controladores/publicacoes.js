import { db } from "../db.js";

export async function publicar_corte(req, res) {
  const id = parseInt(req.params.id);
  const corte = await db.corte.findUnique({ where: { id } });
  if (!corte) return res.status(404).json({ erro: "corte não encontrado" });

  // Stub de publicação (integrações reais podem ser adicionadas depois)
  const pub = await db.publicacao.create({
    data: { corteId: id, rede: (req.body?.rede || "instagram"), status: "publicado", url: "https://exemplo/reel/"+id }
  });
  res.json({ ok: true, publicacao: pub });
}

export async function listar_publicacoes(req, res) {
  const { corteId } = req.query;
  const where = corteId ? { corteId: parseInt(corteId) } : {};
  const lista = await db.publicacao.findMany({ where, orderBy: { id: "desc" } });
  res.json(lista);
}
