<script setup lang="ts">
import { formatarData } from '@/utils/formatos'

defineProps<{ atualizadoEm: string }>()
</script>

<template>
  <footer class="mt-4 border-t border-borda bg-cartao transition-colors">
    <div class="mx-auto grid max-w-7xl items-center gap-4 px-4 py-6 text-sm sm:grid-cols-3 sm:px-6">
      <div class="flex items-center gap-3">
        <svg class="size-8 shrink-0 text-texto" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
          <path d="M6 15 20 6l14 9" stroke-linejoin="round" />
          <path d="M9 15h22M11 18v12M17 18v12M23 18v12M29 18v12M7 33h26" stroke-linecap="round" />
        </svg>
        <div>
          <p class="leading-tight font-semibold text-texto">Painel Pomerode</p>
          <p class="text-xs text-suave">Município de Pomerode</p>
        </div>
      </div>

      <p class="text-suave sm:text-center">Município de Pomerode. Todos os direitos reservados. ©</p>

      <div class="sm:text-right">
        <p class="font-medium text-texto">
          Atualizado em <time :datetime="atualizadoEm">{{ formatarData(atualizadoEm) }}</time>
        </p>
        <p class="text-xs text-suave">
          <span class="font-semibold text-texto">Fonte:</span> Portal da Transparência de Pomerode (IPM)/IBGE
        </p>
      </div>
    </div>
  </footer>
</template>
