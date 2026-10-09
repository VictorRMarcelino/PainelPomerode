// Nomes simples dos órgãos para exibição ("Secretaria de Educação e Formação Empreendedora" → "Educação").
//
// Também servem de chave de agrupamento: a API grava o mesmo órgão ora com acento, ora sem
// ("Fundo Municipal de Saúde" / "Fundo Municipal de Saude"), e agrupar pelo texto exato
// dividiria um órgão em dois.

export const semAcento = (texto: string) =>
  texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

// Ordem importa: o primeiro termo encontrado define o nome.
const NOMES_SIMPLES: [termo: string, nome: string][] = [
  ['educacao', 'Educação'],
  ['saude', 'Saúde'],
  ['aposentadoria', 'Previdência'],
  ['gestao administrativa', 'Administração'],
  ['obras', 'Obras'],
  ['turismo', 'Turismo e Cultura'],
  ['agua e esgoto', 'Água e Esgoto'],
  ['planejamento', 'Planejamento'],
  ['desenvolvimento social', 'Assistência Social'],
  ['desenvolvimento rural', 'Agricultura'],
  ['esporte', 'Esporte e Lazer'],
  ['camara', 'Câmara Municipal'],
  ['transparencia', 'Transparência'],
  ['procuradoria', 'Procuradoria'],
  ['gabinete', 'Gabinete do Prefeito'],
  ['secretaria de governo', 'Governo'],
]

export function nomeSimplesOrgao(nome: string): string {
  const chave = semAcento(nome)
  const encontrado = NOMES_SIMPLES.find(([termo]) => chave.includes(termo))
  if (encontrado) return encontrado[1]
  // Órgão novo, fora da lista: só tira o "Secretaria de".
  return nome.trim().replace(/^Secretaria (Municipal )?(de |da |do )?/i, '')
}

// Entre as grafias de um mesmo órgão, prefere a acentuada para mostrar o nome completo.
export function melhorGrafia(atual: string | undefined, nova: string): string {
  if (!atual) return nova
  const acentos = (texto: string) => texto.length - semAcento(texto).length + (texto.match(/[^\x00-\x7F]/g)?.length ?? 0)
  return acentos(nova) > acentos(atual) ? nova : atual
}
