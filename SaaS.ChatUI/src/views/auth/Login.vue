<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-950 px-4 relative overflow-hidden">
    <!-- Decorative blobs -->
    <div class="absolute top-0 -left-20 w-72 h-72 bg-primary-600/20 rounded-full blur-[120px]"></div>
    <div class="absolute bottom-0 -right-20 w-72 h-72 bg-purple-600/10 rounded-full blur-[120px]"></div>

    <div class="w-full max-w-md glass-card p-8 space-y-8 relative z-10 transition-all hover:border-slate-700">
      <div class="text-center space-y-2">
        <div class="flex justify-center mb-6">
          <div class="w-16 h-16 rounded-2xl bg-primary-600 flex items-center justify-center shadow-xl shadow-primary-900/40">
            <Bot class="text-white w-10 h-10" />
          </div>
        </div>
        <h2 class="text-3xl font-bold tracking-tight">SaaS Chatbot</h2>
        <p class="text-slate-400">Entre com suas credenciais para continuar</p>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-6">
        <div class="space-y-2">
          <label class="text-sm font-medium text-slate-300 ml-1">E-mail</label>
          <div class="relative">
            <Mail class="absolute left-3 top-2.5 h-5 w-5 text-slate-500" />
            <input 
              v-model="email" 
              type="email" 
              class="input-field pl-11" 
              placeholder="seu@email.com"
              required
            />
          </div>
        </div>

        <div class="space-y-2">
          <div class="flex justify-between items-center ml-1">
            <label class="text-sm font-medium text-slate-300">Senha</label>
            <a href="#" class="text-xs text-primary-500 hover:underline">Esqueceu a senha?</a>
          </div>
          <div class="relative">
            <Lock class="absolute left-3 top-2.5 h-5 w-5 text-slate-500" />
            <input 
              v-model="password" 
              type="password" 
              class="input-field pl-11" 
              placeholder="••••••••"
              required
            />
          </div>
        </div>

        <button 
          type="submit" 
          class="btn-primary w-full py-3 font-semibold flex items-center justify-center gap-2 group"
          :disabled="loading"
        >
          <span v-if="loading">Carregando...</span>
          <template v-else>
            Entrar
            <ArrowRight class="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </template>
        </button>
      </form>

      <div class="text-center">
        <p class="text-sm text-slate-500">
          Não tem uma conta? <a href="#" class="text-primary-500 hover:underline font-medium">Contate-nos</a>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import { Mail, Lock, LogIn, ArrowRight, Bot } from 'lucide-vue-next';

const router = useRouter();
const auth = useAuthStore();

const email = ref('');
const password = ref('');
const loading = ref(false);

async function handleLogin() {
  loading.ref = true;
  try {
    // Simulando login para MVP se a API não estiver respondendo
    if (email.value === 'admin@saas.com' && password.value === '123456') {
      auth.token = 'mock-token';
      localStorage.setItem('access_token', 'mock-token');
      router.push('/');
      return;
    }
    
    await auth.login({ email: email.value, password: password.value });
    router.push('/');
  } catch (error) {
    alert('Erro ao entrar. Verifique suas credenciais.');
  } finally {
    loading.ref = false;
  }
}
</script>
