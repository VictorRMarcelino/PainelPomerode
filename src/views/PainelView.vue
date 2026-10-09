<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import CabecalhoPainel from '@/components/CabecalhoPainel.vue'
import CartaoIndicador from '@/components/CartaoIndicador.vue'
import RodapePainel from '@/components/RodapePainel.vue'
import SeletorExercicio from '@/components/SeletorExercicio.vue'
import TabelaCredores from '@/components/TabelaCredores.vue'
import GraficoDespesasOrgao from '@/components/graficos/GraficoDespesasOrgao.vue'
import GraficoReceitaDespesa from '@/components/graficos/GraficoReceitaDespesa.vue'
import '@/components/graficos/configurar'
import { usePainelStore } from '@/stores/painel'
import { exportarCredores, exportarDespesas, exportarReceitas } from '@/utils/exportacao'
import { formatarPercentual, formatarReais } from '@/utils/formatos'

const props = defineProps<{ ano?: string }>()

const router = useRouter()
const painel = usePainelStore()
const { resumo, credores, carregando, progresso, atualizandoAoVivo, anosDisponiveis, atualizadoEm } = storeToRefs(painel)
const indicePronto = ref(false)

// RF01: o ano fica na URL (#/2025), então dá para compartilhar o link de um exercício.
const anoSelecionado = computed({
  get: () => painel.ano ?? anosDisponiveis.value[0]!,
  set: (novo: number) => void router.push({ name: 'painel', params: { ano: String(novo) } }),
})

function aplicarRota() {
  const ano = Number(props.ano)
  if (!anosDisponiveis.value.includes(ano)) {
    void router.replace({ name: 'painel', params: { ano: String(anosDisponiveis.value[0]) } })
    return
  }
  void painel.selecionar(ano)
}

onMounted(async () => {
  await painel.carregarIndice()
  indicePronto.value = true
  aplicarRota()
})

watch(
  () => props.ano,
  () => indicePronto.value && aplicarRota(),
)

// RF04 — indicadores (a regra de cálculo aparece ao passar o mouse). Os valores são números
// para o cartão animar a contagem; a formatação fica com cada cartão.
const cartoes = computed(() => {
  const r = resumo.value
  if (!r) return []
  const fracao = (parte: number, todo: number | null) => (todo ? parte / todo : null)
  return [
    {
      titulo: 'Orçamento executado',
      valor: fracao(r.totalPago, r.orcadoDespesa),
      formatar: formatarPercentual,
      regra: 'Despesa paga ÷ despesa orçada',
    },
    {
      titulo: 'Gastos em Saúde',
      valor: fracao(r.saude.valor, r.totalPago),
      formatar: formatarPercentual,
      regra: `${r.saude.orgao ?? 'Órgão de Saúde'} ÷ despesa paga`,
    },
    {
      titulo: 'Gastos em Educação',
      valor: fracao(r.educacao.valor, r.totalPago),
      formatar: formatarPercentual,
      regra: `${r.educacao.orgao ?? 'Órgão de Educação'} ÷ despesa paga`,
    },
    {
      titulo: 'Despesa por habitante',
      valor: r.populacao ? r.totalPago / r.populacao.habitantes : null,
      formatar: formatarReais,
      regra: r.populacao
        ? `Despesa paga ÷ ${r.populacao.habitantes.toLocaleString('pt-BR')} habitantes (IBGE ${r.populacao.ano})`
        : 'Estimativa do IBGE indisponível',
    },
  ]
})
</script>

<template>
  <div class="min-h-dvh">
    <CabecalhoPainel :atualizado-em="atualizadoEm" :atualizando="atualizandoAoVivo && !carregando" />

    <main class="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <section class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="text-2xl font-semibold text-texto sm:text-3xl">Visão geral das contas públicas</h1>
          <p class="mt-1 text-sm text-suave">
            Receitas, despesas e principais credores consolidados para acompanhamento do cidadão.
          </p>
        </div>
        <div class="flex flex-col items-start gap-2 sm:items-end">
          <SeletorExercicio v-model="anoSelecionado" :anos="anosDisponiveis" />
        </div>
      </section>

      <div class="relative" :aria-busy="carregando">
        <!-- Troca de exercício: o conteúdo antigo sai e o novo entra; gráficos e números animam ao montar. -->
        <Transition name="exercicio" mode="out-in">
          <div v-if="resumo" :key="resumo.exercicio" class="flex flex-col gap-6">
            <section class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" aria-label="Indicadores">
              <CartaoIndicador v-for="cartao in cartoes" :key="cartao.titulo" v-bind="cartao" />
            </section>

            <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <GraficoDespesasOrgao
                :exercicio="resumo.exercicio"
                :por-orgao="resumo.porOrgao"
                :total-pago="resumo.totalPago"
                @exportar="painel.exercicio && exportarDespesas(painel.exercicio)"
              />
              <GraficoReceitaDespesa
                :exercicio="resumo.exercicio"
                :por-mes="resumo.porMes"
                :total-arrecadado="resumo.totalArrecadado"
                :total-pago="resumo.totalPago"
                @exportar="painel.exercicio && exportarReceitas(painel.exercicio)"
              />
            </div>

            <TabelaCredores
              :exercicio="resumo.exercicio"
              :credores="credores"
              @exportar="(linhas, secretaria) => exportarCredores(linhas, resumo!.exercicio, secretaria)"
            />
          </div>

          <!-- Esqueleto da primeira carga, no formato do painel. -->
          <div v-else key="esqueleto" class="flex animate-pulse flex-col gap-6" aria-hidden="true">
            <div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              <div v-for="n in 4" :key="n" class="cartao h-32" />
            </div>
            <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div v-for="n in 2" :key="n" class="cartao h-[30rem]" />
            </div>
            <div class="cartao h-[36rem]" />
          </div>
        </Transition>

        <Transition name="carregando">
          <div
            v-if="carregando"
            class="absolute inset-0 z-10 flex justify-center rounded-xl bg-fundo/70 backdrop-blur-[2px]"
            role="status"
          >
            <div class="sticky top-1/3 flex h-fit flex-col items-center gap-3 px-4 pt-24 text-center">
              <span class="size-10 animate-spin rounded-full border-4 border-borda border-t-texto" aria-hidden="true" />
              <p class="font-medium text-texto">
                <template v-if="progresso">Consultando o portal da transparência… {{ progresso.feitas }}/{{ progresso.total }}</template>
                <template v-else>Carregando dados de {{ anoSelecionado }}…</template>
              </p>
              <p v-if="progresso" class="max-w-sm text-xs text-suave">
                Este exercício ainda não tem cópia salva. O portal aceita 10 consultas por minuto, então pode levar alguns minutos.
              </p>
            </div>
          </div>
        </Transition>
      </div>

    </main>

    <RodapePainel :atualizado-em="atualizadoEm" />
  </div>
</template>
