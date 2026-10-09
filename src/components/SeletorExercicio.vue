<script setup lang="ts">
// RF01 — seleção do exercício.
defineProps<{ anos: number[] }>()
const ano = defineModel<number>({ required: true })
</script>

<template>
  <label class="flex flex-col gap-1.5">
    <span class="text-sm font-medium text-texto">Exercício</span>
    <span class="relative block">
      <select
        v-model.number="ano"
        class="w-44 cursor-pointer appearance-none rounded-lg border-2 border-texto bg-fundo py-2.5 pr-11 pl-4 text-base font-medium text-texto tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-texto"
      >
        <option v-for="opcao in anos" :key="opcao" :value="opcao">{{ opcao }}</option>
      </select>
      <svg
        class="pointer-events-none absolute top-1/2 right-3.5 size-5 -translate-y-1/2 text-texto"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
        <rect x="13" y="14" width="4" height="3" rx=".5" fill="currentColor" stroke="none" />
      </svg>
    </span>
  </label>
</template>
