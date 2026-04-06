<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { store, addOperation, addCustomer, updateCustomerBalance } from '../store/db'
import { Smartphone, Laptop, Battery, Zap, User, CreditCard, Clock, Tag } from 'lucide-vue-next'

const router = useRouter()

const deviceOptions = [
  { id: 'phone', name: 'هاتف', icon: Smartphone },
  { id: 'laptop', name: 'لابتوب', icon: Laptop },
  { id: 'battery', name: 'بطارية', icon: Battery },
  { id: 'powerbank', name: 'بور', icon: Zap }
]

const paymentOptions = [
  { id: 'now', name: 'دفع الآن' },
  { id: 'debt', name: 'على الحساب (دين)' },
  { id: 'balance', name: 'من الرصيد' }
]

const form = ref({
  deviceType: 'phone',
  customerName: '',
  customerId: '',
  paymentMode: 'now',
  quantity: 1
})

const isNewCustomer = ref(false)

const currentPrice = computed(() => {
  return (store.prices[form.value.deviceType] || 0) * form.value.quantity
})

const selectedCustomer = computed(() => {
  if (form.value.customerId) {
    return store.customers.find(c => c.id === form.value.customerId)
  }
  return null
})

const handleCustomerInput = () => {
  const existing = store.customers.find(c => c.name === form.value.customerName)
  if (existing) {
    form.value.customerId = existing.id
    isNewCustomer.value = false
  } else {
    form.value.customerId = ''
    isNewCustomer.value = form.value.customerName.length > 0
  }
}

const selectCustomer = (cust) => {
  form.value.customerId = cust.id
  form.value.customerName = cust.name
  isNewCustomer.value = false
}

const disableSubmit = computed(() => {
  if (form.value.paymentMode === 'debt' || form.value.paymentMode === 'balance') {
    if (!form.value.customerName) return true;
  }
  if (form.value.paymentMode === 'balance') {
    if (!selectedCustomer.value || selectedCustomer.value.balance < currentPrice.value) {
      return true;
    }
  }
  return false
})

const submit = async () => {
  let finalCustomerId = form.value.customerId

  // If new customer is typed and we need them, create it
  if (isNewCustomer.value && form.value.customerName) {
    const newCust = await addCustomer({ name: form.value.customerName })
    finalCustomerId = newCust.id
  }

  const price = currentPrice.value
  let paid = 0
  let debt = 0
  let fromBalance = 0

  if (form.value.paymentMode === 'now') {
    paid = price
  } else if (form.value.paymentMode === 'debt') {
    debt = price
    if (finalCustomerId) await updateCustomerBalance(finalCustomerId, -price)
  } else if (form.value.paymentMode === 'balance') {
    fromBalance = price
    paid = price // We consider it paid since it came from their deposited balance
    if (finalCustomerId) await updateCustomerBalance(finalCustomerId, -price)
  }

  await addOperation({
    customer_id: finalCustomerId,
    customer_name: form.value.customerName || 'زبون عام (نقدي)',
    type: 'charge',
    device_type: form.value.deviceType,
    quantity: form.value.quantity,
    amount: price,
    paid,
    debt,
    from_balance: fromBalance,
    payment_mode: form.value.paymentMode
  })

  // Navigate or show success
  router.push('/history')
}
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <div class="mb-8">
      <h1 class="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
        <div class="bg-primary-100 p-2.5 rounded-xl text-primary-600">
          <Smartphone class="w-7 h-7" />
        </div>
        إضافة جهاز
      </h1>
      <p class="text-slate-500 mt-2 text-lg">تسجيل شحن جهاز جديد وتحديد آلية الدفع.</p>
    </div>

    <form @submit.prevent="submit" class="glass rounded-3xl p-5 md:p-10 space-y-6 md:space-y-8 shadow-xl border border-slate-200/60 relative overflow-hidden">
      <!-- Decorator -->
      <div class="absolute top-0 right-0 w-48 h-48 md:w-64 md:h-64 bg-primary-100 rounded-full blur-3xl opacity-30 -mr-20 -mt-20 pointer-events-none"></div>

      <!-- Device Type -->
      <div class="space-y-4 relative z-10">
        <label class="block text-sm font-bold text-slate-700">نوع الجهاز</label>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
          <div v-for="device in deviceOptions" :key="device.id"
            @click="form.deviceType = device.id"
            class="cursor-pointer border-2 rounded-2xl p-3 md:p-4 flex flex-col items-center gap-2 md:gap-3 text-center transition-all"
            :class="form.deviceType === device.id ? 'border-primary-500 bg-primary-50 shadow-md text-primary-700' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'"
          >
            <component :is="device.icon" class="w-6 h-6 md:w-8 md:h-8" :class="form.deviceType === device.id ? 'text-primary-500' : ''" />
            <span class="font-bold text-sm md:text-base">{{ device.name }}</span>
          </div>
        </div>
      </div>

      <!-- Quantity -->
      <div class="space-y-4 relative z-10">
        <label class="block text-sm font-bold text-slate-700">عدد الأجهزة</label>
        <div class="flex items-center gap-4 bg-white border border-slate-200 rounded-xl p-2 w-fit">
          <button type="button" @click="form.quantity > 1 && form.quantity--" class="w-10 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-700 focus:outline-none transition-colors">-</button>
          <input type="number" v-model.number="form.quantity" class="w-16 text-center text-xl font-bold font-mono outline-none bg-transparent" min="1" />
          <button type="button" @click="form.quantity++" class="w-10 h-10 rounded-lg bg-primary-50 hover:bg-primary-100 flex items-center justify-center font-bold text-primary-600 focus:outline-none transition-colors">+</button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 relative z-10">
        <!-- Customer Selection -->
        <div class="space-y-4">
          <label class="block text-sm font-bold text-slate-700">الزبون (اختياري)</label>
          <div class="relative">
            <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
              <User class="w-5 h-5" />
            </div>
            <input 
              v-model="form.customerName" 
              @input="handleCustomerInput"
              type="text" 
              placeholder="اكتب أو اختر الزبون..." 
              class="block w-full outline-none pr-10 pl-3 py-3 rounded-xl border border-slate-200 shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-100 bg-slate-50 transition-all text-slate-800 font-medium text-sm md:text-base"
            />
            <div v-if="isNewCustomer" class="absolute right-0 mt-2 bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-lg">
              يضاف كزبون جديد
            </div>
          </div>
          
          <ul v-if="form.customerName && !form.customerId && store.customers.filter(c => c.name.includes(form.customerName)).length > 0" 
              class="bg-white border rounded-xl shadow-lg max-h-40 overflow-y-auto mt-2 outline-none absolute z-20 w-[calc(100%-2rem)] md:w-auto min-w-[250px]">
            <li v-for="cust in store.customers.filter(c => c.name.includes(form.customerName))" :key="cust.id"
                @click="selectCustomer(cust)"
                class="px-4 py-2 hover:bg-slate-50 cursor-pointer flex justify-between font-medium text-sm">
              <span>{{ cust.name }}</span>
              <span class="text-slate-400 text-xs" dir="ltr">{{ cust.balance }}</span>
            </li>
          </ul>
        </div>

        <!-- Details Box -->
        <div class="bg-slate-50/80 rounded-2xl p-5 border border-slate-100 space-y-3">
          <div class="flex justify-between items-center pb-3 border-b border-slate-200 border-dashed">
            <div class="flex items-center gap-2 text-slate-500">
              <Tag class="w-4 h-4 md:w-5 md:h-5" />
              <span class="font-bold text-sm">التكلفة الإجمالية</span>
            </div>
            <div class="text-xl md:text-2xl font-bold font-mono text-slate-900">{{ currentPrice }} <span class="text-xs font-sans text-slate-500">₪</span></div>
          </div>
          <div class="flex justify-between items-center">
            <div class="flex items-center gap-2 text-slate-500">
              <Clock class="w-4 h-4 md:w-5 md:h-5" />
              <span class="font-bold text-sm">وقت الدخول</span>
            </div>
            <div class="text-xs md:text-sm font-semibold text-slate-700 bg-white px-2 py-1 rounded-md border">الآن</div>
          </div>
        </div>
      </div>

      <!-- Payment Mode -->
      <div class="space-y-4 relative z-10 pt-2 md:pt-4">
        <label class="block text-sm font-bold text-slate-700">طريقة الدفع</label>
        <div class="flex flex-col gap-3">
          <label v-for="mode in paymentOptions" :key="mode.id" 
            class="flex-1 cursor-pointer"
          >
            <input type="radio" v-model="form.paymentMode" :value="mode.id" class="hidden" />
            <div class="rounded-xl md:rounded-2xl p-3 md:p-4 border-2 transition-all flex items-center gap-3 font-bold"
                :class="form.paymentMode === mode.id ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'">
              <div class="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0" :class="form.paymentMode === mode.id ? 'border-primary-500' : 'border-slate-300'">
                <div v-if="form.paymentMode === mode.id" class="w-2 h-2 bg-primary-500 rounded-full"></div>
              </div>
              {{ mode.name }}
            </div>
          </label>
        </div>
        
        <div v-if="form.paymentMode === 'balance' && selectedCustomer" class="mt-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs md:text-sm font-medium">
          الرصيد المتوفر: <span dir="ltr" class="font-bold">{{ selectedCustomer.balance }}</span>
          <p v-if="selectedCustomer.balance < currentPrice" class="text-red-500 mt-1 font-bold">الرصيد غير كافٍ، لا يمكن الإكمال.</p>
        </div>
        <div v-if="(form.paymentMode === 'debt' || form.paymentMode === 'balance') && !form.customerName" class="mt-2 text-xs text-red-500 font-bold bg-red-50 p-2 rounded-lg border border-red-100">
          ⚠️ يرجى تحديد الزبون أولاً.
        </div>
      </div>

      <!-- Actions -->
      <div class="pt-4 relative z-10">
        <button type="submit" :disabled="disableSubmit"
          class="w-full flex justify-center items-center gap-2 py-4 rounded-xl text-white font-bold text-lg shadow-lg shadow-primary-500/30 transition-all focus:ring focus:ring-primary-300"
          :class="disableSubmit ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' : 'bg-primary-600 active:bg-primary-700'">
          حفظ وشحن
        </button>
      </div>
    </form>
  </div>
</template>
