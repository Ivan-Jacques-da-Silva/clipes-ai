import { spawn } from "child_process";
import fs from "fs";

export function executar_ffmpeg(args = []) {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", ["-y", ...args], { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", d => { stderr += d.toString(); });
    proc.on("close", code => {
      if (code === 0) resolve({ ok: true, log: stderr });
      else reject(new Error(stderr || `ffmpeg saiu com código ${code}`));
    });
  });
}

export function executar_ffprobe(args = []) {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffprobe", [...args], { stdio: ["ignore", "pipe", "pipe"] });
    let out = "", err = "";
    proc.stdout.on("data", d => out += d.toString());
    proc.stderr.on("data", d => err += d.toString());
    proc.on("close", code => {
      if (code === 0) resolve(out);
      else reject(new Error(err || `ffprobe saiu com código ${code}`));
    });
  });
}

export async function extrair_info_video(caminho) {
  try {
    const out = await executar_ffprobe([
      "-v","error",
      "-select_streams","v:0",
      "-show_entries","stream=width,height:format=duration",
      "-of","json",
      caminho
    ]);
    const json = JSON.parse(out);
    const duracao = parseFloat(json?.format?.duration || "0");
    const width = json?.streams?.[0]?.width || null;
    const height = json?.streams?.[0]?.height || null;
    return { duracao, largura: width, altura: height };
  } catch (e) {
    return { duracao: null, largura: null, altura: null, erro: e.message };
  }
}

export async function detectar_cenas(caminho) {
  // Tenta detecção por mudança de cena. Se falhar, retorna divisões uniformes.
  const cenas = [];
  try {
    const args = [
      "-i", caminho,
      "-vf", "select='gt(scene,0.4)',showinfo",
      "-f", "null", "-"
    ];
    const res = await executar_ffmpeg(args).catch(e => ({ ok:false, log: e.message || "" }));
    const log = res.log || "";
    const regex = /pts_time:([0-9]+\.?[0-9]*)/g;
    let m;
    while ((m = regex.exec(log)) !== null) {
      const t = parseFloat(m[1]);
      if (!Number.isNaN(t)) cenas.push(t);
    }
  } catch (e) {}
  if (cenas.length === 0) {
    // fallback: marca a cada 30s
    const info = await extrair_info_video(caminho);
    const dur = info.duracao || 0;
    for (let t=15; t<dur; t+=30) cenas.push(t);
  }
  // Converte em janelas [t-7, t+8]
  const momentos = cenas.map(t => ({
    ini: Math.max(0, t - 7),
    fim: t + 8,
    score: 0.7,
    tipo: "cena"
  }));
  return momentos;
}

export function montar_filtro_unicidade({ preset="9x16", overlayOn=true, seed="seed", variacoes={} }) {
  // Resoluções destino
  const mapas = { "9x16":[1080,1920], "1x1":[1080,1080], "16x9":[1920,1080] };
  const [tw, th] = mapas[preset] || mapas["9x16"];
  const zoom = (variacoes?.zoom || 1.02);
  const ruido = (variacoes?.ruido || 2);
  const posX = (variacoes?.posX || "w-40");
  const posY = (variacoes?.posY || "h-20");
  const opac = (variacoes?.opacidade || 0.04);
  const filtro = [
    `scale=${tw}:${th}`,
    `scale=iw*${zoom}:ih*${zoom}`,
    `crop=${tw}:${th}`,
    `noise=alls=${ruido}:allf=t+u:seed=${(seed||"seed").replace(/[^0-9a-zA-Z]/g,"").slice(0,8)}`,
  ];
  if (overlayOn) {
    const texto = `ID:${(seed||"").slice(0,8)}`;
    filtro.push(`drawtext=text='${texto}':x=${posX}:y=${posY}:fontcolor=white@${opac}:fontsize=10:shadowcolor=black@${opac}:shadowx=1:shadowy=1`);
  }
  return filtro.join(",");
}

export async function renderizar_corte_ffmpeg({ entrada, saida, ini, fim, preset, overlayOn, seed, variacoes }) {
  const filtro = montar_filtro_unicidade({ preset, overlayOn, seed, variacoes });
  const dur = Math.max(0, fim - ini);
  const args = [
    "-ss", `${ini.toFixed(3)}`,
    "-i", entrada,
    "-t", `${dur.toFixed(3)}`,
    "-vf", filtro,
    "-c:v","libx264","-crf","18","-preset","medium","-pix_fmt","yuv420p",
    "-c:a","aac","-b:a","192k",
    saida
  ];
  return executar_ffmpeg(args);
}
