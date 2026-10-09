<script setup lang="ts">
// RF02 — Total pago por secretaria/órgão no exercício.
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import type { ChartData, ChartOptions } from 'chart.js'
import { neutros, rotulosAoLado, SERIES } from './configurar'
import BotaoCsv from '@/components/BotaoCsv.vue'
import { useContagem } from '@/composables/useContagem'
import type { ValorPorOrgao } from '@/dados/calculos'
import { encurtarOrgao, formatarMilhoes, formatarMoeda, formatarPercentual } from '@/utils/formatos'

const props = defineProps<{
  exercicio: number
  porOrgao: ValorPorOrgao[]
  totalPago: number
}>()

defineEmits<{ exportar: [] }>()

const MAXIMO_DE_BARRAS = 7

// Os maiores órgãos aparecem sozinhos; o restante vira "Demais órgãos".
const barras = computed(() => {
  if (props.porOrgao.length <= MAXIMO_DE_BARRAS) return props.porOrgao.map((o) => ({ ...o, agrupados: [] as string[] }))
  const principais = props.porOrgao.slice(0, MAXIMO_DE_BARRAS - 1)
  const demais = props.porOrgao.slice(MAXIMO_DE_BARRAS - 1)
  return [
    ...principais.map((o) => ({ ...o, agrupados: [] as string[] })),
    {
      nome: 'Demais órgãos',
      valor: demais.reduce((soma, o) => soma + o.valor, 0),
      agrupados: demais.map((o) => o.nome),
    },
  ]
})

// Critério de aceite do RF02: a soma do gráfico confere com o total pago.
const somaDoGrafico = computed(() => barras.value.reduce((soma, b) => soma + b.valor, 0))
const diferenca = computed(() =>
  props.totalPago === 0 ? 0 : Math.abs(somaDoGrafico.value - props.totalPago) / props.totalPago,
)

const dados = computed<ChartData<'bar'>>(() => ({
  labels: barras.value.map((b) => encurtarOrgao(b.nome)),
  datasets: [
    {
      data: barras.value.map((b) => b.valor),
      backgroundColor: SERIES.receita,
      hoverBackgroundColor: SERIES.despesa,
      borderRadius: 4,
      borderSkipped: 'start',
      barPercentage: 0.7,
      categoryPercentage: 1,
    },
  ],
}))

const opcoes = computed<ChartOptions<'bar'>>(() => ({
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  layout: { padding: { left: 6, right: 84 } },
  scales: {
    x: { display: false, beginAtZero: true },
    y: {
      grid: { display: false },
      border: { display: false },
      ticks: {
        color: neutros.value.texto,
        font: { size: 12 },
        // Nomes longos são cortados conforme a largura disponível (o nome completo aparece no tooltip).
        callback(_valor, indice) {
          const nome = encurtarOrgao(barras.value[indice]!.nome)
          const limite = this.chart.width < 480 ? 13 : 30
          return nome.length > limite ? `${nome.slice(0, limite - 1)}…` : nome
        },
      },
    },
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      displayColors: false,
      callbacks: {
        title: (itens) => barras.value[itens[0]!.dataIndex]!.nome,
        label: (item) => {
          const valor = Number(item.raw)
          const fatia = props.totalPago ? valor / props.totalPago : 0
          return `${formatarMoeda(valor)} · ${formatarPercentual(fatia)} do total pago`
        },
        afterLabel: (item) => {
          const agrupados = barras.value[item.dataIndex]!.agrupados
          return agrupados.length ? `${agrupados.length} órgãos agrupados` : ''
        },
      },
    },
  },
}))

const plugins = [rotulosAoLado((valor) => formatarMilhoes(valor))]
const totalAnimado = useContagem(() => props.totalPago)
</script>

<template>
  <section class="cartao flex min-w-0 flex-col gap-4 p-5" aria-labelledby="titulo-rf02">
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 id="titulo-rf02" class="text-lg font-semibold text-texto">Total pago por secretaria / órgão</h2>
        <p class="text-sm text-suave">Valores pagos no exercício de {{ exercicio }}</p>
      </div>
      <div class="sm:text-right">
        <p class="text-xs font-medium tracking-wider text-apagado uppercase">Total pago</p>
        <p class="text-2xl font-semibold text-texto tabular-nums">{{ formatarMilhoes(totalAnimado) }}</p>
      </div>
    </header>

    <div class="relative w-full min-w-0 overflow-hidden" :style="{ height: `${Math.max(barras.length, 1) * 38}px` }">
      <Bar
        v-if="barras.length"
        :data="dados"
        :options="opcoes"
        :plugins="plugins"
        role="img"
        :aria-label="`Gráfico de barras com o total pago por órgão em ${exercicio}`"
      />
      <p v-else class="grid h-full place-items-center text-sm text-suave">Nenhum pagamento registrado.</p>
    </div>

    <p
      v-if="barras.length"
      class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-borda bg-fundo px-3 py-2 text-xs"
    >
      <span class="flex items-center gap-1.5 font-medium text-texto">
        <svg v-if="diferenca <= 0.01" class="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fill-rule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z" clip-rule="evenodd" />
        </svg>
        {{ diferenca <= 0.01 ? 'Soma dos órgãos confere com o total pago' : 'Soma dos órgãos diverge do total pago' }}
      </span>
      <span class="text-suave tabular-nums">
        {{ formatarMilhoes(somaDoGrafico) }} · diferença {{ formatarPercentual(diferenca) }}
      </span>
    </p>

    <details class="text-sm">
      <summary class="cursor-pointer text-suave hover:text-texto">Ver todos os órgãos em tabela</summary>
      <table class="mt-2 w-full text-left text-xs">
        <thead class="text-apagado">
          <tr><th class="py-1 font-medium">Órgão</th><th class="py-1 text-right font-medium">Pago</th></tr>
        </thead>
        <tbody>
          <tr v-for="orgao in porOrgao" :key="orgao.nome" class="border-t border-borda">
            <td class="py-1.5 pr-2 text-texto">{{ orgao.nome }}</td>
            <td class="py-1.5 text-right text-texto tabular-nums">{{ formatarMoeda(orgao.valor) }}</td>
          </tr>
        </tbody>
      </table>
    </details>

    <BotaoCsv class="mt-auto self-start" @click="$emit('exportar')">Exportar CSV das despesas de {{ exercicio }}</BotaoCsv>
  </section>
</template>
