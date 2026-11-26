CREATE TYPE "status_simulado" AS ENUM ('RASCUNHO', 'VALIDADO', 'PUBLICADO');

ALTER TABLE "simulado"
  ADD COLUMN "status" "status_simulado" NOT NULL DEFAULT 'RASCUNHO',
  ADD COLUMN "relatorio_validacao" JSONB,
  ADD COLUMN "data_validacao" TIMESTAMP(3),
  ADD COLUMN "data_publicacao" TIMESTAMP(3);

CREATE INDEX "simulado_status_idx" ON "simulado"("status");
