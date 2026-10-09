<script setup lang="ts">
// RF04 — cartão de indicador.
import { computed } from 'vue'
import { useContagem } from '@/composables/useContagem'

const props = defineProps<{
  titulo: string
  valor: number | null
  formatar: (valor: number) => string
  regra: string // dica ao passar o mouse (a regra de cálculo)
}>()

const animado = useContagem(() => props.valor ?? 0)
const texto = computed(() => (props.valor === null ? '—' : props.formatar(animado.value)))
</script>

<template>
  <article class="cartao flex min-w-0 flex-col gap-1 p-4 sm:p-5" :title="regra">
    <h3 class="text-sm font-medium text-suave">{{ titulo }}</h3>
    <p class="text-2xl font-semibold tracking-tight text-texto tabular-nums sm:text-3xl">{{ texto }}</p>
  </article>
</template>
