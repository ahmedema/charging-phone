<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../../supabase.js'
import { initLaundryData } from '../../store/laundryDb.js'
import { WashingMachine, Mail, Lock, Eye, EyeOff } from 'lucide-vue-next'

const router = useRouter()
const email = ref('')
const password = ref('')
const showPass = ref(false)
const loading = ref(false)
const error = ref('')

const handleLogin = async () => {
  error.value = ''
  loading.value = true
  try {
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    })
    if (authError) throw authError
    await initLaundryData()
    router.push('/laundry/')
  } catch (e) {
    error.value = 'البريد أو كلمة المرور غير صحيحة.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen laundry-login-bg flex items-center justify-center p-4 rtl">
    <!-- Background decoration -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-40 -right-40 w-96 h-96 bg-primary-300/20 rounded-full blur-3xl"></div>
      <div class="absolute -bottom-40 -left-40 w-96 h-96 bg-primary-300/20 rounded-full blur-3xl"></div>
    </div>

    <div class="relative w-full max-w-md">
      <!-- Card -->
      <div class="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/60 p-8 md:p-10 space-y-6">

        <!-- Logo -->
        <div class="flex flex-col items-center gap-3 pb-2">
          <div class="w-20 h-20 rounded-3xl laundry-icon-bg flex items-center justify-center shadow-xl shadow-primary-500/30">
            <WashingMachine class="w-10 h-10 text-white" />
          </div>
          <div class="text-center">
            <h1 class="text-2xl font-extrabold text-slate-800 tracking-tight">مغسلة المبحوح</h1>
            <p class="text-slate-500 text-sm mt-1">نظام إدارة المغسلة الذكي</p>
          </div>
        </div>

        <!-- Error -->
        <transition name="page">
          <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 text-sm font-medium px-4 py-3 rounded-xl text-center">
            {{ error }}
          </div>
        </transition>

        <!-- Form -->
        <form @submit.prevent="handleLogin" class="space-y-4">
          <div class="space-y-2">
            <label class="block text-sm font-bold text-slate-700">البريد الإلكتروني</label>
            <div class="relative">
              <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                <Mail class="w-5 h-5" />
              </div>
              <input v-model="email" type="email" required autocomplete="email"
                placeholder="example@email.com"
                class="block w-full pr-10 pl-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-medium text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all" dir="ltr" />
            </div>
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-bold text-slate-700">كلمة المرور</label>
            <div class="relative">
              <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                <Lock class="w-5 h-5" />
              </div>
              <input v-model="password" :type="showPass ? 'text' : 'password'" required autocomplete="current-password"
                placeholder="••••••••"
                class="block w-full pr-10 pl-10 py-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-medium text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all" dir="ltr" />
              <button type="button" @click="showPass = !showPass" class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-slate-600">
                <EyeOff v-if="showPass" class="w-5 h-5" />
                <Eye v-else class="w-5 h-5" />
              </button>
            </div>
          </div>

          <button type="submit" :disabled="loading"
            class="w-full py-4 rounded-xl laundry-btn text-white font-extrabold text-base shadow-lg shadow-primary-500/40 hover:shadow-xl hover:scale-[1.01] active:scale-100 transition-all flex items-center justify-center gap-2 mt-2"
            :class="loading ? 'opacity-70 cursor-wait' : ''">
            <span v-if="loading" class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            <span>{{ loading ? 'جاري الدخول...' : 'دخول' }}</span>
          </button>
        </form>

        <!-- Footer note -->
        <p class="text-center text-xs text-slate-400 pt-2">
          🧺 نظام مخصص لإدارة مغسلة المبحوح فقط
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.laundry-login-bg {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 40%, #f0fdf4 100%);
  position: relative;
}
.laundry-icon-bg {
  background: linear-gradient(135deg, #16a34a, #15803d);
}
.laundry-btn {
  background: linear-gradient(135deg, #16a34a, #15803d);
}
</style>
