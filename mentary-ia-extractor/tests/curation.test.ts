import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  CurationValidationError,
  validateCurationPatch,
  validateForApproval,
} from '../src/services/curation.service.js';

test('aceita edição parcial válida dos metadados', () => {
  const patch = validateCurationPatch({
    enunciado: 'Enunciado corrigido',
    gabaritoCorreto: 'b',
    alternativas: ['Primeira', 'Segunda'],
    metadata: { bncc: 'EF09MA01', dificuldade: 'MÉDIA' },
  });
  assert.equal(patch.enunciado, 'Enunciado corrigido');
  assert.equal(patch.gabaritoCorreto, 'B');
  assert.deepEqual(patch.metadata, { bncc: 'EF09MA01', dificuldade: 'MÉDIA' });
});

test('rejeita campos não editáveis', () => {
  assert.throws(
    () => validateCurationPatch({ ehHomologada: true }),
    CurationValidationError,
  );
});

test('exige alternativas e gabarito correspondente para homologar', () => {
  assert.throws(
    () => validateForApproval({
      enunciado: 'Enunciado',
      alternativas: ['A'],
      gabaritoCorreto: 'B',
    }),
    CurationValidationError,
  );

  assert.doesNotThrow(() => validateForApproval({
    enunciado: 'Enunciado',
    alternativas: ['A', 'B'],
    gabaritoCorreto: 'B',
  }));
});
