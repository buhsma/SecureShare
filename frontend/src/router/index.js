import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/HomeView.vue'
import Download from '@/views/DownloadView.vue'
import TestView from '@/views/TestView.vue'
import Register from '@/views/RegisterView.vue'
import Login from '@/views/LoginView.vue'
import ResetPassword from '@/views/ResetPasswordView.vue'
import Dashboard from '@/views/DashboardView.vue'
import About from '@/views/AboutView.vue'
import FAQ from '@/views/FAQView.vue'
import { isAuthenticated } from '@/tools/authCheck'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home
    },
    {
      path: '/register',
      name: 'register',
      component: Register
    },
    {
      path: '/login',
      name: 'login',
      component: Login
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: ResetPassword
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: Dashboard,
      meta: {
        requiresAuth: true
      }
    },
    {
      path: '/about',
      name: 'about',
      component: About
    },
    {
      path: '/faq',
      name: 'faq',
      component: FAQ
    },
    {
      path: '/download/:id/:cryptoKey/:fileName/:totalChunks',
      name: 'download',
      component: Download,
      props: true
    }
  ]
})

router.beforeEach(async (to, from, next) => {
  if (to.meta.requiresAuth && !(await isAuthenticated())) {
    next('/login')
  } else {
    next()
  }
})

export default router
