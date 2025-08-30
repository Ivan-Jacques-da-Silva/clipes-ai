-- CreateTable
CREATE TABLE "Video" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "caminho" TEXT NOT NULL,
    "largura" INTEGER,
    "altura" INTEGER,
    "duracao" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'pronto',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Momento" (
    "id" SERIAL NOT NULL,
    "videoId" INTEGER NOT NULL,
    "ini" DOUBLE PRECISION NOT NULL,
    "fim" DOUBLE PRECISION NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "tipo" TEXT NOT NULL,
    "palavras" TEXT,

    CONSTRAINT "Momento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Corte" (
    "id" SERIAL NOT NULL,
    "videoId" INTEGER NOT NULL,
    "ini" DOUBLE PRECISION NOT NULL,
    "fim" DOUBLE PRECISION NOT NULL,
    "preset" TEXT NOT NULL DEFAULT '9x16',
    "legendaOn" BOOLEAN NOT NULL DEFAULT false,
    "overlayOn" BOOLEAN NOT NULL DEFAULT true,
    "seed" TEXT,
    "parametrosUnicidade" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "saida" TEXT,

    CONSTRAINT "Corte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Render" (
    "id" SERIAL NOT NULL,
    "corteId" INTEGER NOT NULL,
    "arquivo" TEXT,
    "hashPerceptual" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "log" TEXT,

    CONSTRAINT "Render_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Publicacao" (
    "id" SERIAL NOT NULL,
    "corteId" INTEGER NOT NULL,
    "rede" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "url" TEXT,

    CONSTRAINT "Publicacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "refId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "progresso" INTEGER NOT NULL DEFAULT 0,
    "log" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transcricao" (
    "id" SERIAL NOT NULL,
    "videoId" INTEGER NOT NULL,
    "texto" TEXT NOT NULL,
    "trechos" JSONB,

    CONSTRAINT "Transcricao_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Momento" ADD CONSTRAINT "Momento_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Corte" ADD CONSTRAINT "Corte_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Render" ADD CONSTRAINT "Render_corteId_fkey" FOREIGN KEY ("corteId") REFERENCES "Corte"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Publicacao" ADD CONSTRAINT "Publicacao_corteId_fkey" FOREIGN KEY ("corteId") REFERENCES "Corte"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transcricao" ADD CONSTRAINT "Transcricao_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
