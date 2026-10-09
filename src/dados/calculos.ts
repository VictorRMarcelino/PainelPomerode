// Regras de cálculo do painel (RF02 a RF05). Funções puras sobre um exercício.
// Órgãos são agrupados pelo nome simples (ver orgaos.ts), que ignora diferenças de acento da API.

import { MESES, type Despesa, type Exercicio } from './esquema.ts'
import { melhorGrafia, nomeSimplesOrgao } from './orgaos.ts'

export { semAcento } from './orgaos.ts'

export interface ValorPorOrgao {
  nome: string // nome simples, ex.: "Educação"
  nomeCompleto: string // ex.: "Secretaria de Educação e Formação Empreendedora"
  valor: number
}

export interface ValorMensal {
  mes: string // "01".."12"
  receita: number
  despesa: number
}

export interface ResumoExercicio {
  exercicio: number
  totalPago: number
  totalArrecadado: number
  porOrgao: ValorPorOrgao[] // decrescente
  porMes: ValorMensal[]
  orcadoDespesa: number | null
  saude: { orgao: string | null; valor: number }
  educacao: { orgao: string | null; valor: number }
  populacao: { ano: number; habitantes: number } | null
}

// RF05 — credor agrupado pelo CPF/CNPJ, com o valor pago por órgão no exercício.
export interface Credor {
  documento: string
  nome: string
  total: number
  porOrgao: Record<string, number> // chave: nome simples do órgão
}

// Linha da tabela do RF05 (valor e participação dentro do filtro de secretaria aplicado).
export interface LinhaCredor {
  posicao: number
  documento: string
  nome: string
  secretaria: string
  outrasSecretarias: string[]
  valor: number
  participacao: number
}

export function credoresDoExercicio(ex: Exercicio): Credor[] {
  const credores = new Map<string, Credor>()
  for (const mes of MESES) {
    for (const d of ex.meses[mes]?.despesas ?? []) {
      if (!d.valorPago) continue
      const chave = d.cpfCnpjCredor || d.nomeCredor
      let credor = credores.get(chave)
      if (!credor) {
        credor = { documento: d.cpfCnpjCredor, nome: d.nomeCredor, total: 0, porOrgao: {} }
        credores.set(chave, credor)
      }
      credor.total += d.valorPago
      const orgao = nomeSimplesOrgao(d.orgaoDescricao)
      credor.porOrgao[orgao] = (credor.porOrgao[orgao] ?? 0) + d.valorPago
    }
  }
  return [...credores.values()].filter((c) => Math.abs(c.total) >= 0.005)
}

export function linhasDeDespesa(ex: Exercicio): (Despesa & { mes: string })[] {
  return MESES.flatMap((mes) => (ex.meses[mes]?.despesas ?? []).map((d) => ({ mes, ...d })))
}

// Meses exibidos: os 12 de um exercício encerrado, ou até o mês atual no exercício corrente.
function mesesDoExercicio(exercicio: number, hoje: Date): string[] {
  if (exercicio < hoje.getFullYear()) return [...MESES]
  if (exercicio > hoje.getFullYear()) return []
  return MESES.slice(0, hoje.getMonth() + 1)
}

// Última estimativa do IBGE até o ano do exercício (ou a mais antiga, se o ano for anterior a todas).
function escolherPopulacao(populacao: Record<string, number>, exercicio: number) {
  const anos = Object.keys(populacao).map(Number).sort((a, b) => a - b)
  const ano = anos.filter((a) => a <= exercicio).at(-1) ?? anos[0]
  return ano === undefined ? null : { ano, habitantes: populacao[ano]! }
}

export function resumir(
  ex: Exercicio,
  populacao: Record<string, number>,
  hoje = new Date(),
): ResumoExercicio {
  const pagoPorOrgao = new Map<string, number>()
  const nomesCompletos = new Map<string, string>()
  let totalPago = 0
  let totalArrecadado = 0

  const porMes = mesesDoExercicio(ex.exercicio, hoje).map((mes) => {
    const dados = ex.meses[mes]
    let despesa = 0
    for (const d of dados?.despesas ?? []) {
      despesa += d.valorPago
      const orgao = nomeSimplesOrgao(d.orgaoDescricao)
      pagoPorOrgao.set(orgao, (pagoPorOrgao.get(orgao) ?? 0) + d.valorPago)
      nomesCompletos.set(orgao, melhorGrafia(nomesCompletos.get(orgao), d.orgaoDescricao))
    }
    // Receita líquida: as deduções (contas 9...) já vêm negativas da API.
    const receita = (dados?.receitas ?? []).reduce((soma, r) => soma + r.valorArrecadado, 0)
    totalPago += despesa
    totalArrecadado += receita
    return { mes, receita, despesa }
  })

  const porOrgao = [...pagoPorOrgao]
    .map(([nome, valor]) => ({ nome, nomeCompleto: nomesCompletos.get(nome) ?? nome, valor }))
    .filter((o) => o.valor !== 0)
    .sort((a, b) => b.valor - a.valor)

  const orgaoChamado = (nome: string) => {
    const orgao = porOrgao.find((o) => o.nome === nome)
    return { orgao: orgao?.nomeCompleto ?? null, valor: orgao?.valor ?? 0 }
  }

  return {
    exercicio: ex.exercicio,
    totalPago,
    totalArrecadado,
    porOrgao,
    porMes,
    orcadoDespesa: ex.orcado ? ex.orcado.despesas.reduce((soma, d) => soma + d.valorOrcado, 0) : null,
    saude: orgaoChamado('Saúde'),
    educacao: orgaoChamado('Educação'),
    populacao: escolherPopulacao(populacao, ex.exercicio),
  }
}
