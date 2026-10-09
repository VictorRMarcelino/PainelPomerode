<script setup lang="ts">
import { alternarTema, tema } from '@/composables/useTema'
import { formatarData } from '@/utils/formatos'

defineProps<{ atualizadoEm: string }>()
</script>

<template>
  <header class="border-b border-borda bg-cartao transition-colors">
    <div class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
      <div class="flex items-center gap-3">
        <svg class="size-10 text-texto" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
          <path d="M6 15 20 6l14 9" stroke-linejoin="round" />
          <path d="M9 15h22M11 18v12M17 18v12M23 18v12M29 18v12M7 33h26" stroke-linecap="round" />
        </svg>
        <div>
          <p class="text-xl leading-tight font-semibold text-texto">Painel Pomerode</p>
          <p class="text-sm text-suave">Município de Pomerode</p>
        </div>
      </div>

      <div class="flex items-center gap-4">
        <div class="text-left sm:text-right">
          <p class="text-base font-medium text-texto">
            Atualizado em <time :datetime="atualizadoEm">{{ formatarData(atualizadoEm) }}</time>
          </p>
          <p class="text-xs text-suave">
            <span class="font-semibold text-texto">Fonte:</span>{{ ' ' }}
            <a
              href="https://pomerode.atende.net/transparencia/"
              target="_blank"
              rel="noopener"
              class="underline decoration-borda underline-offset-2 hover:text-texto"
            >Portal da Transparência de Pomerode (IPM)</a>
            / IBGE
          </p>
        </div>

        <button
          type="button"
          class="grid size-10 shrink-0 place-items-center rounded-lg border border-borda text-texto transition-colors hover:border-texto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-texto"
          :aria-label="tema === 'escuro' ? 'Mudar para o tema claro' : 'Mudar para o tema escuro'"
          :title="tema === 'escuro' ? 'Tema claro' : 'Tema escuro'"
          @click="alternarTema"
        >
          <!-- Sol no tema escuro (vai para o claro); lua no tema claro (vai para o escuro). -->
          <svg v-if="tema === 'escuro'" class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
          <svg v-else class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
          </svg>
        </button>
      </div>
    </div>
  </header>
</template>
