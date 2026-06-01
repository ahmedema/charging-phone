<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../supabase.js'
import {
  LayoutDashboard, PlusCircle, BookOpen, Users, Wallet, Settings, LogOut,
  WashingMachine, Menu, X
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const isMobileMenuOpen = ref(false)

const navigation = [
  { name: 'الرئيسية', href: '/laundry/', icon: LayoutDashboard },
  { name: 'إضافة طلب', href: '/laundry/add-order', icon: PlusCircle },
  { name: 'السجل', href: '/laundry/history', icon: BookOpen },
  { name: 'الزبائن', href: '/laundry/customers', icon: Users },
  { name: 'إضافة دفعة', href: '/laundry/add-payment', icon: Wallet },
  { name: 'الأسعار', href: '/laundry/prices', icon: Settings },
]

const isActive = (href) => {
  if (href === '/laundry/') return route.path === '/laundry/' || route.path === '/laundry'
  return route.path.startsWith(href)
}

const handleLogout = async () => {
  await supabase.auth.signOut()
  router.push('/laundry/login')
}

const closeMobile = () => { isMobileMenuOpen.value = false }
</script>

<template>
  <div class="min-h-screen flex flex-col md:flex-row rtl laundry-bg pb-20 md:pb-0">

    <!-- Mobile Top Bar -->
    <div class="md:hidden flex items-center justify-between px-4 py-3 laundry-header sticky top-0 z-40 border-b border-primary-700/30 shadow-lg">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
          <WashingMachine class="w-5 h-5 text-white" />
        </div>
        <span class="font-extrabold text-lg text-white tracking-tight">مغسلة المبحوح</span>
      </div>
      <button @click="isMobileMenuOpen = !isMobileMenuOpen" class="text-white/80 hover:text-white p-1">
        <Menu v-if="!isMobileMenuOpen" class="w-6 h-6" />
        <X v-else class="w-6 h-6" />
      </button>
    </div>

    <!-- Mobile Overlay Menu -->
    <transition name="page">
      <div v-if="isMobileMenuOpen" class="md:hidden fixed inset-0 z-50 laundry-sidebar-overlay" @click.self="closeMobile">
        <div class="absolute top-0 right-0 h-full w-72 laundry-sidebar flex flex-col shadow-2xl">
          <div class="flex items-center justify-between px-6 py-5 border-b border-white/10">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                <WashingMachine class="w-6 h-6 text-white" />
              </div>
              <div>
                <p class="font-extrabold text-white text-base">مغسلة المبحوح</p>
                <p class="text-primary-200 text-xs">نظام إدارة المغسلة</p>
              </div>
            </div>
            <button @click="closeMobile" class="text-white/60 hover:text-white"><X class="w-5 h-5" /></button>
          </div>
          <nav class="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            <router-link v-for="item in navigation" :key="item.name" :to="item.href" @click="closeMobile"
              class="group flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all"
              :class="isActive(item.href) ? 'bg-white/20 text-white shadow-inner' : 'text-white/70 hover:bg-white/10 hover:text-white'">
              <component :is="item.icon" class="w-5 h-5 flex-shrink-0" />
              {{ item.name }}
            </router-link>
          </nav>
          <div class="p-4 border-t border-white/10">
            <button @click="handleLogout" class="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-colors">
              <LogOut class="w-4 h-4" />
              تسجيل الخروج
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Mobile Bottom Nav -->
    <div class="md:hidden fixed bottom-0 left-0 right-0 z-50 laundry-bottom-nav border-t border-primary-700/30 shadow-[0_-4px_20px_rgba(0,0,0,0.2)]">
      <div class="flex justify-around items-center px-1 pt-2 pb-2">
        <router-link v-for="item in navigation" :key="item.name" :to="item.href"
          class="flex flex-col items-center justify-center w-full py-1 rounded-xl transition-all"
          :class="isActive(item.href) ? 'text-primary-300 scale-105' : 'text-white/50 hover:text-white/80'">
          <div :class="isActive(item.href) ? 'bg-white/20 p-1.5 rounded-xl' : 'p-1.5'">
            <component :is="item.icon" class="w-5 h-5" />
          </div>
          <span class="text-[9px] font-bold mt-0.5 max-w-full truncate px-0.5 text-center">{{ item.name }}</span>
        </router-link>
      </div>
    </div>

    <!-- Desktop Sidebar -->
    <div class="hidden md:flex md:w-72 md:flex-col laundry-sidebar h-screen sticky top-0 shadow-2xl z-40">
      <div class="flex flex-col flex-grow pt-8 overflow-y-auto">
        <!-- Logo -->
        <div class="flex items-center px-6 gap-3 mb-8">
          <div class="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shadow-inner">
            <WashingMachine class="w-7 h-7 text-white" />
          </div>
          <div>
            <p class="font-extrabold text-white text-xl tracking-tight">مغسلة المبحوح</p>
            <p class="text-primary-200 text-xs font-medium">نظام إدارة المغسلة</p>
          </div>
        </div>

        <!-- Quick Add Button -->
        <div class="px-4 mb-6">
          <router-link to="/laundry/add-order"
            class="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-white text-primary-700 font-extrabold text-sm shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all active:scale-100">
            <PlusCircle class="w-5 h-5" />
            + طلب جديد
          </router-link>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 px-4 space-y-1">
          <router-link v-for="item in navigation" :key="item.name" :to="item.href"
            class="group flex items-center gap-3 px-4 py-3.5 text-[15px] font-bold rounded-2xl transition-all"
            :class="isActive(item.href) ? 'bg-white/20 text-white shadow-inner' : 'text-white/70 hover:bg-white/10 hover:text-white'">
            <component :is="item.icon" class="w-5 h-5 flex-shrink-0" :class="isActive(item.href) ? 'text-white' : 'text-white/50 group-hover:text-white/80'" />
            {{ item.name }}
          </router-link>
        </nav>

        <!-- Bottom -->
        <div class="p-6 border-t border-white/10 space-y-3">
          <button @click="handleLogout" class="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-colors">
            <LogOut class="w-4 h-4" />
            تسجيل الخروج
          </button>
          <p class="text-xs text-white/40 font-medium text-center" dir="ltr">Developer <span class="font-bold text-white/60">Ahmed Emad</span></p>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <main class="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 overflow-x-hidden">
      <router-view v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<style scoped>
.laundry-bg {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #f0fdf4 100%);
}
.laundry-header {
  background: linear-gradient(90deg, #16a34a, #22c55e);
}
.laundry-sidebar {
  background: linear-gradient(180deg, #15803d 0%, #16a34a 60%, #22c55e 100%);
}
.laundry-sidebar-overlay {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}
.laundry-bottom-nav {
  background: linear-gradient(180deg, #15803d, #16a34a);
}
</style>
