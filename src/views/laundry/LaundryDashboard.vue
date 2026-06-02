<script setup>
import { computed, ref } from 'vue'
import { laundryStore } from '../../store/laundryDb.js'
import { isToday, isThisWeek, isThisMonth, parseISO } from 'date-fns'
import { Wallet, TrendingDown, Activity, Users, AlertCircle, Clock, CheckCircle, WashingMachine } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

const router = useRouter()
const timeFilter = ref('today')

const filters = [
  { val: 'today', label: 'اليوم' },
  { val: 'week', label: 'الأسبوع' },
  { val: 'month', label: 'الشهر' },
]

const filteredOrders = computed(() => {
  return laundryStore.orders.filter(o => {
    if (!o.created_at) return false
    const d = parseISO(o.created_at)
    if (timeFilter.value === 'today') return isToday(d)
    if (timeFilter.value === 'week') return isThisWeek(d)
    if (timeFilter.value === 'month') return isThisMonth(d)
    return true
  })
})

const totalProfit = computed(() => filteredOrders.value.reduce((s, o) => s + Number(o.total_amount || 0), 0))
const totalDebt = computed(() => laundryStore.customers.reduce((s, c) => s + Number(c.total_debt || 0), 0))
const orderCount = computed(() => filteredOrders.value.length)
const customerCount = computed(() => laundryStore.customers.length)

const recentOrders = computed(() => laundryStore.orders.slice(0, 8))

const topDebtors = computed(() =>
  [...laundryStore.customers]
    .filter(c => Number(c.total_debt) > 0)
    .sort((a, b) => Number(b.total_debt) - Number(a.total_debt))
    .slice(0, 5)
)

const statusLabel = (s) => ({ new: 'جديد', washing: 'قيد الغسيل', ready: 'جاهز', delivered: 'تم التسليم' }[s] || s)
const statusClass = (s) => ({
  new: 'bg-blue-100 text-blue-700',
  washing: 'bg-yellow-100 text-yellow-700',
  ready: 'bg-green-100 text-green-700',
  delivered: 'bg-slate-100 text-slate-600',
}[s] || 'bg-slate-100 text-slate-600')

const paymentLabel = (p) => ({ paid: 'مدفوع', partial: 'جزئي', debt: 'دين' }[p] || p)
const paymentClass = (p) => ({
  paid: 'bg-emerald-100 text-emerald-700',
  partial: 'bg-amber-100 text-amber-700',
  debt: 'bg-red-100 text-red-700',
}[p] || 'bg-slate-100 text-slate-600')

const formatDate = (iso) => {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('ar-PS', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="space-y-6 pb-24 md:pb-0">

    <!-- Header -->
    <div class="flex flex-col gap-3">
      <div>
        <h1 class="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <WashingMachine class="w-7 h-7 text-primary-600" />
          لوحة التحكم
        </h1>
        <p class="text-sm text-slate-500 mt-1">ملخص نشاط مغسلة المبحوح</p>
      </div>

      <!-- Time Filter -->
      <div class="inline-flex w-full md:w-auto bg-white/70 p-1 rounded-xl shadow-sm border border-slate-200 backdrop-blur-md overflow-x-auto">
        <button v-for="f in filters" :key="f.val" @click="timeFilter = f.val"
          class="flex-1 md:flex-none px-4 py-2 text-sm font-bold rounded-lg transition-all whitespace-nowrap"
          :class="timeFilter === f.val ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'">
          {{ f.label }}
        </button>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
      <div class="laundry-card rounded-2xl p-4 md:p-5 flex flex-col gap-3 hover:shadow-md transition-all group relative overflow-hidden">
        <div class="absolute -right-4 -top-4 w-20 h-20 bg-primary-100 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500"></div>
        <div class="p-2.5 rounded-2xl bg-primary-100 text-primary-600 w-fit"><Wallet class="w-5 h-5" /></div>
        <div>
          <p class="text-xs font-semibold text-slate-500">
            {{ timeFilter === 'today' ? 'ربح اليوم' : timeFilter === 'week' ? 'ربح الأسبوع' : 'ربح الشهر' }}
          </p>
          <div class="flex items-baseline gap-1 mt-0.5">
            <span class="text-2xl font-extrabold text-slate-900">{{ totalProfit.toFixed(1) }}</span>
            <span class="text-xs text-slate-500">₪</span>
          </div>
        </div>
      </div>

      <div class="laundry-card rounded-2xl p-4 md:p-5 flex flex-col gap-3 hover:shadow-md transition-all group relative overflow-hidden">
        <div class="absolute -right-4 -top-4 w-20 h-20 bg-red-100 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500"></div>
        <div class="p-2.5 rounded-2xl bg-red-100 text-red-500 w-fit"><TrendingDown class="w-5 h-5" /></div>
        <div>
          <p class="text-xs font-semibold text-slate-500">إجمالي الديون</p>
          <div class="flex items-baseline gap-1 mt-0.5">
            <span class="text-2xl font-extrabold text-red-600">{{ totalDebt.toFixed(1) }}</span>
            <span class="text-xs text-slate-500">₪</span>
          </div>
        </div>
      </div>

      <div class="laundry-card rounded-2xl p-4 md:p-5 flex flex-col gap-3 hover:shadow-md transition-all group relative overflow-hidden">
        <div class="absolute -right-4 -top-4 w-20 h-20 bg-primary-100 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500"></div>
        <div class="p-2.5 rounded-2xl bg-primary-100 text-primary-600 w-fit"><Activity class="w-5 h-5" /></div>
        <div>
          <p class="text-xs font-semibold text-slate-500">عدد الطلبات</p>
          <div class="flex items-baseline gap-1 mt-0.5">
            <span class="text-2xl font-extrabold text-slate-900">{{ orderCount }}</span>
            <span class="text-xs text-slate-500">طلب</span>
          </div>
        </div>
      </div>

      <div class="laundry-card rounded-2xl p-4 md:p-5 flex flex-col gap-3 hover:shadow-md transition-all group relative overflow-hidden">
        <div class="absolute -right-4 -top-4 w-20 h-20 bg-violet-100 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500"></div>
        <div class="p-2.5 rounded-2xl bg-violet-100 text-violet-600 w-fit"><Users class="w-5 h-5" /></div>
        <div>
          <p class="text-xs font-semibold text-slate-500">الزبائن</p>
          <div class="flex items-baseline gap-1 mt-0.5">
            <span class="text-2xl font-extrabold text-slate-900">{{ customerCount }}</span>
            <span class="text-xs text-slate-500">زبون</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Two Columns: Recent Orders + Top Debtors -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">

      <!-- Recent Orders -->
      <div class="lg:col-span-2 laundry-card rounded-2xl p-5 shadow-sm">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-base font-extrabold text-slate-800 flex items-center gap-2">
            <Clock class="w-4 h-4 text-primary-600" />
            آخر الطلبات
          </h2>
          <button @click="router.push('/laundry/history')" class="text-xs text-primary-600 font-bold hover:underline">عرض الكل</button>
        </div>
        <div v-if="recentOrders.length === 0" class="text-center py-10 text-slate-400">
          <WashingMachine class="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p class="text-sm">لا توجد طلبات بعد</p>
        </div>
        <div v-else class="space-y-2">
          <div v-for="order in recentOrders" :key="order.id"
            class="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-primary-50 transition-colors cursor-pointer"
            @click="router.push('/laundry/history')">
            <div class="flex flex-col gap-0.5">
              <span class="font-bold text-slate-800 text-sm">{{ order.customer_name }}</span>
              <span class="text-xs text-slate-400">{{ formatDate(order.created_at) }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm font-bold text-slate-700" dir="ltr">{{ Number(order.total_amount).toFixed(1) }} ₪</span>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full" :class="paymentClass(order.payment_status)">{{ paymentLabel(order.payment_status) }}</span>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full" :class="statusClass(order.order_status)">{{ statusLabel(order.order_status) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Top Debtors -->
      <div class="laundry-card rounded-2xl p-5 shadow-sm">
        <h2 class="text-base font-extrabold text-slate-800 flex items-center gap-2 mb-4">
          <AlertCircle class="w-4 h-4 text-red-500" />
          أكثر الديون
        </h2>
        <div v-if="topDebtors.length === 0" class="text-center py-10 text-slate-400">
          <CheckCircle class="w-10 h-10 mx-auto mb-2 opacity-30 text-green-400" />
          <p class="text-sm">لا توجد ديون 🎉</p>
        </div>
        <div v-else class="space-y-3">
          <div v-for="(cust, i) in topDebtors" :key="cust.id"
            class="flex items-center justify-between p-3 rounded-xl bg-red-50/60 hover:bg-red-100 transition-colors cursor-pointer"
            @click="router.push('/laundry/customers')">
            <div class="flex items-center gap-2">
              <span class="w-6 h-6 rounded-full bg-red-200 text-red-700 text-xs font-extrabold flex items-center justify-center">{{ i + 1 }}</span>
              <span class="font-bold text-slate-800 text-sm">{{ cust.name }}</span>
            </div>
            <span class="text-red-600 font-extrabold text-sm" dir="ltr">{{ Number(cust.total_debt).toFixed(1) }} ₪</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Action -->
    <div class="laundry-card rounded-2xl p-5 flex flex-col sm:flex-row gap-4 items-center justify-between border-2 border-primary-100">
      <div>
        <p class="font-extrabold text-slate-800">جاهز لطلب جديد؟</p>
        <p class="text-sm text-slate-500 mt-0.5">أضف طلب جديد بسرعة من هنا</p>
      </div>
      <button @click="router.push('/laundry/add-order')"
        class="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-extrabold text-sm shadow-lg transition-all hover:scale-105 active:scale-100"
        style="background: linear-gradient(135deg, #16a34a, #15803d)">
        <WashingMachine class="w-5 h-5" />
        إضافة طلب جديد
      </button>
    </div>
  </div>
</template>

<style scoped>
.laundry-card {
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.6);
}
</style>
