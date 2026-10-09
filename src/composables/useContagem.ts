import { onBeforeUnmount, ref, watch, type Ref } from 'vue'

const reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Anima um número até o valor alvo (efeito de contagem ao trocar de exercício).
// Ao montar, a contagem começa do zero.
export function useContagem(alvo: () => number, duracaoMs = 700): Ref<number> {
  const atual = ref(reduzirMovimento ? alvo() : 0)
  let quadro = 0

  watch(
    alvo,
    (destino) => {
      cancelAnimationFrame(quadro)
      if (reduzirMovimento) {
        atual.value = destino
        return
      }
      const origem = atual.value
      const inicio = performance.now()
      const passo = (agora: number) => {
        const progresso = Math.min(1, (agora - inicio) / duracaoMs)
        atual.value = origem + (destino - origem) * (1 - (1 - progresso) ** 4)
        if (progresso < 1) quadro = requestAnimationFrame(passo)
      }
      quadro = requestAnimationFrame(passo)
    },
    { immediate: true },
  )

  onBeforeUnmount(() => cancelAnimationFrame(quadro))
  return atual
}
