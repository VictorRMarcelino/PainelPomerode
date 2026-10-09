export const NOMES_MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]
export const MESES_ABREVIADOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const decimal = (casas: number) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })

const duasCasas = decimal(2)
const umaCasa = decimal(1)
const inteiro = decimal(0)
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export const formatarMoeda = (valor: number) => moeda.format(valor)

// R$ 269,55 mi
export const formatarMilhoes = (valor: number, casas = 2) =>
  `R$ ${(casas === 2 ? duasCasas : decimal(casas)).format(valor / 1e6)} mi`

// R$ 7.020
export const formatarReais = (valor: number) => `R$ ${inteiro.format(valor)}`

// 24,8% (ou 6,83% com casas = 2)
export const formatarPercentual = (fracao: number, casas = 1) =>
  `${(casas === 1 ? umaCasa : decimal(casas)).format(fracao * 100)}%`

// 1.284
export const formatarInteiro = (valor: number) => inteiro.format(valor)

// "2026-09-24" → "24 de Set 2026"
export function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split('-').map(Number)
  if (!ano || !mes || !dia) return '—'
  return `${dia} de ${MESES_ABREVIADOS[mes - 1]} ${ano}`
}

// "Secretaria de Educação e Formação Empreendedora" → "Educação e Formação Empreendedora"
export function encurtarOrgao(nome: string): string {
  return nome.replace(/^Secretaria (Municipal )?(de |da |do )?/i, '')
}
