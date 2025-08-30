import fs from "fs";
import path from "path";
import multer from "multer";
import { db } from "../db.js";
import { extrair_info_video, detectar_cenas } from "../servicos/ffmpeg.js";

const pastaUploads = path.join(process.cwd(), "uploads");
if (!fs.existsSync(pastaUploads)) fs.mkdirSync(pastaUploads, { recursive: true });

const armazenamento = multer.diskStorage({
  destination: (req, file, cb) => cb(null, pastaUploads),
  filename: (req, file, cb) => {
    const base = path.parse(file.originalname).name.replace(/[^a-z0-9-_]/gi,"_");
    const ext = path.extname(file.originalname) || ".mp4";
    const nome = `${Date.now()}_${base}${ext}`;
    cb(null, nome);
  }
});
export const upload = multer({ storage: armazenamento });

export async function listar_videos(req, res) {
  const lista = await db.video.findMany({ orderBy: { id: "desc" } });
  res.json(lista);
}

export async function obter_video(req, res) {
  const id = parseInt(req.params.id);
  const v = await db.video.findUnique({ where: { id }, include: { momentos: true, cortes: true } });
  if (!v) return res.status(404).json({ erro: "vídeo não encontrado" });
  res.json(v);
}

export async function criar_video(req, res) {
  const arquivo = req.file;
  if (!arquivo) return res.status(400).json({ erro: "arquivo obrigatório" });
  const caminho = path.join("uploads", arquivo.filename);
  const info = await extrair_info_video(caminho);
  const novo = await db.video.create({
    data: {
      nome: arquivo.originalname,
      caminho,
      largura: info.largura,
      altura: info.altura,
      duracao: info.duracao,
      status: "pronto"
    }
  });
  res.json(novo);
}

export async function detectar_momentos(req, res) {
  const id = parseInt(req.params.id);
  const v = await db.video.findUnique({ where: { id } });
  if (!v) return res.status(404).json({ erro: "vídeo não encontrado" });
  const momentos = await detectar_cenas(v.caminho);
  // salva sugestões
  for (const m of momentos) {
    await db.momento.create({
      data: {
        videoId: id,
        ini: m.ini,
        fim: m.fim,
        score: m.score,
        tipo: m.tipo,
        palavras: ""
      }
    });
  }
  const atual = await db.video.findUnique({ where: { id }, include: { momentos: true } });
  res.json({ ok: true, momentos: atual.momentos });
}
