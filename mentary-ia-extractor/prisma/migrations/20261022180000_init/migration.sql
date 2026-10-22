-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "papel_usuario" AS ENUM ('DOCENTE', 'GESTOR');

-- CreateEnum
CREATE TYPE "status_processamento" AS ENUM ('PENDENTE', 'PROCESSADO', 'ERRO');

-- CreateEnum
CREATE TYPE "status_plano_recomposicao" AS ENUM ('RASCUNHO_IA', 'APROVADO_DOCENTE');

-- CreateTable
CREATE TABLE "usuario" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nome" VARCHAR NOT NULL,
    "email" VARCHAR NOT NULL,
    "senha_hash" VARCHAR NOT NULL,
    "papel" "papel_usuario" NOT NULL,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documento" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "nome_arquivo" VARCHAR NOT NULL,
    "status_processamento" "status_processamento" NOT NULL DEFAULT 'PENDENTE',

    CONSTRAINT "documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questao" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "documento_id" UUID,
    "enunciado" TEXT NOT NULL,
    "texto_base" TEXT,
    "alternativas" JSONB NOT NULL,
    "gabarito_correto" VARCHAR NOT NULL,
    "descritor_saeb" VARCHAR NOT NULL,
    "eh_homologada" BOOLEAN NOT NULL DEFAULT false,
    "embedding" vector(768),

    CONSTRAINT "questao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulado" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "titulo" VARCHAR NOT NULL,
    "disciplina" VARCHAR NOT NULL,

    CONSTRAINT "simulado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_simulado" (
    "simulado_id" UUID NOT NULL,
    "questao_id" UUID NOT NULL,
    "ordem" INTEGER NOT NULL,

    CONSTRAINT "item_simulado_pkey" PRIMARY KEY ("simulado_id","questao_id")
);

-- CreateTable
CREATE TABLE "resposta_simulado" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "simulado_id" UUID NOT NULL,
    "questao_id" UUID NOT NULL,
    "identificador_aluno" VARCHAR NOT NULL,
    "alternativa_escolhida" VARCHAR NOT NULL,
    "eh_correta" BOOLEAN NOT NULL,

    CONSTRAINT "resposta_simulado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plano_recomposicao_ia" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "turma_identificador" VARCHAR NOT NULL,
    "descritor_foco" VARCHAR NOT NULL,
    "sugestao_texto_ia" TEXT NOT NULL,
    "status" "status_plano_recomposicao" NOT NULL DEFAULT 'RASCUNHO_IA',

    CONSTRAINT "plano_recomposicao_ia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE INDEX "documento_usuario_id_idx" ON "documento"("usuario_id");

-- CreateIndex
CREATE INDEX "questao_documento_id_idx" ON "questao"("documento_id");

-- CreateIndex
CREATE INDEX "questao_descritor_saeb_idx" ON "questao"("descritor_saeb");

-- CreateIndex
CREATE INDEX "simulado_usuario_id_idx" ON "simulado"("usuario_id");

-- CreateIndex
CREATE INDEX "resposta_simulado_simulado_id_identificador_aluno_idx" ON "resposta_simulado"("simulado_id", "identificador_aluno");

-- CreateIndex
CREATE INDEX "resposta_simulado_questao_id_idx" ON "resposta_simulado"("questao_id");

-- CreateIndex
CREATE INDEX "plano_recomposicao_ia_usuario_id_idx" ON "plano_recomposicao_ia"("usuario_id");

-- AddForeignKey
ALTER TABLE "documento" ADD CONSTRAINT "documento_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questao" ADD CONSTRAINT "questao_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "documento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulado" ADD CONSTRAINT "simulado_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_simulado" ADD CONSTRAINT "item_simulado_simulado_id_fkey" FOREIGN KEY ("simulado_id") REFERENCES "simulado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_simulado" ADD CONSTRAINT "item_simulado_questao_id_fkey" FOREIGN KEY ("questao_id") REFERENCES "questao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resposta_simulado" ADD CONSTRAINT "resposta_simulado_simulado_id_fkey" FOREIGN KEY ("simulado_id") REFERENCES "simulado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resposta_simulado" ADD CONSTRAINT "resposta_simulado_questao_id_fkey" FOREIGN KEY ("questao_id") REFERENCES "questao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plano_recomposicao_ia" ADD CONSTRAINT "plano_recomposicao_ia_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Prisma does not yet model pgvector's HNSW index definition.
CREATE INDEX "questao_embedding_hnsw_idx" ON "questao" USING hnsw ("embedding" vector_cosine_ops);

-- Keep the public Supabase APIs closed until authenticated access policies exist.
ALTER TABLE "usuario" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "documento" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "questao" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "simulado" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "item_simulado" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "resposta_simulado" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plano_recomposicao_ia" ENABLE ROW LEVEL SECURITY;
