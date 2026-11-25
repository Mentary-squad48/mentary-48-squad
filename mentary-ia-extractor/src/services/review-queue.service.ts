import { prisma } from '../lib/prisma.js';

export async function listReviewQueue(usuarioId: string) {
  return prisma.questao.findMany({
    where: {
      status: 'PENDENTE',
      documento: {
        is: {
          usuarioId,
          statusProcessamento: 'PROCESSADO',
        },
      },
    },
    orderBy: { id: 'asc' },
    select: {
      id: true,
      enunciado: true,
      textoBase: true,
      alternativas: true,
      explicacao: true,
      componenteCurricular: true,
      gabaritoCorreto: true,
      descritorSaeb: true,
      metadata: true,
      status: true,
      motivoRejeicao: true,
      validadorId: true,
      dataValidacao: true,
      documento: {
        select: {
          id: true,
          nomeArquivo: true,
        },
      },
    },
  });
}

export async function listQuestionBank(usuarioId: string) {
  return prisma.questao.findMany({
    where: {
      status: 'HOMOLOGADA',
      ehHomologada: true,
      documento: { is: { usuarioId } },
    },
    orderBy: { dataValidacao: 'desc' },
    select: {
      id: true,
      enunciado: true,
      textoBase: true,
      alternativas: true,
      explicacao: true,
      componenteCurricular: true,
      gabaritoCorreto: true,
      descritorSaeb: true,
      metadata: true,
      status: true,
      validadorId: true,
      dataValidacao: true,
      documento: { select: { id: true, nomeArquivo: true } },
    },
  });
}

export async function listRejectedQuestions(usuarioId: string) {
  return prisma.questao.findMany({
    where: {
      status: 'REJEITADA',
      documento: { is: { usuarioId } },
    },
    orderBy: { dataValidacao: 'desc' },
    select: {
      id: true,
      enunciado: true,
      textoBase: true,
      alternativas: true,
      explicacao: true,
      componenteCurricular: true,
      gabaritoCorreto: true,
      descritorSaeb: true,
      metadata: true,
      status: true,
      motivoRejeicao: true,
      validadorId: true,
      dataValidacao: true,
      documento: { select: { id: true, nomeArquivo: true } },
    },
  });
}
