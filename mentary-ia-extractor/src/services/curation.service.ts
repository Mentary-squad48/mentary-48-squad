import { Prisma } from '../../generated/prisma/client.js';

export type CurationPatch = {
  enunciado?: string;
  textoBase?: string | null;
  alternativas?: string[];
  explicacao?: string | null;
  componenteCurricular?: string | null;
  gabaritoCorreto?: string | null;
  descritorSaeb?: string | null;
  metadata?: Record<string, unknown>;
};

export class CurationValidationError extends Error {
  constructor(message: string) {
    super(message);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalText(value: unknown, field: string, maxLength: number): string | null {
  if (value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new CurationValidationError(`O campo "${field}" deve ser texto ou null.`);
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new CurationValidationError(`O campo "${field}" excede ${maxLength} caracteres.`);
  }
  return trimmed || null;
}

export function validateCurationPatch(body: unknown): CurationPatch {
  if (!isRecord(body)) {
    throw new CurationValidationError('Envie um objeto JSON com os campos a serem atualizados.');
  }

  const allowed = new Set([
    'enunciado',
    'textoBase',
    'alternativas',
    'explicacao',
    'componenteCurricular',
    'gabaritoCorreto',
    'descritorSaeb',
    'metadata',
  ]);
  const unknownFields = Object.keys(body).filter((field) => !allowed.has(field));
  if (unknownFields.length > 0) {
    throw new CurationValidationError(`Campos não editáveis: ${unknownFields.join(', ')}.`);
  }

  const patch: CurationPatch = {};
  if ('enunciado' in body) {
    if (typeof body['enunciado'] !== 'string' || !body['enunciado'].trim()) {
      throw new CurationValidationError('O campo "enunciado" deve ser um texto não vazio.');
    }
    if (body['enunciado'].trim().length > 20_000) {
      throw new CurationValidationError('O campo "enunciado" excede 20.000 caracteres.');
    }
    patch.enunciado = body['enunciado'].trim();
  }
  if ('textoBase' in body) patch.textoBase = optionalText(body['textoBase'], 'textoBase', 20_000);
  if ('explicacao' in body) patch.explicacao = optionalText(body['explicacao'], 'explicacao', 20_000);
  if ('componenteCurricular' in body) patch.componenteCurricular = optionalText(body['componenteCurricular'], 'componenteCurricular', 255);
  if ('descritorSaeb' in body) patch.descritorSaeb = optionalText(body['descritorSaeb'], 'descritorSaeb', 255);
  if ('gabaritoCorreto' in body) {
    if (body['gabaritoCorreto'] === null) {
      patch.gabaritoCorreto = null;
    } else if (typeof body['gabaritoCorreto'] === 'string' && /^[A-Z]$/.test(body['gabaritoCorreto'].trim().toUpperCase())) {
      patch.gabaritoCorreto = body['gabaritoCorreto'].trim().toUpperCase();
    } else {
      throw new CurationValidationError('O campo "gabaritoCorreto" deve ser uma letra entre A e Z ou null.');
    }
  }
  if ('alternativas' in body) {
    if (!Array.isArray(body['alternativas']) || body['alternativas'].length < 2 || body['alternativas'].length > 26) {
      throw new CurationValidationError('O campo "alternativas" deve conter entre 2 e 26 itens.');
    }
    const alternativas: string[] = [];
    for (const value of body['alternativas']) {
      if (typeof value !== 'string' || !value.trim()) {
        throw new CurationValidationError('Todas as alternativas devem ser textos não vazios.');
      }
      if (value.trim().length > 20_000) {
        throw new CurationValidationError('Uma alternativa excede 20.000 caracteres.');
      }
      alternativas.push(value.trim());
    }
    patch.alternativas = alternativas;
  }
  if ('metadata' in body) {
    if (!isRecord(body['metadata'])) {
      throw new CurationValidationError('O campo "metadata" deve ser um objeto JSON.');
    }
    patch.metadata = body['metadata'];
  }
  return patch;
}

export function validateForApproval(question: {
  enunciado: string;
  alternativas: unknown;
  gabaritoCorreto: string | null;
}): void {
  if (!question.enunciado.trim()) {
    throw new CurationValidationError('Informe o enunciado antes de homologar.');
  }
  if (!Array.isArray(question.alternativas) || question.alternativas.length < 2 || question.alternativas.length > 26) {
    throw new CurationValidationError('Informe entre 2 e 26 alternativas antes de homologar.');
  }
  if (question.alternativas.some((alternative) => typeof alternative !== 'string' || !alternative.trim())) {
    throw new CurationValidationError('Todas as alternativas devem estar preenchidas antes de homologar.');
  }
  if (!question.gabaritoCorreto || !/^[A-Z]$/.test(question.gabaritoCorreto)) {
    throw new CurationValidationError('Informe um gabarito válido antes de homologar.');
  }
  const index = question.gabaritoCorreto.charCodeAt(0) - 65;
  if (index < 0 || index >= question.alternativas.length) {
    throw new CurationValidationError('O gabarito não corresponde a uma alternativa cadastrada.');
  }
}

export function toPrismaJson(value: Record<string, unknown>): Prisma.InputJsonObject {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
}
