import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  auditSimulado,
  parseQuestionIds,
  parseSimuladoInput,
  SimuladoValidationError,
} from '../src/services/simulados.service.js';

const questionA = '01b941f3-8ea1-4bae-bf56-2e1486457f84';
const questionB = 'a119638a-7ab2-429b-8094-68c6cd12cd8c';

test('valida dados de criação do simulado', () => {
  assert.deepEqual(parseSimuladoInput({
    titulo: '  Simulado 1 ',
    disciplina: 'Matemática',
    questaoIds: [questionA, questionB],
  }), {
    titulo: 'Simulado 1',
    disciplina: 'Matemática',
    questaoIds: [questionA, questionB],
  });
});

test('rejeita IDs repetidos ou inválidos na composição', () => {
  assert.throws(() => parseQuestionIds([questionA, questionA]), SimuladoValidationError);
  assert.throws(() => parseQuestionIds(['not-a-uuid']), SimuladoValidationError);
});

test('audita gabaritos e retorna distribuição pedagógica', () => {
  const report = auditSimulado([
    {
      id: questionA,
      status: 'HOMOLOGADA',
      ehHomologada: true,
      enunciado: 'Questão de Matemática.',
      gabaritoCorreto: 'B',
      alternativas: ['A', 'B'],
      componenteCurricular: 'Matemática',
      descritorSaeb: 'D23',
      metadata: { dificuldade: 'Média', bncc: 'EF09MA01' },
    },
    {
      id: questionB,
      status: 'HOMOLOGADA',
      ehHomologada: true,
      enunciado: 'Outra questão de Matemática.',
      gabaritoCorreto: 'C',
      alternativas: ['A', 'B'],
      componenteCurricular: 'Matemática',
      descritorSaeb: null,
      metadata: {},
    },
  ]);
  assert.equal(report.canPublish, false);
  assert.ok(report.errors.some((error) => error.includes('gabarito não corresponde')));
  assert.deepEqual(report.distribuicao.gabaritos, { B: 1, C: 1 });
  assert.ok(report.warnings.some((warning) => warning.includes('descritor SAEB não informado')));
});

test('permite publicar questões com gabarito íntegro', () => {
  const report = auditSimulado([{
    id: questionA,
    status: 'HOMOLOGADA',
    ehHomologada: true,
    enunciado: 'Questão de Matemática.',
    gabaritoCorreto: 'B',
    alternativas: ['A', 'B'],
    componenteCurricular: 'Matemática',
    descritorSaeb: 'D23',
    metadata: { dificuldade: 'Média', bncc: 'EF09MA01' },
  }]);
  assert.equal(report.canPublish, true);
  assert.deepEqual(report.errors, []);
});

test('impede publicar questão que deixou de estar homologada', () => {
  const report = auditSimulado([{
    id: questionA,
    status: 'REJEITADA',
    ehHomologada: false,
    enunciado: 'Questão de Matemática.',
    gabaritoCorreto: 'B',
    alternativas: ['A', 'B'],
    componenteCurricular: 'Matemática',
    descritorSaeb: 'D23',
    metadata: { dificuldade: 'Média', bncc: 'EF09MA01' },
  }]);
  assert.equal(report.canPublish, false);
  assert.ok(report.errors.some((error) => error.includes('não está homologada')));
});
