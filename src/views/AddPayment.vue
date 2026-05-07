<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { store, addOperation, updateCustomerBalance } from '../store/db'
import { CreditCard, User, Banknote } from 'lucide-vue-next'

const router = useRouter()

const form = ref({
  customerName: '',
  customerId: '',
  amount: ''
})

const isSubmitting = ref(false)

const handleCustomerInput = () => {
  const existing = store.customers.find(c => c.name === form.value.customerName)
  if (existing) {
    form.value.customerId = existing.id
  } else {
    form.value.customerId = ''
  }
}

const selectCustomer = (cust) => {
  form.value.customerId = cust.id
  form.value.customerName = cust.name
}

const selectedCustomer = computed(() => {
  return store.customers.find(c => c.id === form.value.customerId) || null
})

const submit = async () => {
  if (!form.value.customerId || !form.value.amount || isNaN(form.value.amount)) return
  if (isSubmitting.value) return
  
  isSubmitting.value = true

  try {
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
  } catch (err) {
    console.error('Failed to add payment:', err)
    isSubmitting.value = false
  }
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

    <form @submit.prevent="submit" 
          class="glass rounded-3xl p-5 md:p-10 space-y-6 md:space-y-8 shadow-xl border border-slate-200/60 relative overflow-hidden transition-opacity duration-200"
          :class="isSubmitting ? 'opacity-75 pointer-events-none cursor-wait' : ''">
      
      <!-- Overlay to block all interactions during submission -->
      <div v-if="isSubmitting" class="absolute inset-0 z-50 bg-transparent"></div>

      <div class="absolute top-0 left-0 w-48 h-48 md:w-64 md:h-64 bg-green-100 rounded-full blur-3xl opacity-30 -ml-20 -mt-20 pointer-events-none"></div>

      <!-- Customer Select -->
      <div class="space-y-3 relative z-30">
        <label class="block text-sm font-bold text-slate-700">الزبون</label>
        <div class="relative">
          <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
            <User class="w-5 h-5" />
          </div>
          <input 
            v-model="form.customerName" 
            @input="handleCustomerInput"
            type="text" 
            placeholder="اكتب اسم الزبون للبحث..." 
            required
            class="block w-full outline-none pr-10 pl-3 py-3 md:py-3.5 rounded-xl border border-slate-200 shadow-sm focus:border-green-500 focus:ring focus:ring-green-100 bg-slate-50 transition-all text-slate-800 font-bold text-sm md:text-base"
          />
        </div>
        
        <ul v-if="form.customerName && !form.customerId && store.customers.filter(c => c.name.includes(form.customerName)).length > 0" 
            class="bg-white border rounded-xl shadow-lg max-h-40 overflow-y-auto mt-1 outline-none absolute z-20 left-0 right-0 w-full py-1">
          <li v-for="cust in store.customers.filter(c => c.name.includes(form.customerName))" :key="cust.id"
              @click="selectCustomer(cust)"
              class="px-4 py-3 hover:bg-slate-50 cursor-pointer flex justify-between items-center font-bold text-sm transition-colors border-b last:border-0 border-slate-100">
            <span class="text-slate-800">{{ cust.name }}</span>
            <span :class="cust.balance < 0 ? 'text-red-500 bg-red-50' : 'text-green-600 bg-green-50'" class="px-2 py-1 rounded-md text-xs font-mono" dir="ltr">{{ cust.balance }}</span>
          </li>
        </ul>
        <div v-if="form.customerName && !form.customerId && store.customers.filter(c => c.name.includes(form.customerName)).length === 0" 
            class="bg-red-50 text-red-600 border border-red-100 rounded-xl p-3 mt-1 text-sm font-bold text-center">
            لا يوجد زبون بهذا الاسم. الرجاء اختيار زبون من القائمة.
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
        <button type="submit" :disabled="!form.customerId || isSubmitting"
          class="w-full flex justify-center items-center gap-2 py-4 rounded-xl text-white font-bold text-lg shadow-lg shadow-green-500/30 transition-all focus:ring focus:ring-green-300"
          :class="(!form.customerId || isSubmitting) ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' : 'bg-green-600 active:bg-green-700'">
          <span v-if="isSubmitting" class="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          <span>{{ isSubmitting ? 'جاري الحفظ...' : 'إضافة الدفعة' }}</span>
        </button>
      </div>
    </form>
  </div>
</template>
