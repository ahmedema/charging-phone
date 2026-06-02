<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { laundryStore, addLaundryOrder, editLaundryCustomer } from '../../store/laundryDb.js'
import { Plus, Search, User, Trash2, WashingMachine, CheckCircle, Smartphone, Info, Edit3, X, FileText, Check, Send, CheckCircle2 } from 'lucide-vue-next'

const router = useRouter()
const loading = ref(false)

// Customer Form
const customerQuery = ref('')
const selectedCustomer = ref(null)
const isNewCustomer = ref(false)
const newCustomerPhone = ref('')
const searchInputRef = ref(null)

// Items Form
const items = ref([
  { id: Date.now(), type: 'clothes', weightKg: 1, withPowder: true, unitPrice: laundryStore.prices.clothes_with_powder, description: '' }
])

// Payment Form
const paidAmount = ref('')
const orderNotes = ref('')
const paymentMode = ref('debt') // paid, partial, debt

// WhatsApp Modal State
const showSuccessModal = ref(false)
const savedOrder = ref(null)
const whatsappMessage = ref('')
const whatsappPhone = ref('')

// Computed
const filteredCustomers = computed(() => {
  if (!customerQuery.value) return []
  return laundryStore.customers.filter(c => c.name.includes(customerQuery.value))
})

const totalOrderPrice = computed(() => {
  return items.value.reduce((total, item) => {
    let itemTotal = 0
    if (item.type === 'clothes') {
      const pricePerKg = item.withPowder ? laundryStore.prices.clothes_with_powder : laundryStore.prices.clothes_without_powder
      itemTotal = (item.weightKg || 0) * pricePerKg
    } else {
      itemTotal = Number(item.unitPrice || 0)
    }
    return total + itemTotal
  }, 0)
})

const remainingDebt = computed(() => {
  const paid = Number(paidAmount.value || 0)
  return Math.max(0, totalOrderPrice.value - paid)
})

const disableSubmit = computed(() => {
  if (loading.value) return true
  if (!selectedCustomer.value && !isNewCustomer.value) return true
  if (isNewCustomer.value && !customerQuery.value.trim()) return true
  if (items.value.length === 0) return true
  if (totalOrderPrice.value <= 0) return true
  return false
})

// Actions
const selectCustomer = (cust) => {
  selectedCustomer.value = cust
  customerQuery.value = cust.name
  isNewCustomer.value = false
}

const selectNewCustomer = () => {
  if (customerQuery.value.trim().length > 0) {
    isNewCustomer.value = true
  }
}

const resetCustomer = () => {
  selectedCustomer.value = null
  isNewCustomer.value = false
  customerQuery.value = ''
  newCustomerPhone.value = ''
  setTimeout(() => searchInputRef.value?.focus(), 100)
}

const addItem = (type) => {
  const newItem = { id: Date.now(), type, description: '' }
  if (type === 'clothes') {
    newItem.weightKg = 1
    newItem.withPowder = true
  } else if (type === 'carpet') {
    newItem.unitPrice = laundryStore.prices.carpet_default
  } else if (type === 'blanket') {
    newItem.unitPrice = laundryStore.prices.blanket_default
  }
  items.value.unshift(newItem)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const removeItem = (id) => {
  items.value = items.value.filter(i => i.id !== id)
}

const adjustWeight = (item, delta) => {
  const newVal = (item.weightKg || 0) + delta
  if (newVal >= 0.5) {
    item.weightKg = Number(newVal.toFixed(1))
  }
}

const setPaymentMode = (mode) => {
  paymentMode.value = mode
  if (mode === 'paid') paidAmount.value = totalOrderPrice.value
  else if (mode === 'debt') paidAmount.value = 0
  else paidAmount.value = '' // partial
}

const submitOrder = async () => {
  if (disableSubmit.value) return
  loading.value = true

  try {
    const customer = selectedCustomer.value || {
      name: customerQuery.value.trim(),
      phone: newCustomerPhone.value.trim()
    }

    const processedItems = items.value.map(item => {
      let unitPrice = 0
      let totalPrice = 0
      if (item.type === 'clothes') {
        unitPrice = item.withPowder ? laundryStore.prices.clothes_with_powder : laundryStore.prices.clothes_without_powder
        totalPrice = (item.weightKg || 0) * unitPrice
      } else {
        unitPrice = Number(item.unitPrice || 0)
        totalPrice = unitPrice
      }
      return { ...item, unitPrice, totalPrice }
    })

    const result = await addLaundryOrder({
      customer,
      items: processedItems,
      totalAmount: totalOrderPrice.value,
      paidAmount: Number(paidAmount.value || 0),
      notes: orderNotes.value,
      orderStatus: 'washing'
    })

    // Setup Success Modal
    savedOrder.value = { ...result.order, customer_phone: customer.phone }
    whatsappPhone.value = customer.phone || ''

    const updatedCust = laundryStore.customers.find(c => c.id === result.custId)
    const finalTotalDebt = updatedCust ? Number(updatedCust.total_debt) : 0

    let msg = `مرحباً ${customer.name}،\n`
    msg += `تم تسجيل طلبك في مغسلة المبحوح.\n\n`
    
    processedItems.forEach(item => {
      if (item.type === 'clothes') {
         msg += `👕 ملابس: ${item.weightKg} كيلو (${item.totalPrice.toFixed(1)} ₪)\n`
      }
      if (item.type === 'carpet') {
         msg += `🪶 سجاد: ${item.unitPrice.toFixed(1)} ₪\n`
      }
      if (item.type === 'blanket') {
         msg += `🛌 حرامات: ${item.unitPrice.toFixed(1)} ₪\n`
      }
    })
    
    msg += `\n`
    msg += `💰 تكلفة الطلب: ${totalOrderPrice.value.toFixed(1)} ₪\n`
    msg += `💳 المدفوع الآن: ${Number(paidAmount.value || 0).toFixed(1)} ₪\n`
    
    if (finalTotalDebt > 0) {
      msg += `\n📉 إجمالي ديونك المستحقة: ${finalTotalDebt.toFixed(1)} ₪\n`
    } else if (finalTotalDebt < 0) {
      msg += `\n📈 رصيدك الدائن الحالي: ${Math.abs(finalTotalDebt).toFixed(1)} ₪\n`
    } else {
      msg += `\n✅ حسابك مصفر، لا يوجد ديون.\n`
    }
    
    msg += `\nحالة الطلب: قيد الغسيل ⏳\n`
    msg += `شكراً لاختيارك مغسلة المبحوح! 🌹`

    whatsappMessage.value = msg
    
    if (!customer.phone || !customer.phone.trim()) {
      router.push('/laundry/history')
    } else {
      showSuccessModal.value = true
    }


  } catch (e) {
    console.error(e)
    alert('حدث خطأ أثناء الحفظ')
  } finally {
    loading.value = false
  }
}

const sendWhatsApp = async (prefix) => {
  if (!savedOrder.value.customer_phone && whatsappPhone.value) {
    await editLaundryCustomer(savedOrder.value.customer_id, { phone: whatsappPhone.value })
  }
  
  let targetNumber = ''
  if (whatsappPhone.value) {
      let cleanPhone = whatsappPhone.value.replace(/\D/g, '')
      if (cleanPhone.startsWith('05')) {
        cleanPhone = prefix + cleanPhone.substring(1)
      }
      targetNumber = cleanPhone
  }
  
  const encodedMsg = encodeURIComponent(whatsappMessage.value)
  const url = targetNumber ? `https://wa.me/${targetNumber}?text=${encodedMsg}` : `https://wa.me/?text=${encodedMsg}`
  window.open(url, '_blank')
}

const finishAndGoToHistory = () => {
  router.push('/laundry/history')
}
</script>

<template>
  <div class="max-w-4xl mx-auto pb-40 md:pb-10 relative">
    
    <!-- Page Header -->
    <div class="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <div class="bg-primary-100 p-2.5 rounded-2xl text-primary-600 shadow-inner">
            <Plus class="w-6 h-6 stroke-[3]" />
          </div>
          إضافة طلب
        </h1>
        <p class="text-slate-500 mt-1 text-sm font-medium">قم بإعداد الطلب، حساب التكلفة، وإدارة الدفع.</p>
      </div>
    </div>

    <form @submit.prevent="submitOrder" class="space-y-6">
      
      <!-- 1. Customer Section (Smart & Compact) -->
      <div class="bg-white/90 backdrop-blur-xl border border-slate-200/60 rounded-[2rem] p-5 shadow-sm transition-all duration-300">
        
        <!-- Search Mode -->
        <div v-if="!selectedCustomer && !isNewCustomer" class="relative">
          <div class="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
            <Search class="w-5 h-5" />
          </div>
          <input 
            ref="searchInputRef"
            v-model="customerQuery" 
            type="text" 
            placeholder="ابحث عن اسم الزبون..." 
            class="w-full pr-12 pl-10 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 outline-none focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-500/10 transition-all font-bold text-slate-700 text-lg" 
          />
          <!-- Dropdown -->
          <div v-if="customerQuery" class="absolute z-30 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-56 overflow-y-auto">
            <div v-for="cust in filteredCustomers" :key="cust.id" @click="selectCustomer(cust)"
              class="px-5 py-4 hover:bg-primary-50 cursor-pointer flex justify-between items-center border-b border-slate-50 transition-colors">
              <span class="font-extrabold text-slate-700 text-base">{{ cust.name }}</span>
              <span v-if="Number(cust.total_debt) > 0" class="text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-2.5 py-1 rounded-lg" dir="ltr">
                دين: {{ Number(cust.total_debt).toFixed(1) }} ₪
              </span>
              <span v-else-if="Number(cust.total_debt) < 0" class="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg" dir="ltr">
                رصيد: {{ Math.abs(Number(cust.total_debt)).toFixed(1) }} ₪
              </span>
            </div>
            
            <div v-if="!filteredCustomers.find(c => c.name === customerQuery.trim())" 
                 @click="selectNewCustomer"
                 class="px-5 py-4 hover:bg-primary-50 cursor-pointer flex items-center gap-2 text-primary-600 transition-colors">
                 <Plus class="w-5 h-5" />
                 <span class="font-extrabold text-base">إضافة زبون جديد: "{{ customerQuery }}"</span>
            </div>
          </div>
        </div>

        <!-- Selected / New Customer Mode -->
        <transition name="page">
          <div v-if="selectedCustomer || isNewCustomer" class="flex flex-col gap-3">
            <div class="flex items-center justify-between p-4 rounded-2xl border-2 transition-all"
                 :class="(selectedCustomer && Number(selectedCustomer.total_debt) > 0) ? 'bg-red-50/50 border-red-200' : (selectedCustomer && Number(selectedCustomer.total_debt) < 0) ? 'bg-emerald-50/50 border-emerald-200' : 'bg-primary-50/50 border-primary-200'">
              
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                     :class="(selectedCustomer && Number(selectedCustomer.total_debt) > 0) ? 'bg-red-100 text-red-600' : (selectedCustomer && Number(selectedCustomer.total_debt) < 0) ? 'bg-emerald-100 text-emerald-600' : 'bg-primary-100 text-primary-600'">
                  <User class="w-6 h-6" />
                </div>
                <div>
                  <h3 class="font-black text-lg text-slate-800">{{ selectedCustomer?.name || customerQuery }}</h3>
                  <p v-if="isNewCustomer" class="text-xs font-bold text-primary-600 flex items-center gap-1 mt-0.5">
                    <CheckCircle class="w-3.5 h-3.5" /> زبون جديد
                  </p>
                  <p v-else-if="Number(selectedCustomer.total_debt) > 0" class="text-xs font-extrabold text-red-600 flex items-center gap-1 mt-0.5" dir="ltr">
                    تنبيه: دين سابق بقيمة {{ Number(selectedCustomer.total_debt).toFixed(1) }} ₪
                  </p>
                  <p v-else-if="Number(selectedCustomer.total_debt) < 0" class="text-xs font-extrabold text-emerald-600 flex items-center gap-1 mt-0.5" dir="ltr">
                    رصيد سابق متوفر بقيمة {{ Math.abs(Number(selectedCustomer.total_debt)).toFixed(1) }} ₪
                  </p>
                  <p v-else class="text-xs font-bold text-slate-500 mt-0.5">زبون حالي (لا يوجد ديون أو رصيد)</p>
                </div>
              </div>
              
              <button @click.prevent="resetCustomer" class="text-slate-400 hover:text-slate-600 bg-white p-2 rounded-xl shadow-sm border border-slate-200 transition-colors">
                <Edit3 class="w-5 h-5" />
              </button>
            </div>

            <!-- New Customer Phone -->
            <transition name="page">
              <div v-if="isNewCustomer" class="relative animate-fade-in">
                <div class="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                  <Smartphone class="w-5 h-5" />
                </div>
                <input v-model="newCustomerPhone" type="tel" placeholder="رقم الهاتف للزبون الجديد (اختياري)" dir="ltr"
                  class="w-full pr-12 pl-4 py-3.5 rounded-2xl border-2 border-slate-100 bg-slate-50 outline-none focus:border-primary-500 focus:bg-white text-base font-bold transition-all" />
              </div>
            </transition>
          </div>
        </transition>

      </div>

      <!-- 2. Quick Add Action Bar -->
      <div class="flex items-center gap-3 overflow-x-auto hide-scrollbar pb-2">
        <button type="button" @click="addItem('clothes')" class="flex-shrink-0 flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-white border-2 border-slate-200 shadow-sm hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700 text-slate-700 font-extrabold transition-all active:scale-95">
          <WashingMachine class="w-5 h-5 text-primary-500" />
          <span>ملابس بالكيلو</span>
        </button>
        <button type="button" @click="addItem('carpet')" class="flex-shrink-0 flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-white border-2 border-slate-200 shadow-sm hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-extrabold transition-all active:scale-95">
          <FileText class="w-5 h-5 text-indigo-500" />
          <span>سجاد</span>
        </button>
        <button type="button" @click="addItem('blanket')" class="flex-shrink-0 flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-white border-2 border-slate-200 shadow-sm hover:border-rose-400 hover:bg-rose-50 hover:text-rose-700 text-slate-700 font-extrabold transition-all active:scale-95">
          <FileText class="w-5 h-5 text-rose-500" />
          <span>حرامات</span>
        </button>
      </div>

      <!-- 3. Items List -->
      <div v-if="items.length === 0" class="bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-[2rem] p-10 flex flex-col items-center justify-center text-center">
        <WashingMachine class="w-16 h-16 text-slate-300 mb-3" />
        <p class="text-slate-500 font-bold text-lg">الطلب فارغ حالياً</p>
        <p class="text-slate-400 text-sm mt-1">اضغط على الأزرار في الأعلى لإضافة قطع للغسيل</p>
      </div>

      <div class="space-y-4">
        <transition-group name="page">
          <div v-for="(item, index) in items" :key="item.id" 
               class="bg-white rounded-[2rem] shadow-sm border border-slate-200/80 p-5 relative overflow-hidden transition-all duration-300"
               :class="{'border-primary-200 bg-primary-50/30': item.type === 'clothes', 'border-indigo-200 bg-indigo-50/30': item.type === 'carpet', 'border-rose-200 bg-rose-50/30': item.type === 'blanket'}">
            
            <!-- Delete Item -->
            <button type="button" @click="removeItem(item.id)" class="absolute top-4 left-4 w-8 h-8 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors z-10">
              <X class="w-4 h-4" />
            </button>

            <!-- Item Type Header -->
            <div class="flex items-center gap-2 mb-4">
              <span class="px-3 py-1.5 rounded-xl text-xs font-black"
                    :class="{'bg-primary-100 text-primary-700': item.type === 'clothes', 'bg-indigo-100 text-indigo-700': item.type === 'carpet', 'bg-rose-100 text-rose-700': item.type === 'blanket'}">
                {{ item.type === 'clothes' ? 'ملابس بالكيلو' : item.type === 'carpet' ? 'سجاد' : 'حرامات' }}
              </span>
            </div>

            <!-- Clothes Editor -->
            <div v-if="item.type === 'clothes'" class="flex flex-col md:flex-row md:items-end justify-between gap-5">
              
              <div class="flex-1 space-y-4">
                <!-- Weight Stepper -->
                <div>
                  <label class="block text-xs font-bold text-slate-500 mb-2">الوزن الكلي (كيلو)</label>
                  <div class="flex items-center gap-3">
                    <button type="button" @click="adjustWeight(item, -0.5)" class="w-12 h-12 rounded-xl bg-white border-2 border-slate-200 flex items-center justify-center hover:bg-slate-50 active:bg-slate-100 transition-colors shadow-sm text-slate-600">
                      <Plus class="w-5 h-5 -rotate-90" /> <!-- Minus trick -->
                    </button>
                    <input v-model.number="item.weightKg" type="number" step="0.5" min="0.5" class="w-24 h-12 text-center rounded-xl bg-white border-2 border-slate-200 font-black text-xl text-slate-800 outline-none focus:border-primary-500 shadow-sm" />
                    <button type="button" @click="adjustWeight(item, 0.5)" class="w-12 h-12 rounded-xl bg-white border-2 border-primary-200 flex items-center justify-center hover:bg-primary-50 active:bg-primary-100 transition-colors shadow-sm text-primary-600">
                      <Plus class="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <!-- Powder Toggle -->
                <label class="flex items-center gap-3 p-3 bg-white border-2 rounded-xl cursor-pointer transition-all w-fit"
                       :class="item.withPowder ? 'border-primary-500 shadow-md' : 'border-slate-200'">
                  <div class="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors"
                       :class="item.withPowder ? 'border-primary-500 bg-primary-500' : 'border-slate-300'">
                    <Check v-if="item.withPowder" class="w-4 h-4 text-white" />
                  </div>
                  <input type="checkbox" v-model="item.withPowder" class="hidden" />
                  <span class="text-sm font-extrabold" :class="item.withPowder ? 'text-primary-700' : 'text-slate-600'">مع مسحوق غسيل</span>
                </label>
              </div>

              <!-- Clothes Total -->
              <div class="bg-white px-5 py-4 rounded-2xl border-2 border-slate-100 shadow-sm text-center min-w-[140px]">
                <p class="text-xs font-bold text-slate-400 mb-1">المجموع</p>
                <p class="font-black text-2xl text-slate-800" dir="ltr">
                  {{ ((item.weightKg||0) * (item.withPowder ? laundryStore.prices.clothes_with_powder : laundryStore.prices.clothes_without_powder)).toFixed(1) }} <span class="text-sm text-slate-500">₪</span>
                </p>
              </div>
            </div>

            <!-- Carpet / Blanket Editor -->
            <div v-else class="flex flex-col md:flex-row md:items-end justify-between gap-5">
              <div class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-slate-500 mb-2">وصف أو ملاحظة (اختياري)</label>
                  <input v-model="item.description" type="text" placeholder="مثال: سجادة لون أحمر..." class="w-full px-4 py-3.5 rounded-xl bg-white border-2 border-slate-200 font-bold text-slate-700 outline-none focus:border-indigo-400 transition-colors shadow-sm" />
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-500 mb-2">السعر (₪)</label>
                  <input v-model.number="item.unitPrice" type="number" min="0" class="w-full px-4 py-3.5 rounded-xl bg-white border-2 border-slate-200 font-black text-lg text-slate-800 outline-none focus:border-indigo-400 transition-colors shadow-sm" />
                </div>
              </div>

              <!-- Other Total -->
              <div class="bg-white px-5 py-4 rounded-2xl border-2 border-slate-100 shadow-sm text-center min-w-[140px]">
                <p class="text-xs font-bold text-slate-400 mb-1">المجموع</p>
                <p class="font-black text-2xl text-slate-800" dir="ltr">
                  {{ Number(item.unitPrice||0).toFixed(1) }} <span class="text-sm text-slate-500">₪</span>
                </p>
              </div>
            </div>

          </div>
        </transition-group>
      </div>

      <!-- 4. Payment Segmented Control -->
      <div class="bg-white/90 backdrop-blur-xl border border-slate-200/60 rounded-[2rem] p-5 shadow-sm space-y-5">
        <label class="block text-sm font-bold text-slate-700">حالة الدفع</label>
        
        <div class="flex p-1.5 bg-slate-100 rounded-2xl gap-1">
          <button type="button" @click="setPaymentMode('paid')" class="flex-1 py-3.5 text-sm font-extrabold rounded-xl transition-all duration-300"
            :class="paymentMode === 'paid' ? 'bg-white shadow-sm border border-slate-200/60 text-primary-600 scale-100' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 scale-95'">مدفوع</button>
          <button type="button" @click="setPaymentMode('partial')" class="flex-1 py-3.5 text-sm font-extrabold rounded-xl transition-all duration-300"
            :class="paymentMode === 'partial' ? 'bg-white shadow-sm border border-slate-200/60 text-amber-600 scale-100' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 scale-95'">جزئي</button>
          <button type="button" @click="setPaymentMode('debt')" class="flex-1 py-3.5 text-sm font-extrabold rounded-xl transition-all duration-300"
            :class="paymentMode === 'debt' ? 'bg-white shadow-sm border border-slate-200/60 text-red-600 scale-100' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 scale-95'">دين كامل</button>
        </div>
        
        <transition name="page">
          <div v-if="paymentMode === 'partial'" class="pt-2 animate-fade-in">
             <label class="block text-xs font-bold text-slate-500 mb-2">المبلغ المدفوع (₪)</label>
             <input v-model.number="paidAmount" type="number" min="0" :max="totalOrderPrice" class="w-full p-4 rounded-2xl border-2 border-amber-200 bg-amber-50 font-black text-xl text-amber-800 outline-none focus:border-amber-400 focus:bg-white transition-colors" />
          </div>
        </transition>

        <div v-if="paymentMode !== 'paid'" class="flex justify-between items-center bg-red-50 p-4 rounded-2xl border border-red-100">
          <span class="text-red-600 font-extrabold text-sm">الباقي (يضاف كدين):</span>
          <span class="font-black text-red-600 text-xl" dir="ltr">{{ remainingDebt.toFixed(1) }} ₪</span>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-500 mb-2">ملاحظات الطلب (اختياري)</label>
          <textarea v-model="orderNotes" rows="2" placeholder="مستعجل، حساس، موعد التسليم..." class="w-full p-4 rounded-2xl border-2 border-slate-100 bg-slate-50 outline-none focus:border-primary-500 focus:bg-white text-sm font-bold transition-colors"></textarea>
        </div>
      </div>

      <!-- Desktop Submit (Hidden on Mobile) -->
      <div class="hidden md:block">
        <button type="submit" :disabled="disableSubmit"
          class="w-full py-5 rounded-2xl text-white font-black text-xl transition-all flex items-center justify-center gap-3 shadow-xl"
          :class="disableSubmit ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' : 'bg-primary-600 hover:bg-primary-500 hover:-translate-y-1 shadow-primary-500/30'">
          <span v-if="loading" class="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></span>
          <CheckCircle v-else class="w-6 h-6" />
          {{ loading ? 'جاري حفظ الطلب...' : `حفظ الطلب (${totalOrderPrice.toFixed(1)} ₪)` }}
        </button>
      </div>

    </form>

    <!-- 5. Sticky Action Bar (Mobile Only) -->
    <div class="md:hidden fixed bottom-16 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-t border-slate-200/50 p-4 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] safe-area-pb transition-transform"
         :class="{'translate-y-full opacity-0': items.length === 0 || showSuccessModal}">
      <div class="flex items-center justify-between gap-4 max-w-lg mx-auto">
        <div class="flex flex-col">
          <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider">الإجمالي</span>
          <span class="font-black text-2xl text-slate-800 leading-none" dir="ltr">{{ totalOrderPrice.toFixed(1) }} <span class="text-sm font-bold text-slate-500">₪</span></span>
        </div>
        <button @click="submitOrder" :disabled="disableSubmit"
          class="flex-1 py-4 rounded-2xl text-white font-black text-base transition-all flex items-center justify-center gap-2"
          :class="disableSubmit ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-primary-600 active:bg-primary-700 shadow-lg shadow-primary-500/30'">
          <span v-if="loading" class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          <span v-else>حفظ الطلب</span>
        </button>
      </div>
    </div>

    <!-- 6. Success & WhatsApp Modal -->
    <transition name="page">
      <div v-if="showSuccessModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click.self="finishAndGoToHistory"></div>
        <div class="bg-white rounded-[2rem] shadow-2xl border border-slate-200 w-full max-w-md relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
          
          <div class="bg-emerald-50 p-6 flex flex-col items-center justify-center border-b border-emerald-100 text-center relative shrink-0">
            <button @click="finishAndGoToHistory" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-white rounded-full p-1 shadow-sm"><X class="w-5 h-5"/></button>
            <div class="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 mb-3 animate-bounce">
              <CheckCircle2 class="w-8 h-8" />
            </div>
            <h3 class="text-xl font-black text-emerald-800">تم حفظ الطلب بنجاح!</h3>
            <p class="text-sm text-emerald-600/80 font-bold mt-1">هل تود إرسال الفاتورة للزبون عبر واتساب؟</p>
          </div>
          
          <div class="p-5 flex-1 overflow-y-auto space-y-4">
            
            <div v-if="!savedOrder?.customer_phone" class="bg-amber-50 border border-amber-200 p-4 rounded-2xl">
              <label class="block text-xs font-bold text-amber-700 mb-2">لا يوجد رقم محفوظ للزبون، أضفه الآن:</label>
              <div class="relative">
                <input v-model="whatsappPhone" type="tel" placeholder="رقم الهاتف (مثال: 059...)" dir="ltr"
                  class="w-full px-4 py-3 rounded-xl border border-amber-300 bg-white outline-none focus:border-amber-500 font-bold text-amber-900" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-500 mb-2">نص رسالة الواتساب (يمكنك التعديل)</label>
              <textarea v-model="whatsappMessage" rows="6" dir="rtl" class="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 outline-none focus:border-emerald-500 font-medium text-sm text-slate-700"></textarea>
            </div>

            <div v-if="whatsappPhone && whatsappPhone.replace(/\D/g, '').startsWith('05')" class="flex gap-2 w-full pt-2">
              <button @click="sendWhatsApp('972')" class="flex-1 bg-green-500 hover:bg-green-600 text-white py-3.5 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-500/20 active:scale-95">
                <Send class="w-4 h-4" /> إرسال (972)
              </button>
              <button @click="sendWhatsApp('970')" class="flex-1 bg-teal-500 hover:bg-teal-600 text-white py-3.5 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-teal-500/20 active:scale-95">
                <Send class="w-4 h-4" /> إرسال (970)
              </button>
            </div>
            <button v-else-if="whatsappPhone" @click="sendWhatsApp('972')" class="w-full bg-green-500 hover:bg-green-600 text-white py-3.5 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-500/20 active:scale-95 mt-2">
              <Send class="w-4 h-4" /> إرسال واتساب
            </button>
            
            <button @click="finishAndGoToHistory" class="w-full bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-600 py-3.5 rounded-2xl text-sm font-black transition-all active:scale-95">
              تخطي، إغلاق النافذة
            </button>
          </div>

        </div>
      </div>
    </transition>

  </div>
</template>

<style scoped>
/* Safe area padding for newer mobile devices */
.safe-area-pb {
  padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
}

/* Custom Scrollbar hide */
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
