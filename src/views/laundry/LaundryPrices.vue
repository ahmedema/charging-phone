<script setup>
import { ref, onMounted } from 'vue'
import { laundryStore, updateLaundryPrices } from '../../store/laundryDb.js'
import { Settings, CheckCircle, WashingMachine, PlusCircle } from 'lucide-vue-next'

const loading = ref(false)
const showSuccess = ref(false)

const pricesForm = ref({
  clothes_with_powder: 1.0,
  clothes_without_powder: 1.5,
  carpet_default: 20.0,
  blanket_default: 15.0
})

onMounted(() => {
  // Sync form with store
  pricesForm.value = { ...laundryStore.prices }
})

const savePrices = async () => {
  loading.value = true
  showSuccess.value = false
  try {
    await updateLaundryPrices(pricesForm.value)
    showSuccess.value = true
    setTimeout(() => { showSuccess.value = false }, 3000)
  } catch (e) {
    console.error(e)
    alert('حدث خطأ أثناء حفظ الأسعار')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-6 pb-20">
    <div class="mb-8">
      <h1 class="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
        <div class="bg-primary-100 p-2 rounded-xl text-primary-600"><Settings class="w-6 h-6" /></div>
        إعدادات الأسعار
      </h1>
      <p class="text-slate-500 mt-1 text-sm">تعديل أسعار الغسيل المعتمدة في النظام</p>
    </div>

    <form @submit.prevent="savePrices" class="space-y-6">
      
      <!-- Clothes -->
      <div class="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
        <h2 class="text-lg font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
          <WashingMachine class="w-5 h-5 text-primary-600" />
          أسعار الملابس بالكيلو
        </h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label class="block text-sm font-bold text-slate-700 mb-2">السعر مع مسحوق (₪)</label>
            <div class="relative">
              <input v-model.number="pricesForm.clothes_with_powder" type="number" step="0.5" min="0" dir="ltr"
                class="w-full text-center py-3 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-slate-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all" />
              <div class="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400 font-bold">₪</div>
            </div>
          </div>
          <div>
            <label class="block text-sm font-bold text-slate-700 mb-2">السعر بدون مسحوق (₪)</label>
            <div class="relative">
              <input v-model.number="pricesForm.clothes_without_powder" type="number" step="0.5" min="0" dir="ltr"
                class="w-full text-center py-3 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-slate-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all" />
              <div class="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400 font-bold">₪</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Others -->
      <div class="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
        <h2 class="text-lg font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
          <PlusCircle class="w-5 h-5 text-primary-600" />
          الأسعار المقترحة للقطع الأخرى
        </h2>
        <p class="text-xs text-slate-500 font-bold mb-4">هذه الأسعار تظهر كـ "سعر افتراضي" عند اختيار الصنف ويمكنك تعديلها داخل الطلب.</p>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label class="block text-sm font-bold text-slate-700 mb-2">سعر السجادة الافتراضي (₪)</label>
            <div class="relative">
              <input v-model.number="pricesForm.carpet_default" type="number" step="1" min="0" dir="ltr"
                class="w-full text-center py-3 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-slate-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all" />
              <div class="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400 font-bold">₪</div>
            </div>
          </div>
          <div>
            <label class="block text-sm font-bold text-slate-700 mb-2">سعر الحرام الافتراضي (₪)</label>
            <div class="relative">
              <input v-model.number="pricesForm.blanket_default" type="number" step="1" min="0" dir="ltr"
                class="w-full text-center py-3 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-slate-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all" />
              <div class="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400 font-bold">₪</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Submit -->
      <div class="pt-2">
        <transition name="page">
          <div v-if="showSuccess" class="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-bold px-4 py-3 rounded-xl text-center flex items-center justify-center gap-2">
            <CheckCircle class="w-5 h-5" />
            تم حفظ الأسعار بنجاح!
          </div>
        </transition>

        <button type="submit" :disabled="loading"
          class="w-full py-4 rounded-xl text-white font-extrabold text-lg transition-all flex items-center justify-center gap-2"
          :class="loading ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-primary-600 to-primary-600 hover:from-primary-500 hover:to-primary-500 shadow-lg shadow-primary-500/30 hover:scale-[1.01]'">
          <span v-if="loading" class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          <CheckCircle v-else class="w-5 h-5" />
          {{ loading ? 'جاري الحفظ...' : 'حفظ الأسعار' }}
        </button>
      </div>

    </form>
  </div>
</template>
