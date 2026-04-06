<script setup>
import { computed, ref } from 'vue'
import { store } from '../store/db'
import { Wallet, TrendingUp, TrendingDown, Activity, Users, CreditCard, ChevronDown } from 'lucide-vue-next'
import { isToday, isThisWeek, isThisMonth, parseISO } from 'date-fns'

const timeFilter = ref('today') // 'today', 'week', 'month'

// Derived stats based on operations
const filteredOperations = computed(() => {
  return store.operations.filter(op => {
    if (!op.created_at) return false;
    const date = parseISO(op.created_at);
    if (timeFilter.value === 'today') return isToday(date);
    if (timeFilter.value === 'week') return isThisWeek(date);
    if (timeFilter.value === 'month') return isThisMonth(date);
    return true;
  });
});

const totalIncome = computed(() => {
  return filteredOperations.value.reduce((acc, op) => {
    // Both payment and charging can contribute to income depending on how it's handled.
    // Assuming "paid" amount in charge operation and full amount in payment operation is income.
    if (op.type === 'charge') return acc + (Number(op.paid) || 0);
    if (op.type === 'payment') return acc + (Number(op.amount) || 0);
    return acc;
  }, 0);
});

// Assume expenses are just 0 for now as no screen inputs them yet, but we will wire the UI.
const expenses = ref(0);

const netProfit = computed(() => totalIncome.value - expenses.value);

const operationCount = computed(() => filteredOperations.value.length);

const totalDebt = computed(() => {
  return store.customers.reduce((acc, customer) => {
    return customer.balance < 0 ? acc + Math.abs(customer.balance) : acc;
  }, 0);
});

const totalBalance = computed(() => {
  return store.customers.reduce((acc, customer) => {
    return customer.balance > 0 ? acc + customer.balance : acc;
  }, 0);
});

const stats = computed(() => [
  { name: 'ربح اليوم / الدخل', value: totalIncome.value, icon: Wallet, color: 'text-green-600', bg: 'bg-green-100', isCurrency: true },
  { name: 'المصاريف', value: expenses.value, icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-100', isCurrency: true },
  { name: 'الربح الصافي', value: netProfit.value, icon: TrendingUp, color: 'text-primary-600', bg: 'bg-primary-100', isCurrency: true },
  { name: 'عدد العمليات', value: operationCount.value, icon: Activity, color: 'text-blue-500', bg: 'bg-blue-100', isCurrency: false },
]);
</script>

<template>
  <div class="space-y-4 md:space-y-6 pb-20 md:pb-0">
    
    <!-- Header & Filters -->
    <div class="flex flex-col gap-3">
      <div>
        <h1 class="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">الرئيسية</h1>
        <p class="text-sm md:text-base text-slate-500 mt-1">ملخص النشاط والإحصائيات المالية.</p>
      </div>

      <div class="inline-flex w-full md:w-auto bg-white/60 p-1 rounded-xl shadow-sm border border-slate-200 backdrop-blur-md overflow-x-auto hide-scrollbar">
        <button v-for="filter in [{val:'today', label:'اليوم'}, {val:'week', label:'الأسبوع'}, {val:'month', label:'الشهر'}]" :key="filter.val"
          @click="timeFilter = filter.val"
          class="flex-1 md:flex-none px-4 py-2 text-sm md:text-base font-bold rounded-lg transition-all whitespace-nowrap"
          :class="timeFilter === filter.val ? 'bg-white shadow-sm text-primary-600 ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50/50'"
        >
          {{ filter.label }}
        </button>
      </div>
    </div>

    <!-- Main Stats Grid -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
      <div v-for="stat in stats" :key="stat.name" class="glass rounded-2xl p-4 md:p-6 flex flex-col items-start gap-3 md:gap-4 hover:shadow-md transition-shadow relative overflow-hidden group">
        <div class="absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 group-hover:scale-150 transition-transform duration-500" :class="stat.bg"></div>
        <div class="p-2.5 md:p-3 rounded-2xl shadow-sm" :class="[stat.bg, stat.color]">
          <component :is="stat.icon" class="w-5 h-5 md:w-6 md:h-6" />
        </div>
        <div>
          <p class="text-xs md:text-sm font-semibold text-slate-500 truncate">{{ stat.name }}</p>
          <div class="flex items-baseline gap-1 mt-0.5 md:mt-1">
            <span class="text-xl md:text-3xl font-extrabold text-slate-900 tracking-tight">{{ stat.value }}</span>
            <span v-if="stat.isCurrency" class="text-[10px] md:text-sm font-medium text-slate-500 hidden sm:inline-block">₪</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Secondary Important Stats -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6 mt-4 md:mt-8">
      <div class="glass rounded-2xl p-6 flex items-center justify-between border-l-4 border-l-red-500">
        <div class="flex items-center gap-4">
          <div class="p-4 rounded-xl bg-red-50 text-red-600">
            <Users class="w-8 h-8" />
          </div>
          <div>
            <p class="text-sm font-semibold text-slate-500">إجمالي ديون الزبائن</p>
            <div class="flex items-baseline gap-1 mt-1 text-red-600">
              <span class="text-2xl font-bold">{{ totalDebt }}</span>
              <span class="text-sm font-medium">₪</span>
            </div>
          </div>
        </div>
      </div>

      <div class="glass rounded-2xl p-6 flex items-center justify-between border-l-4 border-l-green-500">
        <div class="flex items-center gap-4">
          <div class="p-4 rounded-xl bg-green-50 text-green-600">
            <CreditCard class="w-8 h-8" />
          </div>
          <div>
            <p class="text-sm font-semibold text-slate-500">إجمالي أرصدة الزبائن</p>
            <div class="flex items-baseline gap-1 mt-1 text-green-600">
              <span class="text-2xl font-bold">{{ totalBalance }}</span>
              <span class="text-sm font-medium">₪</span>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>
