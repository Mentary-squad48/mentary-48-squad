# Mentary: guia técnico para desenvolvedores

Este guia registra o estado técnico atual e orienta desenvolvedores autorizados a configurar e testar o backend. O projeto Supabase compartilhado está marcado como **PRODUCTION**; alterações no banco e permissões exigem cuidado.

## O que já foi feito e testado

- PostgreSQL do Supabase configurado para o Prisma; extensão `pgvector` 0.8.2 confirmada.
- As migrações inicial e de integração Auth/extrator foram aplicadas. O status do Prisma foi confirmado como atualizado.
- Criado o bucket privado `mentary-question-assets` no Supabase Storage.
- API Express implementada para validar tokens Supabase Auth, associar identidades autenticadas ao modelo de usuário, receber arquivos e filtrar documentos pelo proprietário. O código está separado entre `src/routes`, `src/middleware`, `src/services` e `src/lib`.
- Uma imagem real foi enviada e processada pelo Gemini. O documento terminou como `PROCESSADO` e a questão foi salva como rascunho (`ehHomologada: false`).
- O gabarito e o descritor SAEB dessa extração ficaram vazios (`null`), então ainda precisam de revisão humana.
- Testes do extrator, validação do schema Prisma, geração do cliente e verificação TypeScript passaram.

## Limites atuais

- Ainda não existe uma interface web de login, envio e revisão. O teste foi feito por PowerShell/cURL.
- A API foi executada localmente em `http://localhost:3000`. Isso não a publica na internet: outras pessoas em outros computadores não conseguem usar o seu `localhost`. Para acesso remoto, será necessário hospedar a API em um servidor confiável e configurar HTTPS, variáveis secretas e regras de rede.
- O pacote agora tem build e início de produção (`npm run build` e `npm start`), verificados localmente; a API ainda não está hospedada.
- O processamento em segundo plano roda dentro do processo Node. Não rode múltiplas réplicas da API sem adicionar um mecanismo de reserva de tarefas no banco.
- A API permite aprovar questões, mas ainda não oferece uma rota para editar o enunciado, alternativas e gabarito antes da aprovação.
- O Supabase Auth e o acesso ao dashboard são coisas diferentes: convite de membro do projeto não cria automaticamente uma identidade de teste no Auth.

## Acesso dos desenvolvedores ao projeto Supabase

Cada desenvolvedor que precisar administrar o dashboard deve usar a **própria conta Supabase**. Não compartilhe login, senha, códigos de recuperação ou sessões.

1. O responsável pela organização entra no Supabase.
2. Nas configurações da organização, procure **Members**, **Team** ou **Access Control** (os nomes podem variar).
3. Convide o e-mail corporativo/do desenvolvedor e atribua o menor papel compatível com a tarefa. Prefira leitura para consulta; conceda privilégios de desenvolvimento ou administração apenas quando necessários.
4. Se a equipe administrar membros nas configurações do projeto, selecione o papel apropriado e envie o convite.
5. O desenvolvedor aceita o convite usando a própria conta. O acesso ao dashboard e o acesso ao repositório GitHub são concedidos separadamente.

**Importante:** o projeto é de produção. Não conceda acesso de Owner, senha PostgreSQL ou chave `service_role` só para alguém testar o código. Desenvolvedores que não precisem administrar produção devem usar um ambiente Supabase de desenvolvimento separado, com credenciais próprias. Nunca envie segredos em mensagens, commits ou arquivos compartilhados.

## Identidade Auth para testes de desenvolvimento

As rotas protegidas exigem um token Supabase Auth. Para testar localmente, um desenvolvedor autorizado pode usar uma identidade de teste no projeto de desenvolvimento:

1. No projeto Supabase de desenvolvimento, abra **Authentication → Users**.
2. Crie uma conta de teste com e-mail controlado pela equipe e confirme-a conforme a configuração Auth.
3. Use as credenciais dessa conta somente para obter um token durante o teste das rotas. A senha Supabase Auth não é a senha do banco.

A primeira chamada autenticada cria ou vincula o registro correspondente no modelo `usuario`. Não use uma conta real de integrante da equipe em produção para testes de integração. A API não confia em papéis enviados nos metadados do cliente.

## Preparar o ambiente local de desenvolvimento

Requisitos: Git, Node.js/npm compatíveis com o projeto e acesso aprovado às credenciais necessárias. O ambiente Python `.venv` não é usado para iniciar esta API.

1. Obtenha acesso de leitura/escrita ao repositório pelo GitHub, com sua própria conta.
2. Abra um terminal na pasta `mentary-ia-extractor`:

   ```powershell
   cd C:\caminho\para\demo-repository\mentary-ia-extractor
   npm install
   ```

3. Copie `.env.example` para `.env`, sem apagar valores que já existam:

   ```powershell
   Copy-Item .env.example .env
   ```

4. Preencha o `.env` local usando credenciais do ambiente de desenvolvimento. Obtenha `SUPABASE_URL` e a chave pública nas configurações do projeto Supabase; obtenha as credenciais PostgreSQL pelo botão **Connect**. A chave Gemini vem do Google AI Studio e deve ser disponibilizada conforme a política de segredos da equipe.

   ```env
   GEMINI_API_KEY=
   GEMINI_MODEL=gemini-3.8-flash
   DATABASE_URL=
   DIRECT_URL=
   SUPABASE_URL=
   SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   SUPABASE_BUCKET=mentary-question-assets
   CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
   PORT=3000
   ```

   Preencha os valores localmente; não copie credenciais de produção para a máquina de desenvolvimento sem autorização expressa. Nunca cole o conteúdo do `.env` em chat, issue ou commit. O `.env` não deve ser versionado. Entregue credenciais por um gerenciador de segredos aprovado; não use um arquivo `.env` compartilhado no Git.

5. `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` e `DIRECT_URL` são credenciais privilegiadas. Só desenvolvedores autorizados a executar um backend confiável devem recebê-las para o ambiente de desenvolvimento. Nunca as coloque no navegador ou em um aplicativo cliente.
6. Use `DATABASE_URL` e `DIRECT_URL` de acordo com o README principal. A conexão Prisma deve permanecer somente no servidor. Não configure um cliente web com a conexão do banco.
7. O bucket precisa continuar **privado**. Não recrie nem torne público o bucket existente.
8. Verifique a configuração. `db:check` e `db:status` conectam ao banco configurado no `.env`; rode-os apenas se esse destino for o ambiente de desenvolvimento autorizado. Esses comandos não aplicam migrações:

   ```powershell
   npm run db:validate
   npm run db:generate
   npm run db:check
   npm run db:status
   ```

   Em um ambiente atualizado, o status esperado é `Database schema is up to date!`.

9. Inicie a API:

   ```powershell
   npm run api
   ```

   Deixe esse terminal aberto. Em outro terminal, teste:

   ```powershell
   curl.exe http://localhost:3000/health
   ```

   A resposta esperada é `{"status":"ok"}`. A raiz `http://localhost:3000/` não é uma página web e pode responder `Cannot GET /`.

## Testar rotas autenticadas localmente

É necessário ter uma identidade Supabase Auth de teste confirmada no projeto de desenvolvimento e uma chave pública no `.env`. No PowerShell, a partir da pasta `mentary-ia-extractor`, use o script abaixo. Ele pede a senha sem exibi-la e guarda o token apenas na sessão atual do terminal:

```powershell
$envValues = @{}
Get-Content .env | ForEach-Object {
  if ($_ -match '^([A-Za-z_][A-Za-z0-9_]*)=(.*)$') {
    $envValues[$Matches[1]] = $Matches[2]
  }
}

$email = Read-Host "E-mail do Supabase Auth"
$securePassword = Read-Host "Senha de Supabase Auth" -AsSecureString
$password = (New-Object System.Net.NetworkCredential("", $securePassword)).Password

$session = Invoke-RestMethod `
  -Method Post `
  -Uri "$($envValues['SUPABASE_URL'])/auth/v1/token?grant_type=password" `
  -Headers @{ apikey = $envValues['SUPABASE_ANON_KEY'] } `
  -ContentType "application/json" `
  -Body (@{ email = $email; password = $password } | ConvertTo-Json)

$token = $session.access_token
Remove-Variable password, securePassword
```

Use um arquivo local real de PDF, PNG ou JPG (limite: 25 MB):

```powershell
$arquivo = "C:\caminho\real\para\avaliacao.pdf"
Test-Path -LiteralPath $arquivo

curl.exe -X POST "http://localhost:3000/api/v1/documents" `
  -H "Authorization: Bearer $token" `
  -F "file=@$arquivo"
```

Uma resposta `202` com o documento indica que o upload foi aceito. Consulte o estado e o resultado:

```powershell
$id = "UUID retornado no upload"
curl.exe "http://localhost:3000/api/v1/documents/$id" `
  -H "Authorization: Bearer $token"
```

Os estados são `PENDENTE`, `PROCESSADO` e `ERRO`. Se ocorrer erro, verifique o terminal da API; um documento em erro pode ser reenviado para processamento sem novo upload:

```powershell
curl.exe -X POST "http://localhost:3000/api/v1/documents/$id/retry" `
  -H "Authorization: Bearer $token"
```

Rotas disponíveis:

| Método e rota | Uso |
|---|---|
| `GET /health` | Verificar se a API local está ativa. |
| `POST /api/v1/documents` | Enviar um arquivo multipart no campo `file`. |
| `GET /api/v1/documents` | Listar somente documentos do usuário autenticado. |
| `GET /api/v1/documents/:id` | Consultar estado e questões de um documento próprio. |
| `POST /api/v1/documents/:id/retry` | Tentar novamente um processamento com falha, do próprio usuário. |
| `PATCH /api/v1/questions/:id/approve` | Aprovar uma questão própria após revisão humana. |

Não compartilhe `$token`, senha, saída de login ou capturas da barra de endereço que contenham token. Feche a sessão ou revogue-a no Supabase se um token for exposto. Quando fechar o PowerShell, autentique novamente para obter outro token.

## Banco de produção e migrações

O projeto Supabase está marcado como **PRODUCTION**. As duas migrações existentes já foram aplicadas e o status foi confirmado como atualizado. Não execute `npm run db:migrate` contra o banco de produção.

Antes de qualquer alteração futura:

1. faça backup e obtenha aprovação do responsável pelo projeto;
2. crie e revise a migração em um banco local/de desenvolvimento;
3. valide a migração e confirme o destino de `DIRECT_URL`;
4. só então use `npm run db:deploy` intencionalmente.

O servidor da API nunca executa migrações automaticamente. As consultas Prisma da API são feitas com credencial de servidor privilegiada; a aplicação filtra pelo proprietário, mas RLS não substitui validação e autorização cuidadosas no backend.

## Publicar a API no Render

Os comandos de produção estão configurados no pacote:

- `npm run api` inicia o servidor TypeScript para desenvolvimento local.
- `npm run build` gera o cliente Prisma e compila o backend para `dist/`.
- `npm start` inicia `dist/src/server.js`, sem depender de `tsx` em tempo de execução.

Valide antes de publicar:

```powershell
npm run build
npm run typecheck
npm test
```

### Enviar a mudança pelo fluxo da equipe

Não envie alterações diretamente para `develop` ou `main`. Partindo de `develop`, crie uma branch para a configuração de produção. Na raiz do repositório:

```powershell
git switch develop
git pull origin develop
git switch -c feature/us01-render-deploy-config
git add mentary-ia-extractor\package.json mentary-ia-extractor\tsconfig.build.json mentary-ia-extractor\src\server.ts mentary-ia-extractor\README.md mentary-ia-extractor\GUIA_ACESSO_E_CONTINUIDADE.md
git diff --cached --check
git status --short
```

Confira a lista preparada para commit: não deve conter `.env`, `node_modules/` ou `generated/`. Se estiver correta:

```powershell
git commit -m "Configura build de produção para API no Render" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
git push -u origin feature/us01-render-deploy-config
```

Abra um Pull Request de `feature/us01-render-deploy-config` para `develop`. Aguarde a revisão e a integração do PR antes de usar essa versão no Render. Depois da integração, atualize a branch `develop` no Render se necessário.

### Configurar o serviço Render

Crie um serviço **Node Web Service** conectado ao repositório que contém `mentary-ia-extractor`. Use a branch `develop` depois que o PR acima estiver integrado e configure:

- Name: um nome único para a API, por exemplo `mentary-48-squad-api`.
- Language: `Node`.
- Branch: `develop`.
- Root Directory: `mentary-ia-extractor`
- Build Command: `npm ci --include=dev && npm run build`
- Start Command: `npm start`
- Health Check Path: `/health`
- Instance count: `1`.

O deploy do Render pode ter custo. Confira o preço exibido no painel e obtenha aprovação da equipe antes de criar um serviço pago.

Adicione as variáveis diretamente nas configurações de ambiente do serviço Render. Use valores fornecidos por um responsável autorizado, sem copiá-los para o Git:

| Variável | Uso |
|---|---|
| `GEMINI_API_KEY` | Chave do Gemini para extração. |
| `DATABASE_URL` | Conexão PostgreSQL da API. |
| `DIRECT_URL` | Conexão usada pela CLI do Prisma; não é necessária no runtime, mas pode ser cadastrada para operações administrativas. |
| `SUPABASE_URL` | URL do projeto Supabase. |
| `SUPABASE_ANON_KEY` | Chave pública usada para validar sessões Auth. |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave privilegiada usada pelo backend para o bucket privado; nunca expor ao frontend. |
| `SUPABASE_BUCKET` | Nome do bucket privado, atualmente `mentary-question-assets`. |
| `CORS_ORIGINS` | Origem exata do frontend, quando estiver hospedado. Enquanto não houver frontend, não abra CORS para qualquer origem. |

O Render fornece a variável `PORT`; não fixe outra porta no painel. Não configure segredos no Dockerfile, em comandos de build, no repositório ou no código do navegador. Não inclua comandos de migração no build ou início: o banco de produção já está atualizado.

Após o deploy, valide o endereço público:

```text
https://<endereco-do-servico>/health
```

A resposta esperada é `{"status":"ok"}`. O processamento de documentos roda no processo Node. Mantenha uma instância; o plano gratuito pode suspender o serviço e não garante processamento contínuo em segundo plano. Não habilite múltiplas instâncias antes de implementar reserva persistente de jobs no banco. O deploy da API não cria um frontend; sem ele, não há uma interface web para os usuários finais.

## Validação feita

Foram validados `npm run db:validate`, `npm run db:generate`, `npm run typecheck`, `npm test` (6 testes do extrator) e o build de produção `npm run build`. A integração real confirmada usou uma imagem enviada pela API e terminou `PROCESSADO`; o gabarito e o descritor retornaram nulos e precisam de revisão humana. Ainda não há front-end nem serviço hospedado para acesso remoto.
