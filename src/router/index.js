import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '../supabase.js'

// Charging Phone App Views
import Dashboard from '../views/Dashboard.vue'
import AddDevice from '../views/AddDevice.vue'
import AddPayment from '../views/AddPayment.vue'
import HistoryLogs from '../views/HistoryLogs.vue'
import CustomersList from '../views/CustomersList.vue'
import PricesConfig from '../views/PricesConfig.vue'
import LoginView from '../views/LoginView.vue'

// Laundry App Views
import LaundryLogin from '../views/laundry/LaundryLogin.vue'
import LaundryDashboard from '../views/laundry/LaundryDashboard.vue'
import LaundryAddOrder from '../views/laundry/LaundryAddOrder.vue'
import LaundryHistory from '../views/laundry/LaundryHistory.vue'
import LaundryCustomers from '../views/laundry/LaundryCustomers.vue'
import LaundryAddPayment from '../views/laundry/LaundryAddPayment.vue'
import LaundryPrices from '../views/laundry/LaundryPrices.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // --- Charging Phone App (Original) ---
    { path: '/login', name: 'login', component: LoginView, meta: { hideLayout: true } },
    { path: '/', name: 'dashboard', component: Dashboard },
    { path: '/add-device', name: 'add-device', component: AddDevice },
    { path: '/add-payment', name: 'add-payment', component: AddPayment },
    { path: '/history', name: 'history', component: HistoryLogs },
    { path: '/customers', name: 'customers', component: CustomersList },
    { path: '/prices', name: 'prices', component: PricesConfig },

    // --- Laundry App (New) ---
    { path: '/laundry/login', name: 'laundry-login', component: LaundryLogin, meta: { hideLayout: true } },
    { path: '/laundry/', name: 'laundry-dashboard', component: LaundryDashboard, meta: { isLaundry: true } },
    { path: '/laundry/add-order', name: 'laundry-add-order', component: LaundryAddOrder, meta: { isLaundry: true } },
    { path: '/laundry/history', name: 'laundry-history', component: LaundryHistory, meta: { isLaundry: true } },
    { path: '/laundry/customers', name: 'laundry-customers', component: LaundryCustomers, meta: { isLaundry: true } },
    { path: '/laundry/add-payment', name: 'laundry-add-payment', component: LaundryAddPayment, meta: { isLaundry: true } },
    { path: '/laundry/prices', name: 'laundry-prices', component: LaundryPrices, meta: { isLaundry: true } }
  ]
})

router.beforeEach(async (to, from, next) => {
  const { data: { session } } = await supabase.auth.getSession()
  
  const isLoginRoute = to.name === 'login' || to.name === 'laundry-login'

  if (!isLoginRoute && !session) {
    // If going to a laundry page but not logged in, go to laundry login
    if (to.path.startsWith('/laundry')) {
      next({ name: 'laundry-login' })
    } else {
      next({ name: 'login' })
    }
  } else if (isLoginRoute && session) {
    if (to.name === 'laundry-login') next({ name: 'laundry-dashboard' })
    else next({ name: 'dashboard' })
  } else {
    next()
  }
})

export default router
