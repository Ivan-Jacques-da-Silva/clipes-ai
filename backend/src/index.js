import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { rotas } from "./rotas.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json({ limit: "25mb" }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// estáticos para acessar vídeos e renders no frontend
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));
app.use("/renders", express.static(path.join(__dirname, "..", "renders")));

// rotas API
app.use("/api", rotas);

const porta = process.env.PORT || 3001;
app.listen(porta, () => console.log("API ouvindo na porta", porta));
