CREATE TYPE "status_questao" AS ENUM ('PENDENTE', 'HOMOLOGADA', 'REJEITADA');

ALTER TABLE "questao"
  ADD COLUMN "status" "status_questao" NOT NULL DEFAULT 'PENDENTE',
  ADD COLUMN "validador_id" UUID,
  ADD COLUMN "data_validacao" TIMESTAMP(3),
  ADD COLUMN "motivo_rejeicao" TEXT;

UPDATE "questao"
SET "status" = 'HOMOLOGADA'
WHERE "eh_homologada" = TRUE;

ALTER TABLE "questao"
  ADD CONSTRAINT "questao_validador_id_fkey"
  FOREIGN KEY ("validador_id") REFERENCES "usuario"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "questao_status_idx" ON "questao"("status");
