<script setup>
import { computed, ref } from 'vue'
import { laundryStore, deleteLaundryOrder, updateOrderStatus, updateLaundryOrder } from '../../store/laundryDb.js'
import { BookOpen, Search, Trash2, Edit, AlertTriangle, X, Check, CheckCircle, Clock, Truck } from 'lucide-vue-next'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'

const searchQuery = ref('')
const orderToDelete = ref(null)

const statusOptions = [
  { id: 'new', name: 'جديد', icon: Clock },
  { id: 'washing', name: 'قيد الغسيل', icon: Truck }, // Using truck as generic active, could use others
  { id: 'ready', name: 'جاهز', icon: CheckCircle },
  { id: 'delivered', name: 'تم التسليم', icon: Check }
]

const filteredOrders = computed(() => {
  if (!searchQuery.value) return laundryStore.orders
  const q = searchQuery.value.toLowerCase()
  return laundryStore.orders.filter(o => 
    (o.customer_name && o.customer_name.toLowerCase().includes(q))
  )
})

const formatDate = (isoStr) => {
  if (!isoStr) return ''
  try {
    return format(new Date(isoStr), 'dd MMM yyyy - hh:mm a', { locale: ar })
  } catch (e) {
    return isoStr
  }
}

const paymentLabel = (p) => ({ paid: 'مدفوع كامل', partial: 'دفع جزئي', debt: 'دين' }[p] || p)
const paymentClass = (p) => ({
  paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  partial: 'bg-amber-100 text-amber-700 border-amber-200',
  debt: 'bg-red-100 text-red-700 border-red-200',
}[p] || 'bg-slate-100 text-slate-600')

const statusClass = (s) => ({
  new: 'bg-slate-100 text-slate-700 border-slate-200',
  washing: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  ready: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  delivered: 'bg-slate-100 text-slate-400 border-slate-200 opacity-70'
}[s] || 'bg-white text-slate-700')

const readyModalOrder = ref(null)

const orderToEdit = ref(null)
const editOrderData = ref({ total_amount: 0, paid_amount: 0, notes: '' })

const openEditOrder = (order) => {
  orderToEdit.value = order
  editOrderData.value = { 
    total_amount: Number(order.total_amount), 
    paid_amount: Number(order.paid_amount), 
    notes: order.notes || '' 
  }
}

const saveOrderEdit = async () => {
  if (!orderToEdit.value) return
  
  const total = Number(editOrderData.value.total_amount)
  const paid = Number(editOrderData.value.paid_amount)
  const remaining = Math.max(0, total - paid)
  
  const paymentStatus = remaining === 0 ? 'paid' : (paid > 0 ? 'partial' : 'debt')
  
  await updateLaundryOrder(orderToEdit.value.id, {
    total_amount: total,
    paid_amount: paid,
    remaining_debt: remaining,
    payment_status: paymentStatus,
    notes: editOrderData.value.notes
  })
  
  orderToEdit.value = null
}

const handleStatusChange = async (order, newStatus) => {
  await updateOrderStatus(order.id, newStatus)
  if (newStatus === 'ready') {
    const cust = laundryStore.customers.find(c => c.id === order.customer_id)
    if (cust && cust.phone) {
      readyModalOrder.value = { order, cust }
    }
  }
}

const sendReadyWhatsApp = (prefix = '972') => {
  if (!readyModalOrder.value) return
  const { order, cust } = readyModalOrder.value
  
  let msg = `مرحباً ${cust.name}، 🌹\n`
  msg += `نود إعلامك بأن طلبك في مغسلة المبحوح قد أصبح *جاهزاً للاستلام*! ✨\n\n`
  
  if (Number(order.remaining_debt) > 0) {
    msg += `المتبقي للدفع عند الاستلام: ${Number(order.remaining_debt).toFixed(1)} ₪\n`
  }
  
  msg += `\nنحن في انتظارك، أهلاً وسهلاً بك! 🧺`
  
  let targetNumber = cust.phone.replace(/\D/g, '')
  if (targetNumber.startsWith('05')) {
    targetNumber = prefix + targetNumber.substring(1)
  }
  
  const encodedMsg = encodeURIComponent(msg)
  const url = `https://wa.me/${targetNumber}?text=${encodedMsg}`
  window.open(url, '_blank')
  
  readyModalOrder.value = null
}

const confirmDelete = (order) => {
  orderToDelete.value = order
}

const handleDelete = async () => {
  if (!orderToDelete.value) return
  await deleteLaundryOrder(orderToDelete.value.id)
  orderToDelete.value = null
}

const sendWhatsAppReceipt = (order, prefix = '972') => {
  const cust = laundryStore.customers.find(c => c.id === order.customer_id)
  if (!cust || !cust.phone) {
    alert('لا يوجد رقم هاتف محفوظ لهذا الزبون في السجلات.')
    return
  }
  
  const items = laundryStore.orderItems.filter(i => i.order_id === order.id)
  
  let msg = `مرحباً ${order.customer_name}،\n`
  msg += `هذه نسخة من فاتورة طلبك في مغسلة المبحوح.\n\n`
  
  items.forEach(item => {
    if (item.item_type === 'clothes') {
       msg += `👕 ملابس: ${item.weight_kg} كيلو (${Number(item.total_price).toFixed(1)} ₪)\n`
    }
    if (item.item_type === 'carpet') {
       msg += `🪶 سجاد: ${Number(item.unit_price).toFixed(1)} ₪\n`
    }
    if (item.item_type === 'blanket') {
       msg += `🛌 حرامات: ${Number(item.unit_price).toFixed(1)} ₪\n`
    }
  })
  
  msg += `\n`
  msg += `💰 المجموع: ${Number(order.total_amount).toFixed(1)} ₪\n`
  msg += `💳 المدفوع: ${Number(order.paid_amount).toFixed(1)} ₪\n`
  if (Number(order.remaining_debt) > 0) {
    msg += `📉 المتبقي (دين): ${Number(order.remaining_debt).toFixed(1)} ₪\n`
  }
  msg += `\nحالة الطلب: ${statusOptions.find(s => s.id === order.order_status)?.name || 'غير محدد'}\n`
  msg += `شكراً لاختيارك مغسلة المبحوح! 🌹`
  
  let targetNumber = cust.phone.replace(/\D/g, '')
  if (targetNumber.startsWith('05')) {
    targetNumber = prefix + targetNumber.substring(1)
  }
  
  const encodedMsg = encodeURIComponent(msg)
  const url = `https://wa.me/${targetNumber}?text=${encodedMsg}`
  window.open(url, '_blank')
}
</script>

<template>
  <div class="max-w-6xl mx-auto space-y-6 pb-20">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
          <BookOpen class="w-7 h-7 text-primary-600" />
          سجل الطلبات
        </h1>
        <p class="text-slate-500 mt-1 text-sm">عرض وإدارة جميع طلبات المغسلة</p>
      </div>

      <div class="relative w-full md:w-72">
        <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
          <Search class="w-4 h-4" />
        </div>
        <input v-model="searchQuery" type="text" placeholder="بحث باسم الزبون..." 
          class="w-full pr-10 pl-3 py-2.5 rounded-xl border border-slate-200 bg-white shadow-sm outline-none focus:border-primary-500 text-sm font-medium" />
      </div>
    </div>

    <!-- Desktop View (Table) -->
    <div class="hidden md:block bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm text-right">
          <thead class="bg-slate-50 text-slate-600 text-xs uppercase font-bold border-b border-slate-200">
            <tr>
              <th class="px-4 py-4">التاريخ</th>
              <th class="px-4 py-4">الزبون</th>
              <th class="px-4 py-4 text-center">الإجمالي</th>
              <th class="px-4 py-4 text-center">المدفوع</th>
              <th class="px-4 py-4 text-center">الدين</th>
              <th class="px-4 py-4 text-center">الدفع</th>
              <th class="px-4 py-4 text-center">حالة الطلب</th>
              <th class="px-4 py-4 text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="order in filteredOrders" :key="order.id" class="hover:bg-slate-50/50 transition-colors">
              <td class="px-4 py-4 text-slate-500 font-mono text-xs whitespace-nowrap" dir="ltr">{{ formatDate(order.created_at) }}</td>
              <td class="px-4 py-4 font-bold text-slate-800">{{ order.customer_name }}</td>
              <td class="px-4 py-4 text-center font-extrabold text-primary-600" dir="ltr">{{ Number(order.total_amount).toFixed(1) }}</td>
              <td class="px-4 py-4 text-center font-bold text-emerald-600" dir="ltr">{{ Number(order.paid_amount).toFixed(1) }}</td>
              <td class="px-4 py-4 text-center font-bold text-red-500" dir="ltr">{{ Number(order.remaining_debt).toFixed(1) }}</td>
              <td class="px-4 py-4 text-center">
                <span class="px-2.5 py-1 text-[10px] font-bold rounded border" :class="paymentClass(order.payment_status)">
                  {{ paymentLabel(order.payment_status) }}
                </span>
              </td>
              <td class="px-4 py-4 text-center">
                <select :value="order.order_status" @change="e => handleStatusChange(order, e.target.value)"
                  class="text-xs font-bold border border-slate-200 rounded-lg px-2 py-1 outline-none cursor-pointer transition-colors"
                  :class="statusClass(order.order_status)">
                  <option v-for="opt in statusOptions" :key="opt.id" :value="opt.id">{{ opt.name }}</option>
                </select>
              </td>
              <td class="px-4 py-4 text-center">
                <div class="flex justify-center items-center gap-2">
                  <div class="relative group">
                    <button class="text-green-500 hover:text-green-600 p-1 rounded transition-colors" title="إرسال فاتورة">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-send"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                    </button>
                    <!-- Dropdown for prefixes -->
                    <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:flex flex-col gap-1 bg-white border border-slate-200 p-1.5 rounded-xl shadow-lg z-10 w-24">
                      <button @click="sendWhatsAppReceipt(order, '972')" class="text-xs font-bold text-slate-700 bg-slate-50 hover:bg-green-50 hover:text-green-600 py-1 rounded">972</button>
                      <button @click="sendWhatsAppReceipt(order, '970')" class="text-xs font-bold text-slate-700 bg-slate-50 hover:bg-green-50 hover:text-green-600 py-1 rounded">970</button>
                    </div>
                  </div>
                  <button @click="openEditOrder(order)" class="text-blue-400 hover:text-blue-600 p-1 rounded transition-colors" title="تعديل الطلب">
                    <Edit class="w-4 h-4" />
                  </button>
                  <button @click="confirmDelete(order)" class="text-red-400 hover:text-red-600 p-1 rounded transition-colors" title="حذف الطلب">
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredOrders.length === 0">
              <td colspan="8" class="px-4 py-10 text-center text-slate-400">لا توجد طلبات مطابقة</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Mobile View (Cards) -->
    <div class="md:hidden space-y-3">
      <div v-for="order in filteredOrders" :key="'mob-'+order.id" class="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-3 relative">
        
        <div class="absolute top-4 left-4 flex gap-2">
          <div class="relative group">
            <button class="text-green-500 hover:text-green-600 bg-green-50 p-1.5 rounded-lg">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-send"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
            </button>
            <div class="absolute top-full left-0 mt-1 hidden group-hover:flex flex-col gap-1 bg-white border border-slate-200 p-1.5 rounded-xl shadow-lg z-10 w-24">
              <button @click="sendWhatsAppReceipt(order, '972')" class="text-xs font-bold text-slate-700 bg-slate-50 hover:bg-green-50 hover:text-green-600 py-1 rounded">972</button>
              <button @click="sendWhatsAppReceipt(order, '970')" class="text-xs font-bold text-slate-700 bg-slate-50 hover:bg-green-50 hover:text-green-600 py-1 rounded">970</button>
            </div>
          </div>
          <button @click="openEditOrder(order)" class="text-blue-400 hover:text-blue-600 bg-blue-50 p-1.5 rounded-lg">
            <Edit class="w-4 h-4" />
          </button>
          <button @click="confirmDelete(order)" class="text-red-400 hover:text-red-600 bg-red-50 p-1.5 rounded-lg">
            <Trash2 class="w-4 h-4" />
          </button>
        </div>

        <div>
          <h3 class="font-bold text-slate-800">{{ order.customer_name }}</h3>
          <p class="text-[10px] text-slate-400 mt-0.5" dir="ltr">{{ formatDate(order.created_at) }}</p>
        </div>

        <div class="grid grid-cols-3 gap-2 bg-slate-50 rounded-lg p-2 border border-slate-100 text-center">
          <div>
            <p class="text-[10px] font-bold text-slate-500">الإجمالي</p>
            <p class="font-bold text-primary-600 text-xs" dir="ltr">{{ Number(order.total_amount).toFixed(1) }}</p>
          </div>
          <div class="border-x border-slate-200">
            <p class="text-[10px] font-bold text-slate-500">المدفوع</p>
            <p class="font-bold text-emerald-600 text-xs" dir="ltr">{{ Number(order.paid_amount).toFixed(1) }}</p>
          </div>
          <div>
            <p class="text-[10px] font-bold text-slate-500">الباقي (دين)</p>
            <p class="font-bold text-red-500 text-xs" dir="ltr">{{ Number(order.remaining_debt).toFixed(1) }}</p>
          </div>
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-slate-100">
          <span class="px-2 py-0.5 text-[10px] font-bold rounded border" :class="paymentClass(order.payment_status)">
            {{ paymentLabel(order.payment_status) }}
          </span>
          <select :value="order.order_status" @change="e => handleStatusChange(order, e.target.value)"
            class="text-xs font-bold border border-slate-200 rounded-md px-2 py-1 outline-none transition-colors"
            :class="statusClass(order.order_status)">
            <option v-for="opt in statusOptions" :key="opt.id" :value="opt.id">{{ opt.name }}</option>
          </select>
        </div>
      </div>
      <div v-if="filteredOrders.length === 0" class="text-center py-10 text-slate-400 bg-white rounded-xl border border-dashed">
        لا توجد طلبات مطابقة
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <transition name="page">
      <div v-if="orderToDelete" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="orderToDelete = null"></div>
        <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm relative z-10 overflow-hidden">
          <div class="bg-red-50 p-6 flex flex-col items-center justify-center border-b border-red-100 text-center">
            <div class="w-14 h-14 bg-white rounded-full flex items-center justify-center text-red-500 shadow-sm mb-3">
              <AlertTriangle class="w-7 h-7" />
            </div>
            <h3 class="text-lg font-extrabold text-red-700">تأكيد الحذف</h3>
            <p class="text-sm text-red-600/80 font-medium mt-1">هل أنت متأكد من حذف هذا الطلب للزبون <span class="font-bold">{{ orderToDelete.customer_name }}</span>؟</p>
          </div>
          <div class="p-5">
            <p class="text-xs text-slate-500 font-bold mb-4 text-center bg-slate-50 p-2 rounded-lg border border-slate-200">
              ⚠️ سيتم إرجاع أي دين مسجل على الزبون بسبب هذا الطلب (عكس العملية).
            </p>
            <div class="flex gap-3">
              <button @click="handleDelete" class="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 rounded-xl transition-colors">نعم، احذف</button>
              <button @click="orderToDelete = null" class="flex-1 bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-2.5 rounded-xl transition-colors">إلغاء</button>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- Ready WhatsApp Modal -->
    <transition name="page">
      <div v-if="readyModalOrder" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="readyModalOrder = null"></div>
        <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm relative z-10 overflow-hidden">
          <div class="bg-emerald-50 p-6 flex flex-col items-center justify-center border-b border-emerald-100 text-center relative">
            <button @click="readyModalOrder = null" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-white rounded-full p-1 shadow-sm"><X class="w-5 h-5"/></button>
            <div class="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 mb-3 animate-bounce">
              <CheckCircle class="w-8 h-8" />
            </div>
            <h3 class="text-lg font-extrabold text-emerald-800">الطلب أصبح جاهزاً! 🎉</h3>
            <p class="text-sm text-emerald-600/80 font-bold mt-1">هل تود إرسال رسالة للزبون <span class="font-black">{{ readyModalOrder.cust.name }}</span> ليأتي لاستلامه؟</p>
          </div>
          <div class="p-5">
            <div v-if="readyModalOrder.cust.phone.replace(/\D/g, '').startsWith('05')" class="flex gap-2 w-full">
              <button @click="sendReadyWhatsApp('972')" class="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-500/20 active:scale-95">
                إرسال (972)
              </button>
              <button @click="sendReadyWhatsApp('970')" class="flex-1 bg-teal-500 hover:bg-teal-600 text-white py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-teal-500/20 active:scale-95">
                إرسال (970)
              </button>
            </div>
            <button v-else @click="sendReadyWhatsApp('972')" class="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-500/20 active:scale-95">
              إرسال عبر واتساب
            </button>
            
            <button @click="readyModalOrder = null" class="w-full mt-3 bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-600 py-3 rounded-xl text-sm font-black transition-all active:scale-95">
              إلغاء
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Edit Order Modal -->
    <transition name="page">
      <div v-if="orderToEdit" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="orderToEdit = null"></div>
        <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm relative z-10 overflow-hidden">
          <div class="bg-primary-50 p-6 flex flex-col items-center justify-center border-b border-primary-100 text-center relative">
            <button @click="orderToEdit = null" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-white rounded-full p-1 shadow-sm"><X class="w-5 h-5"/></button>
            <div class="w-14 h-14 bg-white rounded-full flex items-center justify-center text-primary-600 shadow-sm mb-3">
              <Edit class="w-7 h-7" />
            </div>
            <h3 class="text-lg font-extrabold text-primary-800">تعديل محاسبة الطلب</h3>
            <p class="text-xs text-primary-600 font-bold mt-1">سيتم إعادة حساب الدين تلقائياً</p>
          </div>
          <form @submit.prevent="saveOrderEdit" class="p-5 space-y-4">
            
            <div>
              <label class="block text-xs font-bold text-slate-500 mb-1.5">الإجمالي (₪)</label>
              <input v-model.number="editOrderData.total_amount" type="number" step="0.5" min="0" required class="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white outline-none focus:border-primary-500 font-black text-slate-700" />
            </div>
            
            <div>
              <label class="block text-xs font-bold text-slate-500 mb-1.5">المدفوع (₪)</label>
              <input v-model.number="editOrderData.paid_amount" type="number" step="0.5" min="0" required class="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white outline-none focus:border-primary-500 font-black text-slate-700" />
            </div>
            
            <div>
              <label class="block text-xs font-bold text-slate-500 mb-1.5">ملاحظات الطلب</label>
              <textarea v-model="editOrderData.notes" rows="2" class="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white outline-none focus:border-primary-500 font-bold text-slate-700"></textarea>
            </div>

            <div class="flex gap-3 pt-4 border-t border-slate-100">
              <button type="submit" class="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-primary-500/20">حفظ التعديلات</button>
              <button type="button" @click="orderToEdit = null" class="flex-1 bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3 rounded-xl transition-colors">إلغاء</button>
            </div>
          </form>
        </div>
      </div>
    </transition>

  </div>
</template>
