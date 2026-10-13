import { computed, watch } from 'vue'
import { BarElement, CategoryScale, Chart, LinearScale, Tooltip, type Plugin } from 'chart.js'
import { tema } from '@/composables/useTema'

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip)

// Escuro = alto contraste: barras e textos com no mínimo 7:1 sobre o cartão (#0a0a0a).
// Um azul escuro não chega a 7:1 no preto, então a receita fica azul-claro (9,8:1) e a despesa
// âmbar (12,9:1), par que também se distingue com daltonismo. Só a grade fica abaixo (decorativa).
// Claro: os azuis originais, com contraste ≥ 3:1 sobre o branco.
const SERIES = {
  escuro: { receita: '#8cb8ff', despesa: '#ffc94d', destaque: '#ffffff' },
  claro: { receita: '#1f56d8', despesa: '#5b95ec', destaque: '#5b95ec' },
}

const NEUTROS = {
  escuro: { texto: '#ffffff', suave: '#e6e6e6', grade: '#5c5c5c', tooltip: '#000000', tooltipBorda: '#a6a6a6' },
  claro: { texto: '#0d1117', suave: '#4b5563', grade: '#e5e7eb', tooltip: '#ffffff', tooltipBorda: '#d1d5db' },
}

export const coresSeries = computed(() => SERIES[tema.value])
export const neutros = computed(() => NEUTROS[tema.value])

Chart.defaults.font.family = "'Poppins', system-ui, sans-serif"
Chart.defaults.font.size = 12
// Ao montar (inclusive na troca de exercício) as barras crescem a partir do zero.
// Altera as propriedades em vez de trocar o objeto: substituir `Chart.defaults.animation`
// apaga a configuração interna de interpolação de cores e o Chart.js para de redesenhar.
Object.assign(Chart.defaults.animation, { duration: 700, easing: 'easeOutQuart' })
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) Chart.defaults.animation = false

Object.assign(Chart.defaults.plugins.tooltip, {
  borderWidth: 1,
  padding: 10,
  cornerRadius: 6,
  boxPadding: 4,
  usePointStyle: true,
})

const redesenharTodos = () => Object.values(Chart.instances).forEach((grafico) => grafico.update())

watch(
  neutros,
  (cores) => {
    Chart.defaults.color = cores.suave
    Chart.defaults.borderColor = cores.grade
    Object.assign(Chart.defaults.plugins.tooltip, {
      backgroundColor: cores.tooltip,
      borderColor: cores.tooltipBorda,
      titleColor: cores.texto,
      bodyColor: cores.suave,
    })
    redesenharTodos()
  },
  { immediate: true },
)

// O Chart.js mede os rótulos com a fonte disponível no momento; quando a Poppins termina
// de carregar, os gráficos são redesenhados para os nomes não ficarem cortados.
document.fonts?.ready.then(redesenharTodos)

// Escreve o valor na margem direita, alinhado com cada barra horizontal (como no protótipo do RF02).
// O gráfico precisa reservar essa margem em `layout.padding.right`.
export function rotulosAoLado(formatar: (valor: number) => string): Plugin<'bar'> {
  return {
    id: 'rotulosAoLado',
    afterDatasetsDraw(chart) {
      const { ctx } = chart
      const meta = chart.getDatasetMeta(0)
      const valores = chart.data.datasets[0]?.data ?? []
      ctx.save()
      ctx.fillStyle = neutros.value.texto
      ctx.font = `600 12px ${Chart.defaults.font.family}`
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'right'
      meta.data.forEach((barra, i) => {
        ctx.fillText(formatar(Number(valores[i])), chart.width - 2, barra.y)
      })
      ctx.restore()
    },
  }
}
