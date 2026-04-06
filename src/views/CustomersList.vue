<script setup>
import { ref, computed, watch } from 'vue'
import { store, deleteCustomer, editCustomer } from '../store/db'
import { Users, Search, Plus, User, ArrowLeft, Banknote, ShieldAlert, Smartphone, Laptop, Battery, Zap, Pencil, Trash2, Check, X } from 'lucide-vue-next'
import { format, parseISO } from 'date-fns'
import { ar } from 'date-fns/locale'
import { useRouter } from 'vue-router'

const router = useRouter()

const searchQuery = ref('')
const selectedCustomer = ref(null)
const filterDebtsOnly = ref(false)

const filteredCustomers = computed(() => {
  let result = store.customers.filter(c => c.name.toLowerCase().includes(searchQuery.value.toLowerCase()))
  if (filterDebtsOnly.value) {
    result = result.filter(c => c.balance < 0).sort((a, b) => a.balance - b.balance)
  }
  return result
})

const currentPage = ref(1)
const itemsPerPage = 20

watch([searchQuery, filterDebtsOnly], () => {
  currentPage.value = 1
})

const paginatedCustomers = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredCustomers.value.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(filteredCustomers.value.length / itemsPerPage) || 1
})

const customerOperations = computed(() => {
  if (!selectedCustomer.value) return []
  return store.operations
    .filter(op => op.customer_id === selectedCustomer.value.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
})

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return format(parseISO(dateStr), 'dd MMM yyyy - hh:mm a', { locale: ar })
}

const openCustomer = (customer) => {
  selectedCustomer.value = customer
}

const closeCustomer = () => {
  selectedCustomer.value = null
}

const goToAddPayment = () => {
  // Can pass via query if needed route with query params or keep simple.
  router.push('/add-payment')
}

const getDeviceIcon = (device) => {
  if (device === 'phone') return Smartphone;
  if (device === 'laptop') return Laptop;
  if (device === 'battery') return Battery;
  if (device === 'powerbank') return Zap;
  return ShieldAlert;
}

const isEditing = ref(false)
const editName = ref('')
const editBalance = ref(0)

const startEdit = () => {
  editName.value = selectedCustomer.value.name
  editBalance.value = selectedCustomer.value.balance
  isEditing.value = true
}

const saveEdit = async () => {
  if (editName.value.trim()) {
    const updatedBalance = Number(editBalance.value) || 0
    await editCustomer(selectedCustomer.value.id, { name: editName.value, balance: updatedBalance })
    selectedCustomer.value.name = editName.value
    selectedCustomer.value.balance = updatedBalance
  }
  isEditing.value = false
}

const cancelEdit = () => {
  isEditing.value = false
}

const handleDeleteCustomer = async () => {
  if (confirm('هل أنت متأكد من حذف هذا الزبون وجميع عملياته؟ لا يمكن التراجع عن هذا الإجراء.')) {
    await deleteCustomer(selectedCustomer.value.id)
    closeCustomer()
  }
}
</script>

<template>
  <div class="space-y-4 md:space-y-6 relative min-h-[calc(100vh-8rem)] pb-24 md:pb-0">
    
    <!-- Main View -->
    <div :class="{'hidden md:block': selectedCustomer, 'block': !selectedCustomer}">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 mb-4 md:mb-6">
        <div>
          <div class="flex items-center gap-3">
            <h1 class="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">الزبائن</h1>
            <span class="bg-slate-100 text-slate-700 text-sm font-bold px-3 py-1 rounded-lg border border-slate-200 shadow-sm" dir="rtl">{{ store.customers.length }} زبون</span>
          </div>
          <p class="text-sm md:text-base text-slate-500 mt-1">كشف الحسابات والأرصدة للزبائن.</p>
        </div>

        <div class="flex flex-col sm:flex-row w-full md:w-auto gap-3 items-center">
          <label class="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700 bg-white border border-slate-200 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors shadow-sm w-full sm:w-auto justify-center sm:justify-start">
            <input type="checkbox" v-model="filterDebtsOnly" class="rounded text-red-500 focus:ring-red-500 w-4 h-4 accent-red-500" />
            <span>عرض الديون فقط</span>
          </label>
          <div class="relative w-full sm:w-72">
            <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
              <Search class="w-4 h-4" />
            </div>
            <input 
              v-model="searchQuery" 
              type="text" 
              placeholder="بحث عن زبون..." 
              class="block w-full outline-none pr-9 pl-3 py-2 text-sm rounded-xl border border-slate-200 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 bg-white transition-all text-slate-800 font-medium"
            />
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <div v-for="customer in paginatedCustomers" :key="customer.id" 
             @click="openCustomer(customer)"
             class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm cursor-pointer hover:shadow-md transition-all hover:-translate-y-1 group">
          <div class="flex justify-between items-start">
            <div class="flex items-center gap-3">
              <div class="p-2.5 rounded-full bg-slate-100 text-slate-500 group-hover:bg-primary-100 group-hover:text-primary-600 transition-colors">
                <User class="w-6 h-6" />
              </div>
              <div>
                <h3 class="font-bold text-slate-900 text-lg group-hover:text-primary-600 transition-colors">{{ customer.name }}</h3>
                <p class="text-xs text-slate-400">كود: {{ customer.id.slice(-4) }}</p>
              </div>
            </div>
          </div>
          
          <div class="mt-5 pt-4 border-t border-slate-100 flex justify-between items-end">
            <span class="text-sm text-slate-500 font-medium">الرصيد:</span>
            <div class="font-mono text-xl font-bold" 
                 :class="{
                   'text-green-600': customer.balance > 0,
                   'text-red-500': customer.balance < 0,
                   'text-slate-400': customer.balance === 0
                 }" dir="ltr">
              {{ customer.balance > 0 ? '+' : '' }}{{ customer.balance }}
            </div>
          </div>
        </div>
        <div v-if="filteredCustomers.length === 0" class="col-span-full py-12 text-center text-slate-500">
          <p class="text-lg font-medium">لا يوجد زبائن مطابقين لبحثك</p>
        </div>
      </div>

      <!-- Pagination Controls for Customers -->
      <div v-if="totalPages > 1" class="mt-6 p-4 border border-slate-200 flex items-center justify-between bg-white rounded-2xl shadow-sm pb-20 md:pb-4">
        <button @click="currentPage--" :disabled="currentPage === 1" class="px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold bg-slate-50 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors">
          السابق
        </button>
        <span class="text-sm font-bold text-slate-600 px-3 py-1">
          صفحة {{ currentPage }} من {{ totalPages }}
        </span>
        <button @click="currentPage++" :disabled="currentPage === totalPages" class="px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold bg-slate-50 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors">
          التالي
        </button>
      </div>
      <div v-else class="pb-20 md:pb-4"></div>
    </div>

    <!-- Details View (Slide-over on mobile, side panel on desktop) -->
    <div v-if="selectedCustomer" class="fixed inset-0 z-40 flex md:relative md:inset-auto md:h-full transition-all">
      <!-- Backdrop for mobile -->
      <div class="fixed inset-0 bg-slate-900/50 md:hidden" @click="closeCustomer"></div>
      
      <div class="relative w-full max-w-2xl bg-white h-full md:rounded-3xl shadow-2xl flex flex-col mx-auto md:mx-0 overflow-hidden border border-slate-200">
        
        <!-- Details Header -->
        <div class="p-6 border-b border-slate-200 bg-slate-50/50 flex flex-col gap-4">
          <div class="flex justify-between items-center">
            <button @click="closeCustomer" class="flex gap-2 items-center text-slate-500 hover:text-slate-800 transition-colors">
              <ArrowLeft class="w-5 h-5" />
              <span class="font-bold text-sm">عودة للقائمة</span>
            </button>
            <button @click="goToAddPayment" class="inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-bold shadow-md shadow-green-600/30 hover:bg-green-500 transition-colors">
              <Banknote class="w-4 h-4" />
              إضافة دفعة
            </button>
          </div>
          
          <div class="flex justify-between items-end mt-2">
            <div>
              <div v-if="!isEditing" class="flex items-center gap-3">
                <h2 class="text-3xl font-extrabold text-slate-900">{{ selectedCustomer.name }}</h2>
                <div class="flex gap-1">
                  <button @click="startEdit" class="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="تعديل">
                    <Pencil class="w-4 h-4" />
                  </button>
                  <button @click="handleDeleteCustomer" class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="حذف">
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div v-else class="flex items-center gap-2">
                <input 
                  type="text" 
                  v-model="editName" 
                  @keyup.enter="saveEdit"
                  class="text-2xl font-extrabold text-slate-900 bg-white border border-slate-300 rounded-lg px-2 py-1 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  autofocus
                />
                <button @click="saveEdit" class="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">
                  <Check class="w-4 h-4" />
                </button>
                 <button @click="cancelEdit" class="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors">
                  <X class="w-4 h-4" />
                </button>
              </div>
              <p class="text-slate-500 text-sm mt-1">تفاصيل العمليات وحركة الرصيد</p>
            </div>
            <div class="text-left">
              <span class="block text-xs font-semibold text-slate-400 mb-1">صافي الرصيد</span>
              <div v-if="!isEditing" class="inline-flex items-center justify-center px-4 py-1.5 rounded-lg border font-mono text-xl font-bold"
                  :class="{
                    'bg-green-50 text-green-700 border-green-200': selectedCustomer.balance > 0,
                    'bg-red-50 text-red-600 border-red-200': selectedCustomer.balance < 0,
                    'bg-slate-100 text-slate-600 border-slate-200': selectedCustomer.balance === 0
                  }" dir="ltr">
                  {{ selectedCustomer.balance > 0 ? '+' : '' }}{{ selectedCustomer.balance }} <span class="text-xs font-sans ms-1 font-normal">₪</span>
              </div>
              <div v-else class="flex items-center" dir="ltr">
                  <input type="number" step="any" v-model="editBalance" @keyup.enter="saveEdit" class="w-full text-center font-mono text-xl font-bold bg-white border border-slate-300 rounded-lg px-2 py-1 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500" style="max-width: 6rem;" />
                  <span class="text-xs font-sans ms-2 font-normal text-slate-500">₪</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Operations Details List -->
        <div class="flex-1 overflow-y-auto bg-white p-4">
          <div v-if="customerOperations.length === 0" class="text-center py-10 text-slate-400 font-medium">
            لا توجد عمليات مسجلة لهذا الزبون.
          </div>
          <div class="space-y-3">
             <div v-for="op in customerOperations" :key="op.id" class="p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between gap-4 group hover:bg-slate-50 transition-colors">
               
               <div class="flex items-start gap-4">
                 <div class="p-2.5 rounded-lg shrink-0 mt-1" 
                      :class="op.type === 'charge' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'">
                   <component :is="op.type === 'charge' ? getDeviceIcon(op.device_type) : Banknote" class="w-6 h-6" />
                 </div>
                 <div>
                   <h4 class="font-bold text-slate-900">
                     <span v-if="op.type === 'charge'">شحن {{ op.device_type === 'phone' ? 'هاتف' : op.device_type === 'laptop' ? 'لابتوب' : op.device_type === 'battery' ? 'بطارية' : 'بور' }}</span>
                     <span v-else>دفعة مستلمة</span>
                   </h4>
                   <p class="text-xs text-slate-400 mt-1" dir="ltr">{{ formatDate(op.created_at) }}</p>
                   
                   <!-- Badges -->
                   <div class="flex gap-2 text-[11px] mt-2 flex-wrap">
                     <span v-if="op.paid" class="text-green-700 bg-green-100/50 px-2 py-0.5 rounded-md border border-green-100 flex items-center gap-1">مدفوع: {{ op.paid }}</span>
                     <span v-if="op.debt" class="text-red-600 bg-red-100/50 px-2 py-0.5 rounded-md border border-red-100 flex items-center gap-1">دين: {{ op.debt }}</span>
                     <span v-if="op.from_balance" class="text-orange-600 bg-orange-100/50 px-2 py-0.5 rounded-md border border-orange-100 flex items-center gap-1">من الرصيد: {{ op.from_balance }}</span>
                   </div>
                 </div>
               </div>

               <div class="sm:text-left flex sm:flex-col items-center sm:items-end justify-between">
                 <div class="font-mono text-lg font-bold text-slate-800" dir="ltr">
                   {{ op.type === 'payment' ? '+' : '' }}{{ op.amount }} <span class="text-xs font-sans text-slate-400 font-normal">₪</span>
                 </div>
                 <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                   {{ op.type === 'charge' ? 'CHARGE' : 'PAYMENT' }}
                 </div>
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>
