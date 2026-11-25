# Roteiro de testes da API

Este roteiro valida a API publicada no Render desde a conexão com o banco até a extração de questões. Os exemplos usam Postman e uma conta de teste do Supabase Auth.

Para consultar o histórico de modelos Gemini e os resultados de extração, veja [MODELOS_IA_E_TESTES.md](./MODELOS_IA_E_TESTES.md).

## Antes de começar

- Confirme que o serviço do Render está com estado **Live** e que as variáveis de ambiente estão configuradas.
- `DATABASE_URL` deve usar a URI **Session pooler** do Supabase. Não coloque a URL completa neste documento, em capturas de tela ou em mensagens.
- Tenha um PDF, PNG ou JPG válido de até 25 MB para o teste.
- Use somente credenciais de teste. Nunca compartilhe `access_token`, senha, `GEMINI_API_KEY` ou `SUPABASE_SERVICE_ROLE_KEY`.
- Se uma senha ou token tiver sido exposto, revogue-o ou troque-o antes de continuar.

## 1. Verificar a conexão local com o banco

No PowerShell, entre nesta pasta e execute:

```powershell
npm run db:check
```

Resultado esperado:

```text
Conexão PostgreSQL OK: banco=postgres, schema=public
pgvector habilitado: versão 0.8.2
```

Esse teste usa o `.env` local. Ele não confirma quais variáveis estão configuradas no Render.

## 2. Verificar se a API está online

Abra no navegador:

```text
https://mentary-48-squad.onrender.com/health
```

Resultado esperado:

```json
{"status":"ok"}
```

Essa rota confirma que a API está respondendo; não testa o banco, o Storage ou o Gemini.

## 3. Obter um token de acesso de teste

No Postman, crie uma requisição:

- Método: `POST`
- URL: `https://<PROJECT-REF>.supabase.co/auth/v1/token?grant_type=password`

Em **Headers**, adicione:

| Key | Value |
| --- | --- |
| `apikey` | Chave publishable/anon do projeto Supabase |
| `Content-Type` | `application/json` |

Em **Body → raw → JSON**, use as credenciais de uma conta de teste:

```json
{
  "email": "EMAIL_DA_CONTA_DE_TESTE",
  "password": "SENHA_DA_CONTA_DE_TESTE"
}
```

Clique em **Send** e copie o campo `access_token` da resposta. Não envie o token em mensagens nem em capturas de tela. No Postman, use **Authorization → Bearer Token**; cole somente o token no campo **Token**, sem acrescentar a palavra `Bearer`.

## 4. Enviar um arquivo

Crie outra requisição no Postman:

- Método: `POST`
- URL: `https://mentary-48-squad.onrender.com/api/v1/documents`
- **Authorization:** `Bearer Token` com o token obtido no passo anterior.
- **Body → form-data:** crie uma linha com a chave `file`, altere o tipo de **Text** para **File** e selecione um PDF, PNG ou JPG válido de até 25 MB.

Não adicione outros campos obrigatórios: o endpoint exige apenas `file`. Não defina manualmente o header `Content-Type`; o Postman configura o multipart ao enviar o arquivo.

Clique em **Send**. Resultado esperado: HTTP `202` e uma resposta semelhante a:

```json
{
  "document": {
    "id": "ID-DO-DOCUMENTO",
    "nomeArquivo": "arquivo.pdf",
    "statusProcessamento": "PENDENTE"
  }
}
```

Guarde o `id` retornado para consultar o processamento.

## 5. Consultar o processamento

Crie uma requisição **GET**:

```text
https://mentary-48-squad.onrender.com/api/v1/documents/ID-DO-DOCUMENTO
```

Configure **Authorization → Bearer Token** com o mesmo token e clique em **Send**. Consulte novamente após alguns segundos até o estado mudar:

- `PROCESSADO`: confira o array `questoes` retornado. A extração foi concluída.
- `ERRO`: a extração falhou. Consulte os logs recentes do Render para identificar a causa.

O token deve pertencer ao mesmo usuário que enviou o arquivo. Se a resposta disser que falta o token, confira a configuração **Authorization** da requisição GET.

## 6. Repetir o processamento de um documento com falha

Se o documento estiver em `ERRO`, a API pode tentar processar novamente o arquivo já armazenado. No Postman, crie:

- Método: `POST`
- URL: `https://mentary-48-squad.onrender.com/api/v1/documents/ID-DO-DOCUMENTO/retry`
- **Authorization:** `Bearer Token` com o mesmo token do proprietário do documento.

Uma resposta com `PENDENTE` indica que a nova tentativa foi aceita. Volte ao passo anterior para consultar o resultado.

## 7. Consultar a fila de revisão

Depois que um documento estiver como `PROCESSADO`, crie uma requisição **GET**:

```text
https://mentary-48-squad.onrender.com/api/v1/questions/review-queue
```

Configure **Authorization → Bearer Token** com o token Supabase do mesmo usuário que enviou o documento. A resposta contém somente questões ainda não homologadas, de documentos processados que pertencem a esse usuário:

```json
{
  "questions": [
    {
      "id": "ID-DA-QUESTAO",
      "enunciado": "Enunciado extraído",
      "textoBase": "Texto de apoio, quando houver",
      "alternativas": ["Alternativa A", "Alternativa B"],
      "gabaritoCorreto": "A",
      "documento": {
        "id": "ID-DO-DOCUMENTO",
        "nomeArquivo": "arquivo.pdf"
      }
    }
  ]
}
```

Se não houver questões aguardando revisão, a API retorna `"questions": []`. A consulta é uma fila consultável, não um aviso instantâneo: o consumidor precisa chamar o endpoint novamente para verificar se chegaram novas questões.

## 8. Editar uma questão

Use `PATCH /api/v1/questions/ID-DA-QUESTAO` com o token do proprietário do documento e um corpo parcial:

```json
{
  "enunciado": "Enunciado corrigido",
  "textoBase": "Texto de apoio corrigido",
  "alternativas": ["Alternativa A", "Alternativa B", "Alternativa C"],
  "gabaritoCorreto": "B",
  "componenteCurricular": "Matemática",
  "descritorSaeb": "D23",
  "metadata": {
    "bncc": "EF09MA01",
    "dificuldade": "MÉDIA"
  }
}
```

O campo `metadata` é mesclado com os metadados já existentes. Gabarito e alternativas são validados antes da homologação.

## 9. Homologar ou rejeitar

- Homologar: `PATCH /api/v1/questions/ID-DA-QUESTAO/approve`
- Rejeitar: `PATCH /api/v1/questions/ID-DA-QUESTAO/reject`

Para rejeitar, envie:

```json
{
  "motivo": "Enunciado incompleto e gabarito não confirmado."
}
```

Homologação exige enunciado preenchido, entre 2 e 26 alternativas e gabarito correspondente a uma alternativa. A decisão registra o usuário validador e a data. Questões homologadas entram no Banco de Questões; questões rejeitadas deixam de integrar o banco ativo.

## 10. Consultar o Banco de Questões e rejeições

- Banco ativo: `GET /api/v1/questions/bank`
- Rejeitadas: `GET /api/v1/questions/rejected`
- Detalhe de uma questão: `GET /api/v1/questions/ID-DA-QUESTAO`

## Diagnóstico rápido

| Resultado | O que conferir |
| --- | --- |
| `401` ou mensagem de token ausente | Configure **Authorization → Bearer Token** e use um `access_token` válido. |
| `400` pedindo o campo `file` | Em **Body → form-data**, confirme a chave exata `file` e que o tipo está como **File**. |
| `413` | O arquivo excede o limite de 25 MB. |
| `415` | O arquivo não é um PDF, PNG ou JPG válido; teste com outro arquivo. |
| `500` no envio | Consulte os logs do Render no horário da requisição. O upload depende de Storage e banco. |
| Documento permanece `PENDENTE` ou muda para `ERRO` | Procure nos logs a mensagem `Falha ao processar documento` e leia o erro subsequente. |
| `28P01` nos logs ou no `db:check` | O servidor alcançou o banco, mas usuário/senha não foram aceitos. Confira a URI completa do Session pooler e as credenciais atuais. |
| `ENETUNREACH` | O ambiente não alcançou o host/rota configurados. Confirme que o Render usa a URI Session pooler, não a conexão direta. |
| `HTTP/2 Protocol Error` no Postman | Esse erro do cliente não informa sozinho o resultado do processamento. Consulte novamente o documento e confira os logs do Render. |

Ao compartilhar um erro para diagnóstico, envie apenas a mensagem relevante. Remova tokens, senhas, URLs de conexão e chaves antes de enviar capturas de tela ou logs.
