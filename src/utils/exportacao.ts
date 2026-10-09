// RF06 — exportação dos dados brutos do exercício (todas as linhas da API, com o mês de origem).
import { linhasDeDespesa, semAcento, type LinhaCredor } from '@/dados/calculos'
import { encurtarOrgao } from '@/utils/formatos'
import { ESQUEMAS, MESES, type Endpoint, type Exercicio, type Receita } from '@/dados/esquema'
import { baixarCsv, gerarCsv, type ColunaCsv } from './csv'

const TITULOS: Record<string, string> = {
  orgaoCodigo: 'Código do órgão',
  orgaoDescricao: 'Órgão',
  unidadeCodigo: 'Código da unidade',
  unidadeDescricao: 'Unidade',
  fonteRecurso: 'Fonte de recurso',
  fonteRecursoDescricao: 'Descrição da fonte de recurso',
  cpfCnpjCredor: 'CPF/CNPJ do credor',
  nomeCredor: 'Credor',
  valorEmpenhado: 'Valor empenhado',
  valorAnulado: 'Valor anulado',
  valorLiquidado: 'Valor liquidado',
  valorRetido: 'Valor retido',
  valorPago: 'Valor pago',
  contaCodigo: 'Código da conta',
  contaDescricao: 'Descrição da conta',
  valorArrecadado: 'Valor arrecadado',
}

type ComMes<T> = T & { mes: string }

function colunas<T extends { mes: string }>(endpoint: Endpoint, exercicio: number): ColunaCsv<T>[] {
  return [
    { titulo: 'Exercício', valor: () => String(exercicio) },
    { titulo: 'Mês', valor: (linha) => linha.mes },
    ...ESQUEMAS[endpoint].map(([nome]) => ({
      titulo: TITULOS[nome] ?? nome,
      valor: (linha: T) => (linha as unknown as Record<string, string | number>)[nome] ?? '',
    })),
  ]
}

export function exportarDespesas(ex: Exercicio) {
  const linhas = linhasDeDespesa(ex)
  baixarCsv(`despesas-pomerode-${ex.exercicio}.csv`, gerarCsv(colunas('despesas', ex.exercicio), linhas))
}

export function exportarReceitas(ex: Exercicio) {
  const linhas: ComMes<Receita>[] = MESES.flatMap((mes) =>
    (ex.meses[mes]?.receitas ?? []).map((r) => ({ mes, ...r })),
  )
  baixarCsv(`receitas-pomerode-${ex.exercicio}.csv`, gerarCsv(colunas('receitas', ex.exercicio), linhas))
}

// RF05: exporta todas as linhas da tabela de credores com o filtro e a ordenação aplicados.
export function exportarCredores(linhas: LinhaCredor[], exercicio: number, secretaria: string) {
  const sufixo = secretaria ? `-${semAcento(encurtarOrgao(secretaria)).replace(/[^a-z0-9]+/g, '-')}` : ''
  const colunasCredor: ColunaCsv<LinhaCredor>[] = [
    { titulo: 'Exercício', valor: () => String(exercicio) },
    { titulo: 'Posição', valor: (l) => String(l.posicao) },
    { titulo: 'Credor', valor: (l) => l.nome },
    { titulo: 'CPF/CNPJ do credor', valor: (l) => l.documento },
    { titulo: 'Secretaria', valor: (l) => l.secretaria },
    { titulo: 'Outras secretarias', valor: (l) => l.outrasSecretarias.join(', ') },
    { titulo: 'Valor recebido', valor: (l) => l.valor },
    { titulo: 'Participação (%)', valor: (l) => l.participacao * 100 },
  ]
  baixarCsv(`credores-pomerode-${exercicio}${sufixo}.csv`, gerarCsv(colunasCredor, linhas))
}
