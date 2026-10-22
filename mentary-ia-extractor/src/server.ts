import 'dotenv/config';
import { app } from './app.js';
import { prisma } from './lib/prisma.js';
import { scheduleExtraction } from './services/extraction.service.js';

const port = Number.parseInt(process.env.PORT ?? '3000', 10);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT deve ser um número entre 1 e 65535.');
}

const server = app.listen(port, () => {
  console.log(`API Mentary disponível em http://localhost:${port}`);
  void prisma.documento.findMany({
    where: { statusProcessamento: 'PENDENTE', storagePath: { not: null } },
    select: { id: true },
  }).then((documents) => documents.forEach(({ id }) => scheduleExtraction(id)))
    .catch((error: unknown) => console.error('Falha ao retomar documentos pendentes:', error));
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(() => {
      void prisma.$disconnect().finally(() => process.exit(0));
    });
  });
}
