<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../supabase.js'
import { initData } from '../store/db'
import { Zap, User, Lock, Eye, EyeOff, ArrowLeft, AlertCircle } from 'lucide-vue-next'

const router = useRouter()
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')

const handleLogin = async () => {
  if(email.value && password.value) {
    isLoading.value = true
    errorMessage.value = ''
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    })

    if (error) {
      errorMessage.value = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.'
      isLoading.value = false
    } else {
      await initData()
      isLoading.value = false
      router.push('/')
    }
  }
}
</script>

<template>
  <div class="min-h-screen rtl flex items-center justify-center bg-slate-50 relative overflow-hidden font-cairo">
    <!-- Animated Background Elements -->
    <div class="absolute w-[500px] h-[500px] bg-primary-500/20 rounded-full blur-[100px] -top-32 -right-32 animate-pulse" style="animation-duration: 4s;"></div>
    <div class="absolute w-[400px] h-[400px] bg-emerald-500/15 rounded-full blur-[80px] -bottom-20 -left-20 animate-pulse" style="animation-duration: 5s; animation-delay: 1s;"></div>
    <div class="absolute w-[300px] h-[300px] bg-primary-400/10 rounded-full blur-[60px] top-1/2 left-1/4 animate-pulse" style="animation-duration: 6s; animation-delay: 2s;"></div>

    <div class="w-full max-w-md p-6 m-4 relative z-10 transition-all duration-700 transform translate-y-0 opacity-100">
      <!-- Glassmorphism Card -->
      <div class="bg-white/80 backdrop-blur-2xl rounded-[2rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-white p-8 sm:p-10 transform transition-all duration-500 hover:shadow-primary-500/20 hover:border-primary-100/50 relative overflow-hidden">
        
        <div class="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary-400/20 to-transparent blur-2xl rounded-full translate-x-10 -translate-y-10"></div>
        
        <!-- Logo/Header -->
        <div class="flex flex-col items-center justify-center mb-10 text-primary-600 gap-4 relative z-10">
          <div class="relative group">
            <div class="absolute inset-0 bg-primary-500 rounded-2xl blur-md opacity-30 group-hover:opacity-60 transition-opacity duration-500"></div>
            <div class="relative bg-gradient-to-b from-primary-50 to-white shadow-sm p-4 rounded-2xl border border-primary-100 transform group-hover:-translate-y-1 transition-all duration-300">
              <Zap class="w-10 h-10 fill-primary-500/20 text-primary-600 drop-shadow-sm" />
            </div>
          </div>
          <div class="text-center">
            <h1 class="text-3xl font-black tracking-tight text-slate-800 mt-2 mb-1">تسجيل الدخول</h1>
            <p class="text-slate-500 text-sm font-bold">مرحباً بك في نظام محطة شحن المكار</p>
          </div>
        </div>

        <!-- Error Message -->
        <div v-if="errorMessage" class="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3 relative z-10 animate-fade-in">
          <AlertCircle class="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p class="text-sm font-bold text-red-600">{{ errorMessage }}</p>
        </div>

        <!-- Form -->
        <form @submit.prevent="handleLogin" class="space-y-6 relative z-10">
          <div class="space-y-2">
            <label class="text-sm font-bold text-slate-700 px-1">البريد الإلكتروني</label>
            <div class="relative group">
              <div class="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400 group-focus-within:text-primary-500 transition-colors duration-300">
                <User class="w-5 h-5" />
              </div>
              <input 
                type="email" 
                v-model="email"
                required
                class="w-full bg-slate-50/50 border border-slate-200 text-slate-900 font-medium rounded-2xl py-3.5 pr-12 pl-4 focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all duration-300 outline-none placeholder:text-slate-400"
                placeholder="أدخل بريدك الإلكتروني"
              >
            </div>
          </div>

          <div class="space-y-2">
            <div class="flex items-center justify-between px-1">
              <label class="text-sm font-bold text-slate-700">كلمة المرور</label>
              <a href="#" class="text-xs font-bold text-primary-600 hover:text-primary-700 px-2 py-1 rounded-lg hover:bg-primary-50 transition-all duration-300">نسيت كلمة المرور؟</a>
            </div>
            <div class="relative group">
              <div class="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400 group-focus-within:text-primary-500 transition-colors duration-300">
                <Lock class="w-5 h-5" />
              </div>
              <input 
                :type="showPassword ? 'text' : 'password'" 
                v-model="password"
                required
                class="w-full bg-slate-50/50 border border-slate-200 text-slate-900 font-medium rounded-2xl py-3.5 pr-12 pl-12 focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all duration-300 outline-none placeholder:text-slate-400 font-sans tracking-wider"
                placeholder="••••••••"
              >
              <button 
                type="button"
                @click="showPassword = !showPassword"
                class="absolute inset-y-0 left-2 flex items-center px-2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors duration-300 bg-transparent"
              >
                <EyeOff v-if="showPassword" class="w-5 h-5" />
                <Eye v-else class="w-5 h-5" />
              </button>
            </div>
          </div>

          <div class="pt-4">
            <button 
              type="submit" 
              :disabled="isLoading"
              class="group relative w-full flex justify-center py-4 px-4 border border-transparent text-base font-black rounded-2xl text-white bg-primary-600 hover:bg-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/30 transition-all duration-300 overflow-hidden shadow-xl shadow-primary-500/30 disabled:opacity-70 disabled:cursor-not-allowed"
            >
               <div class="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
              
              <span v-if="isLoading" class="relative z-10 flex items-center gap-2">
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                جاري الدخول...
              </span>
              <span v-else class="relative z-10 flex items-center gap-2">
                دخول للنظام
                <ArrowLeft class="w-5 h-5 group-hover:-translate-x-1.5 transition-transform duration-300" />
              </span>
            </button>
          </div>
        </form>

      </div>
      
      <!-- Footer Note -->
      <div class="text-center mt-6">
        <p class="text-xs text-slate-400 font-bold flex items-center justify-center gap-1.5" dir="ltr">
          <span>Powered by</span>
          <span class="text-slate-500 hover:text-primary-600 transition-colors">Ahmed Emad</span>
        </p>
      </div>
    </div>
  </div>
</template>

<style>
@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}
</style>
