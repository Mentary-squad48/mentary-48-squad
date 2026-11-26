import { Prisma } from '../../generated/prisma/client.js';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class SimuladoValidationError extends Error {}

export type SimuladoInput = {
  titulo: string;
  disciplina: string;
  questaoIds: string[];
};

export type AuditQuestion = {
  id: string;
  status: 'PENDENTE' | 'HOMOLOGADA' | 'REJEITADA';
  ehHomologada: boolean;
  enunciado: string;
  gabaritoCorreto: string | null;
  alternativas: unknown;
  componenteCurricular: string | null;
  descritorSaeb: string | null;
  metadata: unknown;
};

export function parseSimuladoInput(value: unknown): SimuladoInput {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new SimuladoValidationError('Envie um objeto JSON com título, disciplina e questaoIds.');
  }
  const body = value as Record<string, unknown>;
  const titulo = typeof body['titulo'] === 'string' ? body['titulo'].trim() : '';
  const disciplina = typeof body['disciplina'] === 'string' ? body['disciplina'].trim() : '';
  if (!titulo || titulo.length > 200) {
    throw new SimuladoValidationError('Informe um título com até 200 caracteres.');
  }
  if (!disciplina || disciplina.length > 200) {
    throw new SimuladoValidationError('Informe uma disciplina com até 200 caracteres.');
  }
  return { titulo, disciplina, questaoIds: parseQuestionIds(body['questaoIds']) };
}

export function parseQuestionIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 100) {
    throw new SimuladoValidationError('questaoIds deve conter entre 1 e 100 identificadores.');
  }
  if (value.some((id) => typeof id !== 'string' || !uuidPattern.test(id))) {
    throw new SimuladoValidationError('Todos os identificadores de questão devem ser UUIDs válidos.');
  }
  const ids = value as string[];
  if (new Set(ids).size !== ids.length) {
    throw new SimuladoValidationError('O simulado não pode conter questões duplicadas.');
  }
  return ids;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function increment(counts: Record<string, number>, key: string): void {
  counts[key] = (counts[key] ?? 0) + 1;
}

export function auditSimulado(questions: AuditQuestion[]) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const difficultyDistribution: Record<string, number> = {};
  const descriptorDistribution: Record<string, number> = {};
  const answerDistribution: Record<string, number> = {};

  if (questions.length === 0) {
    errors.push('Adicione ao menos uma questão ao simulado.');
  }

  for (const [index, question] of questions.entries()) {
    const questionNumber = index + 1;
    if (question.status !== 'HOMOLOGADA' || !question.ehHomologada) {
      errors.push(`Questão ${questionNumber}: não está homologada e ativa no Banco de Questões.`);
    }
    if (!question.enunciado.trim()) {
      errors.push(`Questão ${questionNumber}: enunciado não informado.`);
    }
    if (!Array.isArray(question.alternativas) || question.alternativas.length < 2 ||
      question.alternativas.some((alternative) => typeof alternative !== 'string' || !alternative.trim())) {
      errors.push(`Questão ${questionNumber}: alternativas ausentes ou inválidas.`);
    }

    const answer = question.gabaritoCorreto;
    const options = Array.isArray(question.alternativas) ? question.alternativas : [];
    if (!answer || !/^[A-Z]$/.test(answer)) {
      errors.push(`Questão ${questionNumber}: gabarito ausente ou inválido.`);
    } else {
      const answerIndex = answer.charCodeAt(0) - 65;
      if (answerIndex < 0 || answerIndex >= options.length) {
        errors.push(`Questão ${questionNumber}: gabarito não corresponde a uma alternativa.`);
      }
      increment(answerDistribution, answer);
    }

    const metadata = isRecord(question.metadata) ? question.metadata : {};
    const difficulty = metadata['dificuldade'];
    const bncc = metadata['bncc'];
    if (typeof difficulty === 'string' && difficulty.trim()) {
      increment(difficultyDistribution, difficulty.trim());
    } else {
      warnings.push(`Questão ${questionNumber}: dificuldade não informada.`);
    }
    if (question.descritorSaeb?.trim()) {
      increment(descriptorDistribution, question.descritorSaeb.trim());
    } else {
      warnings.push(`Questão ${questionNumber}: descritor SAEB não informado.`);
    }
    if (typeof bncc !== 'string' || !bncc.trim()) {
      warnings.push(`Questão ${questionNumber}: habilidade BNCC não informada.`);
    }
  }

  return {
    canPublish: errors.length === 0,
    totalQuestoes: questions.length,
    errors,
    warnings,
    distribuicao: {
      dificuldade: difficultyDistribution,
      descritoresSaeb: descriptorDistribution,
      gabaritos: answerDistribution,
    },
  };
}

export function toPrismaJson(value: object): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
