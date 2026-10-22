# Mentary question extractor and database

This project extracts questions from text, images, and PDFs with Gemini. PostgreSQL is accessed through Prisma. Redis/BullMQ is not required.

## Connect the Supabase PostgreSQL project

1. In Supabase, open **Connect** and copy the PostgreSQL connection strings. Keep the project password private.
2. In `mentary-ia-extractor`, copy `.env.example` to `.env` if you do not already have one. Preserve existing values such as `GEMINI_API_KEY`.
3. Set:
   - `DATABASE_URL` to the application connection string (the Supabase session pooler is suitable for a persistent Node backend).
   - `DIRECT_URL` to a direct connection for Prisma migrations. If direct IPv6 connectivity is unavailable, use the Supabase session pooler rather than the transaction pooler.
   - URL-encode reserved characters in the database password.
4. Validate the Prisma model and generate its client:

   ```cmd
   npm run db:validate
   npm run db:generate
   ```

5. Test the connection without changing the database:

   ```cmd
   npm run db:check
   ```

The checker reports whether pgvector is enabled. If not, enable it in Supabase's **Database → Extensions** page (or SQL Editor with `CREATE EXTENSION IF NOT EXISTS vector;`) before applying the migration.

## Schema and migrations

`prisma/schema.prisma` models the seven entities from the delivery: Usuario, Documento, Questao, Simulado, ItemSimulado, RespostaSimulado, and PlanoRecomposicaoIa. `Questao.embedding` is an optional `vector(768)` column for Gemini `text-embedding-004`, as specified in the architecture. A cosine HNSW index is added using custom SQL because Prisma does not model that pgvector index definition.

The initial migration is in `prisma/migrations/20261022180000_init/migration.sql`. It creates tables in the `public` schema and enables pgvector. The initial migration has already been applied to the Supabase `main — PRODUCTION` project. Review each later migration and take a database backup before intentionally applying it to production.

Since this is a production project, do not use `prisma migrate dev` against it. After confirming the migration and having a backup, use:

```cmd
npm run db:status
npm run db:deploy
```

For future schema changes, create migrations against a local development PostgreSQL database with `npm run db:migrate`, review and commit the generated migration, then apply the committed migrations with `npm run db:deploy`. If no separate development database is available, do not experiment directly on production.

The schema follows the delivery and now includes a nullable Supabase Auth user link, private Storage object references, and nullable answer/SAEB fields so incomplete AI results can remain drafts. Questions default to `eh_homologada = false`.

The initial migration enables Row Level Security (RLS) on every public table and creates no public access policies. This intentionally denies access through Supabase's `anon` and `authenticated` API roles until the Mentary authentication model and per-user policies are implemented. The trusted Prisma PostgreSQL connection is server-side and must never be exposed to the browser. Do not add permissive `USING (true)` policies as a shortcut.

## Extract questions

Install dependencies with `npm install`, set `GEMINI_API_KEY`, then run:

```cmd
npm run extract
```

The sample test calls Gemini and prints its extracted question JSON. PDFs are rendered page-by-page in small overlapping batches to support scanned pages. Batch size and concurrency are configurable with `PDF_PAGE_BATCH_SIZE`, `PDF_PAGE_OVERLAP`, and `PDF_BATCH_CONCURRENCY`. A 60-page PDF is split into 15 batches by default.

## Authenticated extraction API

Copy `.env.example` to `.env` and configure `GEMINI_API_KEY`, `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. The current private bucket is `mentary-question-assets`; `CORS_ORIGINS` and `PORT` have local development defaults. The `.env.example` file reflects the current API and extraction setup. Keep the service-role key exclusively on the backend.

The backend source is organized under `src/`: route handlers live in `src/routes`, Supabase token validation in `src/middleware`, and database/Storage/extraction logic in `src/lib` and `src/services`. Prisma schema, migrations, and configuration stay at the package root so the Prisma CLI can locate them.

```text
src/
  lib/             Prisma client
  middleware/      Supabase Auth
  routes/          HTTP endpoints
  services/        extraction, Storage, and user operations
  app.ts           Express middleware and route registration
  server.ts        startup, pending-job recovery, and shutdown
scripts/           database diagnostics
tests/             automated tests
prisma/            schema and versioned migrations
```

Start the API from this folder:

```cmd
npm run api
```

It accepts Supabase Auth access tokens in the Authorization header.

- `POST /api/v1/documents` — multipart upload with a `file` field (PDF, PNG, or JPG; max. 25 MB). Returns `202` while extraction runs.
- `GET /api/v1/documents` — lists the authenticated teacher's documents and extracted questions.
- `GET /api/v1/documents/:id` — polls one owned document for status and questions.
- `POST /api/v1/documents/:id/retry` — retries a failed document using its stored file.
- `PATCH /api/v1/questions/:id/approve` — explicitly approves a question after human review.
- `GET /health` — basic process health check.

Poll the document endpoint until status becomes `PROCESSADO` or `ERRO`. If it fails, retry through the retry endpoint. New Auth users receive the `DOCENTE` role; role assignment is not taken from client metadata. The API enforces ownership on Prisma queries. RLS remains enabled for public APIs; Prisma uses a trusted server-side connection.

Extraction jobs run in the Node process and pending documents are resumed on startup. Do not run multiple API replicas without database-backed job claiming. The API does not apply migrations automatically.

The migration at `prisma/migrations/20261023120000_auth_extraction_api/migration.sql` has been applied to the Supabase production project. Review and back up production before applying any future migration.

For collaborator access, local setup, Auth accounts, upload testing, and security guidance, see [GUIA_ACESSO_E_CONTINUIDADE.md](./GUIA_ACESSO_E_CONTINUIDADE.md).

## Security

- `.env` is ignored by Git. Never commit the database password, Supabase service-role key, or Gemini API key.
- Keep database connections and service-role credentials in trusted backend processes only; never place them in browser code.
- Actual processing time depends on file complexity, Gemini quota/availability, and concurrency; the 15-minute target must be measured with representative PDFs.
