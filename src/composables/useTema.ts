import { ref, watch } from 'vue'

export type Tema = 'escuro' | 'claro'

const CHAVE = 'painel-pomerode:tema'

function temaInicial(): Tema {
  try {
    const salvo = localStorage.getItem(CHAVE)
    if (salvo === 'escuro' || salvo === 'claro') return salvo
  } catch {
    // Navegação privada pode bloquear o localStorage; segue com o padrão.
  }
  return 'escuro'
}

// Estado único para o site inteiro. O index.html aplica o tema salvo antes do Vue carregar,
// para a página não piscar no tema errado.
export const tema = ref<Tema>(temaInicial())

watch(
  tema,
  (atual) => {
    document.documentElement.dataset.tema = atual
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', atual === 'escuro' ? '#08090c' : '#f3f4f6')
    try {
      localStorage.setItem(CHAVE, atual)
    } catch {
      // Sem localStorage o tema só não fica salvo para a próxima visita.
    }
  },
  { immediate: true },
)

export function alternarTema() {
  tema.value = tema.value === 'escuro' ? 'claro' : 'escuro'
}
