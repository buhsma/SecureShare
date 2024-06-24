import { createRouter, createWebHistory } from 'vue-router'
// import HomeView from '../views/HomeView.vue'
import TestView from '@/views/TestView.vue'
import Register from '@/components/Register.vue'
import Login from '@/components/Login.vue'
import ResetPassword from '@/components/ResetPassword.vue'
import Dashboard from '@/views/DashboardView.vue'
import axios from 'axios'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'test',
      component: TestView
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
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/AboutView.vue')
    }
  ]
})

async function isAuthenticated() {
  const token = localStorage.getItem('access');
  if (!token) {
    return false;
  }

  try {
    console.log('Checking token');
    const response = await axios.post('/api/token/verify/', {
      token: token
    });
    console.log('Token response', response);
    return response.status === 200;
  } catch (error) {
    console.error('Token verify error', error);
    if (error.response.status === 401) {
      console.log('Refreshing token');
      const refresh = localStorage.getItem('refresh');
      try {
        const response = await axios.post('/api/token/refresh/', {
          refresh: refresh
        });
        console.log('Refresh response', response);
        localStorage.setItem('access', response.data.access);
        return true;
      } catch (error) {
        console.error('Token refresh error', error);
        return false;
      }
    }
    return false;
  }
}

router.beforeEach(async (to, from, next) => {
  if (to.meta.requiresAuth && !(await isAuthenticated())) {
    next('/login')
  }
  else {
    next()
  }
})

export default router
