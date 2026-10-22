ALTER TABLE "usuario"
  ALTER COLUMN "senha_hash" DROP NOT NULL,
  ADD COLUMN "auth_user_id" UUID;

CREATE UNIQUE INDEX "usuario_auth_user_id_key" ON "usuario"("auth_user_id");

ALTER TABLE "documento"
  ADD COLUMN "storage_bucket" VARCHAR,
  ADD COLUMN "storage_path" VARCHAR,
  ADD COLUMN "content_type" VARCHAR;

ALTER TABLE "questao"
  ALTER COLUMN "gabarito_correto" DROP NOT NULL,
  ALTER COLUMN "descritor_saeb" DROP NOT NULL,
  ADD COLUMN "explicacao" TEXT,
  ADD COLUMN "componente_curricular" VARCHAR,
  ADD COLUMN "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb;
