import 'dotenv/config';
import { prisma } from '../src/lib/prisma.js';

try {
  const [database] = await prisma.$queryRaw<Array<{ current_database: string; current_schema: string }>>`
    SELECT current_database(), current_schema()
  `;
  const vector = await prisma.$queryRaw<Array<{ extname: string; extversion: string }>>`
    SELECT extname, extversion
    FROM pg_extension
    WHERE extname = 'vector'
  `;

  if (!database) {
    throw new Error('PostgreSQL não retornou o nome do banco/schema atual.');
  }
  console.log(`Conexão PostgreSQL OK: banco=${database.current_database}, schema=${database.current_schema}`);
  if (vector[0]) {
    console.log(`pgvector habilitado: versão ${vector[0].extversion}`);
  } else {
    console.log('pgvector ainda não está habilitado no banco.');
  }
} catch (error) {
  console.error('Falha ao conectar ao PostgreSQL:', error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
