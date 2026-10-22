import assert from 'node:assert/strict';
import test from 'node:test';
import { agruparPaginas, extrairDeImagem } from '../src/services/extractor.js';

test('agruparPaginas returns no batches for an empty document', () => {
  assert.deepEqual(agruparPaginas(0), []);
});

test('agruparPaginas keeps a one-page overlap between batches', () => {
  assert.deepEqual(agruparPaginas(10, 5, 1), [
    [1, 2, 3, 4, 5],
    [5, 6, 7, 8, 9],
    [9, 10],
  ]);
});

test('agruparPaginas splits a 60-page PDF into bounded batches with full coverage', () => {
  const batches = agruparPaginas(60);
  const pages = new Set(batches.flat());
  assert.equal(batches.length, 15);
  assert.equal(pages.size, 60);
  assert.equal(Math.min(...pages), 1);
  assert.equal(Math.max(...pages), 60);
});

test('agruparPaginas covers each page when overlap is disabled', () => {
  assert.deepEqual(agruparPaginas(7, 3, 0), [
    [1, 2, 3],
    [4, 5, 6],
    [7],
  ]);
});

test('agruparPaginas rejects invalid limits', () => {
  assert.throws(() => agruparPaginas(-1), /inteiro não negativo/);
  assert.throws(() => agruparPaginas(10, 3, 3), /sobreposição/);
});

test('extrairDeImagem rejects unsupported extensions before reading or calling Gemini', async () => {
  await assert.rejects(extrairDeImagem('imagem.gif'), /Formato de imagem não suportado/);
});
