import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';

export interface StoredAsset {
  bucket: string;
  path: string;
  contentType: string;
  originalName: string;
}

let supabase: SupabaseClient | undefined;

function getSupabaseClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error('Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.');
  }
  supabase ??= createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return supabase;
}

export function getStorageBucket(): string {
  const bucket = process.env.SUPABASE_BUCKET;
  if (!bucket) {
    throw new Error('Configure SUPABASE_BUCKET no .env.');
  }
  return bucket;
}

function safeFileName(fileName: string): string {
  const cleaned = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
  return cleaned || 'upload';
}

export async function uploadSourceFile(localPath: string, contentType: string): Promise<StoredAsset> {
  const originalName = path.basename(localPath);
  const file = await fs.readFile(localPath);
  return uploadSourceBuffer(file, originalName, contentType);
}

export async function uploadSourceBuffer(
  file: Uint8Array,
  originalName: string,
  contentType: string,
  ownerId?: string,
): Promise<StoredAsset> {
  const bucket = getStorageBucket();
  const ownerPath = ownerId ? `users/${ownerId}/` : '';
  const objectPath = `${ownerPath}incoming/${new Date().toISOString().slice(0, 10)}/${randomUUID()}/${safeFileName(originalName)}`;
  const { error } = await getSupabaseClient()
    .storage
    .from(bucket)
    .upload(objectPath, file, { contentType, upsert: false });

  if (error) {
    throw new Error(`Falha ao enviar o arquivo ao Supabase Storage: ${error.message}`);
  }
  return { bucket, path: objectPath, contentType, originalName };
}

export async function downloadStoredFile(asset: StoredAsset): Promise<Buffer> {
  const { data, error } = await getSupabaseClient().storage.from(asset.bucket).download(asset.path);
  if (error) {
    throw new Error(`Falha ao baixar o arquivo do Supabase Storage: ${error.message}`);
  }
  return Buffer.from(await data.arrayBuffer());
}

export async function uploadReviewResult(objectPath: string, content: Uint8Array): Promise<void> {
  const { error } = await getSupabaseClient()
    .storage
    .from(getStorageBucket())
    .upload(objectPath, content, {
      contentType: 'application/json',
      upsert: true,
    });

  if (error) {
    throw new Error(`Falha ao salvar o resultado na área de revisão do Supabase: ${error.message}`);
  }
}

export async function createReviewDownloadUrl(objectPath: string): Promise<string> {
  return createStoredAssetDownloadUrl(getStorageBucket(), objectPath);
}

export async function createStoredAssetDownloadUrl(bucket: string, objectPath: string): Promise<string> {
  const expiresIn = Number.parseInt(process.env.REVIEW_URL_TTL_SECONDS ?? '3600', 10);
  if (!Number.isInteger(expiresIn) || expiresIn < 60 || expiresIn > 604800) {
    throw new Error('REVIEW_URL_TTL_SECONDS deve estar entre 60 e 604800 segundos.');
  }
  const { data, error } = await getSupabaseClient()
    .storage
    .from(bucket)
    .createSignedUrl(objectPath, expiresIn);

  if (error) {
    throw new Error(`Falha ao gerar URL temporária para revisão: ${error.message}`);
  }
  return data.signedUrl;
}

export async function removeStoredAsset(asset: StoredAsset): Promise<void> {
  const { error } = await getSupabaseClient().storage.from(asset.bucket).remove([asset.path]);
  if (error) {
    throw new Error(`Falha ao remover o arquivo órfão do Supabase Storage: ${error.message}`);
  }
}
