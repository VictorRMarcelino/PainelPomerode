import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import Swal from 'sweetalert2'
import { tema } from '@/composables/useTema'
import { atualizarExercicio, criarLimitador, pendencias } from '@/dados/api.ts'
import { credoresDoExercicio, resumir } from '@/dados/calculos.ts'
import {
  decodificar,
  dataMaisRecente,
  type ArquivoExercicio,
  type Exercicio,
  type IndiceDados,
} from '@/dados/esquema.ts'

// O BASE_URL pode vir sem a barra final (ex.: build com --base=/PainelPomerode), o que geraria
// "/PainelPomerodedados/" e faria o painel cair na consulta lenta à API. Garante a barra.
const URL_DADOS = `${import.meta.env.BASE_URL.replace(/\/?$/, '/')}dados/`

// Tempo máximo que a tela fica bloqueada esperando a API (requisito: exercício em até 15 s).
const ESPERA_MAXIMA_MS = 12_000
const esperar = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

// Um limitador para a página toda: o limite da API (10/min) vale para o visitante inteiro.
const limitador = criarLimitador()

async function buscarJson<T>(nome: string): Promise<T | undefined> {
  const resposta = await fetch(URL_DADOS + nome, { cache: 'no-cache' })
  if (!resposta.ok) return undefined
  return (await resposta.json()) as T
}

export const usePainelStore = defineStore('painel', () => {
  const indice = shallowRef<IndiceDados>({ atualizadoEm: '', exercicios: [], populacao: {} })
  const ano = ref<number>()
  // shallowRef: o exercício tem dezenas de milhares de linhas, não precisa de reatividade profunda.
  const exercicio = shallowRef<Exercicio>()
  // Contador, não booleano: trocas rápidas de ano não podem esconder o loading antes da hora.
  const pendentes = ref(0)
  const carregando = computed(() => pendentes.value > 0)
  const progresso = ref<{ feitas: number; total: number }>()
  const atualizandoAoVivo = ref(false)

  const cache = new Map<number, Promise<Exercicio>>()
  const sincronizacoes = new Map<number, Promise<void>>()

  const anosDisponiveis = computed(() => {
    const anos = new Set(indice.value.exercicios.map((e) => e.exercicio))
    anos.add(new Date().getFullYear())
    return [...anos].sort((a, b) => b - a)
  })

  const resumo = computed(() => exercicio.value && resumir(exercicio.value, indice.value.populacao))
  const credores = computed(() => (exercicio.value ? credoresDoExercicio(exercicio.value) : []))
  const atualizadoEm = computed(() => (exercicio.value ? dataMaisRecente(exercicio.value) : ''))

  async function carregarIndice() {
    try {
      indice.value = (await buscarJson<IndiceDados>('index.json')) ?? indice.value
    } catch {
      // Sem índice o painel ainda funciona consultando a API direto.
    }
  }

  async function aguardar<T>(promessa: Promise<T>): Promise<T> {
    pendentes.value++
    try {
      return await promessa
    } finally {
      pendentes.value--
    }
  }

  async function carregarArquivo(ano: number): Promise<Exercicio> {
    const arquivo = await buscarJson<ArquivoExercicio>(`${ano}.json`).catch(() => undefined)
    return arquivo ? decodificar(arquivo) : { exercicio: ano, meses: {} }
  }

  const temaDoAlerta = () => (tema.value === 'escuro' ? 'dark' : 'light')

  // Exibe o que chegar: cada mês concluído atualiza a tela.
  function exibir(ex: Exercicio) {
    if (ano.value === ex.exercicio) exercicio.value = { ...ex }
  }

  // Busca na API só os meses que faltam ou ainda podem mudar (no máximo 3 requisições por vez).
  function sincronizar(ex: Exercicio): Promise<void> {
    const emAndamento = sincronizacoes.get(ex.exercicio)
    if (emAndamento) return emAndamento

    const total = pendencias(ex)
    if (total === 0) return Promise.resolve()

    const temDados = Object.keys(ex.meses).length > 0
    atualizandoAoVivo.value = true
    if (!temDados) progresso.value = { feitas: 0, total }

    const tarefa = atualizarExercicio(ex, {
      limitador,
      aoConcluir: (atual) => {
        if (progresso.value) progresso.value = { ...progresso.value, feitas: progresso.value.feitas + 1 }
        exibir(atual)
      },
    })
      .then((erros) => {
        if (erros.length === 0) return
        console.warn('[Painel] Falhas ao consultar a API:', erros)
        if (Object.keys(ex.meses).length === 0) {
          void Swal.fire({
            icon: 'error',
            title: 'Não foi possível carregar os dados',
            text: `O portal da transparência não respondeu para o exercício de ${ex.exercicio}. Tente novamente em alguns minutos.`,
            theme: temaDoAlerta(),
            confirmButtonText: 'Entendi',
          })
        } else {
          void Swal.fire({
            toast: true,
            position: 'bottom-end',
            icon: 'warning',
            title: 'Exibindo a última cópia salva',
            text: 'O portal não respondeu agora; os meses mais recentes podem estar desatualizados.',
            theme: temaDoAlerta(),
            timer: 6000,
            showConfirmButton: false,
          })
        }
      })
      .finally(() => {
        sincronizacoes.delete(ex.exercicio)
        if (sincronizacoes.size === 0) atualizandoAoVivo.value = false
        progresso.value = undefined
      })

    sincronizacoes.set(ex.exercicio, tarefa)
    return tarefa
  }

  // RF01: troca o exercício; toda a tela deriva de `exercicio`.
  async function selecionar(novoAno: number) {
    ano.value = novoAno
    let carregamento = cache.get(novoAno)
    if (!carregamento) {
      carregamento = carregarArquivo(novoAno)
      cache.set(novoAno, carregamento)
    }
    const ex = await aguardar(carregamento)

    exibir(ex)
    // Com cópia local, a atualização roda em segundo plano. Sem cópia (contingência), a tela espera
    // a API no máximo ESPERA_MAXIMA_MS: com o limite de 10 consultas/min, o ano inteiro levaria
    // minutos. Depois disso mostra o que já chegou e continua completando em segundo plano.
    const sincronizacao = sincronizar(ex)
    if (Object.keys(ex.meses).length > 0) return
    const terminou = await aguardar(
      Promise.race([sincronizacao.then(() => true), esperar(ESPERA_MAXIMA_MS).then(() => false)]),
    )
    if (!terminou && ano.value === novoAno) {
      progresso.value = undefined
      void Swal.fire({
        toast: true,
        position: 'bottom-end',
        icon: 'info',
        title: `Carregando ${novoAno} direto do portal`,
        text: 'Os meses aparecem conforme chegam; o portal aceita 10 consultas por minuto.',
        theme: temaDoAlerta(),
        timer: 8000,
        showConfirmButton: false,
      })
    }
  }

  return {
    ano,
    anosDisponiveis,
    atualizadoEm,
    atualizandoAoVivo,
    carregando,
    carregarIndice,
    credores,
    exercicio,
    indice,
    progresso,
    resumo,
    selecionar,
  }
})
