<template>
  <button
    type="button"
    class="inline-flex items-center gap-2 rounded-lg border border-borda bg-fundo px-3 py-2 text-xs font-medium text-texto transition-colors hover:border-texto hover:bg-texto hover:text-fundo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-texto"
  >
    <svg class="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10 2a1 1 0 0 1 1 1v8.6l2.3-2.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 1.4-1.4L9 11.6V3a1 1 0 0 1 1-1Z" />
      <path d="M3 14a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1Z" />
    </svg>
    <slot />
  </button>
</template>
