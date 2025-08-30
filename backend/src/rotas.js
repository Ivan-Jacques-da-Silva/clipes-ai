import { Router } from "express";
import { upload, listar_videos, obter_video, criar_video, detectar_momentos } from "./controladores/videos.js";
import { criar_cortes, listar_cortes, detalhar_corte, renderizar_corte, personalizar_unicidade } from "./controladores/cortes.js";
import { publicar_corte, listar_publicacoes } from "./controladores/publicacoes.js";
import { listar_jobs } from "./controladores/jobs.js";

export const rotas = Router();

// vídeos
rotas.get("/videos", listar_videos);
rotas.get("/videos/:id", obter_video);
rotas.post("/videos", upload.single("arquivo"), criar_video);
rotas.post("/videos/:id/detectar-momentos", detectar_momentos);

// cortes
rotas.get("/cortes", listar_cortes);
rotas.get("/cortes/:id", detalhar_corte);
rotas.post("/cortes", criar_cortes);
rotas.post("/cortes/:id/personalizar", personalizar_unicidade);
rotas.post("/cortes/:id/renderizar", renderizar_corte);

// publicações (stub)
rotas.get("/publicacoes", listar_publicacoes);
rotas.post("/publicacoes/:id/publicar", publicar_corte);

// jobs (stub)
rotas.get("/jobs", listar_jobs);
