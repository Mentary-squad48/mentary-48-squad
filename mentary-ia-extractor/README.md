# Extrator de questões e banco de dados Mentary

Este projeto extrai questões de textos, imagens e PDFs usando o Gemini. O PostgreSQL é acessado pelo Prisma. Redis/BullMQ não é necessário.

## Conectar ao PostgreSQL do Supabase

1. No Supabase, abra **Connect** e copie as URLs de conexão PostgreSQL. Mantenha a senha do projeto em segurança.
2. Na pasta `mentary-ia-extractor`, copie `.env.example` para `.env`, se ainda não tiver esse arquivo. Preserve valores já configurados, como `GEMINI_API_KEY`.
3. Configure:
   - `DATABASE_URL` com a URL de conexão da aplicação. O pooler de sessão do Supabase é adequado para um backend Node persistente.
   - `DIRECT_URL` com uma conexão direta para as migrações Prisma. Se a conexão direta não funcionar por falta de suporte a IPv6, use o pooler de sessão do Supabase, não o pooler de transação.
   - Codifique em URL os caracteres reservados que existirem na senha do banco.
4. Valide o modelo Prisma e gere o cliente:

   ```cmd
   npm run db:validate
   npm run db:generate
   ```

5. Teste a conexão sem alterar o banco:

   ```cmd
   npm run db:check
   ```

O verificador informa se o `pgvector` está habilitado. Se não estiver, habilite-o em **Database → Extensions** no Supabase (ou no SQL Editor com `CREATE EXTENSION IF NOT EXISTS vector;`) antes de aplicar uma migração que dependa da extensão.

## Esquema e migrações

`prisma/schema.prisma` modela as sete entidades da entrega: Usuario, Documento, Questao, Simulado, ItemSimulado, RespostaSimulado e PlanoRecomposicaoIa. `Questao.embedding` é uma coluna opcional `vector(768)` para o `text-embedding-004` do Gemini, conforme a arquitetura. Um índice HNSW de cosseno é criado por SQL personalizado, porque o Prisma ainda não representa essa definição de índice pgvector.

A migração inicial está em `prisma/migrations/20261022180000_init/migration.sql`. Ela cria as tabelas no esquema `public` e habilita o pgvector. Essa migração já foi aplicada ao projeto Supabase `main — PRODUCTION`. Revise toda nova migração e faça backup do banco antes de aplicá-la intencionalmente em produção.

Como esse é um projeto de produção, não use `prisma migrate dev` nele. Depois de confirmar a migração e fazer backup, use:

```cmd
npm run db:status
npm run db:deploy
```

Para futuras alterações, crie migrações em um PostgreSQL local/de desenvolvimento usando `npm run db:migrate`, revise e registre a migração no Git e, depois, aplique as migrações aprovadas com `npm run db:deploy`. Se não houver um banco separado para desenvolvimento, não faça experimentos diretamente em produção.

O esquema segue a entrega e agora inclui a referência opcional ao usuário do Supabase Auth, referências aos objetos privados do Storage e campos opcionais de resposta e SAEB, para que resultados incompletos da IA possam permanecer como rascunhos. Questões começam com `eh_homologada = false`.

A migração inicial habilita Row Level Security (RLS) em todas as tabelas públicas e não cria políticas de acesso público. Isso bloqueia intencionalmente o acesso pelas funções `anon` e `authenticated` do Supabase até que a autenticação Mentary e as políticas por usuário sejam implementadas. A conexão PostgreSQL confiável do Prisma é exclusiva do servidor e nunca deve ser exposta no navegador. Não adicione políticas permissivas com `USING (true)` como atalho.

## Extrair questões

Instale as dependências com `npm install`, configure `GEMINI_API_KEY` e execute:

```cmd
npm run extract
```

O teste de exemplo chama o Gemini e imprime o JSON das questões extraídas. PDFs são renderizados página a página em pequenos lotes sobrepostos para dar suporte a páginas digitalizadas. O tamanho dos lotes e a concorrência podem ser configurados com `PDF_PAGE_BATCH_SIZE`, `PDF_PAGE_OVERLAP` e `PDF_BATCH_CONCURRENCY`. Por padrão, um PDF de 60 páginas é dividido em 15 lotes.

## API de extração autenticada

Copie `.env.example` para `.env` e configure `GEMINI_API_KEY`, `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`. O bucket privado atual é `mentary-question-assets`; `CORS_ORIGINS` e `PORT` já têm valores padrão para desenvolvimento local. O arquivo `.env.example` corresponde à API e ao fluxo de extração atuais. Mantenha a chave `service_role` somente no backend.

O código do backend está organizado em `src/`: as rotas ficam em `src/routes`, a validação dos tokens Supabase em `src/middleware`, e a lógica do banco, Storage e extração em `src/lib` e `src/services`. O esquema, as migrações e a configuração Prisma permanecem na raiz do pacote para que a CLI do Prisma os encontre.

```text
src/
  lib/             cliente Prisma
  middleware/      autenticação Supabase Auth
  routes/          rotas HTTP
  services/        extração, Storage e operações de usuário
  app.ts           middlewares e registro de rotas Express
  server.ts        inicialização, retomada de tarefas e encerramento
scripts/           diagnóstico do banco
tests/             testes automatizados
prisma/            esquema e migrações versionadas
```

Inicie a API a partir desta pasta:

```cmd
npm run api
```

A API aceita tokens de acesso do Supabase Auth no cabeçalho `Authorization`.

- `POST /api/v1/documents` — envia um arquivo multipart no campo `file` (PDF, PNG ou JPG; máximo de 25 MB). Retorna `202` enquanto a extração é executada.
- `GET /api/v1/documents` — lista os documentos e as questões extraídas do usuário autenticado.
- `GET /api/v1/documents/:id` — consulta o estado e as questões de um documento pertencente ao usuário.
- `POST /api/v1/documents/:id/retry` — tenta processar novamente um documento com falha usando o arquivo armazenado.
- `PATCH /api/v1/questions/:id/approve` — aprova explicitamente uma questão após revisão humana.
- `GET /health` — verifica se o processo da API está ativo.

Consulte o endpoint do documento até o estado mudar para `PROCESSADO` ou `ERRO`. Se houver falha, tente novamente pela rota de retry. Novas contas Auth recebem o papel `DOCENTE`; a API não aceita a atribuição de papel por metadados enviados pelo cliente. As consultas Prisma são filtradas pela propriedade do usuário. O RLS continua habilitado para as APIs públicas do Supabase; o Prisma usa uma conexão confiável exclusiva do servidor.

As tarefas de extração são executadas no processo Node, e documentos pendentes são retomados quando o servidor inicia. Não execute várias instâncias da API sem implementar uma forma de reservar as tarefas no banco. A API não aplica migrações automaticamente.

A migração `prisma/migrations/20261023120000_auth_extraction_api/migration.sql` já foi aplicada ao projeto Supabase de produção. Revise e faça backup de produção antes de aplicar qualquer migração futura.

## Publicar a API no Render

O pacote inclui uma compilação de produção (`npm run build`) e um comando para iniciar (`npm start`). Antes de publicar, registre as alterações no Git e envie-as para a branch que o Render usará.

Crie um serviço **Node Web Service** com:

- Diretório raiz: `mentary-ia-extractor`
- Comando de compilação: `npm ci --include=dev && npm run build`
- Comando de início: `npm start`
- Caminho de verificação de integridade: `/health`

Configure as credenciais como variáveis de ambiente do serviço Render, não no Git: `GEMINI_API_KEY`, `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_BUCKET`. Configure `CORS_ORIGINS` com a origem exata do front-end quando ele existir. O Render fornece `PORT`; não defina a porta diretamente no código. Não configure `NODE_ENV=production` durante a compilação se isso fizer o npm omitir as ferramentas de desenvolvimento necessárias para compilar.

Não execute migrações do banco durante a compilação ou a inicialização. Atualmente, a API processa extrações no próprio processo Node; use apenas uma instância e considere o plano gratuito como uma opção de teste, não como garantia de processamento em segundo plano, pois o serviço pode suspender. Uma implantação confiável com várias instâncias exige reserva/fila persistente de tarefas no banco e dimensionamento adequado dos recursos.

Para acesso dos desenvolvedores, configuração local, testes Auth e upload, além de orientações de segurança, consulte [GUIA_ACESSO_E_CONTINUIDADE.md](./GUIA_ACESSO_E_CONTINUIDADE.md).

## Segurança

- `.env` é ignorado pelo Git. Nunca registre no Git a senha do banco, a chave de serviço do Supabase ou a chave de API do Gemini.
- Mantenha conexões de banco e credenciais `service_role` somente em processos confiáveis do backend; nunca as coloque no código do navegador.
- O tempo real de processamento depende da complexidade do arquivo, da cota/disponibilidade do Gemini e da concorrência. A meta de 15 minutos precisa ser medida com PDFs representativos.
