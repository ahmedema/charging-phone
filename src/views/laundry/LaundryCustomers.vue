<script setup>
import { computed, ref } from 'vue'
import { laundryStore, deleteLaundryCustomer, editLaundryCustomer } from '../../store/laundryDb.js'
import { Users, Search, Trash2, Edit2, AlertTriangle, Phone, Save, X, CheckCircle, Filter, Eye, Clock, Truck, CheckCircle2, Check, FileText, ShoppingBag, Wallet } from 'lucide-vue-next'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'

const searchQuery = ref('')
const showDebtorsOnly = ref(false)
const customerToDelete = ref(null)
const deleteWithOrders = ref(false)

const customerToEdit = ref(null)
const editFormData = ref({ name: '', phone: '' })

// Profile State
const customerProfile = ref(null)

const profileOrders = computed(() => {
  if (!customerProfile.value) return []
  return laundryStore.orders
    .filter(o => o.customer_id === customerProfile.value.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
})

const activeOrders = computed(() => {
  return profileOrders.value.filter(o => ['new', 'washing', 'ready'].includes(o.order_status))
})

const pastOrders = computed(() => {
  return profileOrders.value.filter(o => o.order_status === 'delivered')
})

const profilePayments = computed(() => {
  if (!customerProfile.value) return []
  return (laundryStore.payments || [])
    .filter(p => p.customer_id === customerProfile.value.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
})

const openCustomerProfile = (cust) => {
  customerProfile.value = cust
}

const statusOptions = {
  new: { name: 'جديد', icon: Clock, color: 'text-slate-600 bg-slate-100 border-slate-200' },
  washing: { name: 'قيد الغسيل', icon: Truck, color: 'text-indigo-600 bg-indigo-100 border-indigo-200' },
  ready: { name: 'جاهز', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-100 border-emerald-200' },
  delivered: { name: 'تم التسليم', icon: Check, color: 'text-slate-500 bg-slate-100 border-slate-200' }
}

const paymentLabel = (p) => ({ paid: 'مدفوع كامل', partial: 'دفع جزئي', debt: 'دين' }[p] || p)
const paymentClass = (p) => ({
  paid: 'text-emerald-700 bg-emerald-50',
  partial: 'text-amber-700 bg-amber-50',
  debt: 'text-red-700 bg-red-50',
}[p] || 'text-slate-600 bg-slate-50')

const filteredCustomers = computed(() => {
  let list = laundryStore.customers
  
  if (showDebtorsOnly.value) {
    list = list.filter(c => Number(c.total_debt) > 0)
  }
  
  if (!searchQuery.value) return list
  const q = searchQuery.value.toLowerCase()
  return list.filter(c => c.name.toLowerCase().includes(q))
})

const formatDate = (isoStr) => {
  if (!isoStr) return 'غير معروف'
  try {
    return format(new Date(isoStr), 'dd MMM yyyy - hh:mm a', { locale: ar })
  } catch (e) {
    return isoStr
  }
}

const getOrderCount = (custId) => {
  return laundryStore.orders.filter(o => o.customer_id === custId).length
}

const confirmDelete = (cust) => {
  customerToDelete.value = cust
  deleteWithOrders.value = false
}

const handleDelete = async () => {
  if (!customerToDelete.value) return
  await deleteLaundryCustomer(customerToDelete.value.id, deleteWithOrders.value)
  customerToDelete.value = null
}

const openEditCustomer = (cust) => {
  customerToEdit.value = cust
  editFormData.value = { name: cust.name, phone: cust.phone || '' }
}

const saveCustomerEdit = async () => {
  if (!editFormData.value.name.trim()) return
  await editLaundryCustomer(customerToEdit.value.id, {
    name: editFormData.value.name.trim(),
    phone: editFormData.value.phone.trim() || null
  })
  customerToEdit.value = null
}

const sendWhatsAppReminder = (cust, prefix = '972') => {
  if (!cust.phone) {
    alert('لا يوجد رقم هاتف لهذا الزبون.')
    return
  }
  
  let msg = `مرحباً ${cust.name}،\n`
  msg += `نود تذكيرك بوجود رصيد مستحق (دين) في مغسلة المبحوح بقيمة: `
  msg += `*${Number(cust.total_debt).toFixed(1)} ₪*\n\n`
  msg += `شكراً لتعاملك معنا. 🌹`
  
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
          <Users class="w-7 h-7 text-primary-600" />
          سجل الزبائن
        </h1>
        <p class="text-slate-500 mt-1 text-sm">إدارة زبائن المغسلة ومتابعة الديون</p>
      </div>

      <div class="flex flex-col md:flex-row gap-3 w-full md:w-auto">
        <label class="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors shadow-sm">
          <input type="checkbox" v-model="showDebtorsOnly" class="w-4 h-4 rounded text-primary-600 focus:ring-primary-500" />
          <span class="text-sm font-bold text-slate-700 flex items-center gap-1">
            <Filter class="w-4 h-4 text-slate-400" />
            ديون فقط
          </span>
        </label>
        
        <div class="relative w-full md:w-64">
          <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
            <Search class="w-4 h-4" />
          </div>
          <input v-model="searchQuery" type="text" placeholder="بحث باسم الزبون..." 
            class="w-full pr-10 pl-3 py-2.5 rounded-xl border border-slate-200 bg-white shadow-sm outline-none focus:border-primary-500 text-sm font-medium" />
        </div>
      </div>
    </div>

    <!-- Desktop View -->
    <div class="hidden md:block bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm text-right">
          <thead class="bg-slate-50 text-slate-600 text-xs uppercase font-bold border-b border-slate-200">
            <tr>
              <th class="px-4 py-4">اسم الزبون</th>
              <th class="px-4 py-4">رقم الهاتف</th>
              <th class="px-4 py-4 text-center">عدد الطلبات</th>
              <th class="px-4 py-4 text-center">إجمالي الدين</th>
              <th class="px-4 py-4">تاريخ الإضافة</th>
              <th class="px-4 py-4 text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="cust in filteredCustomers" :key="cust.id" class="hover:bg-slate-50/50 transition-colors">
              <td class="px-4 py-4 font-bold text-slate-800">{{ cust.name }}</td>
              <td class="px-4 py-4 text-slate-500" dir="ltr">{{ cust.phone || '-' }}</td>
              <td class="px-4 py-4 text-center font-bold text-slate-600">{{ getOrderCount(cust.id) }}</td>
              <td class="px-4 py-4 text-center font-extrabold" :class="Number(cust.total_debt) > 0 ? 'text-red-500' : 'text-emerald-500'" dir="ltr">
                {{ Number(cust.total_debt).toFixed(1) }} ₪
              </td>
              <td class="px-4 py-4 text-slate-400 text-xs">{{ formatDate(cust.created_at) }}</td>
              <td class="px-4 py-4 text-center">
                <div class="flex justify-center items-center gap-2">
                  <div v-if="Number(cust.total_debt) > 0 && cust.phone" class="relative group">
                    <button class="text-green-500 hover:text-green-600 p-1 rounded transition-colors" title="إرسال تذكير بالدين">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-send"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                    </button>
                    <!-- Dropdown for prefixes -->
                    <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:flex flex-col gap-1 bg-white border border-slate-200 p-1.5 rounded-xl shadow-lg z-10 w-24">
                      <button @click="sendWhatsAppReminder(cust, '972')" class="text-xs font-bold text-slate-700 bg-slate-50 hover:bg-green-50 hover:text-green-600 py-1 rounded">972</button>
                      <button @click="sendWhatsAppReminder(cust, '970')" class="text-xs font-bold text-slate-700 bg-slate-50 hover:bg-green-50 hover:text-green-600 py-1 rounded">970</button>
                    </div>
                  </div>
                  <button @click="openCustomerProfile(cust)" class="text-indigo-400 hover:text-indigo-600 p-1 rounded transition-colors" title="ملف الزبون والحركة">
                    <Eye class="w-4 h-4" />
                  </button>
                  <button @click="openEditCustomer(cust)" class="text-blue-400 hover:text-blue-600 p-1 rounded transition-colors" title="تعديل الزبون">
                    <Edit2 class="w-4 h-4" />
                  </button>
                  <button @click="confirmDelete(cust)" class="text-red-400 hover:text-red-600 p-1 rounded transition-colors" title="حذف الزبون">
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredCustomers.length === 0">
              <td colspan="6" class="px-4 py-10 text-center text-slate-400">لا يوجد زبائن مطابقين</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Mobile View -->
    <div class="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div v-for="cust in filteredCustomers" :key="'mob-'+cust.id" class="bg-white rounded-xl shadow-sm border border-slate-200 p-4 relative">
        <div class="absolute top-4 left-4 flex gap-2">
          <div v-if="Number(cust.total_debt) > 0 && cust.phone" class="relative group">
            <button class="text-green-500 hover:text-green-600 p-1 rounded">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-send"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
            </button>
            <div class="absolute top-full left-0 mt-1 hidden group-hover:flex flex-col gap-1 bg-white border border-slate-200 p-1.5 rounded-xl shadow-lg z-10 w-24">
              <button @click="sendWhatsAppReminder(cust, '972')" class="text-xs font-bold text-slate-700 bg-slate-50 hover:bg-green-50 hover:text-green-600 py-1 rounded">972</button>
              <button @click="sendWhatsAppReminder(cust, '970')" class="text-xs font-bold text-slate-700 bg-slate-50 hover:bg-green-50 hover:text-green-600 py-1 rounded">970</button>
            </div>
          </div>
          <button @click="openCustomerProfile(cust)" class="text-indigo-400 hover:text-indigo-600 p-1 rounded">
            <Eye class="w-4 h-4" />
          </button>
          <button @click="openEditCustomer(cust)" class="text-blue-400 hover:text-blue-600 p-1 rounded">
            <Edit2 class="w-4 h-4" />
          </button>
          <button @click="confirmDelete(cust)" class="text-red-400 hover:text-red-600 p-1 rounded">
            <Trash2 class="w-4 h-4" />
          </button>
        </div>

        <h3 class="font-bold text-slate-800 text-lg">{{ cust.name }}</h3>
        <p class="text-xs text-slate-400 flex items-center gap-1 mt-1">
          <Phone class="w-3 h-3" /> <span dir="ltr">{{ cust.phone || 'لا يوجد رقم' }}</span>
        </p>

        <div class="mt-4 flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-100">
          <div class="text-center flex-1 border-l border-slate-200">
            <p class="text-[10px] font-bold text-slate-500">الطلبات</p>
            <p class="font-bold text-slate-700">{{ getOrderCount(cust.id) }}</p>
          </div>
          <div class="text-center flex-1">
            <p class="text-[10px] font-bold text-slate-500">الدين</p>
            <p class="font-extrabold text-sm" :class="Number(cust.total_debt) > 0 ? 'text-red-500' : 'text-emerald-500'" dir="ltr">
              {{ Number(cust.total_debt).toFixed(1) }} ₪
            </p>
          </div>
        </div>
      </div>
      <div v-if="filteredCustomers.length === 0" class="sm:col-span-2 text-center py-10 text-slate-400 bg-white rounded-xl border border-dashed">
        لا يوجد زبائن مطابقين
      </div>
    </div>

    <!-- Delete Modal -->
    <transition name="page">
      <div v-if="customerToDelete" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="customerToDelete = null"></div>
        <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm relative z-10 overflow-hidden">
          <div class="bg-red-50 p-6 flex flex-col items-center justify-center border-b border-red-100 text-center">
            <div class="w-14 h-14 bg-white rounded-full flex items-center justify-center text-red-500 shadow-sm mb-3">
              <AlertTriangle class="w-7 h-7" />
            </div>
            <h3 class="text-lg font-extrabold text-red-700">تأكيد حذف الزبون</h3>
            <p class="text-sm text-red-600/80 font-medium mt-1">هل أنت متأكد من حذف <span class="font-bold">{{ customerToDelete.name }}</span>؟</p>
          </div>
          <div class="p-5 space-y-4">
            
            <label class="flex items-start gap-3 p-3 bg-red-50/50 border border-red-100 rounded-xl cursor-pointer">
              <input type="checkbox" v-model="deleteWithOrders" class="mt-1 w-4 h-4 rounded text-red-600 focus:ring-red-500" />
              <div class="text-xs">
                <span class="font-bold text-slate-800 block">حذف جميع حركاته أيضاً؟</span>
                <span class="text-slate-500 block mt-0.5">إذا لم تختر هذا، ستبقى طلباته مسجلة في السجل لكن بدون ارتباط بهذا الزبون.</span>
              </div>
            </label>

            <div class="flex gap-3 pt-2">
              <button @click="handleDelete" class="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 rounded-xl transition-colors shadow-lg shadow-red-500/20">نعم، احذف</button>
              <button @click="customerToDelete = null" class="flex-1 bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-2.5 rounded-xl transition-colors">إلغاء</button>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- Edit Customer Modal -->
    <transition name="page">
      <div v-if="customerToEdit" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="customerToEdit = null"></div>
        <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm relative z-10 overflow-hidden">
          <div class="bg-primary-50 p-6 flex flex-col items-center justify-center border-b border-primary-100 text-center relative">
            <button @click="customerToEdit = null" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-white rounded-full p-1 shadow-sm"><X class="w-5 h-5"/></button>
            <div class="w-14 h-14 bg-white rounded-full flex items-center justify-center text-primary-600 shadow-sm mb-3">
              <Edit2 class="w-7 h-7" />
            </div>
            <h3 class="text-lg font-extrabold text-primary-800">تعديل بيانات الزبون</h3>
          </div>
          <form @submit.prevent="saveCustomerEdit" class="p-5 space-y-4">
            
            <div>
              <label class="block text-xs font-bold text-slate-500 mb-1.5">اسم الزبون</label>
              <input v-model="editFormData.name" type="text" required class="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white outline-none focus:border-primary-500 font-bold text-slate-700" />
            </div>
            
            <div>
              <label class="block text-xs font-bold text-slate-500 mb-1.5">رقم الهاتف</label>
              <input v-model="editFormData.phone" type="tel" dir="ltr" class="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white outline-none focus:border-primary-500 font-bold text-slate-700 text-left" />
            </div>

            <div class="flex gap-3 pt-4 border-t border-slate-100">
              <button type="submit" class="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-primary-500/20">حفظ التعديلات</button>
              <button type="button" @click="customerToEdit = null" class="flex-1 bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3 rounded-xl transition-colors">إلغاء</button>
            </div>
          </form>
        </div>
      </div>
    </transition>

    <!-- Customer Profile / History Modal -->
    <transition name="page">
      <div v-if="customerProfile" class="fixed inset-0 z-[110] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="customerProfile = null"></div>
        <div class="bg-white rounded-[2rem] shadow-2xl border border-slate-200 w-full max-w-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
          
          <!-- Header (Glassmorphism) -->
          <div class="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 flex flex-col relative shrink-0 overflow-hidden text-white">
            <div class="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
            <button @click.stop="customerProfile = null" class="absolute top-4 left-4 text-white/70 hover:text-white bg-black/20 hover:bg-black/30 backdrop-blur-md rounded-full w-10 h-10 flex items-center justify-center transition-all z-30 shadow-sm active:scale-95"><X class="w-5 h-5"/></button>
            
            <div class="flex items-center gap-4 z-10">
              <div class="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/30 shadow-inner">
                <Users class="w-8 h-8 text-white" />
              </div>
              <div class="flex-1">
                <h3 class="text-2xl font-black text-white">{{ customerProfile.name }}</h3>
                <p v-if="customerProfile.phone" class="text-indigo-100 font-medium mt-1 flex items-center gap-1 text-sm" dir="ltr">
                  <Phone class="w-3.5 h-3.5" /> {{ customerProfile.phone }}
                </p>
                <p v-else class="text-indigo-200/80 font-medium mt-1 text-xs">لا يوجد رقم هاتف</p>
              </div>
              <div class="bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-2xl text-center min-w-[100px]">
                <p class="text-[10px] font-bold text-indigo-100 uppercase mb-0.5">الديون المستحقة</p>
                <p class="text-xl font-black text-white" dir="ltr">{{ Number(customerProfile.total_debt).toFixed(1) }} <span class="text-xs">₪</span></p>
              </div>
            </div>
          </div>
          
          <!-- Scrollable Content -->
          <div class="p-5 flex-1 overflow-y-auto bg-slate-50">
            
            <!-- Active Orders -->
            <div v-if="activeOrders.length > 0" class="mb-8">
              <h4 class="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                <ShoppingBag class="w-4 h-4 text-primary-500" />
                الطلبات النشطة ({{ activeOrders.length }})
              </h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div v-for="order in activeOrders" :key="order.id" 
                     class="bg-white rounded-2xl p-4 border-2 shadow-sm transition-all relative overflow-hidden"
                     :class="order.order_status === 'ready' ? 'border-emerald-200 shadow-emerald-500/5' : 'border-indigo-200 shadow-indigo-500/5'">
                  
                  <div class="absolute top-0 right-0 w-full h-1" :class="order.order_status === 'ready' ? 'bg-emerald-400' : 'bg-indigo-400'"></div>
                  
                  <div class="flex justify-between items-start mb-3 mt-1">
                    <span class="px-2.5 py-1 text-[10px] font-bold rounded-lg border flex items-center gap-1.5"
                          :class="statusOptions[order.order_status]?.color">
                      <component :is="statusOptions[order.order_status]?.icon" class="w-3.5 h-3.5" />
                      {{ statusOptions[order.order_status]?.name }}
                    </span>
                    <span class="text-xs font-bold text-slate-400" dir="ltr">{{ formatDate(order.created_at).split(' - ')[0] }}</span>
                  </div>
                  
                  <div class="flex justify-between items-end mt-4">
                    <div>
                      <p class="text-[10px] font-bold text-slate-500 mb-0.5">تكلفة الطلب</p>
                      <p class="font-black text-slate-800 text-lg" dir="ltr">{{ Number(order.total_amount).toFixed(1) }} ₪</p>
                    </div>
                    <span class="px-2 py-0.5 text-[10px] font-bold rounded" :class="paymentClass(order.payment_status)">
                      {{ paymentLabel(order.payment_status) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Payments History -->
            <div class="mb-8">
              <h4 class="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                <Wallet class="w-4 h-4 text-emerald-500" />
                سجل الدفعات المالية المسددة ({{ profilePayments.length }})
              </h4>
              
              <div v-if="profilePayments.length === 0" class="text-center py-6 bg-white rounded-2xl border border-dashed border-slate-200">
                <p class="text-xs text-slate-400 font-medium">لا توجد دفعات مسجلة لهذا الزبون.</p>
              </div>
              
              <div v-else class="space-y-2">
                <div v-for="pay in profilePayments" :key="pay.id"
                     class="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-sm flex items-center justify-between hover:border-emerald-200 transition-colors">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Check class="w-5 h-5 stroke-[3]" />
                    </div>
                    <div>
                      <p class="font-extrabold text-slate-700 text-sm">تسديد دفعة نقدية</p>
                      <p class="text-[10px] text-slate-400 mt-0.5" dir="ltr">{{ formatDate(pay.payment_date) }}</p>
                      <p v-if="pay.notes" class="text-xs text-slate-500 mt-1 font-bold bg-slate-50 px-2 py-0.5 rounded border border-slate-100 w-fit">
                        📝 {{ pay.notes }}
                      </p>
                    </div>
                  </div>
                  <div class="text-left">
                    <span class="text-emerald-600 font-black text-base" dir="ltr">+ {{ Number(pay.amount).toFixed(1) }} ₪</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Timeline for Past Orders -->
            <div>
              <h4 class="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                <Clock class="w-4 h-4 text-slate-400" />
                سجل الطلبات السابقة ({{ pastOrders.length }})
              </h4>
              
              <div v-if="pastOrders.length === 0" class="text-center py-8 bg-white rounded-2xl border border-dashed border-slate-200">
                <p class="text-sm text-slate-400 font-medium">لا توجد طلبات سابقة لهذا الزبون.</p>
              </div>
              
              <div v-else class="space-y-3 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                <div v-for="order in pastOrders" :key="order.id" class="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  
                  <!-- Timeline Dot -->
                  <div class="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-50 bg-white text-slate-400 group-hover:text-primary-500 group-hover:border-primary-100 transition-colors shadow-sm shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                    <Check class="w-4 h-4" />
                  </div>
                  
                  <!-- Timeline Content -->
                  <div class="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl bg-white border border-slate-200 shadow-sm transition-all hover:shadow-md hover:border-slate-300">
                    <div class="flex justify-between items-start mb-2">
                      <p class="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md" dir="ltr">{{ formatDate(order.created_at) }}</p>
                      <span class="px-2 py-0.5 text-[9px] font-bold rounded" :class="paymentClass(order.payment_status)">
                        {{ paymentLabel(order.payment_status) }}
                      </span>
                    </div>
                    <div class="flex justify-between items-end">
                      <div>
                        <p class="text-[10px] font-bold text-slate-500 mb-0.5">الإجمالي</p>
                        <p class="font-black text-slate-700 text-sm" dir="ltr">{{ Number(order.total_amount).toFixed(1) }} ₪</p>
                      </div>
                      <div class="text-left">
                        <p class="text-[10px] font-bold text-slate-500 mb-0.5">المدفوع</p>
                        <p class="font-black text-emerald-600 text-sm" dir="ltr">{{ Number(order.paid_amount).toFixed(1) }} ₪</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </transition>

  </div>
</template>
