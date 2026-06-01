<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { laundryStore, addLaundryPayment } from '../../store/laundryDb.js'
import { Wallet, Search, User, CheckCircle, Info, FileText } from 'lucide-vue-next'

const router = useRouter()
const loading = ref(false)

const customerQuery = ref('')
const selectedCustomer = ref(null)

const amount = ref('')
const notes = ref('')

const filteredCustomers = computed(() => {
  if (!customerQuery.value) return []
  return laundryStore.customers.filter(c => 
    c.name.includes(customerQuery.value) && Number(c.total_debt) > 0
  )
})

const disableSubmit = computed(() => {
  if (loading.value) return true
  if (!selectedCustomer.value) return true
  if (!amount.value || amount.value <= 0) return true
  return false
})

const selectCustomer = (cust) => {
  selectedCustomer.value = cust
  customerQuery.value = cust.name
}

const handleCustomerSearch = () => {
  selectedCustomer.value = null
}

const clearCustomer = () => {
  customerQuery.value = ''
  selectedCustomer.value = null
}

const submitPayment = async () => {
  if (disableSubmit.value) return
  loading.value = true

  try {
    await addLaundryPayment({
      customerId: selectedCustomer.value.id,
      customerName: selectedCustomer.value.name,
      amount: amount.value,
      notes: notes.value
    })
    
    // reset form or navigate
    router.push('/laundry/customers')
  } catch (e) {
    console.error(e)
    alert('حدث خطأ أثناء حفظ الدفعة')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-6 pb-20">
    <div class="mb-8">
      <h1 class="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
        <div class="bg-primary-100 p-2 rounded-xl text-primary-600"><Wallet class="w-6 h-6" /></div>
        تسديد دفعة
      </h1>
      <p class="text-slate-500 mt-1 text-sm">تسجيل دفعة نقدية لخصمها من دين الزبون</p>
    </div>

    <form @submit.prevent="submitPayment" class="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-3xl p-5 md:p-8 shadow-sm space-y-6">
      
      <!-- Customer Search -->
      <div class="space-y-3">
        <label class="block text-sm font-bold text-slate-700 flex items-center gap-2">
          <User class="w-4 h-4 text-primary-500" />
          ابحث عن الزبون (المديونين فقط)
        </label>
        
        <div class="relative">
          <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
            <Search class="w-5 h-5" />
          </div>
          <input v-model="customerQuery" @input="handleCustomerSearch" type="text" placeholder="اكتب اسم الزبون..." 
            class="w-full pr-10 pl-10 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all font-bold text-slate-700" />
          <button v-if="customerQuery" @click.prevent="clearCustomer" class="absolute inset-y-0 left-0 pl-3 text-slate-400 hover:text-slate-600 font-bold text-xl">
            ×
          </button>

          <!-- Autocomplete Dropdown -->
          <div v-if="customerQuery && !selectedCustomer && filteredCustomers.length > 0" class="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
            <div v-for="cust in filteredCustomers" :key="cust.id" @click="selectCustomer(cust)"
              class="px-4 py-3 hover:bg-primary-50 cursor-pointer flex justify-between items-center border-b border-slate-50 last:border-0 transition-colors">
              <span class="font-bold text-slate-700">{{ cust.name }}</span>
              <span class="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded-md" dir="ltr">دين: {{ Number(cust.total_debt).toFixed(1) }} ₪</span>
            </div>
          </div>
          <div v-if="customerQuery && !selectedCustomer && filteredCustomers.length === 0" class="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-center text-sm text-slate-500">
            لا يوجد زبائن مديونين بهذا الاسم.
          </div>
        </div>

        <transition name="page">
          <div v-if="selectedCustomer" class="mt-3 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
            <div class="flex items-center gap-2 text-red-700 font-bold text-sm">
              <Info class="w-4 h-4" />
              إجمالي الدين الحالي:
            </div>
            <span class="font-extrabold text-red-600 text-lg" dir="ltr">{{ Number(selectedCustomer.total_debt).toFixed(1) }} ₪</span>
          </div>
        </transition>
      </div>

      <!-- Payment Amount -->
      <div class="space-y-3 pt-2">
        <label class="block text-sm font-bold text-slate-700 flex items-center gap-2">
          <Wallet class="w-4 h-4 text-emerald-500" />
          المبلغ المدفوع
        </label>
        <div class="relative">
          <input v-model.number="amount" type="number" min="1" step="0.5" placeholder="0.0" dir="ltr"
            class="w-full text-center text-2xl py-4 rounded-xl border border-slate-200 bg-slate-50 font-mono font-extrabold text-slate-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all" />
          <div class="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400 font-bold">
            ₪
          </div>
        </div>
        
        <transition name="page">
          <div v-if="selectedCustomer && amount" class="flex justify-between items-center text-xs font-bold px-1">
            <span class="text-slate-500">الدين المتبقي بعد الدفع:</span>
            <span class="text-primary-600" dir="ltr">{{ Math.max(0, Number(selectedCustomer.total_debt) - amount).toFixed(1) }} ₪</span>
          </div>
        </transition>
      </div>

      <!-- Notes -->
      <div class="space-y-3 pt-2">
        <label class="block text-sm font-bold text-slate-700 flex items-center gap-2">
          <FileText class="w-4 h-4 text-slate-400" />
          ملاحظات (اختياري)
        </label>
        <textarea v-model="notes" rows="2" placeholder="مثال: تحويل بنكي، كاش..."
          class="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-primary-500 text-sm font-medium"></textarea>
      </div>

      <!-- Submit -->
      <div class="pt-4">
        <button type="submit" :disabled="disableSubmit"
          class="w-full py-4 rounded-xl text-white font-extrabold text-lg transition-all flex items-center justify-center gap-2"
          :class="disableSubmit ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-primary-600 to-primary-600 hover:from-primary-500 hover:to-primary-500 shadow-lg shadow-primary-500/30 hover:scale-[1.01]'">
          <span v-if="loading" class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          <CheckCircle v-else class="w-5 h-5" />
          {{ loading ? 'جاري الحفظ...' : 'حفظ الدفعة' }}
        </button>
      </div>

    </form>
  </div>
</template>
