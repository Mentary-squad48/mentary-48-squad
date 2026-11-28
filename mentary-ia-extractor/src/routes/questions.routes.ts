import { Router, type Request, type Response } from 'express';
import { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import { requireSupabaseUser } from '../middleware/auth.js';
import {
  CurationValidationError,
  toPrismaJson,
  validateCurationPatch,
  validateForApproval,
} from '../services/curation.service.js';
import {
  listQuestionBank,
  listRejectedQuestions,
  listReviewQueue,
} from '../services/review-queue.service.js';
import { ensureUsuario } from '../services/user.service.js';

const router = Router();

function getUuidParam(request: Request, response: Response): string | null {
  const value = request.params['id'];
  if (typeof value !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    response.status(400).json({ error: 'Identificador inválido.' });
    return null;
  }
  return value;
}

async function findOwnedQuestion(questionId: string, usuarioId: string) {
  return prisma.questao.findFirst({
    where: { id: questionId, documento: { is: { usuarioId } } },
  });
}

router.get('/review-queue', requireSupabaseUser, async (request, response) => {
  const usuarioId = await ensureUsuario(request.authenticatedUser);
  const questions = await listReviewQueue(usuarioId);
  response.json({ questions });
});

router.get('/bank', requireSupabaseUser, async (request, response) => {
  const usuarioId = await ensureUsuario(request.authenticatedUser);
  const questions = await listQuestionBank(usuarioId);
  response.json({ questions });
});

router.get('/rejected', requireSupabaseUser, async (request, response) => {
  const usuarioId = await ensureUsuario(request.authenticatedUser);
  const questions = await listRejectedQuestions(usuarioId);
  response.json({ questions });
});

router.get('/:id', requireSupabaseUser, async (request: Request, response: Response) => {
  const questionId = getUuidParam(request, response);
  if (!questionId) return;
  const usuarioId = await ensureUsuario(request.authenticatedUser);
  const question = await findOwnedQuestion(questionId, usuarioId);
  if (!question) {
    response.status(404).json({ error: 'Questão não encontrada.' });
    return;
  }
  response.json({ question });
});

router.patch('/:id', requireSupabaseUser, async (request: Request, response: Response) => {
  const questionId = getUuidParam(request, response);
  if (!questionId) return;
  let patch;
  try {
    patch = validateCurationPatch(request.body);
  } catch (error) {
    if (error instanceof CurationValidationError) {
      response.status(400).json({ error: error.message });
      return;
    }
    throw error;
  }

  const usuarioId = await ensureUsuario(request.authenticatedUser);
  const current = await findOwnedQuestion(questionId, usuarioId);
  if (!current) {
    response.status(404).json({ error: 'Questão não encontrada.' });
    return;
  }
  if (current.status === 'HOMOLOGADA') {
    response.status(409).json({ error: 'Questões homologadas não podem ser editadas diretamente. Rejeite a questão primeiro.' });
    return;
  }

  const effectiveAlternatives = patch.alternativas ?? current.alternativas;
  const effectiveAnswer = patch.gabaritoCorreto !== undefined ? patch.gabaritoCorreto : current.gabaritoCorreto;
  if ((patch.alternativas !== undefined || patch.gabaritoCorreto !== undefined) && effectiveAnswer) {
    if (!Array.isArray(effectiveAlternatives) || effectiveAlternatives.length < 2) {
      response.status(400).json({ error: 'Cadastre pelo menos duas alternativas antes de definir o gabarito.' });
      return;
    }
    const answerIndex = effectiveAnswer.charCodeAt(0) - 65;
    if (answerIndex < 0 || answerIndex >= effectiveAlternatives.length) {
      response.status(400).json({ error: 'O gabarito não corresponde a uma alternativa cadastrada.' });
      return;
    }
  }

  const data: Prisma.QuestaoUpdateInput = {};
  if (patch.enunciado !== undefined) data['enunciado'] = patch.enunciado;
  if (patch.textoBase !== undefined) data['textoBase'] = patch.textoBase;
  if (patch.explicacao !== undefined) data['explicacao'] = patch.explicacao;
  if (patch.componenteCurricular !== undefined) data['componenteCurricular'] = patch.componenteCurricular;
  if (patch.gabaritoCorreto !== undefined) data['gabaritoCorreto'] = patch.gabaritoCorreto;
  if (patch.descritorSaeb !== undefined) data['descritorSaeb'] = patch.descritorSaeb;
  if (patch.alternativas !== undefined) data['alternativas'] = patch.alternativas;
  if (patch.metadata !== undefined) {
    const baseMetadata = typeof current.metadata === 'object' && current.metadata !== null && !Array.isArray(current.metadata)
      ? current.metadata as Record<string, unknown>
      : {};
    data['metadata'] = toPrismaJson({ ...baseMetadata, ...patch.metadata });
  }
  if (current.status === 'REJEITADA') {
    data['status'] = 'PENDENTE';
    data['ehHomologada'] = false;
    data['motivoRejeicao'] = null;
    data['validador'] = { disconnect: true };
    data['dataValidacao'] = null;
  }
  if (Object.keys(data).length === 0) {
    response.status(400).json({ error: 'Nenhum campo editável foi informado.' });
    return;
  }

  const updated = await prisma.questao.update({
    where: { id: questionId },
    data,
  });
  response.json({ question: updated });
});

router.patch('/:id/approve', requireSupabaseUser, async (request: Request, response: Response) => {
  const questionId = getUuidParam(request, response);
  if (!questionId) return;

  const usuarioId = await ensureUsuario(request.authenticatedUser);
  const current = await findOwnedQuestion(questionId, usuarioId);
  if (!current) {
    response.status(404).json({ error: 'Questão não encontrada.' });
    return;
  }
  if (current.status !== 'PENDENTE') {
    response.status(409).json({ error: `A questão está ${current.status.toLowerCase()} e não pode ser homologada.` });
    return;
  }
  try {
    validateForApproval(current);
  } catch (error) {
    if (error instanceof CurationValidationError) {
      response.status(400).json({ error: error.message });
      return;
    }
    throw error;
  }

  const result = await prisma.questao.updateMany({
    where: { id: questionId, status: 'PENDENTE', documento: { is: { usuarioId } } },
    data: {
      ehHomologada: true,
      status: 'HOMOLOGADA',
      validadorId: usuarioId,
      dataValidacao: new Date(),
      motivoRejeicao: null,
    },
  });
  if (result.count === 0) {
    response.status(409).json({ error: 'A questão mudou de estado durante a operação.' });
    return;
  }
  const approved = await prisma.questao.findUnique({ where: { id: questionId } });
  response.json({ approved: true, question: approved });
});

router.patch('/:id/reject', requireSupabaseUser, async (request: Request, response: Response) => {
  const questionId = getUuidParam(request, response);
  if (!questionId) return;
  if (typeof request.body?.motivo !== 'string' || !request.body.motivo.trim()) {
    response.status(400).json({ error: 'Informe o motivo da rejeição no campo "motivo".' });
    return;
  }
  if (request.body.motivo.trim().length > 2_000) {
    response.status(400).json({ error: 'O motivo da rejeição excede 2.000 caracteres.' });
    return;
  }

  const usuarioId = await ensureUsuario(request.authenticatedUser);
  const current = await findOwnedQuestion(questionId, usuarioId);
  if (!current) {
    response.status(404).json({ error: 'Questão não encontrada.' });
    return;
  }
  if (current.status === 'REJEITADA') {
    response.status(409).json({ error: 'A questão já está rejeitada.' });
    return;
  }
  const result = await prisma.questao.updateMany({
    where: {
      id: questionId,
      status: { in: ['PENDENTE', 'HOMOLOGADA'] },
      documento: { is: { usuarioId } },
    },
    data: {
      ehHomologada: false,
      status: 'REJEITADA',
      validadorId: usuarioId,
      dataValidacao: new Date(),
      motivoRejeicao: request.body.motivo.trim(),
    },
  });
  if (result.count === 0) {
    response.status(409).json({ error: 'A questão mudou de estado durante a operação.' });
    return;
  }
  const rejected = await prisma.questao.findUnique({ where: { id: questionId } });
  response.json({ rejected: true, question: rejected });
});

export default router;
