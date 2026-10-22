#  Especificação de Requisitos Funcionais - Sistema Mentary

Este documento detalha os Requisitos Funcionais (RF) e os Requisitos de Sistema vinculados às funcionalidades da plataforma Mentary.

---

## 1. Módulo de Entrada e Ingestão (OCR / IA)

### RF001: Envio de Arquivos de Avaliação
O sistema deverá permitir o envio de arquivos contendo questões de avaliações pelo professor ou coordenador.

| Código | Requisito de Sistema |
| :---: | :--- |
| **RF001.1** | O sistema deverá disponibilizar tela de upload compatível com formatos PDF, imagens (PNG/JPG), planilhas eletrônicas (XLSX/CSV) e JSON. |
| **RF001.2** | O sistema deverá validar a extensão do arquivo submetido antes de autorizar o envio para a camada de serviço. |
| **RF001.3** | O sistema deverá registrar metadados de envio contendo código do usuário autenticado, data, hora e nome do documento. |

---

### RF002: Extração Automatizada de Questões
O sistema deverá realizar a extração automatizada de questões via OCR e inteligência artificial a partir de documentos enfileirados.

| Código | Requisito de Sistema |
| :---: | :--- |
| **RF002.1** | O sistema deverá alocar os documentos recebidos em uma fila assíncrona de processamento. |
| **RF002.2** | O pipeline de OCR/IA deverá segmentar de forma autônoma: texto-base/suporte, enunciado, alternativas e gabarito preliminar. |
| **RF002.3** | O módulo deverá disponibilizar o item extraído na interface para início da etapa de conferência. |

---

### RF003: Conferência e Edição de Metadados
O sistema deverá permitir a conferência e edição dos metadados curriculares (BNCC e SAEB) da questão extraída.

| Código | Requisito de Sistema |
| :---: | :--- |
| **RF003.1** | O sistema deverá disponibilizar visualização lado a lado entre o arquivo original digitalizado e a questão transcrita. |
| **RF003.2** | A interface deverá permitir a edição textual de campos e o ajuste de vínculos com a base curricular nacional (habilidades BNCC e descritores SAEB). |
| **RF003.3** | O sistema deverá permitir a definição e ajuste do nível estimado de dificuldade pedagógica do item. |

---

### RF004: Homologação do Item Extraído
O sistema deverá permitir a tomada de decisão de homologação (aprovação ou rejeição) do item extraído.

| Código | Requisito de Sistema |
| :---: | :--- |
| **RF004.1** | A interface deverá conter botões de decisão rápida para aprovação ou rejeição da questão avaliada. |
| **RF004.2** | Ao selecionar a aprovação, o sistema deverá submeter o item para a rotina de armazenamento definitivo. |
| **RF004.3** | Ao selecionar a rejeição, o sistema deverá descartar o item da fila de aprovação e gravar registro com o motivo do descarte. |

---

### RF005: Persistência no Banco Mentary
O sistema deverá persistir as questões aprovadas no Banco Mentary com histórico e metadados de rastreabilidade.

| Código | Requisito de Sistema |
| :---: | :--- |
| **RF005.1** | O sistema deverá gravar os itens aprovados no repositório relacional do Banco Mentary. |
| **RF005.2** | O banco de dados deverá associar campos obrigatórios de rastreabilidade (autor da submissão, validador responsável, data/hora e identificador único). |
| **RF005.3** | O sistema deverá atualizar o status da questão para "Homologada/Ativa" e finalizar o fluxo de ingestão. |

---

## 2. Módulo de Montagem e Seleção de Simulados

### RF006: Consulta e Filtragem no Banco de Questões
O sistema deverá permitir a consulta parametrizada e filtragem de itens no banco de questões.

| Código | Requisito de Sistema |
| :---: | :--- |
| **RF006.1** | O sistema deverá disponibilizar filtros de consulta por componente curricular, ano letivo, código de habilidade BNCC, descritor e nível de dificuldade. |
| **RF006.2** | A pesquisa deverá retornar lista paginada apresentando resumo do item, gabarito cadastrado e metadados associados. |
| **RF006.3** | O sistema deverá emitir alerta orientando o ajuste de filtros caso a busca não localize registros. |

---

### RF007: Composição do Caderno de Prova
O sistema deverá permitir a seleção de questões e composição do caderno de prova para montagem de simulados.

| Código | Requisito de Sistema |
| :---: | :--- |
| **RF007.1** | A interface deverá permitir que o professor marque questões individuais da busca para inclusão direta no simulado. |
| **RF007.2** | O sistema deverá permitir reordenar a sequência numérica das questões selecionadas. |
| **RF007.3** | A plataforma deverá exibir sumário em tempo real contendo o total de questões e distribuição preliminar do simulado. |

---

## 3. Módulo de Validação Pedagógica e Auditoria

### RF008: Solicitação de Validação Pedagógica
O sistema deverá permitir a solicitação da rotina de validação pedagógica do simulado em elaboração.

| Código | Requisito de Sistema |
| :---: | :--- |
| **RF008.1** | O sistema deverá disponibilizar a funcionalidade de solicitação de validação pedagógica antes do fechamento da avaliação. |
| **RF008.2** | O sistema deverá disparar requisição interna contendo o conjunto de questões montadas para o serviço de auditoria. |
| **RF008.3** | A interface deverá permitir o avanço direto para publicação caso o usuário opte por dispensar a validação pedagógica. |

---

### RF009: Auditoria Automatizada da Avaliação
O sistema deverá auditar automaticamente a distribuição de habilidades, equilíbrio de dificuldade e dispersão de gabaritos.

| Código | Requisito de Sistema |
| :---: | :--- |
| **RF009.1** | O módulo de auditoria deverá checar o equilíbrio percentual de descritores e a cobertura das habilidades requeridas para o simulado. |
| **RF009.2** | A rotina deverá analisar o balanceamento estatístico dos níveis de dificuldade cadastrados. |
| **RF009.3** | O sistema deverá verificar a integridade técnica dos itens, checando a presença de gabaritos e a ausência de duplicidades. |

---

### RF010: Bloqueio ou Liberação do Simulado
O sistema deverá bloquear a liberação do simulado em caso de inconsistências ou publicar e disponibilizar a avaliação validada.

| Código | Requisito de Sistema |
| :---: | :--- |
| **RF010.1** | O sistema deverá bloquear a publicação do simulado caso identifique itens sem gabarito ou desequilíbrios críticos, exibindo lista de pendências para ajuste. |
| **RF010.2** | A interface deverá permitir o retorno ao fluxo de edição para correção dos apontamentos emitidos. |
| **RF010.3** | Inexistindo pendências impeditivas, o sistema deverá persistir a avaliação montada no banco de dados e torná-la disponível para aplicação física ou digital. |