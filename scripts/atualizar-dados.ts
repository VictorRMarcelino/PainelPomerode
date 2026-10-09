// Atualiza public/dados/ com os dados da API de Dados Abertos de Pomerode.
//
//   npm run dados                 → exercício atual e os dois anteriores
//   npm run dados -- 2023 2024    → só os exercícios informados
//
// Roda sozinho antes do `npm run dev` e do `npm run build`. Consulta apenas os meses
// que faltam ou que ainda podem mudar, respeitando o limite da API (10 requisições por
// minuto, 3 ao mesmo tempo), e grava o arquivo do ano a cada mês concluído. Se a API estiver fora do ar, os
// arquivos existentes ficam como estão (cópia de contingência) e o projeto sobe mesmo assim.

import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import {
  atualizarExercicio,
  criarLimitador,
  dataISO,
  pendencias,
  POR_MINUTO,
  type Limitador,
} from '../src/dados/api.ts'
import {
  codificar,
  dataMaisRecente,
  decodificar,
  serializar,
  type ArquivoExercicio,
  type Exercicio,
  type IndiceDados,
} from '../src/dados/esquema.ts'

const PASTA = fileURLToPath(new URL('../public/dados/', import.meta.url))
const IBGE_POPULACAO =
  'https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/-10/variaveis/9324?localidades=N6[4213203]'

const caminho = (nome: string) => PASTA + nome

async function lerJson<T>(nome: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(caminho(nome), 'utf8')) as T
  } catch {
    return undefined
  }
}

// Grava num arquivo temporário e renomeia: um processo interrompido nunca deixa JSON pela metade.
async function gravarJson(nome: string, conteudo: unknown) {
  const temporario = caminho(`.${nome}.tmp`)
  await writeFile(temporario, serializar(conteudo) + '\n')
  await rename(temporario, caminho(nome))
}

async function carregarExercicio(ano: number): Promise<Exercicio> {
  const arquivo = await lerJson<ArquivoExercicio>(`${ano}.json`)
  if (!arquivo) return { exercicio: ano, meses: {} }
  try {
    return decodificar(arquivo)
  } catch (erro) {
    console.warn(`  ${ano}.json inválido, recriando: ${(erro as Error).message}`)
    return { exercicio: ano, meses: {} }
  }
}

async function atualizarAno(ano: number, limitador: Limitador) {
  const ex = await carregarExercicio(ano)
  const total = pendencias(ex)
  if (total === 0) {
    console.log(`  ${ano}: em dia`)
    return
  }
  console.log(`  ${ano}: ${total} período(s) pendente(s), ${total * 2} requisições`)

  // As gravações do mesmo ano entram em fila para não se atropelarem.
  let gravacao = Promise.resolve()
  let concluidas = 0
  const erros = await atualizarExercicio(ex, {
    limitador,
    aoConcluir: (atual, parte) => {
      concluidas++
      console.log(`  ${ano}: ${parte} ok (${concluidas}/${total})`)
      gravacao = gravacao.then(() => gravarJson(`${ano}.json`, codificar(atual)))
      return gravacao
    },
  })
  await gravacao
  for (const erro of erros) console.warn(`  ${ano}: ${erro.message}`)
}

async function consultarPopulacao(): Promise<Record<string, number> | undefined> {
  try {
    const resposta = await fetch(IBGE_POPULACAO, { signal: AbortSignal.timeout(30_000) })
    const corpo = (await resposta.json()) as {
      resultados: { series: { serie: Record<string, string> }[] }[]
    }[]
    const serie = corpo[0]?.resultados[0]?.series[0]?.serie ?? {}
    const populacao = Object.fromEntries(
      Object.entries(serie)
        .map(([ano, valor]) => [ano, Number(valor)] as const)
        .filter(([, valor]) => valor > 0),
    )
    return Object.keys(populacao).length ? populacao : undefined
  } catch (erro) {
    console.warn(`  IBGE indisponível, mantendo população anterior: ${(erro as Error).message}`)
    return undefined
  }
}

async function gravarIndice() {
  const anterior = await lerJson<IndiceDados>('index.json')
  const anos = (await readdir(PASTA))
    .map((nome) => /^(\d{4})\.json$/.exec(nome)?.[1])
    .filter((ano): ano is string => ano !== undefined)
    .map(Number)
    .sort((a, b) => b - a)

  const exercicios: IndiceDados['exercicios'] = []
  for (const ano of anos) {
    const ex = await carregarExercicio(ano)
    const meses = Object.keys(ex.meses).length
    if (meses > 0) exercicios.push({ exercicio: ano, atualizadoEm: dataMaisRecente(ex), meses })
  }

  const indice: IndiceDados = {
    atualizadoEm: exercicios.map((e) => e.atualizadoEm).sort().at(-1) ?? dataISO(),
    exercicios,
    populacao: (await consultarPopulacao()) ?? anterior?.populacao ?? {},
  }
  await gravarJson('index.json', indice)
}

async function main() {
  const anoAtual = new Date().getFullYear()
  const informados = process.argv.slice(2).map(Number).filter((n) => n >= 2000 && n <= anoAtual)
  const anos = informados.length ? informados : [anoAtual, anoAtual - 1, anoAtual - 2]

  await mkdir(PASTA, { recursive: true })
  console.log(`Atualizando dados (${anos.join(', ')})...`)
  const inicio = Date.now()
  const requisicoes = (await Promise.all(anos.map(async (ano) => pendencias(await carregarExercicio(ano))))).reduce((a, b) => a + b, 0) * 2
  if (requisicoes > POR_MINUTO) {
    console.log(`  ${requisicoes} requisições: cerca de ${Math.ceil(requisicoes / POR_MINUTO)} min por causa do limite da API.`)
  }

  // Um limitador só para todos os anos: até 3 requisições ao mesmo tempo e 10 por minuto.
  const limitador = criarLimitador()
  await Promise.all(anos.map((ano) => atualizarAno(ano, limitador)))
  await gravarIndice()

  console.log(`Dados prontos em ${((Date.now() - inicio) / 1000).toFixed(1)} s.`)
}

main().catch((erro) => {
  // Não derruba o `npm run dev`: o site continua com os arquivos que já existem.
  console.warn(`Não foi possível atualizar os dados: ${(erro as Error).message}`)
})
