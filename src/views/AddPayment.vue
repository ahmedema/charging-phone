import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { store, addOperation, updateCustomerBalance } from '../store/db'
import { CreditCard, User, Banknote, Search, ChevronDown } from 'lucide-vue-next'

const router = useRouter()

const form = ref({
  customerId: '',
  amount: ''
})

const isDropdownOpen = ref(false)
const searchQuery = ref('')
const dropdownRef = ref(null)
const searchInput = ref(null)

const selectedCustomer = computed(() => {
  return store.customers.find(c => c.id === form.value.customerId) || null
})

const filteredCustomers = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return store.customers
  return store.customers.filter(c => c.name.toLowerCase().includes(q))
})

const toggleDropdown = async () => {
  isDropdownOpen.value = !isDropdownOpen.value
  if (isDropdownOpen.value) {
    searchQuery.value = ''
    await nextTick()
    if (searchInput.value) {
      searchInput.value.focus()
    }
  }
}

const selectCustomer = (cust) => {
  form.value.customerId = cust.id
  isDropdownOpen.value = false
}

const handleClickOutside = (e) => {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target)) {
    isDropdownOpen.value = false
  }
}

onMounted(() => document.addEventListener('mousedown', handleClickOutside))
onUnmounted(() => document.removeEventListener('mousedown', handleClickOutside))

const submit = async () => {
  if (!form.value.customerId || !form.value.amount || isNaN(form.value.amount)) return

  const amountNumber = Number(form.value.amount)

  // Update balance (adds money to balance)
  await updateCustomerBalance(form.value.customerId, amountNumber)

  // Create payment operation
  await addOperation({
    customer_id: form.value.customerId,
    customer_name: selectedCustomer.value.name,
    type: 'payment',
    amount: amountNumber,
    paid: amountNumber, // Full amount is paid
    debt: 0,
    from_balance: 0,
    payment_mode: 'now' 
  })

  router.push('/customers')
}
</script>

<template>
  <div class="max-w-xl mx-auto space-y-6 mt-10">
    <div class="mb-8 text-center sm:text-right">
      <h1 class="text-3xl font-extrabold text-slate-900 flex items-center justify-center sm:justify-start gap-3">
        <div class="bg-green-100 p-2.5 rounded-xl text-green-600">
          <Banknote class="w-7 h-7" />
        </div>
        إضافة دفعة
      </h1>
      <p class="text-slate-500 mt-2 text-lg">استلام مبلغ من الزبون وإضافته للرصيد.</p>
    </div>

    <form @submit.prevent="submit" class="glass rounded-3xl p-5 md:p-10 space-y-6 md:space-y-8 shadow-xl border border-slate-200/60 relative overflow-hidden">
      <div class="absolute top-0 left-0 w-48 h-48 md:w-64 md:h-64 bg-green-100 rounded-full blur-3xl opacity-30 -ml-20 -mt-20 pointer-events-none"></div>

      <!-- Customer Select -->
      <div class="space-y-3 relative z-20">
        <label class="block text-sm font-bold text-slate-700">الزبون</label>
        
        <div class="relative" ref="dropdownRef">
          <!-- Hidden input for html5 validation -->
          <input type="text" v-model="form.customerId" required class="absolute opacity-0 w-0 h-0 p-0 m-0 border-0 pointer-events-none" tabindex="-1" />
          
          <!-- Select Button -->
          <button 
            type="button" 
            @click="toggleDropdown"
            class="w-full relative flex items-center justify-between outline-none pr-10 pl-10 py-3 md:py-3.5 rounded-xl border shadow-sm transition-all text-sm md:text-base cursor-pointer"
            :class="[isDropdownOpen ? 'border-green-500 ring ring-green-100 bg-white' : 'border-slate-200 bg-slate-50 focus:border-green-500 focus:ring focus:ring-green-100', form.customerId ? 'text-slate-800 font-bold' : 'text-slate-500 font-normal']"
          >
            <span class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 pointer-events-none">
              <User class="w-5 h-5" />
            </span>
            <span>{{ selectedCustomer ? selectedCustomer.name : 'اختر الزبون من القائمة...' }}</span>
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
              <ChevronDown class="w-5 h-5 transition-transform" :class="{ 'rotate-180': isDropdownOpen }" />
            </span>
          </button>

          <!-- Dropdown List -->
          <div v-if="isDropdownOpen" class="absolute z-50 mt-2 w-full bg-white rounded-xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden transform opacity-100 scale-100 transition-all origin-top">
            <!-- Search Input -->
            <div class="p-2 border-b border-slate-100 relative bg-slate-50/50">
              <Search class="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                ref="searchInput"
                type="text" 
                v-model="searchQuery" 
                placeholder="ابحث عن الزبون..." 
                class="w-full bg-white border border-slate-200 rounded-lg py-2.5 pr-10 pl-3 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all placeholder:font-normal font-bold"
                @click.stop
              />
            </div>
            <!-- Options List -->
            <div class="max-h-60 overflow-y-auto w-full styled-scrollbar" style="scrollbar-width: thin;">
              <div v-if="filteredCustomers.length === 0" class="p-4 text-center text-sm text-slate-500 font-bold">
                لا توجد نتائج مطابقة للبحث
              </div>
              <button 
                v-else
                v-for="cust in filteredCustomers" :key="cust.id"
                type="button"
                @click="selectCustomer(cust)"
                class="w-full text-right px-4 py-3 text-sm hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 flex items-center justify-between"
                :class="{ 'bg-green-50 text-green-700 font-bold': form.customerId === cust.id, 'text-slate-700 font-bold': form.customerId !== cust.id }"
              >
                <span>{{ cust.name }}</span>
                <span v-if="form.customerId === cust.id" class="w-2 h-2 rounded-full bg-green-500"></span>
              </button>
            </div>
          </div>
        </div>
        
        <div v-if="selectedCustomer" class="flex gap-2 text-xs md:text-sm items-center p-3 rounded-lg bg-slate-50 border border-slate-100 mt-2">
          <span class="text-slate-500 font-bold">الرصيد الحالي:</span>
          <span :class="selectedCustomer.balance < 0 ? 'text-red-500' : 'text-green-600'" class="font-bold flex-1" dir="ltr">{{ selectedCustomer.balance }}</span>
        </div>
      </div>

      <!-- Amount -->
      <div class="space-y-3 relative z-10">
        <label class="block text-sm font-bold text-slate-700">المبلغ المُستلم</label>
        <div class="relative">
          <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
            <CreditCard class="w-5 h-5" />
          </div>
          <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none font-bold text-slate-400 text-sm">
            ₪
          </div>
          <input 
            v-model="form.amount" type="number" step="any" min="1" required
            placeholder="أدخل المبلغ..." 
            class="block w-full outline-none pr-10 pl-12 py-3 md:py-3.5 rounded-xl border border-slate-200 shadow-sm focus:border-green-500 focus:ring focus:ring-green-100 bg-slate-50 transition-all text-slate-800 font-bold font-mono text-lg md:text-xl"
          />
        </div>
      </div>

      <!-- Actions -->
      <div class="pt-4 relative z-10">
        <button type="submit"
          class="w-full flex justify-center items-center gap-2 py-4 rounded-xl text-white font-bold text-lg shadow-lg shadow-green-500/30 transition-all bg-green-600 active:bg-green-700 focus:ring focus:ring-green-300">
          إضافة الدفعة
        </button>
      </div>
    </form>
  </div>
</template>
