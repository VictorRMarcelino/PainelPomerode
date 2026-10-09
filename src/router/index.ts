import { createRouter, createWebHashHistory } from 'vue-router'
import PainelView from '../views/PainelView.vue'

// Hash history: o GitHub Pages não tem servidor para redirecionar rotas como /2025.
const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/:ano(\\d{4})?',
      name: 'painel',
      component: PainelView,
      props: true,
    },
    { path: '/:caminho(.*)*', redirect: '/' },
  ],
})

export default router
