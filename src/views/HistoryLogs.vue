<script setup>
import { ref, computed, watch } from 'vue'
import { store } from '../store/db'
import { Search, Filter, Smartphone, Laptop, Battery, Zap, Banknote, ShieldAlert, ArrowDownLeft, ArrowUpRight } from 'lucide-vue-next'
import { format, parseISO } from 'date-fns'
import { ar } from 'date-fns/locale'

const searchQuery = ref('')
const typeFilter = ref('all') // all, charge, payment
const deviceFilter = ref('all') // all, phone, laptop, battery

const currentPage = ref(1)
const itemsPerPage = 20

watch([searchQuery, typeFilter, deviceFilter], () => {
  currentPage.value = 1
})

const sortedOperations = computed(() => {
  return [...store.operations].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
})

const filteredOperations = computed(() => {
  return sortedOperations.value.filter(op => {
    // text search
    const textMatch = (op.customer_name || '').toLowerCase().includes(searchQuery.value.toLowerCase()) || 
                      formatDate(op.created_at).includes(searchQuery.value);
    
    // type filter
    const typeMatch = typeFilter.value === 'all' || op.type === typeFilter.value;
    
    // device filter (only applies if it's a charge)
    const deviceMatch = deviceFilter.value === 'all' || op.device_type === deviceFilter.value;

    return textMatch && typeMatch && deviceMatch;
  });
})

const paginatedOperations = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredOperations.value.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(filteredOperations.value.length / itemsPerPage) || 1
})

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return format(parseISO(dateStr), 'dd MMM yyyy - hh:mm a', { locale: ar })
}

const getDeviceIcon = (device) => {
  if (device === 'phone') return Smartphone;
  if (device === 'laptop') return Laptop;
  if (device === 'battery') return Battery;
  if (device === 'powerbank') return Zap;
  return ShieldAlert;
}
</script>

<template>
  <div class="space-y-4 md:space-y-6 pb-20 md:pb-0">
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-3 md:gap-4 mb-4 md:mb-6">
      <div>
        <h1 class="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">السجل والبحث</h1>
        <p class="text-sm md:text-base text-slate-500 mt-1">تتبع كافة العمليات والبحوث الدقيقة.</p>
      </div>

      <!-- Filters -->
      <div class="flex flex-col sm:flex-row flex-wrap gap-2 md:gap-3 w-full md:w-auto">
        <div class="flex gap-2 w-full sm:w-auto">
          <select v-model="typeFilter" class="flex-1 bg-white border border-slate-200 text-sm rounded-xl px-3 py-2 md:px-4 outline-none focus:ring-2 focus:ring-primary-500 appearance-none font-medium text-slate-700">
            <option value="all">كل العمليات</option>
            <option value="charge">شحن فقط</option>
            <option value="payment">دفعات فقط</option>
          </select>

          <select v-model="deviceFilter" :disabled="typeFilter === 'payment'" class="flex-1 bg-white border border-slate-200 text-sm rounded-xl px-3 py-2 md:px-4 outline-none focus:ring-2 focus:ring-primary-500 appearance-none font-medium text-slate-700 disabled:opacity-50 disabled:bg-slate-100">
            <option value="all">كل الأجهزة</option>
            <option value="phone">هواتف</option>
            <option value="laptop">لابتوبات</option>
            <option value="battery">بطاريات</option>
            <option value="powerbank">بور</option>
          </select>
        </div>
        
        <div class="relative w-full sm:w-72 mt-1 sm:mt-0">
          <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
            <Search class="w-4 h-4" />
          </div>
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="بحث بالاسم أو التاريخ..." 
            class="block w-full outline-none pr-9 pl-3 py-2 text-sm rounded-xl border border-slate-200 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 bg-white transition-all text-slate-800 font-medium"
          />
        </div>
      </div>
    </div>

    <!-- Operations List -->
    <div class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
      <div v-if="filteredOperations.length === 0" class="p-12 text-center text-slate-500">
        <Filter class="w-12 h-12 mx-auto text-slate-300 mb-3" />
        <p class="text-lg font-medium text-slate-600">لا توجد نتائج مطابقة</p>
        <p class="text-sm mt-1">جرب تغيير محددات البحث.</p>
      </div>
      
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm text-right align-middle whitespace-nowrap hidden md:table">
          <thead class="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
            <tr>
              <th scope="col" class="px-6 py-4 font-bold">الزبون / الوقت</th>
              <th scope="col" class="px-6 py-4 font-bold">النوع</th>
              <th scope="col" class="px-6 py-4 font-bold text-center">القيمة (₪)</th>
              <th scope="col" class="px-6 py-4 font-bold text-center">مدفوع</th>
              <th scope="col" class="px-6 py-4 font-bold text-center">دين</th>
              <th scope="col" class="px-6 py-4 font-bold text-center">من الرصيد</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="op in paginatedOperations" :key="op.id" class="hover:bg-slate-50/50 transition-colors group">
              <td class="px-6 py-4">
                <div class="font-bold text-slate-900 text-base mb-0.5">{{ op.customer_name }}</div>
                <div class="text-xs text-slate-500" dir="ltr">{{ formatDate(op.created_at) }}</div>
              </td>
              <td class="px-6 py-4">
                <div v-if="op.type === 'charge'" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-semibold border border-blue-100 text-xs">
                  <component :is="getDeviceIcon(op.device_type)" class="w-3.5 h-3.5" />
                  شحن ({{ op.device_type }}) <span v-if="op.quantity > 1" class="text-[10px] bg-blue-200 text-blue-800 px-1 py-0.5 rounded ml-1 font-bold">×{{op.quantity}}</span>
                </div>
                <div v-else class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-50 text-green-700 font-semibold border border-green-100 text-xs">
                  <Banknote class="w-3.5 h-3.5" />
                  دفعة مستلمة
                </div>
              </td>
              <td class="px-6 py-4 text-center font-mono font-bold text-slate-700">{{ op.amount }}</td>
              <td class="px-6 py-4 text-center">
                <span v-if="op.paid" class="inline-flex items-center gap-1 text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded text-xs"><ArrowDownLeft class="w-3 h-3"/> {{ op.paid }}</span>
                <span v-else class="text-slate-300">-</span>
              </td>
              <td class="px-6 py-4 text-center">
                <span v-if="op.debt" class="inline-flex items-center gap-1 text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded text-xs"><ArrowUpRight class="w-3 h-3"/> {{ op.debt }}</span>
                <span v-else class="text-slate-300">-</span>
              </td>
              <td class="px-6 py-4 text-center">
                <span v-if="op.from_balance" class="inline-flex items-center gap-1 text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded text-xs">{{ op.from_balance }}</span>
                <span v-else class="text-slate-300">-</span>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Mobile view as list of cards -->
        <div class="md:hidden divide-y divide-slate-100">
          <div v-for="op in paginatedOperations" :key="op.id" class="p-5 flex flex-col gap-3">
            <div class="flex justify-between items-start">
              <div>
                <div class="font-bold text-slate-900 text-lg">{{ op.customer_name }}</div>
                <div class="text-xs text-slate-500 mt-1" dir="ltr">{{ formatDate(op.created_at) }}</div>
              </div>
              <div class="font-mono font-bold text-lg text-slate-800">{{ op.amount }} <span class="text-xs font-sans font-normal text-slate-500">₪</span></div>
            </div>
            
            <div class="flex items-center justify-between mt-2">
              <div v-if="op.type === 'charge'" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-semibold border border-blue-100 text-xs">
                <component :is="getDeviceIcon(op.device_type)" class="w-4 h-4" />
                شحن ({{ op.device_type }}) <span v-if="op.quantity > 1" class="text-[10px] bg-blue-200 text-blue-800 px-1 py-0.5 rounded ml-1 font-bold">×{{op.quantity}}</span>
              </div>
              <div v-else class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-50 text-green-700 font-semibold border border-green-100 text-xs">
                <Banknote class="w-4 h-4" />
                دفعة مستلمة
              </div>
              
              <div class="flex gap-2 text-xs">
                <span v-if="op.paid" class="text-green-600 font-bold bg-green-50 px-2 py-1 rounded-md border border-green-100 flex items-center gap-1">مدفوع: {{ op.paid }}</span>
                <span v-if="op.debt" class="text-red-600 font-bold bg-red-50 px-2 py-1 rounded-md border border-red-100 flex items-center gap-1">دين: {{ op.debt }}</span>
                <span v-if="op.from_balance" class="text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded-md border border-orange-100 flex items-center gap-1">من الرصيد: {{ op.from_balance }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Pagination Controls -->
        <div v-if="totalPages > 1" class="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50/50 rounded-b-3xl">
          <button @click="currentPage--" :disabled="currentPage === 1" class="px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold bg-white text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors shadow-sm">
            السابق
          </button>
          <span class="text-sm font-bold text-slate-600 bg-white px-3 py-1 rounded-md border border-slate-200 shadow-sm">
            صفحة {{ currentPage }} من {{ totalPages }}
          </span>
          <button @click="currentPage++" :disabled="currentPage === totalPages" class="px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold bg-white text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors shadow-sm">
            التالي
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
