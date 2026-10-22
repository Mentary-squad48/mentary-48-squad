import { Router, type Request, type Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireSupabaseUser } from '../middleware/auth.js';
import { ensureUsuario } from '../services/user.service.js';

const router = Router();

router.patch('/:id/approve', requireSupabaseUser, async (request: Request, response: Response) => {
  const questionId = request.params['id'];
  if (typeof questionId !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(questionId)) {
    response.status(400).json({ error: 'Identificador inválido.' });
    return;
  }

  const usuarioId = await ensureUsuario(request.authenticatedUser);
  const result = await prisma.questao.updateMany({
    where: {
      id: questionId,
      documento: { usuarioId },
    },
    data: { ehHomologada: true },
  });
  if (result.count === 0) {
    response.status(404).json({ error: 'Questão não encontrada.' });
    return;
  }
  response.json({ approved: true });
});

export default router;
