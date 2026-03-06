<template>
  <div class="flex h-screen overflow-hidden bg-slate-950">
    <!-- Sidebar -->
    <aside class="w-64 glass-sidebar hidden md:flex flex-col z-20">
      <div class="p-6">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
            <Bot class="text-white w-5 h-5" />
          </div>
          <span class="font-bold text-lg tracking-tight">SaaS Chatbot</span>
        </div>
      </div>

      <nav class="flex-1 px-4 py-4 space-y-1">
        <RouterLink 
          v-for="item in menuItems" 
          :key="item.path"
          :to="item.path"
          class="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors"
          :class="[$route.path === item.path ? 'bg-primary-600/10 text-primary-500' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900']"
        >
          <component :is="item.icon" class="w-5 h-5" />
          <span class="font-medium text-sm">{{ item.name }}</span>
        </RouterLink>
      </nav>

      <div class="p-4 border-t border-slate-800">
        <button @click="auth.logout" class="flex items-center gap-3 px-3 py-2 w-full text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all">
          <LogOut class="w-5 h-5" />
          <span class="font-medium text-sm">Sair</span>
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col min-w-0">
      <header class="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-slate-950/50 backdrop-blur-md">
        <h1 class="font-semibold text-lg">{{ currentRouteName }}</h1>
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-3 text-sm">
            <div class="text-right">
              <p class="font-medium">Luck Arkman</p>
              <p class="text-xs text-slate-500">SuperAdmin</p>
            </div>
            <div class="w-8 h-8 rounded-full bg-slate-800 border border-slate-700"></div>
          </div>
        </div>
      </header>

      <main class="flex-1 overflow-y-auto p-8">
        <RouterView v-slot="{ Component }">
          <Transition name="fade" mode="out-in">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Workflow, 
  Settings, 
  Users, 
  LogOut,
  Bot
} from 'lucide-vue-next';

const route = useRoute();
const auth = useAuthStore();

const menuItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Conversas', path: '/chat', icon: MessageSquare },
  { name: 'Flow Builder', path: '/agent-builder', icon: Workflow },
  { name: 'Tenants', path: '/tenants', icon: Users },
  { name: 'Configurações', path: '/settings', icon: Settings },
];

const currentRouteName = computed(() => {
  const item = menuItems.find(i => i.path === route.path);
  return item ? item.name : 'Bem-vindo';
});
</script>
