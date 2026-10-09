import { computed, watch } from 'vue'
import { BarElement, CategoryScale, Chart, LinearScale, Tooltip, type Plugin } from 'chart.js'
import { tema } from '@/composables/useTema'

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip)

// Séries validadas nos dois temas (fundo #0f1218 e #ffffff): contraste ≥ 3:1 e
// distinguíveis com daltonismo. Só as cores neutras mudam com o tema.
export const SERIES = {
  receita: '#1f56d8',
  despesa: '#5b95ec',
}

const NEUTROS = {
  escuro: { texto: '#f5f7fa', suave: '#a3acba', grade: '#1e2430', tooltip: '#171b24', tooltipBorda: '#2a3140' },
  claro: { texto: '#0d1117', suave: '#4b5563', grade: '#e5e7eb', tooltip: '#ffffff', tooltipBorda: '#d1d5db' },
}

export const neutros = computed(() => NEUTROS[tema.value])

Chart.defaults.font.family = "'Inter', system-ui, sans-serif"
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

// O Chart.js mede os rótulos com a fonte disponível no momento; quando a Inter termina
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
