<script setup lang="ts">
import { formatarData } from '@/utils/formatos'
import logo from '@/assets/logo.png'

defineProps<{ atualizadoEm: string }>()
</script>

<template>
  <footer class="mt-4 border-t border-borda bg-cartao transition-colors">
    <div class="mx-auto grid max-w-7xl items-center gap-4 px-4 py-6 text-sm sm:grid-cols-3 sm:px-6">
      <div class="flex items-center gap-3">
        <img :src="logo" alt="" class="size-10 shrink-0 rounded-full" width="128" height="128" />
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
