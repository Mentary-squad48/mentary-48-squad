import type { User } from '@supabase/supabase-js';
import { prisma } from '../lib/prisma.js';

function userName(user: User): string {
  const name = user.user_metadata['full_name'];
  return typeof name === 'string' && name.trim() ? name.trim().slice(0, 200) : user.email ?? 'Docente';
}

export async function ensureUsuario(user: User | undefined): Promise<string> {
  if (!user) {
    throw Object.assign(new Error('Autenticação obrigatória.'), { statusCode: 401 });
  }
  if (!user.email) {
    throw Object.assign(new Error('A conta autenticada não possui e-mail.'), { statusCode: 403 });
  }

  const byAuthId = await prisma.usuario.findUnique({ where: { authUserId: user.id } });
  if (byAuthId) {
    return byAuthId.id;
  }

  const byEmail = await prisma.usuario.findUnique({ where: { email: user.email } });
  if (byEmail) {
    if (!user.email_confirmed_at) {
      throw Object.assign(new Error('Confirme o e-mail no Supabase Auth antes de vincular esta conta.'), { statusCode: 403 });
    }
    if (byEmail.authUserId && byEmail.authUserId !== user.id) {
      throw Object.assign(new Error('O e-mail já está vinculado a outra conta.'), { statusCode: 409 });
    }
    const linked = await prisma.usuario.update({
      where: { id: byEmail.id },
      data: { authUserId: user.id },
    });
    return linked.id;
  }

  const created = await prisma.usuario.create({
    data: {
      nome: userName(user),
      email: user.email,
      authUserId: user.id,
      papel: 'DOCENTE',
    },
  });
  return created.id;
}
