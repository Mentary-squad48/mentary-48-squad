import { createClient, type User } from '@supabase/supabase-js';
import type { NextFunction, Request, Response } from 'express';

declare global {
  namespace Express {
    interface Request {
      authenticatedUser?: User;
    }
  }
}

let authClient: ReturnType<typeof createClient> | undefined;

function getAuthClient(): ReturnType<typeof createClient> {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('Configure SUPABASE_URL e SUPABASE_ANON_KEY no .env.');
  }
  authClient ??= createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return authClient;
}

export async function requireSupabaseUser(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const authorization = request.header('authorization');
  const match = authorization?.match(/^Bearer\s+(\S+)$/i);
  if (!match) {
    response.status(401).json({ error: 'Envie um token Supabase Auth no cabeçalho Authorization.' });
    return;
  }

  try {
    const { data, error } = await getAuthClient().auth.getUser(match[1]);
    if (error || !data.user) {
      response.status(401).json({ error: 'Token Supabase Auth inválido ou expirado.' });
      return;
    }
    request.authenticatedUser = data.user;
    next();
  } catch (error) {
    next(error);
  }
}
