<script setup>
import { computed, ref } from 'vue'
import { laundryStore, deleteLaundryCustomer, editLaundryCustomer } from '../../store/laundryDb.js'
import { Users, Search, Trash2, Edit2, AlertTriangle, Phone, Save, X, CheckCircle, Filter } from 'lucide-vue-next'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'

const searchQuery = ref('')
const showDebtorsOnly = ref(false)
const customerToDelete = ref(null)
const deleteWithOrders = ref(false)

const customerToEdit = ref(null)
const editFormData = ref({ name: '', phone: '' })

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
    return format(new Date(isoStr), 'dd MMM yyyy', { locale: ar })
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

  </div>
</template>
