import { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import {
  extrairDeImagemBuffer,
  extrairDePDFBuffer,
  type QuestaoMentary,
} from './extractor.js';
import { downloadStoredFile, type StoredAsset } from './storage.js';

const processingDocuments = new Set<string>();

function answerLetter(index: number | null, optionCount: number): string | null {
  if (index === null || index < 0 || index >= optionCount || index >= 26) {
    return null;
  }
  return String.fromCharCode(65 + index);
}

function prismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function processDocument(documentId: string): Promise<void> {
  if (processingDocuments.has(documentId)) {
    return;
  }
  processingDocuments.add(documentId);

  try {
    const document = await prisma.documento.findUnique({ where: { id: documentId } });
    if (!document || !document.storageBucket || !document.storagePath || !document.contentType) {
      throw new Error(`Documento ${documentId} sem referência completa ao arquivo armazenado.`);
    }

    const asset: StoredAsset = {
      bucket: document.storageBucket,
      path: document.storagePath,
      contentType: document.contentType,
      originalName: document.nomeArquivo,
    };
    const fileBuffer = await downloadStoredFile(asset);
    let questions: QuestaoMentary[];
    if (document.contentType === 'application/pdf') {
      questions = await extrairDePDFBuffer(fileBuffer);
    } else {
      questions = await extrairDeImagemBuffer(fileBuffer, document.contentType);
    }

    const questionRows = questions.map((question) => ({
      documentoId: document.id,
      enunciado: question.title,
      alternativas: prismaJson(question.answer_options),
      explicacao: question.answers_explanation,
      componenteCurricular: question.subjects,
      gabaritoCorreto: answerLetter(question.correct_answer_index, question.answer_options.length),
      descritorSaeb: question.metadata?.descritor ?? null,
      metadata: prismaJson(question.metadata ?? {}),
    }));

    await prisma.$transaction(async (transaction) => {
      if (questionRows.length > 0) {
        await transaction.questao.createMany({ data: questionRows });
      }
      await transaction.documento.update({
        where: { id: document.id },
        data: { statusProcessamento: 'PROCESSADO' },
      });
    }, { maxWait: 15_000, timeout: 60_000 });
  } catch (error) {
    console.error(`Falha ao processar documento ${documentId}:`, error);
    await prisma.documento.update({
      where: { id: documentId },
      data: { statusProcessamento: 'ERRO' },
    });
  } finally {
    processingDocuments.delete(documentId);
  }
}

export function scheduleExtraction(documentId: string): void {
  setImmediate(() => {
    void processDocument(documentId).catch((error: unknown) => {
      console.error(`Falha inesperada no processamento do documento ${documentId}:`, error);
    });
  });
}
