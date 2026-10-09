// Formato dos dados do Painel Pomerode.
//
// Cada exercício fica em public/dados/<ano>.json, com as linhas brutas da API
// separadas por mês. Para o arquivo ficar pequeno, todo texto (órgão, credor,
// fonte...) é guardado uma vez só em `textos` e as linhas guardam o índice.
// As colunas de cada tabela estão descritas em `colunas`, na mesma ordem das linhas.

export type TipoCampo = 't' | 'n'
type Esquema = readonly (readonly [string, TipoCampo])[]

// A chave é o nome do endpoint da API; os campos seguem os nomes da API.
export const ESQUEMAS = {
  despesas: [
    ['orgaoCodigo', 't'],
    ['orgaoDescricao', 't'],
    ['unidadeCodigo', 't'],
    ['unidadeDescricao', 't'],
    ['fonteRecurso', 't'],
    ['fonteRecursoDescricao', 't'],
    ['cpfCnpjCredor', 't'],
    ['nomeCredor', 't'],
    ['valorEmpenhado', 'n'],
    ['valorAnulado', 'n'],
    ['valorLiquidado', 'n'],
    ['valorRetido', 'n'],
    ['valorPago', 'n'],
  ],
  receitas: [
    ['contaCodigo', 't'],
    ['contaDescricao', 't'],
    ['valorArrecadado', 'n'],
  ],
  despesasOrcadas: [
    ['orgaoCodigo', 't'],
    ['orgaoDescricao', 't'],
    ['unidadeCodigo', 't'],
    ['unidadeDescricao', 't'],
    ['valorOrcado', 'n'],
  ],
  receitasOrcadas: [
    ['contaCodigo', 't'],
    ['contaDescricao', 't'],
    ['valorOrcado', 'n'],
  ],
} as const satisfies Record<string, Esquema>

export type Endpoint = keyof typeof ESQUEMAS

type Registro<E extends Esquema> = {
  [C in E[number] as C[0]]: C[1] extends 't' ? string : number
}

export type Despesa = Registro<typeof ESQUEMAS.despesas>
export type Receita = Registro<typeof ESQUEMAS.receitas>
export type DespesaOrcada = Registro<typeof ESQUEMAS.despesasOrcadas>
export type ReceitaOrcada = Registro<typeof ESQUEMAS.receitasOrcadas>

export const MESES = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'] as const

export interface DadosMes {
  consultadoEm: string // AAAA-MM-DD
  despesas: Despesa[]
  receitas: Receita[]
}

export interface DadosOrcado {
  consultadoEm: string // AAAA-MM-DD
  despesas: DespesaOrcada[]
  receitas: ReceitaOrcada[]
}

export interface Exercicio {
  exercicio: number
  meses: Partial<Record<string, DadosMes>>
  orcado?: DadosOrcado
}

type LinhaCodificada = number[]

interface TabelasCodificadas {
  consultadoEm: string
  despesas: LinhaCodificada[]
  receitas: LinhaCodificada[]
}

export interface ArquivoExercicio {
  versao: 1
  exercicio: number
  atualizadoEm: string
  colunas: Record<Endpoint, string[]>
  textos: string[]
  meses: Record<string, TabelasCodificadas>
  orcado?: TabelasCodificadas
}

export interface IndiceDados {
  atualizadoEm: string
  exercicios: { exercicio: number; atualizadoEm: string; meses: number }[]
  // Estimativas de população do IBGE por ano (RF04c).
  populacao: Record<string, number>
}

type Linha = Record<string, string | number>

// Converte uma linha crua da API: textos com trim() e valores (que vêm como string) em número.
export function normalizar<E extends Endpoint>(endpoint: E, bruto: unknown): Registro<(typeof ESQUEMAS)[E]> {
  const origem = (bruto ?? {}) as Record<string, unknown>
  const linha: Linha = {}
  for (const [nome, tipo] of ESQUEMAS[endpoint]) {
    const valor = origem[nome]
    linha[nome] = tipo === 't' ? String(valor ?? '').trim() : Number(valor) || 0
  }
  return linha as Registro<(typeof ESQUEMAS)[E]>
}

export function dataMaisRecente(ex: Exercicio): string {
  const datas = Object.values(ex.meses).map((m) => m!.consultadoEm)
  if (ex.orcado) datas.push(ex.orcado.consultadoEm)
  return datas.sort().at(-1) ?? ''
}

export function codificar(ex: Exercicio): ArquivoExercicio {
  const textos: string[] = []
  const indices = new Map<string, number>()
  const indice = (texto: string) => {
    let i = indices.get(texto)
    if (i === undefined) {
      i = textos.push(texto) - 1
      indices.set(texto, i)
    }
    return i
  }
  const linhas = (endpoint: Endpoint, registros: object[]) =>
    registros.map((registro) =>
      ESQUEMAS[endpoint].map(([nome, tipo]) => {
        const valor = (registro as Linha)[nome]!
        return tipo === 't' ? indice(valor as string) : (valor as number)
      }),
    )

  const meses: Record<string, TabelasCodificadas> = {}
  for (const mes of MESES) {
    const dados = ex.meses[mes]
    if (!dados) continue
    meses[mes] = {
      consultadoEm: dados.consultadoEm,
      despesas: linhas('despesas', dados.despesas),
      receitas: linhas('receitas', dados.receitas),
    }
  }

  return {
    versao: 1,
    exercicio: ex.exercicio,
    atualizadoEm: dataMaisRecente(ex),
    colunas: Object.fromEntries(
      Object.entries(ESQUEMAS).map(([endpoint, campos]) => [endpoint, campos.map(([nome]) => nome)]),
    ) as Record<Endpoint, string[]>,
    textos,
    meses,
    orcado: ex.orcado && {
      consultadoEm: ex.orcado.consultadoEm,
      despesas: linhas('despesasOrcadas', ex.orcado.despesas),
      receitas: linhas('receitasOrcadas', ex.orcado.receitas),
    },
  }
}

export function decodificar(arquivo: ArquivoExercicio): Exercicio {
  if (arquivo.versao !== 1) throw new Error(`Versão de arquivo desconhecida: ${arquivo.versao}`)
  const { textos } = arquivo
  const linhas = <E extends Endpoint>(endpoint: E, codificadas: LinhaCodificada[]) =>
    codificadas.map((codificada) => {
      const linha: Linha = {}
      ESQUEMAS[endpoint].forEach(([nome, tipo], i) => {
        const valor = codificada[i] ?? 0
        linha[nome] = tipo === 't' ? (textos[valor] ?? '') : valor
      })
      return linha as Registro<(typeof ESQUEMAS)[E]>
    })

  const meses: Exercicio['meses'] = {}
  for (const [mes, tabelas] of Object.entries(arquivo.meses)) {
    meses[mes] = {
      consultadoEm: tabelas.consultadoEm,
      despesas: linhas('despesas', tabelas.despesas),
      receitas: linhas('receitas', tabelas.receitas),
    }
  }

  return {
    exercicio: arquivo.exercicio,
    meses,
    orcado: arquivo.orcado && {
      consultadoEm: arquivo.orcado.consultadoEm,
      despesas: linhas('despesasOrcadas', arquivo.orcado.despesas),
      receitas: linhas('receitasOrcadas', arquivo.orcado.receitas),
    },
  }
}

// JSON legível no git: objetos indentados, uma linha da tabela por linha do arquivo.
export function serializar(valor: unknown, recuo = ''): string {
  if (Array.isArray(valor)) {
    const simples = valor.every((item) => item === null || typeof item !== 'object')
    if (valor.length === 0 || (simples && valor.length <= 20)) return JSON.stringify(valor)
    const proximo = recuo + ' '
    return `[\n${valor.map((item) => proximo + serializar(item, proximo)).join(',\n')}\n${recuo}]`
  }
  if (valor !== null && typeof valor === 'object') {
    const entradas = Object.entries(valor).filter(([, v]) => v !== undefined)
    if (entradas.length === 0) return '{}'
    const proximo = recuo + ' '
    const corpo = entradas.map(([k, v]) => `${proximo}${JSON.stringify(k)}: ${serializar(v, proximo)}`)
    return `{\n${corpo.join(',\n')}\n${recuo}}`
  }
  return JSON.stringify(valor)
}
