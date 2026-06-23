<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { isLoading, initData, globalDebtAlert, store } from './store/db'
import { laundryLoading, initLaundryData } from './store/laundryDb'
import { supabase } from './supabase.js'
import { syncQueue } from './store/offlineQueue'
import { syncLaundryQueue } from './store/laundryOfflineQueue'
import { isOnline } from './composables/useOnlineStatus'
import OfflineBanner from './components/OfflineBanner.vue'
import LaundryLayout from './components/LaundryLayout.vue'
import { Home, PlusSquare, CreditCard, Search, Users, Settings, Menu, X, Zap, LogOut, AlertTriangle, Send, Download, DownloadCloud } from 'lucide-vue-next'
import { usePwaInstall } from './composables/usePwaInstall'

const { isInstallable, promptInstall } = usePwaInstall()

const isMobileMenuOpen = ref(false)
const route = useRoute()
const router = useRouter()

const isLaundryRoute = computed(() => {
  return route.path.startsWith('/laundry')
})

const isAppLoading = computed(() => {
  return isLaundryRoute.value ? laundryLoading.value : isLoading.value
})

const navigation = [
  { name: 'الرئيسية', href: '/', icon: Home },
  { name: 'إضافة جهاز', href: '/add-device', icon: PlusSquare },
  { name: 'إضافة دفعة', href: '/add-payment', icon: CreditCard },
  { name: 'السجل', href: '/history', icon: Search },
  { name: 'الزبائن', href: '/customers', icon: Users },
  { name: 'الأسعار', href: '/prices', icon: Settings },
]

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false
}

const handleLogout = async () => {
  await supabase.auth.signOut()
  router.push('/login')
}

onMounted(async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    // Initialize both apps data so switching is seamless
    initData()
    initLaundryData()
    
    // مزامنة أي عمليات معلّقة من قبل (إن وُجدت)
    if (isOnline.value) {
      setTimeout(() => {
        syncQueue()
        syncLaundryQueue()
      }, 2000)
    }
  } else {
    isLoading.value = false
    laundryLoading.value = false
  }
})

const sendToWhatsAppFromAlert = (prefix = '972') => {
  if (!globalDebtAlert.value) return
  const alertData = globalDebtAlert.value
  
  const message = [
    `مرحباً ${alertData.name}،`,
    ``,
    `نود تذكيرك بتجاوز سقف الدين المسموح به في *نقطة شحن المبحوح*.`,
    `💸 قيمة الدين الحالي: *${Math.abs(alertData.balance)} ₪*`,
    ``,
    `يرجى إرسال قيمة الدين على محفظة جوال بي أو بال بي (PalPay) على الرقم:`,
    `📱 *0598811023*`,
    ``,
    `⚠️ يرجى إرسال إشعار الدفع هنا بعد التحويل ليتم تحديث رصيدك.`,
    `شاكرين تفهمكم وتعاونكم! 🌹`
  ].join('%0A')

  let targetNumber = ''
  if (alertData.phone) {
    let cleanPhone = alertData.phone.replace(/\D/g, '')
    if (cleanPhone.startsWith('05')) {
      cleanPhone = prefix + cleanPhone.substring(1)
    }
    targetNumber = cleanPhone
  }
  
  const whatsappUrl = targetNumber 
    ? `https://wa.me/${targetNumber}?text=${message}` 
    : `https://wa.me/?text=${message}`

  window.open(whatsappUrl, '_blank')
  globalDebtAlert.value = null
}

const handleDownloadBackup = () => {
  const backupData = {
    exportDate: new Date().toISOString(),
    customers: store.customers,
    operations: store.operations,
    prices: store.prices
  }
  
  const jsonStr = JSON.stringify(backupData, null, 2)
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const a = document.createElement('a')
  a.href = url
  const dateStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '-')
  a.download = `ChargingPoint_Backup_${dateStr}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
</script>

<template>
  <!-- شريط حالة الاتصال -->
  <OfflineBanner />

  <!-- Global Loader -->
  <div v-if="isAppLoading" class="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm">
    <div class="w-16 h-16 border-4 border-slate-100 border-t-cyan-600 rounded-full animate-spin"></div>
    <div class="mt-4 text-lg md:text-xl font-bold text-slate-700">جاري الاتصال السحابي...</div>
  </div>

  <!-- إشعار الديون العائم (غير المزعج) - لتطبيق الشحن فقط -->
  <transition name="page">
    <div v-if="globalDebtAlert && !isLaundryRoute" class="fixed top-4 md:top-6 left-1/2 -translate-x-1/2 z-[110] bg-white border border-red-200 shadow-2xl shadow-red-500/20 rounded-2xl p-4 w-[90%] max-w-sm flex flex-col gap-3">
      <div class="flex justify-between items-start">
        <div class="flex items-center gap-2 text-red-600">
          <AlertTriangle class="w-5 h-5" />
          <h4 class="font-bold">تجاوز الحد المسموح للدين!</h4>
        </div>
        <button @click="globalDebtAlert = null" class="text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-1 rounded-lg transition-colors">
          <X class="w-4 h-4" />
        </button>
      </div>
      <p class="text-sm text-slate-600">الزبون <span class="font-bold text-slate-800">{{ globalDebtAlert.name }}</span> تجاوز دينه <span class="font-bold text-red-600" dir="ltr">{{ Math.abs(globalDebtAlert.balance) }} ₪</span>.</p>
      <div v-if="globalDebtAlert.phone && globalDebtAlert.phone.replace(/\D/g, '').startsWith('05')" class="flex gap-2 w-full mt-1">
        <button @click="sendToWhatsAppFromAlert('972')" class="flex-1 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors">
          <Send class="w-3.5 h-3.5" />
          إرسال (972)
        </button>
        <button @click="sendToWhatsAppFromAlert('970')" class="flex-1 bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors">
          <Send class="w-3.5 h-3.5" />
          إرسال (970)
        </button>
      </div>
      <button v-else @click="sendToWhatsAppFromAlert('972')" class="mt-1 w-full bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors">
        <Send class="w-4 h-4" />
        إرسال تنبيه واتساب
      </button>
    </div>
  </transition>

  <!-- Login pages or full screen pages without layout -->
  <div v-if="route.meta.hideLayout">
    <router-view v-slot="{ Component }">
      <transition name="page" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </div>
  
  <!-- Laundry App Layout -->
  <LaundryLayout v-else-if="isLaundryRoute" />

  <!-- Charging Phone App Layout (Original) -->
  <div v-else class="min-h-screen bg-slate-50 flex flex-col md:flex-row rtl pb-20 md:pb-0">
    
    <!-- Mobile header -->
    <div class="md:hidden flex items-center justify-center p-4 glass sticky top-0 z-40 border-b border-slate-200 shadow-sm">
      <div class="flex items-center gap-2 text-primary-600">
        <Zap class="w-6 h-6 fill-current border border-primary-200 rounded-lg p-1 bg-primary-50" />
        <span class="font-bold text-xl tracking-tight">محطة شحن المكار</span>
      </div>
    </div>

    <!-- Mobile Bottom Navigation Bar -->
    <div class="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] safe-area-pb">
      <div class="flex justify-between items-center px-2 pt-2 pb-2">
        <router-link
          v-for="item in navigation"
          :key="item.name"
          :to="item.href"
          class="flex flex-col items-center justify-center w-full py-1 rounded-xl transition-all"
          :class="[route.path === item.href ? 'text-primary-600 scale-105' : 'text-slate-400 hover:text-slate-600']"
        >
          <div :class="[route.path === item.href ? 'bg-primary-50 p-1.5 rounded-xl shadow-sm' : 'p-1.5']">
             <component :is="item.icon" class="w-5 h-5" :class="[route.path === item.href ? 'fill-primary-50 text-primary-600' : '']" />
          </div>
          <span class="text-[9px] font-bold mt-1 max-w-full truncate px-1 text-center" :class="[route.path === item.href ? 'text-primary-700' : '']">{{ item.name }}</span>
        </router-link>
      </div>
    </div>

    <!-- Desktop sidebar -->
    <div class="hidden md:flex md:w-72 md:flex-col glass border-l border-slate-200 h-screen sticky top-0 shadow-lg z-40">
      <div class="flex flex-col flex-grow pt-8 overflow-y-auto">
        <div class="flex items-center px-8 gap-3 text-primary-600 mb-8">
          <Zap class="w-8 h-8 fill-current drop-shadow-md bg-primary-50 p-1 rounded-xl border border-primary-100" />
          <span class="font-bold text-2xl tracking-tight">محطة شحن المكار</span>
        </div>
        <div class="mt-5 flex-1 flex flex-col">
          <nav class="flex-1 px-4 space-y-2">
            <router-link
              v-for="item in navigation"
              :key="item.name"
              :to="item.href"
              class="group flex items-center gap-3 px-4 py-3.5 text-[15px] font-bold rounded-2xl transition-all"
              :class="[route.path === item.href ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30' : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900']"
            >
              <component :is="item.icon" class="w-5 h-5 flex-shrink-0" :class="[route.path === item.href ? 'text-white fill-white/20' : 'text-slate-400 group-hover:text-slate-600']" />
              {{ item.name }}
            </router-link>
          </nav>
          
          <div class="mt-8 p-6 text-center border-t border-slate-100 space-y-4">
            <button v-if="isInstallable" @click="promptInstall" class="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-primary-700 font-bold bg-primary-50 hover:bg-primary-100 transition-colors border border-primary-100">
              <DownloadCloud class="w-4 h-4" />
              تثبيت التطبيق
            </button>
            <button @click="handleDownloadBackup" class="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-blue-700 font-bold bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-100">
              <Download class="w-4 h-4" />
              تنزيل نسخة احتياطية
            </button>
            <button @click="handleLogout" class="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-red-600 font-bold bg-red-50 hover:bg-red-100 transition-colors border border-red-100">
              <LogOut class="w-4 h-4" />
              تسجيل الخروج
            </button>
            <p class="text-xs text-slate-400 font-medium flex items-center justify-center gap-1.5" dir="ltr">
              <span>Developer</span>
              <span class="font-bold text-slate-500 hover:text-primary-600 transition-colors">Ahmed Emad</span>
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Main content container -->
    <main class="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 overflow-x-hidden md:min-h-screen relative z-10 flex flex-col">
      <div class="flex-1">
        <router-view v-slot="{ Component }">
          <transition name="page" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>

      <!-- Mobile credit -->
      <div class="md:hidden mt-8 pb-4 flex flex-col items-center gap-3">
        <button v-if="isInstallable" @click="promptInstall" class="flex items-center gap-2 text-primary-700 font-bold bg-primary-50 px-4 py-2 rounded-xl text-sm w-full justify-center active:bg-primary-100 transition-colors border border-primary-100">
          <DownloadCloud class="w-4 h-4" />
          تثبيت التطبيق
        </button>
        <button @click="handleDownloadBackup" class="flex items-center gap-2 text-blue-700 font-bold bg-blue-50 px-4 py-2 rounded-xl text-sm w-full justify-center active:bg-blue-100 transition-colors border border-blue-100">
          <Download class="w-4 h-4" />
          تنزيل نسخة احتياطية
        </button>
        <button @click="handleLogout" class="flex items-center gap-2 text-red-500 font-bold bg-red-50 px-4 py-2 rounded-xl text-sm w-full justify-center active:bg-red-100 transition-colors border border-red-100">
          <LogOut class="w-4 h-4" />
          تسجيل الخروج
        </button>
        <p class="text-[11px] text-slate-400 font-medium flex items-center justify-center gap-1 mt-2" dir="ltr">
          <span>Developer</span>
          <span class="font-bold text-slate-500">Ahmed Emad</span>
        </p>
      </div>
    </main>
  </div>
</template>

