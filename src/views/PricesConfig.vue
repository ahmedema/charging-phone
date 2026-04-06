<script setup>
import { ref } from 'vue'
import { store, updatePrices } from '../store/db'
import { Settings, Save, Smartphone, Laptop, Battery, Zap } from 'lucide-vue-next'

const prices = ref({ ...store.prices })
const isSaving = ref(false)
const showSuccess = ref(false)

const savePrices = async () => {
  isSaving.value = true
  
  try {
    await updatePrices({
      phone: Number(prices.value.phone),
      laptop: Number(prices.value.laptop),
      battery: Number(prices.value.battery),
      powerbank: Number(prices.value.powerbank)
    })
    
    showSuccess.value = true
    setTimeout(() => {
      showSuccess.value = false
    }, 3000)
  } catch (error) {
    console.error("Failed to update prices", error)
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="max-w-xl mx-auto space-y-6 mt-10">
    <div class="mb-8">
      <h1 class="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
        <div class="bg-primary-100 p-2.5 rounded-xl text-primary-600">
          <Settings class="w-7 h-7" />
        </div>
        إعدادات الأسعار
      </h1>
      <p class="text-slate-500 mt-2 text-lg">تحديث تكلفة الشحن لكل نوع جهاز.</p>
    </div>

    <form @submit.prevent="savePrices" class="glass rounded-3xl p-5 md:p-10 space-y-6 md:space-y-8 shadow-xl border border-slate-200/60 relative overflow-hidden">
      <div class="absolute top-0 right-0 w-48 h-48 md:w-64 md:h-64 bg-primary-100 rounded-full blur-3xl opacity-20 -mr-20 -mt-20 pointer-events-none"></div>

      <!-- Phone -->
      <div class="space-y-2 md:space-y-3 relative z-10">
        <label class="flex items-center gap-2 text-sm font-bold text-slate-700">
          <Smartphone class="w-4 h-4 md:w-5 md:h-5 text-slate-400" />
          سعر شحن الهاتف
        </label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 font-bold text-sm">
            ₪
          </div>
          <input 
            v-model="prices.phone" type="number" step="any" min="0" required
            class="block w-full outline-none pl-12 pr-4 py-3 md:py-3.5 rounded-xl border border-slate-200 shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-100 bg-white transition-all text-slate-800 font-bold font-mono text-lg text-left"
            dir="ltr"
          />
        </div>
      </div>

      <!-- Laptop -->
      <div class="space-y-2 md:space-y-3 relative z-10">
        <label class="flex items-center gap-2 text-sm font-bold text-slate-700">
          <Laptop class="w-4 h-4 md:w-5 md:h-5 text-slate-400" />
          سعر شحن اللابتوب
        </label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 font-bold text-sm">
            ₪
          </div>
          <input 
            v-model="prices.laptop" type="number" step="any" min="0" required
            class="block w-full outline-none pl-12 pr-4 py-3 md:py-3.5 rounded-xl border border-slate-200 shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-100 bg-white transition-all text-slate-800 font-bold font-mono text-lg text-left"
            dir="ltr"
          />
        </div>
      </div>

      <!-- Battery -->
      <div class="space-y-2 md:space-y-3 relative z-10">
        <label class="flex items-center gap-2 text-sm font-bold text-slate-700">
          <Battery class="w-4 h-4 md:w-5 md:h-5 text-slate-400" />
          سعر شحن البطارية
        </label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 font-bold text-sm">
            ₪
          </div>
          <input 
            v-model="prices.battery" type="number" step="any" min="0" required
            class="block w-full outline-none pl-12 pr-4 py-3 md:py-3.5 rounded-xl border border-slate-200 shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-100 bg-white transition-all text-slate-800 font-bold font-mono text-lg text-left"
            dir="ltr"
          />
        </div>
      </div>

      <!-- Powerbank -->
      <div class="space-y-2 md:space-y-3 relative z-10">
        <label class="flex items-center gap-2 text-sm font-bold text-slate-700">
          <Zap class="w-4 h-4 md:w-5 md:h-5 text-slate-400" />
          سعر شحن البور
        </label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 font-bold text-sm">
            ₪
          </div>
          <input 
            v-model="prices.powerbank" type="number" step="any" min="0" required
            class="block w-full outline-none pl-12 pr-4 py-3 md:py-3.5 rounded-xl border border-slate-200 shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-100 bg-white transition-all text-slate-800 font-bold font-mono text-lg text-left"
            dir="ltr"
          />
        </div>
      </div>

      <!-- Actions -->
      <div class="pt-6 relative z-10 flex flex-col gap-3">
        <button type="submit" :disabled="isSaving"
          class="w-full flex justify-center items-center gap-2 py-4 px-6 rounded-2xl text-white font-bold text-lg shadow-lg shadow-primary-500/30 transition-all bg-primary-600 hover:bg-primary-500 hover:shadow-primary-500/50 hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed">
          <Save v-if="!isSaving" class="w-5 h-5" />
          <div v-else class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          حفظ التعديلات
        </button>
        
        <transition name="page">
          <div v-if="showSuccess" class="text-center text-green-600 font-bold text-sm bg-green-50 py-2 rounded-xl border border-green-100">
            تم تحديث الأسعار بنجاح!
          </div>
        </transition>
      </div>
    </form>
  </div>
</template>
