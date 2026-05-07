<script setup>
import { computed, ref, watch } from 'vue'
import { isOnline } from '../composables/useOnlineStatus'
import { offlineQueue, pendingCount, syncQueue } from '../store/offlineQueue'
import { WifiOff, Wifi, RefreshCw, Clock } from 'lucide-vue-next'

const hasPending = computed(() => pendingCount.value > 0)

const showBackOnline = ref(false)
let timeoutId = null

watch(isOnline, (newVal) => {
  if (newVal) {
    showBackOnline.value = true
    if (hasPending.value) {
      syncQueue() // المزامنة التلقائية عند عودة الإنترنت
    }
    timeoutId = setTimeout(() => {
      showBackOnline.value = false
    }, 4000)
  } else {
    showBackOnline.value = false
    if (timeoutId) clearTimeout(timeoutId)
  }
})
</script>

<template>
  <!-- شريط Offline: يظهر فقط عند انقطاع الإنترنت -->
  <transition name="banner-slide">
    <div v-if="!isOnline" 
      class="fixed top-0 left-0 right-0 z-[200] flex items-center justify-center gap-3 px-4 py-3 text-white font-bold text-sm shadow-lg"
      style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)"
    >
      <WifiOff class="w-5 h-5 shrink-0 animate-pulse" />
      <span class="flex-1 text-center">
        لا يوجد اتصال بالإنترنت — البيانات تُحفظ محلياً وستُرسل تلقائياً عند عودة الاتصال
      </span>
      <div v-if="hasPending" 
        class="bg-white/20 px-2 py-0.5 rounded-full text-xs font-mono flex items-center gap-1"
        title="عدد العمليات المعلّقة"
      >
        <Clock class="w-3 h-3" />
        {{ pendingCount }}
      </div>
    </div>
  </transition>

  <!-- شريط عودة الاتصال (يظهر مؤقتاً فقط) -->
  <transition name="banner-slide">
    <div v-if="showBackOnline"
      class="fixed top-0 left-0 right-0 z-[200] flex items-center justify-center gap-3 px-4 py-3 text-white font-bold text-sm shadow-lg"
      style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%)"
    >
      <Wifi class="w-5 h-5 shrink-0" />
      <span class="flex-1 text-center">
        عاد الاتصال بالإنترنت!
        <span v-if="offlineQueue.isSyncing"> (جاري مزامنة العمليات المعلّقة...)</span>
      </span>
    </div>
  </transition>
</template>

<style scoped>
.banner-slide-enter-active,
.banner-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.banner-slide-enter-from,
.banner-slide-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
