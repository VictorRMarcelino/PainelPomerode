<script setup lang="ts">
// RF03 — Receita arrecadada x despesa paga, mês a mês.
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import type { ChartData, ChartOptions } from 'chart.js'
import { neutros, SERIES } from './configurar'
import BotaoCsv from '@/components/BotaoCsv.vue'
import type { ValorMensal } from '@/dados/calculos'
import { MESES_ABREVIADOS, NOMES_MESES, formatarMilhoes, formatarMoeda } from '@/utils/formatos'

const props = defineProps<{
  exercicio: number
  porMes: ValorMensal[]
  totalArrecadado: number
  totalPago: number
}>()

defineEmits<{ exportar: [] }>()

const ultimoMes = computed(() => {
  const ultimo = props.porMes.at(-1)
  return ultimo ? NOMES_MESES[Number(ultimo.mes) - 1] : ''
})

const saldo = computed(() => props.totalArrecadado - props.totalPago)

const series = computed(() => [
  { rotulo: 'Receita arrecadada', cor: SERIES.receita, total: props.totalArrecadado },
  { rotulo: 'Despesa paga', cor: SERIES.despesa, total: props.totalPago },
])

const dados = computed<ChartData<'bar'>>(() => ({
  labels: props.porMes.map((m) => MESES_ABREVIADOS[Number(m.mes) - 1]),
  datasets: [
    { label: 'Receita arrecadada', data: props.porMes.map((m) => m.receita), backgroundColor: SERIES.receita },
    { label: 'Despesa paga', data: props.porMes.map((m) => m.despesa), backgroundColor: SERIES.despesa },
  ].map((serie) => ({
    ...serie,
    borderRadius: 4,
    borderSkipped: 'start' as const,
    barPercentage: 0.88,
    categoryPercentage: 0.72,
  })),
}))

const opcoes = computed<ChartOptions<'bar'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  scales: {
    x: { grid: { display: false }, border: { color: neutros.value.grade } },
    y: {
      beginAtZero: true,
      border: { display: false },
      grid: { color: neutros.value.grade },
      ticks: { maxTicksLimit: 6, callback: (valor) => formatarMilhoes(Number(valor), 0) },
    },
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        title: (itens) => `${NOMES_MESES[Number(props.porMes[itens[0]!.dataIndex]!.mes) - 1]} de ${props.exercicio}`,
        label: (item) => `${item.dataset.label}: ${formatarMoeda(Number(item.raw))}`,
      },
    },
  },
}))
</script>

<template>
  <section class="cartao flex min-w-0 flex-col gap-4 p-5" aria-labelledby="titulo-rf03">
    <header>
      <h2 id="titulo-rf03" class="text-lg font-semibold text-texto">Receita arrecadada × despesa paga</h2>
      <p class="text-sm text-suave">
        Evolução mensal<template v-if="ultimoMes"> até {{ ultimoMes }}</template> de {{ exercicio }} · R$ milhões
      </p>
    </header>

    <ul class="flex flex-wrap gap-x-5 gap-y-1 text-sm">
      <li v-for="serie in series" :key="serie.rotulo" class="flex items-center gap-2 text-suave">
        <span class="size-3 rounded-sm" :style="{ backgroundColor: serie.cor }" aria-hidden="true" />
        {{ serie.rotulo }} ·
        <span class="font-medium text-texto tabular-nums">{{ formatarMilhoes(serie.total) }}</span>
      </li>
    </ul>

    <div class="relative h-72 w-full min-w-0 overflow-hidden">
      <Bar
        v-if="porMes.length"
        :data="dados"
        :options="opcoes"
        role="img"
        :aria-label="`Gráfico de barras com receita arrecadada e despesa paga por mês em ${exercicio}`"
      />
      <p v-else class="grid h-full place-items-center text-sm text-suave">Exercício ainda não iniciado.</p>
    </div>

    <p v-if="porMes.length" class="text-sm text-suave">
      {{ saldo >= 0 ? 'Receitas superam despesas' : 'Despesas superam receitas' }} em
      <span class="font-medium text-texto tabular-nums">{{ formatarMilhoes(Math.abs(saldo)) }}</span>
      no acumulado do exercício.
    </p>

    <details class="text-sm">
      <summary class="cursor-pointer text-suave hover:text-texto">Ver valores mensais em tabela</summary>
      <table class="mt-2 w-full text-left text-xs">
        <thead class="text-apagado">
          <tr>
            <th class="py-1 font-medium">Mês</th>
            <th class="py-1 text-right font-medium">Receita arrecadada</th>
            <th class="py-1 text-right font-medium">Despesa paga</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in porMes" :key="m.mes" class="border-t border-borda text-texto tabular-nums">
            <td class="py-1.5 capitalize">{{ NOMES_MESES[Number(m.mes) - 1] }}</td>
            <td class="py-1.5 text-right">{{ formatarMoeda(m.receita) }}</td>
            <td class="py-1.5 text-right">{{ formatarMoeda(m.despesa) }}</td>
          </tr>
        </tbody>
      </table>
    </details>

    <BotaoCsv class="mt-auto self-start" @click="$emit('exportar')">Exportar CSV das receitas de {{ exercicio }}</BotaoCsv>
  </section>
</template>
