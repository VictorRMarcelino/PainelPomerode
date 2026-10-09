<script setup lang="ts">
// RF05 — fornecedores/credores que mais receberam, com busca por nome/CNPJ,
// filtro por secretaria, ordenação e paginação.
import { computed, ref, watch } from 'vue'
import BotaoCsv from '@/components/BotaoCsv.vue'
import { semAcento, type Credor, type LinhaCredor } from '@/dados/calculos'
import { formatarInteiro, formatarPercentual, formatarReais } from '@/utils/formatos'

const props = defineProps<{
  exercicio: number
  credores: Credor[]
}>()

const emit = defineEmits<{ exportar: [linhas: LinhaCredor[], secretaria: string] }>()

type Ordem = 'valor-desc' | 'valor-asc' | 'nome-asc' | 'nome-desc'

const POR_PAGINA = 10

const busca = ref('')
const secretaria = ref('') // '' = todas
const ordem = ref<Ordem>('valor-desc')
const pagina = ref(1)

const secretarias = computed(() => {
  const nomes = new Set<string>()
  for (const c of props.credores) for (const orgao of Object.keys(c.porOrgao)) nomes.add(orgao)
  return [...nomes].sort((a, b) => a.localeCompare(b, 'pt-BR'))
})

// Ranking dentro do escopo (todas ou uma secretaria): a posição não muda com a busca nem com a ordenação.
const ranking = computed<LinhaCredor[]>(() => {
  const linhas = props.credores
    .map((c) => {
      const orgaos = Object.entries(c.porOrgao).sort((a, b) => b[1] - a[1])
      const valor = secretaria.value ? (c.porOrgao[secretaria.value] ?? 0) : c.total
      return {
        posicao: 0,
        documento: c.documento,
        nome: c.nome,
        secretaria: secretaria.value || orgaos[0]![0],
        outrasSecretarias: secretaria.value ? [] : orgaos.slice(1).map(([nome]) => nome),
        valor,
        participacao: 0,
      }
    })
    .filter((l) => Math.abs(l.valor) >= 0.005)
    .sort((a, b) => b.valor - a.valor)

  const totalDoEscopo = linhas.reduce((soma, l) => soma + l.valor, 0)
  linhas.forEach((l, i) => {
    l.posicao = i + 1
    l.participacao = totalDoEscopo ? l.valor / totalDoEscopo : 0
  })
  return linhas
})

const filtradas = computed(() => {
  const termo = semAcento(busca.value.trim())
  const digitos = busca.value.replace(/\D/g, '')
  const encontradas = termo
    ? ranking.value.filter(
        (l) => semAcento(l.nome).includes(termo) || (digitos.length >= 3 && l.documento.replace(/\D/g, '').includes(digitos)),
      )
    : [...ranking.value]

  const porNome = (a: LinhaCredor, b: LinhaCredor) => a.nome.localeCompare(b.nome, 'pt-BR')
  const ordenar: Record<Ordem, (a: LinhaCredor, b: LinhaCredor) => number> = {
    'valor-desc': (a, b) => b.valor - a.valor,
    'valor-asc': (a, b) => a.valor - b.valor,
    'nome-asc': porNome,
    'nome-desc': (a, b) => porNome(b, a),
  }
  return encontradas.sort(ordenar[ordem.value])
})

const totalPaginas = computed(() => Math.max(1, Math.ceil(filtradas.value.length / POR_PAGINA)))
const visiveis = computed(() => filtradas.value.slice((pagina.value - 1) * POR_PAGINA, pagina.value * POR_PAGINA))
const inicio = computed(() => (filtradas.value.length ? (pagina.value - 1) * POR_PAGINA + 1 : 0))
const fim = computed(() => Math.min(pagina.value * POR_PAGINA, filtradas.value.length))

// Botões de página: primeira, vizinhas da atual e última, com "…" entre os saltos.
const botoesPagina = computed(() => {
  const total = totalPaginas.value
  const atual = pagina.value
  const paginas = [...new Set([1, atual - 1, atual, atual + 1, total])].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  const botoes: (number | '…')[] = []
  paginas.forEach((p, i) => {
    if (i > 0 && p - paginas[i - 1]! > 1) botoes.push('…')
    botoes.push(p)
  })
  return botoes
})

watch([busca, secretaria, ordem], () => (pagina.value = 1))

// Clicar no cabeçalho alterna a ordenação daquela coluna (e o seletor acompanha).
function ordenarPor(coluna: 'valor' | 'nome') {
  if (coluna === 'valor') ordem.value = ordem.value === 'valor-desc' ? 'valor-asc' : 'valor-desc'
  else ordem.value = ordem.value === 'nome-asc' ? 'nome-desc' : 'nome-asc'
}

const setaValor = computed(() => (ordem.value === 'valor-desc' ? '↓' : ordem.value === 'valor-asc' ? '↑' : ''))
const setaNome = computed(() => (ordem.value === 'nome-asc' ? '↓' : ordem.value === 'nome-desc' ? '↑' : ''))
const ariaOrdem = (coluna: 'valor' | 'nome') => {
  if (coluna === 'valor') return ordem.value === 'valor-desc' ? 'descending' : ordem.value === 'valor-asc' ? 'ascending' : 'none'
  return ordem.value === 'nome-asc' ? 'ascending' : ordem.value === 'nome-desc' ? 'descending' : 'none'
}

const posicao = (n: number) => String(n).padStart(2, '0')
</script>

<template>
  <section class="cartao flex min-w-0 flex-col gap-4 p-5" aria-labelledby="titulo-rf05">
    <header class="flex flex-wrap items-start justify-between gap-2">
      <div>
        <h2 id="titulo-rf05" class="text-lg font-semibold text-texto">Fornecedores / credores que mais receberam</h2>
        <p class="text-sm text-suave" aria-live="polite">
          Pagamentos acumulados no exercício · {{ formatarInteiro(filtradas.length) }}
          {{ filtradas.length === 1 ? 'credor encontrado' : 'credores encontrados' }}
        </p>
      </div>
      <p class="text-xs text-apagado">Fonte: despesas pagas</p>
    </header>

    <div class="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_14rem_14rem] sm:gap-3">
      <label class="relative col-span-2 sm:col-span-1">
        <span class="sr-only">Buscar por nome ou CNPJ</span>
        <svg class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-apagado" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="9" cy="9" r="6" /><path d="m14 14 4 4" stroke-linecap="round" />
        </svg>
        <input
          v-model="busca"
          type="search"
          placeholder="Buscar por nome ou CNPJ"
          class="w-full rounded-lg border border-borda bg-fundo py-2.5 pr-3 pl-9 text-sm text-texto placeholder:text-apagado focus-visible:border-texto focus-visible:outline-none"
        />
      </label>

      <label class="relative min-w-0">
        <span class="sr-only">Filtrar por secretaria</span>
        <select
          v-model="secretaria"
          class="w-full cursor-pointer appearance-none truncate rounded-lg border border-borda bg-fundo py-2.5 pr-8 pl-3 text-sm text-texto focus-visible:border-texto focus-visible:outline-none"
        >
          <option value="">Todas as secretarias</option>
          <option v-for="nome in secretarias" :key="nome" :value="nome">{{ nome }}</option>
        </select>
        <svg class="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-suave" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z" />
        </svg>
      </label>

      <label class="relative min-w-0">
        <span class="sr-only">Ordenar por</span>
        <select
          v-model="ordem"
          class="w-full cursor-pointer appearance-none truncate rounded-lg border border-azul bg-azul/10 py-2.5 pr-8 pl-3 text-sm font-medium text-texto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-azul"
        >
          <option value="valor-desc">Maior valor recebido</option>
          <option value="valor-asc">Menor valor recebido</option>
          <option value="nome-asc">Nome (A–Z)</option>
          <option value="nome-desc">Nome (Z–A)</option>
        </select>
        <svg class="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-texto" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z" />
        </svg>
      </label>
    </div>

    <div class="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
      <table class="w-full border-collapse text-left text-xs sm:text-sm">
        <thead>
          <tr class="bg-azul/10 text-[0.68rem] font-semibold tracking-wide text-suave uppercase sm:text-xs">
            <th scope="col" class="rounded-l-lg py-3 pr-2 pl-2 font-semibold sm:pl-3">Pos.</th>
            <th scope="col" class="py-3 pr-2 font-semibold" :aria-sort="ariaOrdem('nome')">
              <button type="button" class="uppercase hover:text-texto" @click="ordenarPor('nome')">
                Fornecedor / credor {{ setaNome }}
              </button>
            </th>
            <th scope="col" class="hidden py-3 pr-2 font-semibold sm:table-cell">Secretaria</th>
            <th scope="col" class="py-3 pr-2 text-right font-semibold" :aria-sort="ariaOrdem('valor')">
              <button type="button" class="text-texto uppercase hover:text-azul" @click="ordenarPor('valor')">
                Valor recebido {{ setaValor }}
              </button>
            </th>
            <th scope="col" class="rounded-r-lg py-3 pr-3 text-right font-semibold">
              <span class="sm:hidden" aria-hidden="true">%</span><span class="sr-only sm:not-sr-only">Participação</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="linha in visiveis" :key="linha.documento + linha.nome" class="border-b border-borda last:border-b-0">
            <td class="py-3.5 pr-2 pl-2 text-apagado tabular-nums sm:pl-3">{{ posicao(linha.posicao) }}</td>
            <td class="py-3.5 pr-2 font-medium text-texto">
              {{ linha.nome }}
              <!-- No celular a secretaria vai embaixo do nome, para a tabela caber sem rolagem lateral. -->
              <span class="mt-0.5 block text-[0.7rem] font-normal text-suave sm:hidden">
                {{ linha.secretaria }}
              </span>
            </td>
            <td class="hidden py-3.5 pr-2 text-suave sm:table-cell">
              {{ linha.secretaria }}
            </td>
            <td class="py-3.5 pr-2 text-right font-mono text-[0.7rem] whitespace-nowrap text-texto tabular-nums sm:text-sm">{{ formatarReais(linha.valor) }}</td>
            <td class="py-3.5 pr-2 text-right font-mono text-[0.7rem] whitespace-nowrap text-suave tabular-nums sm:pr-3 sm:text-sm">{{ formatarPercentual(linha.participacao, 2) }}</td>
          </tr>
          <tr v-if="!visiveis.length">
            <td colspan="5" class="py-10 text-center text-suave">Nenhum credor encontrado para esse filtro.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <nav class="flex flex-wrap items-center justify-between gap-3 text-xs" aria-label="Paginação dos credores">
      <p class="text-apagado">
        Exibindo {{ formatarInteiro(inicio) }}–{{ formatarInteiro(fim) }} de {{ formatarInteiro(filtradas.length) }} resultados
      </p>
      <div class="flex items-center gap-1">
        <button
          type="button"
          class="rounded-md border border-borda px-2.5 py-1.5 text-suave hover:border-texto hover:text-texto disabled:pointer-events-none disabled:opacity-40"
          :disabled="pagina === 1"
          @click="pagina--"
        >Anterior</button>
        <template v-for="(botao, i) in botoesPagina" :key="i">
          <span v-if="botao === '…'" class="px-1 text-apagado">…</span>
          <button
            v-else
            type="button"
            class="min-w-8 rounded-md border px-2 py-1.5 tabular-nums"
            :class="botao === pagina ? 'border-texto bg-texto font-semibold text-fundo' : 'border-borda text-suave hover:border-texto hover:text-texto'"
            :aria-current="botao === pagina ? 'page' : undefined"
            @click="pagina = botao"
          >{{ botao }}</button>
        </template>
        <button
          type="button"
          class="rounded-md border border-borda px-2.5 py-1.5 text-suave hover:border-texto hover:text-texto disabled:pointer-events-none disabled:opacity-40"
          :disabled="pagina === totalPaginas"
          @click="pagina++"
        >Próxima</button>
      </div>
    </nav>

    <BotaoCsv class="self-start" @click="emit('exportar', filtradas, secretaria)">Exportar CSV</BotaoCsv>
  </section>
</template>
