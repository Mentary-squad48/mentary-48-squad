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

---

## 4. Módulo de Inteligência Avaliativa

### RF011: Captura e Processamento de Telemetria
O sistema (Motor IA / OCR) deverá atuar de forma autônoma para processar os dados originados da aplicação do simulado e atualizar a base de dados de Inteligência Avaliativa.

| Código | Requisito de Sistema |
| :---: | :--- |
| **RF011.1** | O sistema deverá capturar automaticamente os dados de respostas registrados na aplicação do simulado, seja em formato físico (via leitura/OCR do cartão-resposta) ou digital. |
| **RF011.2** | O Motor IA/OCR deverá processar os dados capturados, calculando métricas de desempenho (acertos, erros, percentuais por habilidade e por descritor). |
| **RF011.3** | O sistema deverá atualizar a base de dados de Inteligência Avaliativa com os resultados processados, sem necessidade de intervenção manual. |

---

### RF012: Renderização de Dashboards
O sistema deverá disponibilizar interfaces visuais de Inteligência Avaliativa para que professores, coordenadores e gestores possam acessar e acompanhar as métricas calculadas.

| Código | Requisito de Sistema |
| :---: | :--- |
| **RF012.1** | O sistema deverá disponibilizar dashboard com métricas de Inteligência Avaliativa segmentadas conforme o perfil de acesso do usuário (professor, coordenador ou gestor). |
| **RF012.2** | O dashboard deverá exibir indicadores de desempenho geral, evolução histórica e distribuição de resultados por habilidade e descritor. |
| **RF012.3** | O sistema deverá manter as métricas exibidas atualizadas conforme o último processamento da base de dados. |

---

### RF013: Visão Comparativa Avançada
O sistema deverá fornecer uma funcionalidade sob demanda, restrita ao perfil de Gestor de Rede de Ensino, para alterar a visão padrão do dashboard e comparar o desempenho de escolas individualmente.

| Código | Requisito de Sistema |
| :---: | :--- |
| **RF013.1** | O sistema deverá restringir o acesso à funcionalidade de visão comparativa ao perfil "Gestor de Rede de Ensino", validando a permissão antes de exibir a opção. |
| **RF013.2** | A interface deverá permitir a seleção de duas ou mais escolas para comparação lado a lado dos indicadores de desempenho. |
| **RF013.3** | O sistema deverá permitir a alternância entre a visão padrão do dashboard e a visão comparativa, a qualquer momento e sob demanda do gestor. |

---

## 5. Módulo de Relatórios Curriculares

### RF014: Processamento de Relatórios Curriculares
O sistema deverá receber requisições de professores, coordenadores ou gestores para gerar análises de desempenho.

| Código | Requisito de Sistema |
| :---: | :--- |
| **RF014.1** | O sistema deverá disponibilizar funcionalidade de solicitação de relatório de desempenho para os perfis de professor, coordenador e gestor. |
| **RF014.2** | O sistema deverá validar os parâmetros informados na requisição (turma, componente curricular e período) antes de iniciar o processamento. |
| **RF014.3** | O sistema deverá enfileirar a requisição para processamento e notificar o usuário sobre o status da geração do relatório. |

---

### RF015: Exibição de Dados Curriculares
Ao receber a solicitação, o sistema deverá processar os dados e exibir obrigatoriamente o relatório detalhado, segmentado por Descritor e Habilidade (BNCC).

| Código | Requisito de Sistema |
| :---: | :--- |
| **RF015.1** | O sistema deverá processar os dados vinculados à requisição e consolidar o relatório de desempenho. |
| **RF015.2** | O relatório gerado deverá segmentar obrigatoriamente os resultados por Descritor e por Habilidade (BNCC). |
| **RF015.3** | O sistema deverá exibir o relatório em formato visual, permitindo sua exportação e/ou impressão. |

---

## 6. Módulo de Recomposição da Aprendizagem

### RF016: Elaboração Estratégica via IA
O sistema, apoiado pelo Motor IA / OCR, deverá ser capaz de processar os resultados e elaborar uma proposta de Plano de Recomposição da Aprendizagem.

| Código | Requisito de Sistema |
| :---: | :--- |
| **RF016.1** | O Motor IA/OCR deverá analisar os resultados de desempenho segmentados por habilidade e descritor. |
| **RF016.2** | O sistema deverá elaborar, com apoio da IA, uma proposta de Plano de Recomposição da Aprendizagem, priorizando as lacunas de aprendizagem identificadas. |
| **RF016.3** | O sistema deverá disponibilizar a proposta gerada para a etapa de auditoria humana. |

---

### RF017: Interface de Auditoria Humana
O sistema deverá exibir o plano elaborado pela IA em uma interface de revisão, garantindo que o professor assuma o papel de auditar e validar a estratégia antes da aprovação.

| Código | Requisito de Sistema |
| :---: | :--- |
| **RF017.1** | O sistema deverá exibir o plano elaborado pela IA em interface dedicada de revisão pedagógica. |
| **RF017.2** | A interface deverá permitir que o professor edite, aprove ou rejeite os elementos do plano proposto. |
| **RF017.3** | O sistema deverá registrar a decisão do professor (aprovação ou rejeição), vinculando-a ao seu identificador e à data/hora da ação. |

---

### RF018: Recálculo de Solução Pedagógica
O sistema deverá permitir que o professor recuse o plano inicial e acione uma rota alternativa, solicitando que a IA gere uma nova solução de recomposição antes da aprovação final.

| Código | Requisito de Sistema |
| :---: | :--- |
| **RF018.1** | O sistema deverá permitir que o professor recuse o plano inicial apresentado, indicando o motivo da recusa. |
| **RF018.2** | Ao receber a recusa, o sistema deverá acionar rota alternativa solicitando à IA a geração de uma nova proposta de plano de recomposição. |
| **RF018.3** | O sistema deverá repetir o ciclo de auditoria humana até que o plano seja aprovado pelo professor. |