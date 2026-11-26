import { Router, type Request, type Response } from 'express';
import { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import { requireSupabaseUser } from '../middleware/auth.js';
import {
  auditSimulado,
  parseQuestionIds,
  parseSimuladoInput,
  SimuladoValidationError,
  toPrismaJson,
} from '../services/simulados.service.js';
import { ensureUsuario } from '../services/user.service.js';

const router = Router();
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const questionSelection = {
  id: true,
  enunciado: true,
  textoBase: true,
  alternativas: true,
  explicacao: true,
  componenteCurricular: true,
  gabaritoCorreto: true,
  descritorSaeb: true,
  metadata: true,
} as const;

function getId(request: Request, response: Response): string | null {
  const id = request.params['id'];
  if (typeof id !== 'string' || !uuidPattern.test(id)) {
    response.status(400).json({ error: 'Identificador inválido.' });
    return null;
  }
  return id;
}

function parsePage(value: unknown, fallback: number, maximum: number): number | null {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return parsed >= 1 && parsed <= maximum ? parsed : null;
}

function stringQuery(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function questionWhere(usuarioId: string, ids: string[]): Prisma.QuestaoWhereInput {
  return {
    id: { in: ids },
    status: 'HOMOLOGADA',
    ehHomologada: true,
    documento: { is: { usuarioId } },
  };
}

async function validateQuestionOwnership(ids: string[], usuarioId: string): Promise<boolean> {
  const count = await prisma.questao.count({ where: questionWhere(usuarioId, ids) });
  return count === ids.length;
}

async function findOwnedSimulado(id: string, usuarioId: string) {
  return prisma.simulado.findFirst({ where: { id, usuarioId } });
}

router.get('/questions', requireSupabaseUser, async (request, response) => {
  const page = parsePage(request.query['page'], 1, 1_000_000);
  const pageSize = parsePage(request.query['pageSize'], 20, 100);
  if (page === null || pageSize === null) {
    response.status(400).json({ error: 'page deve ser positivo e pageSize deve estar entre 1 e 100.' });
    return;
  }

  const usuarioId = await ensureUsuario(request.authenticatedUser);
  const filters: Prisma.QuestaoWhereInput[] = [];
  const componenteCurricular = stringQuery(request.query['componenteCurricular']);
  const descritorSaeb = stringQuery(request.query['descritorSaeb']);
  const anoEscolar = stringQuery(request.query['anoEscolar']);
  const bncc = stringQuery(request.query['bncc']);
  const dificuldade = stringQuery(request.query['dificuldade']);
  if (componenteCurricular) filters.push({ componenteCurricular: { contains: componenteCurricular, mode: 'insensitive' } });
  if (descritorSaeb) filters.push({ descritorSaeb: { contains: descritorSaeb, mode: 'insensitive' } });
  if (anoEscolar) filters.push({ metadata: { path: ['ano_escolar'], string_contains: anoEscolar } });
  if (bncc) filters.push({ metadata: { path: ['bncc'], string_contains: bncc } });
  if (dificuldade) filters.push({ metadata: { path: ['dificuldade'], string_contains: dificuldade } });
  const where: Prisma.QuestaoWhereInput = {
    status: 'HOMOLOGADA',
    ehHomologada: true,
    documento: { is: { usuarioId } },
    ...(filters.length > 0 ? { AND: filters } : {}),
  };

  const [total, questions] = await prisma.$transaction([
    prisma.questao.count({ where }),
    prisma.questao.findMany({
      where,
      orderBy: { id: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: questionSelection,
    }),
  ]);
  response.json({
    questions,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
});

router.get('/', requireSupabaseUser, async (request, response) => {
  const usuarioId = await ensureUsuario(request.authenticatedUser);
  const simulados = await prisma.simulado.findMany({
    where: { usuarioId },
    orderBy: { id: 'desc' },
    select: {
      id: true,
      titulo: true,
      disciplina: true,
      status: true,
      dataValidacao: true,
      dataPublicacao: true,
      _count: { select: { itens: true } },
    },
  });
  response.json({ simulados });
});

router.post('/', requireSupabaseUser, async (request, response) => {
  let input;
  try {
    input = parseSimuladoInput(request.body);
  } catch (error) {
    if (error instanceof SimuladoValidationError) {
      response.status(400).json({ error: error.message });
      return;
    }
    throw error;
  }

  const usuarioId = await ensureUsuario(request.authenticatedUser);
  if (!await validateQuestionOwnership(input.questaoIds, usuarioId)) {
    response.status(400).json({ error: 'Todas as questões devem existir, estar homologadas e pertencer à sua conta.' });
    return;
  }
  const simulado = await prisma.$transaction(async (transaction) => {
    const created = await transaction.simulado.create({
      data: { usuarioId, titulo: input.titulo, disciplina: input.disciplina },
    });
    await transaction.itemSimulado.createMany({
      data: input.questaoIds.map((questaoId, index) => ({
        simuladoId: created.id,
        questaoId,
        ordem: index + 1,
      })),
    });
    return transaction.simulado.findUniqueOrThrow({
      where: { id: created.id },
      include: { itens: { orderBy: { ordem: 'asc' }, include: { questao: { select: questionSelection } } } },
    });
  });
  response.status(201).json({ simulado });
});

router.get('/:id', requireSupabaseUser, async (request, response) => {
  const id = getId(request, response);
  if (!id) return;
  const usuarioId = await ensureUsuario(request.authenticatedUser);
  const simulado = await prisma.simulado.findFirst({
    where: { id, usuarioId },
    include: { itens: { orderBy: { ordem: 'asc' }, include: { questao: { select: questionSelection } } } },
  });
  if (!simulado) {
    response.status(404).json({ error: 'Simulado não encontrado.' });
    return;
  }
  response.json({ simulado });
});

router.put('/:id/questions', requireSupabaseUser, async (request, response) => {
  const id = getId(request, response);
  if (!id) return;
  let questionIds: string[];
  try {
    questionIds = parseQuestionIds(request.body?.questaoIds);
  } catch (error) {
    if (error instanceof SimuladoValidationError) {
      response.status(400).json({ error: error.message });
      return;
    }
    throw error;
  }

  const usuarioId = await ensureUsuario(request.authenticatedUser);
  const simulado = await findOwnedSimulado(id, usuarioId);
  if (!simulado) {
    response.status(404).json({ error: 'Simulado não encontrado.' });
    return;
  }
  if (simulado.status === 'PUBLICADO') {
    response.status(409).json({ error: 'Um simulado publicado não pode ser alterado.' });
    return;
  }
  if (!await validateQuestionOwnership(questionIds, usuarioId)) {
    response.status(400).json({ error: 'Todas as questões devem existir, estar homologadas e pertencer à sua conta.' });
    return;
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.itemSimulado.deleteMany({ where: { simuladoId: id } });
    await transaction.itemSimulado.createMany({
      data: questionIds.map((questaoId, index) => ({ simuladoId: id, questaoId, ordem: index + 1 })),
    });
    await transaction.simulado.update({
      where: { id },
      data: { status: 'RASCUNHO', relatorioValidacao: Prisma.DbNull, dataValidacao: null },
    });
  });
  const updated = await prisma.simulado.findUniqueOrThrow({
    where: { id },
    include: { itens: { orderBy: { ordem: 'asc' }, include: { questao: { select: questionSelection } } } },
  });
  response.json({ simulado: updated });
});

router.post('/:id/validate', requireSupabaseUser, async (request, response) => {
  const id = getId(request, response);
  if (!id) return;
  const usuarioId = await ensureUsuario(request.authenticatedUser);
  const simulado = await prisma.simulado.findFirst({
    where: { id, usuarioId },
    include: { itens: { orderBy: { ordem: 'asc' }, include: { questao: true } } },
  });
  if (!simulado) {
    response.status(404).json({ error: 'Simulado não encontrado.' });
    return;
  }
  if (simulado.status === 'PUBLICADO') {
    response.status(409).json({ error: 'O simulado já foi publicado.' });
    return;
  }

  const report = auditSimulado(simulado.itens.map(({ questao }) => questao));
  const validatedAt = new Date();
  const updated = await prisma.simulado.update({
    where: { id },
    data: {
      status: report.canPublish ? 'VALIDADO' : 'RASCUNHO',
      relatorioValidacao: toPrismaJson(report),
      dataValidacao: validatedAt,
    },
  });
  response.json({ canPublish: report.canPublish, report, simulado: updated });
});

router.post('/:id/publish', requireSupabaseUser, async (request, response) => {
  const id = getId(request, response);
  if (!id) return;
  const usuarioId = await ensureUsuario(request.authenticatedUser);
  const simulado = await prisma.simulado.findFirst({
    where: { id, usuarioId },
    include: { itens: { orderBy: { ordem: 'asc' }, include: { questao: true } } },
  });
  if (!simulado) {
    response.status(404).json({ error: 'Simulado não encontrado.' });
    return;
  }
  if (simulado.status !== 'VALIDADO') {
    response.status(409).json({ error: 'Valide o simulado sem pendências antes de publicar.' });
    return;
  }
  const report = auditSimulado(simulado.itens.map(({ questao }) => questao));
  if (!report.canPublish) {
    const updated = await prisma.simulado.update({
      where: { id },
      data: {
        status: 'RASCUNHO',
        relatorioValidacao: toPrismaJson(report),
        dataValidacao: new Date(),
      },
    });
    response.status(409).json({
      error: 'O simulado possui questões que deixaram de atender aos critérios de publicação.',
      report,
      simulado: updated,
    });
    return;
  }
  const result = await prisma.simulado.updateMany({
    where: { id, usuarioId, status: 'VALIDADO' },
    data: { status: 'PUBLICADO', dataPublicacao: new Date() },
  });
  if (result.count === 0) {
    const simulado = await findOwnedSimulado(id, usuarioId);
    if (!simulado) {
      response.status(404).json({ error: 'Simulado não encontrado.' });
      return;
    }
    response.status(409).json({ error: 'Valide o simulado sem pendências antes de publicar.' });
    return;
  }
  const published = await prisma.simulado.findUniqueOrThrow({
    where: { id },
    include: { itens: { orderBy: { ordem: 'asc' }, include: { questao: { select: questionSelection } } } },
  });
  response.json({ published: true, simulado: published });
});

export default router;
