<script setup lang="ts">
// RF04 — cartão de indicador.
import { computed } from 'vue'
import { useContagem } from '@/composables/useContagem'

const props = defineProps<{
  titulo: string
  valor: number | null
  formatar: (valor: number) => string
  regra: string
}>()

const animado = useContagem(() => props.valor ?? 0)
const texto = computed(() => (props.valor === null ? '—' : props.formatar(animado.value)))
</script>

<template>
  <article class="cartao flex min-w-0 flex-col gap-1 p-4 sm:p-5">
    <h3 class="text-sm font-medium text-suave">{{ titulo }}</h3>
    <p class="text-2xl font-semibold tracking-tight text-texto tabular-nums sm:text-3xl">{{ texto }}</p>
    <p class="text-xs text-apagado">{{ regra }}</p>
  </article>
</template>
