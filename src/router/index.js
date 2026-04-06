import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '../supabase.js'
import Dashboard from '../views/Dashboard.vue'
import AddDevice from '../views/AddDevice.vue'
import AddPayment from '../views/AddPayment.vue'
import HistoryLogs from '../views/HistoryLogs.vue'
import CustomersList from '../views/CustomersList.vue'
import PricesConfig from '../views/PricesConfig.vue'
import LoginView from '../views/LoginView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { hideLayout: true }
    },
    {
      path: '/',
      name: 'dashboard',
      component: Dashboard
    },
    {
      path: '/add-device',
      name: 'add-device',
      component: AddDevice
    },
    {
      path: '/add-payment',
      name: 'add-payment',
      component: AddPayment
    },
    {
      path: '/history',
      name: 'history',
      component: HistoryLogs
    },
    {
      path: '/customers',
      name: 'customers',
      component: CustomersList
    },
    {
      path: '/prices',
      name: 'prices',
      component: PricesConfig
    }
  ]
})

router.beforeEach(async (to, from, next) => {
  // Check active session
  const { data: { session } } = await supabase.auth.getSession()

  // Protect all routes except login
  if (to.name !== 'login' && !session) {
    next({ name: 'login' })
  } else if (to.name === 'login' && session) {
    // Redirect to dashboard if logged in and trying to visit login
    next({ name: 'dashboard' })
  } else {
    next()
  }
})

export default router
