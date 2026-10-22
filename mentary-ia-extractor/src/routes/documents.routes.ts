import path from 'node:path';
import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { prisma } from '../lib/prisma.js';
import { requireSupabaseUser } from '../middleware/auth.js';
import { scheduleExtraction } from '../services/extraction.service.js';
import { ensureUsuario } from '../services/user.service.js';
import {
  removeStoredAsset,
  uploadSourceBuffer,
  type StoredAsset,
} from '../services/storage.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
});

function detectFileType(buffer: Buffer, fileName: string): string | null {
  const extension = path.extname(fileName).toLowerCase();
  if (extension === '.pdf' && buffer.subarray(0, 5).toString('ascii') === '%PDF-') {
    return 'application/pdf';
  }
  if (extension === '.png' && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return 'image/png';
  }
  if (['.jpg', '.jpeg'].includes(extension) && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  return null;
}

function getUuidParam(request: Request, response: Response): string | null {
  const value = request.params['id'];
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    response.status(400).json({ error: 'Identificador inválido.' });
    return null;
  }
  return value;
}

const questionSelection = {
  id: true,
  enunciado: true,
  alternativas: true,
  gabaritoCorreto: true,
  descritorSaeb: true,
  ehHomologada: true,
  metadata: true,
} as const;

router.post('/', requireSupabaseUser, upload.single('file'), async (request: Request, response: Response) => {
  if (!request.file) {
    response.status(400).json({ error: 'Envie um arquivo no campo "file".' });
    return;
  }
  const contentType = detectFileType(request.file.buffer, request.file.originalname);
  if (!contentType) {
    response.status(415).json({ error: 'Formato inválido. Envie um PDF, PNG ou JPG válido.' });
    return;
  }

  const usuarioId = await ensureUsuario(request.authenticatedUser);
  let asset: StoredAsset | undefined;
  try {
    const name = path.basename(request.file.originalname).slice(0, 255);
    asset = await uploadSourceBuffer(request.file.buffer, name, contentType, usuarioId);
    const document = await prisma.documento.create({
      data: {
        usuarioId,
        nomeArquivo: name,
        storageBucket: asset.bucket,
        storagePath: asset.path,
        contentType: asset.contentType,
      },
      select: { id: true, nomeArquivo: true, statusProcessamento: true },
    });
    scheduleExtraction(document.id);
    response.status(202).json({ document });
  } catch (error) {
    if (asset) {
      try {
        await removeStoredAsset(asset);
      } catch (cleanupError) {
        console.error('Falha ao limpar arquivo após erro ao registrar documento:', cleanupError);
      }
    }
    throw error;
  }
});

router.get('/', requireSupabaseUser, async (request, response) => {
  const usuarioId = await ensureUsuario(request.authenticatedUser);
  const documents = await prisma.documento.findMany({
    where: { usuarioId },
    orderBy: { id: 'desc' },
    select: {
      id: true,
      nomeArquivo: true,
      statusProcessamento: true,
      questoes: { select: questionSelection },
    },
  });
  response.json({ documents });
});

router.get('/:id', requireSupabaseUser, async (request, response) => {
  const documentId = getUuidParam(request, response);
  if (!documentId) {
    return;
  }
  const usuarioId = await ensureUsuario(request.authenticatedUser);
  const document = await prisma.documento.findFirst({
    where: { id: documentId, usuarioId },
    select: {
      id: true,
      nomeArquivo: true,
      statusProcessamento: true,
      questoes: { select: questionSelection },
    },
  });
  if (!document) {
    response.status(404).json({ error: 'Documento não encontrado.' });
    return;
  }
  response.json({ document });
});

router.post('/:id/retry', requireSupabaseUser, async (request, response) => {
  const documentId = getUuidParam(request, response);
  if (!documentId) {
    return;
  }
  const usuarioId = await ensureUsuario(request.authenticatedUser);
  const result = await prisma.documento.updateMany({
    where: {
      id: documentId,
      usuarioId,
      statusProcessamento: 'ERRO',
      storagePath: { not: null },
    },
    data: { statusProcessamento: 'PENDENTE' },
  });
  if (result.count === 0) {
    response.status(404).json({ error: 'Documento com falha não encontrado para este usuário.' });
    return;
  }
  scheduleExtraction(documentId);
  response.status(202).json({ id: documentId, statusProcessamento: 'PENDENTE' });
});

export default router;
