import path from "path";
import { db } from "../db.js";
import { renderizar_corte_ffmpeg } from "../servicos/ffmpeg.js";
import crypto from "node:crypto";
import fs from "fs";

const pastaRenders = path.join(process.cwd(), "renders");
if (!fs.existsSync(pastaRenders)) fs.mkdirSync(pastaRenders, { recursive: true });

export async function criar_cortes(req, res) {
  const { videoId, marcadores = [] } = req.body || {};
  if (!videoId || !Array.isArray(marcadores) || marcadores.length === 0)
    return res.status(400).json({ erro: "videoId e marcadores obrigatórios" });
  const cs = [];
  for (const mk of marcadores) {
    const novo = await db.corte.create({
      data: {
        videoId,
        ini: mk.ini,
        fim: mk.fim,
        preset: mk.preset || "9x16",
        legendaOn: !!mk.legendaOn,
        overlayOn: mk.overlayOn === false ? false : true,
        status: "pendente"
      }
    });
    cs.push(novo);
  }
  res.json({ ok: true, cortes: cs });
}

export async function detalhar_corte(req, res) {
  const id = parseInt(req.params.id);
  const c = await db.corte.findUnique({ where: { id } });
  if (!c) return res.status(404).json({ erro: "corte não encontrado" });
  res.json(c);
}

export async function personalizar_unicidade(req, res) {
  const id = parseInt(req.params.id);
  const { seed, parametrosUnicidade } = req.body || {};

  const atual = await db.corte.findUnique({ where: { id } });
  if (!atual) return res.status(404).json({ erro: "corte não encontrado" });

  const novoSeed = seed || atual.seed || crypto.randomUUID();
  const jsonTexto = JSON.stringify(parametrosUnicidade || {});

  const c = await db.corte.update({
    where: { id },
    data: { seed: novoSeed, parametrosUnicidade: jsonTexto }
  });
  res.json({ ok: true, corte: c });
}


export async function renderizar_corte(req, res) {
  const id = parseInt(req.params.id);
  const c = await db.corte.findUnique({ where: { id } });
  if (!c) return res.status(404).json({ erro: "corte não encontrado" });
  const v = await db.video.findUnique({ where: { id: c.videoId } });
  if (!v) return res.status(404).json({ erro: "vídeo não encontrado" });

  const nomeSaida = `corte_${id}_${Date.now()}.mp4`;
  const caminhoSaida = path.join("renders", nomeSaida);

  try {
    await db.corte.update({ where: { id }, data: { status: "renderizando" } });
    const variacoes = c.parametrosUnicidade ? JSON.parse(c.parametrosUnicidade) : {};
    await renderizar_corte_ffmpeg({
      entrada: v.caminho,
      saida: caminhoSaida,
      ini: c.ini,
      fim: c.fim,
      preset: c.preset,
      overlayOn: c.overlayOn,
      seed: c.seed || String(id),
      variacoes
    });

    await db.corte.update({
      where: { id },
      data: { status: "pronto", saida: caminhoSaida }
    });
    const r = await db.render.create({
      data: { corteId: id, arquivo: caminhoSaida, status: "pronto" }
    });
    res.json({ ok: true, saida: caminhoSaida, render: r });
  } catch (e) {
    await db.corte.update({ where: { id }, data: { status: "erro" } });
    res.status(500).json({ erro: e.message });
  }
}

export async function listar_cortes(req, res) {
  const { videoId } = req.query;
  const where = videoId ? { videoId: parseInt(videoId) } : {};
  const lista = await db.corte.findMany({ where, orderBy: { id: "desc" } });
  res.json(lista);
}
