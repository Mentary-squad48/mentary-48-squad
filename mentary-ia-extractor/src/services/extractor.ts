import { GoogleGenAI, Type, type ContentListUnion, type GenerateContentResponse, type Schema } from '@google/genai';
import * as dotenv from 'dotenv';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { PDFParse } from 'pdf-parse';

dotenv.config();

let ai: GoogleGenAI | undefined;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('A variável GEMINI_API_KEY não foi definida no arquivo .env.');
  }
  ai ??= new GoogleGenAI({ apiKey });
  return ai;
}

// Interface compatível com a tabela de questões da plataforma Mentary
export interface QuestaoMentary {
  question_id: string | null;
  fk_user_id: string | null;
  fk_institution_id: string | null;
  title: string;
  question_type: string;
  content_type: "image" | "glb" | "url" | null;
  fk_content_id: string | null;
  correct_answer_index: number | null;
  answer_options_type: string;
  answer_options: string[];
  question_visibility_status: "PUBLICO" | "PRIVADO";
  answers_explanation: string | null;
  ar_gallery_id: string | null;
  subjects: string | null;
  created_at: string | null;
  updated_at: string | null;
  metadata: {
    bncc?: string | null;
    habilidade_bncc?: string | null;
    prova?: string;
    origem?: string;
    descritor?: string | null;
    ano_escolar?: string | null;
    dificuldade?: string | null;
    source_asset_path?: string;
    source_asset_bucket?: string;
    source_pages?: number[];
    [key: string]: unknown;
  } | null;
}

const schemaQuestoes: Schema = {
  type: Type.OBJECT,
  properties: {
    questoes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "O enunciado principal da questão" },
          question_type: { type: Type.STRING, enum: ["MULTIPLA ESCOLHA"] },
          content_type: { type: Type.STRING, nullable: true },
          correct_answer_index: { 
            type: Type.INTEGER, 
            nullable: true,
            description: "Índice de 0 a N da resposta correta nas opções (0 para A, 1 para B, 2 para C, etc.)" 
          },
          answer_options_type: { type: Type.STRING, enum: ["TEXTO"] },
          answer_options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Lista contendo os textos de cada uma das alternativas de resposta"
          },
          question_visibility_status: { type: Type.STRING, enum: ["PUBLICO", "PRIVADO"] },
          answers_explanation: { type: Type.STRING, nullable: true },
          subjects: { type: Type.STRING, nullable: true, description: "Componente curricular da questão" },
          metadata: {
            type: Type.OBJECT,
            properties: {
              bncc: { type: Type.STRING, nullable: true, description: "Código da habilidade BNCC, se identificável" },
              habilidade_bncc: { type: Type.STRING, nullable: true, description: "Descrição da habilidade BNCC correspondente" },
              prova: { type: Type.STRING, nullable: true },
              origem: { type: Type.STRING, nullable: true },
              descritor: { type: Type.STRING, nullable: true, description: "Descritor SAEB (ex: D23)" },
              ano_escolar: { type: Type.STRING, nullable: true },
              dificuldade: { type: Type.STRING, nullable: true },
              source_pages: { type: Type.ARRAY, items: { type: Type.INTEGER } }
            },
            required: ["bncc", "habilidade_bncc", "prova", "origem", "descritor", "ano_escolar", "dificuldade", "source_pages"]
          }
        },
        required: [
          "title",
          "question_type",
          "correct_answer_index",
          "answer_options_type",
          "answer_options",
          "question_visibility_status",
          "answers_explanation",
          "subjects",
          "metadata",
        ]
      }
    }
  },
  required: ["questoes"]
};

const SYSTEM_INSTRUCTION = `Você é o motor de IA pedagógica da plataforma Mentary.
Extraia todas as questões, incluindo enunciado, alternativas, gabarito e qualquer informação visual relevante.
Classifique assunto/componente curricular, ano escolar, dificuldade, descritor SAEB e habilidade BNCC.
Em metadata.bncc informe o código BNCC e em metadata.habilidade_bncc descreva a habilidade correspondente.
Não invente códigos curriculares: retorne null quando não houver evidência suficiente.
Para correct_answer_index use índice baseado em zero (A=0, B=1, C=2, D=3); se o gabarito não estiver disponível, não crie uma resposta.
Em metadata.source_pages informe os números das páginas mostradas no material de origem para cada questão.
Mantenha question_visibility_status como PRIVADO até a aprovação humana.
Siga rigorosamente o esquema JSON de resposta.`;

/**
 * Função utilitária para tratamento de resiliência e retentativa em caso de oscilação do serviço (503/429)
 */
async function chamarGeminiComRetry(contents: ContentListUnion, retries = 3, delayMs = 2000): Promise<GenerateContentResponse> {
  const modeloAtual = process.env.GEMINI_MODEL ?? 'gemini-3.8-flash';

  for (let i = 0; i < retries; i++) {
    try {
      return await getGeminiClient().models.generateContent({
        model: modeloAtual,
        contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: schemaQuestoes,
          temperature: 0.1,
        },
      });
    } catch (err: unknown) {
      const status = typeof err === 'object' && err !== null && 'status' in err
        ? err.status
        : undefined;
      if ((status === 503 || status === 429) && i < retries - 1) {
        console.warn(`[${status} Temporariamente Indisponível] Tentativa ${i + 1}/${retries}. Aguardando ${delayMs / 1000}s...`);
        await new Promise((res) => setTimeout(res, delayMs));
        delayMs *= 2;
      } else {
        throw err;
      }
    }
  }
  throw new Error('Não foi possível obter resposta do Gemini após as tentativas configuradas.');
}

function interpretarResposta(response: GenerateContentResponse, sourcePages?: number[]): QuestaoMentary[] {
  if (!response.text) {
    throw new Error('O Gemini retornou uma resposta vazia.');
  }
  const result: unknown = JSON.parse(response.text);
  if (typeof result !== 'object' || result === null || !('questoes' in result) || !Array.isArray(result.questoes)) {
    throw new Error('O Gemini retornou JSON sem a lista obrigatória "questoes".');
  }

  return result.questoes.map((item: unknown, index: number) => {
    if (typeof item !== 'object' || item === null || !('title' in item) || typeof item.title !== 'string' ||
      !('answer_options' in item) || !Array.isArray(item.answer_options) ||
      !('correct_answer_index' in item) ||
      (typeof item.correct_answer_index !== 'number' && item.correct_answer_index !== null)) {
      throw new Error(`A questão ${index + 1} retornada pelo Gemini está incompleta ou inválida.`);
    }
    const title = item.title;
    const answerOptions = item.answer_options.filter((option): option is string => typeof option === 'string');
    const correctAnswerIndex = item.correct_answer_index;
    if (answerOptions.length !== item.answer_options.length) {
      throw new Error(`As alternativas da questão ${index + 1} contêm valores inválidos.`);
    }
    const question = item as Partial<QuestaoMentary>;
    const modelPages = question.metadata?.source_pages;
    const metadata = { ...(question.metadata ?? {}) };
    if (Array.isArray(modelPages) && modelPages.every((page) => typeof page === 'number') && sourcePages) {
      const validPages = modelPages.filter((page) => sourcePages.includes(page));
      metadata.source_pages = validPages.length > 0 ? validPages : sourcePages;
    } else if (Array.isArray(modelPages) && modelPages.every((page) => typeof page === 'number')) {
      metadata.source_pages = modelPages;
    } else if (sourcePages) {
      metadata.source_pages = sourcePages;
    }
    return {
      question_id: question.question_id ?? null,
      fk_user_id: question.fk_user_id ?? null,
      fk_institution_id: question.fk_institution_id ?? null,
      title,
      question_type: question.question_type ?? 'MULTIPLA ESCOLHA',
      content_type: question.content_type ?? null,
      fk_content_id: question.fk_content_id ?? null,
      correct_answer_index: correctAnswerIndex,
      answer_options_type: question.answer_options_type ?? 'TEXTO',
      answer_options: answerOptions,
      question_visibility_status: question.question_visibility_status ?? 'PRIVADO',
      answers_explanation: question.answers_explanation ?? null,
      ar_gallery_id: question.ar_gallery_id ?? null,
      subjects: question.subjects ?? null,
      created_at: question.created_at ?? null,
      updated_at: question.updated_at ?? null,
      metadata,
    };
  });
}

export function agruparPaginas(totalPaginas: number, tamanhoLote = 5, sobreposicao = 1): number[][] {
  if (!Number.isInteger(totalPaginas) || totalPaginas < 0) {
    throw new Error('O total de páginas deve ser um inteiro não negativo.');
  }
  if (!Number.isInteger(tamanhoLote) || tamanhoLote < 1 ||
    !Number.isInteger(sobreposicao) || sobreposicao < 0 || sobreposicao >= tamanhoLote) {
    throw new Error('Tamanho do lote e sobreposição de páginas inválidos.');
  }

  const lotes: number[][] = [];
  const passo = tamanhoLote - sobreposicao;
  for (let inicio = 1; inicio <= totalPaginas; inicio += passo) {
    lotes.push(Array.from(
      { length: Math.min(tamanhoLote, totalPaginas - inicio + 1) },
      (_, indice) => inicio + indice,
    ));
  }
  return lotes;
}

function pdfBatchConfiguration(): { batchSize: number; overlap: number; concurrency: number } {
  const batchSize = Number.parseInt(process.env.PDF_PAGE_BATCH_SIZE ?? '5', 10);
  const overlap = Number.parseInt(process.env.PDF_PAGE_OVERLAP ?? '1', 10);
  const concurrency = Number.parseInt(process.env.PDF_BATCH_CONCURRENCY ?? '2', 10);
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 10) {
    throw new Error('PDF_PAGE_BATCH_SIZE deve estar entre 1 e 10.');
  }
  if (!Number.isInteger(overlap) || overlap < 0 || overlap >= batchSize) {
    throw new Error('PDF_PAGE_OVERLAP deve ser menor que PDF_PAGE_BATCH_SIZE e não negativo.');
  }
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 4) {
    throw new Error('PDF_BATCH_CONCURRENCY deve estar entre 1 e 4.');
  }
  return { batchSize, overlap, concurrency };
}

function extrairCodigoPagina(question: QuestaoMentary): string {
  return `${question.title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\W+/g, ' ').trim()}|${question.answer_options.join('|').toLowerCase().trim()}`;
}

function removerDuplicatasDeSobreposicao(questions: QuestaoMentary[]): QuestaoMentary[] {
  const unique: QuestaoMentary[] = [];
  const seen = new Map<string, QuestaoMentary>();
  for (const question of questions) {
    const key = extrairCodigoPagina(question);
    const previous = seen.get(key);
    const pages = question.metadata?.source_pages;
    const previousPages = previous?.metadata?.source_pages;
    const overlaps = previousPages?.some((page) => pages?.includes(page)) ?? false;
    if (previous && overlaps) {
      continue;
    }
    unique.push(question);
    seen.set(key, question);
  }
  return unique;
}

/**
 * 1. Processa Texto Puro
 */
export async function extrairDeTexto(textoBruto: string): Promise<QuestaoMentary[]> {
  const contents = `Analise o texto a seguir e extraia as questões estruturadas conforme o padrão Mentary:\n\n"""\n${textoBruto}\n"""`;
  const response = await chamarGeminiComRetry(contents);
  return interpretarResposta(response);
}

/**
 * 2. Processa Imagens (PNG, JPG, JPEG)
 */
export async function extrairDeImagem(caminhoFicheiro: string): Promise<QuestaoMentary[]> {
  const extensao = path.extname(caminhoFicheiro).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
  };
  const mimeType = mimeTypes[extensao];
  if (!mimeType) {
    throw new Error(`Formato de imagem não suportado: ${extensao || '(sem extensão)'}. Use PNG ou JPG.`);
  }
  const imageBuffer = fs.readFileSync(caminhoFicheiro);
  return extrairDeImagemBuffer(imageBuffer, mimeType);
}

export async function extrairDeImagemBuffer(imageBuffer: Uint8Array, mimeType: string): Promise<QuestaoMentary[]> {
  const contents = [
    {
      inlineData: {
        mimeType,
        data: Buffer.from(imageBuffer).toString('base64')
      }
    },
    "Analise a imagem da avaliação e extraia todas as questões estruturadas conforme o padrão Mentary."
  ];

  const response = await chamarGeminiComRetry(contents);
  return interpretarResposta(response);
}

/**
 * Processa PDFs renderizando as páginas em lotes para incluir OCR e conteúdo visual.
 */
export async function extrairDePDFBuffer(
  dataBuffer: Uint8Array,
  onProgress?: (completedPages: number, totalPages: number) => void | Promise<void>,
): Promise<QuestaoMentary[]> {
  const parser = new PDFParse({ data: Buffer.from(dataBuffer) });
  try {
    const info = await parser.getInfo();
    if (info.total === 0) {
      throw new Error('O PDF não contém páginas para processar.');
    }

    const { batchSize, overlap, concurrency } = pdfBatchConfiguration();
    const pageBatches = agruparPaginas(info.total, batchSize, overlap);
    const questionsByBatch: QuestaoMentary[][] = new Array(pageBatches.length);

    let nextBatch = 0;
    const completedPages = new Set<number>();
    let hasFailure = false;
    let failure: unknown;
    const runBatchWorker = async (): Promise<void> => {
      while (!hasFailure && nextBatch < pageBatches.length) {
        const batchIndex = nextBatch++;
        const pages = pageBatches[batchIndex];
        if (!pages) {
          hasFailure = true;
          failure = new Error(`Lote de páginas ${batchIndex + 1} indisponível.`);
          return;
        }
        try {
          const screenshots = await parser.getScreenshot({
            partial: pages,
            desiredWidth: 1400,
            imageBuffer: true,
            imageDataUrl: false,
          });
          const contents: (string | { inlineData: { mimeType: string; data: string } })[] = [];
          for (const screenshot of screenshots.pages) {
            contents.push(`Página ${screenshot.pageNumber}: extraia questões visíveis nesta página.`);
            contents.push({
              inlineData: {
                mimeType: 'image/png',
                data: Buffer.from(screenshot.data).toString('base64'),
              },
            });
          }
          contents.push('Consolide questões que continuem entre páginas adjacentes sem duplicá-las e informe em metadata.source_pages as páginas de origem.');
          questionsByBatch[batchIndex] = interpretarResposta(
            await chamarGeminiComRetry(contents),
            pages,
          );
          pages.forEach((page) => completedPages.add(page));
          await onProgress?.(completedPages.size, info.total);
        } catch (error) {
          hasFailure = true;
          failure = error;
          return;
        }
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(concurrency, pageBatches.length) }, () => runBatchWorker()),
    );
    if (hasFailure) {
      throw failure;
    }
    return removerDuplicatasDeSobreposicao(questionsByBatch.flat());
  } finally {
    await parser.destroy();
  }
}

export async function extrairDePDF(caminhoFicheiro: string): Promise<QuestaoMentary[]> {
  return extrairDePDFBuffer(fs.readFileSync(caminhoFicheiro));
}

/**
 * Função Universal: Detecta o formato automaticamente e chama o fluxo apropriado
 */
export async function extrairQuestoes(caminhoOuTexto: string): Promise<QuestaoMentary[]> {
  if (fs.existsSync(caminhoOuTexto)) {
    const extensao = path.extname(caminhoOuTexto).toLowerCase();
    
    if (extensao === '.pdf') {
      console.log(`[PDF detectado] Processando: ${caminhoOuTexto}`);
      return extrairDePDF(caminhoOuTexto);
    } else if (['.png', '.jpg', '.jpeg'].includes(extensao)) {
      console.log(`[Imagem detectada] Processando: ${caminhoOuTexto}`);
      return extrairDeImagem(caminhoOuTexto);
    }
  }

  console.log(`[Texto Direto detectado] Processando string...`);
  return extrairDeTexto(caminhoOuTexto);
}

async function testar(): Promise<void> {
  try {
    const textoExemplo = `Questão 1. Quanto é 2 + 2? 
    a) 3 
    b) 4 
    c) 5 
    d) 6
    Gabarito: B. 
    Descritor: D01. 
    Ano: 5º ano. 
    Matéria: Matemática.`;

    console.log("Enviando teste para o Gemini...");
    const resultadoTexto = await extrairQuestoes(textoExemplo);
    console.log("\nResultado (JSON Compatível com o Banco Mentary):");
    console.log(JSON.stringify(resultadoTexto, null, 2));
  } catch (error) {
    console.error("Erro ao executar:", error);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  void testar();
}