export const DISCIPLINAS = [
  { value: 'lp', label: 'Língua Portuguesa' },
  { value: 'mat', label: 'Matemática' },
  { value: 'cie', label: 'Ciências' },
]

export const BNCC = [
  { value: 'EF69LP03', label: 'EF69LP03 · Fato central em notícias', disciplina: 'lp' },
  { value: 'EF06MA01', label: 'EF06MA01 · Números naturais e racionais', disciplina: 'mat' },
  { value: 'EF06CI05', label: 'EF06CI05 · Organização básica das células', disciplina: 'cie' },
]

export const SAEB = [
  { value: 'D1', label: 'D1 · Localizar informações explícitas', disciplina: 'lp' },
  { value: 'D6', label: 'D6 · Identificar o tema de um texto', disciplina: 'lp' },
  { value: 'EX-MAT', label: 'Descritor de exemplo (Matemática)', disciplina: 'mat' },
  { value: 'EX-CIE', label: 'Descritor de exemplo (Ciências)', disciplina: 'cie' },
]

export const ANOS = ['6º ano', '7º ano', '8º ano', '9º ano']
export const DIFICULDADES = ['Fácil', 'Médio', 'Difícil']

/* Questões já homologadas (tela Banco de Questões) */
export const QUESTOES_BANCO = [
  {
    id: 1, disciplina: 'lp', bncc: 'EF69LP03', saeb: 'D1', ano: '6º ano', dificuldade: 'Médio',
    enunciado: 'Segundo o texto sobre a Copa de 2014, qual foi o nome escolhido para a mascote?',
    alternativas: ['Amijubi', 'Fuleco', 'Zuzeco', 'Futebol'], gabarito: 1,
  },
  {
    id: 2, disciplina: 'lp', bncc: 'EF69LP03', saeb: 'D1', ano: '6º ano', dificuldade: 'Fácil',
    enunciado: 'Em uma notícia, o "fato central" corresponde a:',
    alternativas: ['O que aconteceu', 'A opinião do autor', 'O título da página', 'A data de publicação'], gabarito: 0,
  },
  {
    id: 3, disciplina: 'mat', bncc: 'EF06MA01', saeb: 'EX-MAT', ano: '6º ano', dificuldade: 'Fácil',
    enunciado: 'Qual número é maior: 0,75 ou 0,8?',
    alternativas: ['0,75', '0,8', 'São iguais', 'Não é possível comparar'], gabarito: 1,
  },
  {
    id: 4, disciplina: 'mat', bncc: 'EF06MA01', saeb: 'EX-MAT', ano: '6º ano', dificuldade: 'Médio',
    enunciado: 'Ordene do menor para o maior: 1/2, 0,3 e 0,6.',
    alternativas: ['0,3; 1/2; 0,6', '1/2; 0,3; 0,6', '0,6; 1/2; 0,3', '0,3; 0,6; 1/2'], gabarito: 0,
  },
  {
    id: 5, disciplina: 'mat', bncc: 'EF06MA01', saeb: 'EX-MAT', ano: '6º ano', dificuldade: 'Médio',
    enunciado: 'Qual é o maior número entre 10.203, 10.320 e 10.302?',
    alternativas: ['10.203', '10.320', '10.302', 'São iguais'], gabarito: 1,
  },
  {
    id: 6, disciplina: 'cie', bncc: 'EF06CI05', saeb: 'EX-CIE', ano: '6º ano', dificuldade: 'Médio',
    enunciado: 'Qual estrutura controla a entrada e a saída de substâncias na célula?',
    alternativas: ['Núcleo', 'Membrana plasmática', 'Mitocôndria', 'Ribossomo'], gabarito: 1,
  },
  {
    id: 7, disciplina: 'cie', bncc: 'EF06CI05', saeb: 'EX-CIE', ano: '6º ano', dificuldade: 'Fácil',
    enunciado: 'Qual organela é conhecida como a "usina de energia" da célula?',
    alternativas: ['Lisossomo', 'Mitocôndria', 'Cloroplasto', 'Vacúolo'], gabarito: 1,
  },
  {
    id: 8, disciplina: 'cie', bncc: 'EF06CI05', saeb: 'EX-CIE', ano: '6º ano', dificuldade: 'Difícil',
    enunciado: 'Qual estrutura é característica das células vegetais e ausente nas células animais?',
    alternativas: ['Núcleo', 'Parede celular', 'Ribossomos', 'Membrana plasmática'], gabarito: 1,
  },
]

/* Questões "extraídas pela IA" (tela de Revisão) */
export const QUESTOES_EXTRAIDAS = [
  {
    id: 1, status: 'pendente', motivo: '',
    apoio:
      'Copa 2014\nA Fifa anunciou na noite deste domingo o nome da mascote oficial da Copa do Mundo de 2014. Depois de uma eleição que durou três meses e oferecia três alternativas – todas sugeridas pela própria Fifa – a palavra Fuleco foi escolhida por 1,7 milhão de brasileiros, que corresponde a 48% dos votos. O nome vencedor vem da fusão de “futebol” e “ecologia”.\n\nEm segundo lugar ficou Zuzeco, com 31%, que era a combinação entre “azul” e “ecologia”. O nome Amijubi, de “amizade” e “júbilo”, terminou em terceiro lugar, com 21% dos votos.',
    enunciado: 'A informação principal desse texto está no trecho:',
    alternativas: [
      '“Depois de uma eleição que durou três meses […] a palavra Fuleco foi escolhida...”.',
      '“O nome vencedor vem da fusão de ‘futebol’ e ‘ecologia’.”.',
      '“Em segundo lugar ficou Zuzeco […] que era a combinação entre ‘azul’ e ‘ecologia’.”.',
      '“O nome Amijubi, de ‘amizade’ e ‘júbilo’, terminou em terceiro lugar...”.',
    ],
    gabarito: 1, disciplina: 'lp', bncc: 'EF69LP03', saeb: 'D1', dificuldade: 'Médio',
  },
  {
    id: 2, status: 'pendente', motivo: '', apoio: '',
    enunciado: 'Qual número é maior: 0,75 ou 0,8?',
    alternativas: ['0,75', '0,8', 'São iguais', 'Não é possível comparar'],
    gabarito: 1, disciplina: 'mat', bncc: '', saeb: '', dificuldade: '',
  },
  {
    id: 3, status: 'pendente', motivo: '', apoio: '',
    enunciado: 'Qual organela é conhecida como a "usina de energia" da célula?',
    alternativas: ['Lisossomo', 'Mitocôndria', 'Cloroplasto', 'Vacúolo'],
    gabarito: 1, disciplina: 'cie', bncc: 'EF06CI05', saeb: '', dificuldade: 'Fácil',
  },
]