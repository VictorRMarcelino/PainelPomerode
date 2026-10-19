// Consulta à API de Dados Abertos de Pomerode e regra de atualização incremental.
// Usado tanto pelo script scripts/atualizar-dados.ts (Node) quanto pelo navegador.

import {
  MESES,
  normalizar,
  type DadosMes,
  type DadosOrcado,
  type Endpoint,
  type Exercicio,
} from './esquema.ts'

export const API_BASE = 'https://pomerode.atende.net/api/WCPDadosAbertos'

// A API aceita 10 requisições por minuto no total (todos os endpoints somados);
// acima disso responde HTTP 429. Além disso, no máximo 3 ficam em andamento ao mesmo tempo.
export const SIMULTANEAS = 3
export const POR_MINUTO = 10
const JANELA_MS = 60_000

// Mês consultado mais de N dias depois de terminar é considerado fechado (não muda mais).
const DIAS_PARA_FECHAR = 35

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms))

// A consulta foi cancelada porque outra já falhou (ver `pararNaPrimeiraFalha`).
export class ConsultaCancelada extends Error {}

// Espera `ms`, mas desiste na hora se o sinal for cancelado.
function esperarOuCancelar(ms: number, sinal?: AbortSignal): Promise<void> {
  return new Promise((resolver, rejeitar) => {
    if (sinal?.aborted) return rejeitar(new ConsultaCancelada())
    const cancelar = () => {
      clearTimeout(relogio)
      rejeitar(new ConsultaCancelada())
    }
    const relogio = setTimeout(() => {
      sinal?.removeEventListener('abort', cancelar)
      resolver()
    }, ms)
    sinal?.addEventListener('abort', cancelar, { once: true })
  })
}

export interface Limitador {
  // Com `sinal`, uma consulta cancelada desiste antes de ocupar vaga na janela de 10/min.
  executar<T>(tarefa: () => Promise<T>, sinal?: AbortSignal): Promise<T>
  // Segura todas as próximas requisições (usado quando a API responde 429).
  pausar(ms: number): void
}

export function criarLimitador(simultaneas = SIMULTANEAS, porMinuto = POR_MINUTO): Limitador {
  let ativos = 0
  const fila: (() => void)[] = []
  const envios: number[] = []
  let pausadoAte = 0

  async function aguardarJanela(sinal?: AbortSignal) {
    for (;;) {
      if (sinal?.aborted) throw new ConsultaCancelada()
      const agora = Date.now()
      while (envios.length && agora - envios[0]! >= JANELA_MS) envios.shift()
      if (agora < pausadoAte) await esperarOuCancelar(pausadoAte - agora, sinal)
      else if (envios.length >= porMinuto) await esperarOuCancelar(envios[0]! + JANELA_MS - agora + 250, sinal)
      else {
        envios.push(agora)
        return
      }
    }
  }

  return {
    async executar(tarefa, sinal) {
      // A vaga é repassada direto para quem está na fila, sem passar pelo contador.
      if (ativos < simultaneas) ativos++
      else await new Promise<void>((liberar) => fila.push(liberar))
      try {
        await aguardarJanela(sinal)
        return await tarefa()
      } finally {
        const proximo = fila.shift()
        if (proximo) proximo()
        else ativos--
      }
    },
    pausar(ms) {
      pausadoAte = Math.max(pausadoAte, Date.now() + ms)
    },
  }
}

class LimiteExcedido extends Error {}

export interface OpcoesConsulta {
  tentativas?: number
  // Repetir também falhas de conexão e erros da API. O limite 429 sempre é repetido, após a pausa.
  repetirFalhas?: boolean
  timeoutMs?: number
  sinal?: AbortSignal
}

export async function consultar<E extends Endpoint>(
  endpoint: E,
  parametros: Record<string, string>,
  limitador: Limitador,
  opcoes: OpcoesConsulta = {},
) {
  const { tentativas = 5, repetirFalhas = true, timeoutMs = 60_000, sinal } = opcoes
  // As datas vão sem codificar: a API recusa "%2F" no lugar de "/".
  const query = Object.entries(parametros)
    .map(([k, v]) => `${k}=${v}`)
    .join('&')
  const url = `${API_BASE}/${endpoint}?${query}`

  for (let tentativa = 1; ; tentativa++) {
    if (sinal?.aborted) throw new ConsultaCancelada()
    try {
      return await limitador.executar(async () => {
        if (sinal?.aborted) throw new ConsultaCancelada()
        const tempoEsgotado = AbortSignal.timeout(timeoutMs)
        const resposta = await fetch(url, {
          headers: { Accept: 'application/json' },
          signal: sinal ? AbortSignal.any([sinal, tempoEsgotado]) : tempoEsgotado,
        })
        const corpo = (await resposta.json().catch(() => ({}))) as {
          status?: string
          retorno?: unknown
          msg?: string
        }
        if (resposta.status === 429) throw new LimiteExcedido('limite de 10 requisições por minuto atingido')
        if (!resposta.ok || corpo.status !== 'ok' || !Array.isArray(corpo.retorno)) {
          const msg = corpo.msg ?? (corpo.retorno as { msg?: string } | undefined)?.msg
          throw new Error(msg ?? `HTTP ${resposta.status}`)
        }
        return corpo.retorno.map((bruto) => normalizar(endpoint, bruto))
      }, sinal)
    } catch (erro) {
      if (erro instanceof ConsultaCancelada || sinal?.aborted) throw new ConsultaCancelada()
      const limite = erro instanceof LimiteExcedido
      if (tentativa >= tentativas || (!limite && !repetirFalhas)) {
        const motivo = erro instanceof Error ? erro.message : String(erro)
        throw new Error(`Falha ao consultar ${endpoint} (${query}): ${motivo}`)
      }
      if (limite) limitador.pausar(JANELA_MS)
      else await esperar(1500 * tentativa)
    }
  }
}

// ---- datas ----

const doisDigitos = (n: number) => String(n).padStart(2, '0')

export function dataISO(data = new Date()): string {
  return `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}`
}

const paraApi = (data: Date) =>
  `${doisDigitos(data.getDate())}/${doisDigitos(data.getMonth() + 1)}/${data.getFullYear()}`

const ultimoDiaDoMes = (ano: number, mes: number) => new Date(ano, mes, 0)

function somarDias(data: Date, dias: number): string {
  const resultado = new Date(data)
  resultado.setDate(resultado.getDate() + dias)
  return dataISO(resultado)
}

// Um período (mês ou orçamento do ano) precisa ser consultado de novo quando:
// nunca foi consultado; ou foi consultado antes de hoje e ainda não estava fechado.
function precisaConsultar(consultadoEm: string | undefined, fimDoPeriodo: Date, hoje: string): boolean {
  if (!consultadoEm) return true
  if (consultadoEm >= hoje) return false
  return consultadoEm <= somarDias(fimDoPeriodo, DIAS_PARA_FECHAR)
}

export function mesesPendentes(ex: Exercicio, hoje = dataISO()): string[] {
  return MESES.filter((mes, i) => {
    const inicio = dataISO(new Date(ex.exercicio, i, 1))
    if (inicio > hoje) return false // mês futuro
    return precisaConsultar(ex.meses[mes]?.consultadoEm, ultimoDiaDoMes(ex.exercicio, i + 1), hoje)
  })
}

export function orcadoPendente(ex: Exercicio, hoje = dataISO()): boolean {
  if (`${ex.exercicio}-01-01` > hoje) return false
  return precisaConsultar(ex.orcado?.consultadoEm, new Date(ex.exercicio, 11, 31), hoje)
}

export function pendencias(ex: Exercicio, hoje = dataISO()): number {
  return mesesPendentes(ex, hoje).length + (orcadoPendente(ex, hoje) ? 1 : 0)
}

async function consultarMes(ano: number, mes: string, limitador: Limitador, opcoes: OpcoesConsulta): Promise<DadosMes> {
  const m = Number(mes)
  const periodo = {
    dataInicial: paraApi(new Date(ano, m - 1, 1)),
    dataFinal: paraApi(ultimoDiaDoMes(ano, m)),
  }
  const [despesas, receitas] = await Promise.all([
    consultar('despesas', periodo, limitador, opcoes),
    consultar('receitas', periodo, limitador, opcoes),
  ])
  return { consultadoEm: dataISO(), despesas, receitas }
}

async function consultarOrcado(ano: number, limitador: Limitador, opcoes: OpcoesConsulta): Promise<DadosOrcado> {
  const fimDoAno = new Date(ano, 11, 31)
  const hoje = new Date()
  const parametros = { dataFinal: paraApi(hoje < fimDoAno ? hoje : fimDoAno) }
  const [despesas, receitas] = await Promise.all([
    consultar('despesasOrcadas', parametros, limitador, opcoes),
    consultar('receitasOrcadas', parametros, limitador, opcoes),
  ])
  return { consultadoEm: dataISO(), despesas, receitas }
}

export interface OpcoesAtualizacao {
  limitador?: Limitador
  // Chamado a cada mês (ou orçamento) concluído, para gravar/exibir o progresso.
  aoConcluir?: (ex: Exercicio, parte: string) => void | Promise<void>
  // Chamado uma vez, na primeira falha (para o site avisar na hora).
  aoFalhar?: (erro: Error) => void
  // Site: na primeira falha que não seja o limite 429, cancela as demais consultas em vez de
  // repetir. Script de coleta: deixa desligado, para tentar de novo em falhas momentâneas.
  pararNaPrimeiraFalha?: boolean
  timeoutMs?: number
}

// Consulta só o que falta ou pode ter mudado. Altera `ex` no lugar e devolve os erros. No script,
// um mês que falhar não impede os outros de serem gravados; no site (`pararNaPrimeiraFalha`), a
// primeira falha cancela o restante para o aviso aparecer na hora.
export async function atualizarExercicio(ex: Exercicio, opcoes: OpcoesAtualizacao = {}): Promise<Error[]> {
  const limitador = opcoes.limitador ?? criarLimitador()
  const erros: Error[] = []
  const tarefas: Promise<void>[] = []
  const cancelamento = new AbortController()
  const consulta: OpcoesConsulta = {
    repetirFalhas: !opcoes.pararNaPrimeiraFalha,
    timeoutMs: opcoes.timeoutMs,
    sinal: opcoes.pararNaPrimeiraFalha ? cancelamento.signal : undefined,
  }
  const falhou = (erro: Error) => {
    if (erro instanceof ConsultaCancelada) return
    erros.push(erro)
    if (erros.length === 1) opcoes.aoFalhar?.(erro)
    if (opcoes.pararNaPrimeiraFalha) cancelamento.abort()
  }

  for (const mes of mesesPendentes(ex)) {
    tarefas.push(
      consultarMes(ex.exercicio, mes, limitador, consulta).then(
        async (dados) => {
          ex.meses[mes] = dados
          await opcoes.aoConcluir?.(ex, `mês ${mes}`)
        },
        falhou,
      ),
    )
  }
  if (orcadoPendente(ex)) {
    tarefas.push(
      consultarOrcado(ex.exercicio, limitador, consulta).then(
        async (dados) => {
          ex.orcado = dados
          await opcoes.aoConcluir?.(ex, 'orçamento')
        },
        falhou,
      ),
    )
  }

  await Promise.all(tarefas)
  return erros
}
