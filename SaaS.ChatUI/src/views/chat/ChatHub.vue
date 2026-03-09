<template>
  <div class="h-[calc(100vh-10rem)] glass-card flex overflow-hidden">
    <!-- Sidebar / List -->
    <div class="w-80 border-r border-slate-800 flex flex-col">
      <div class="p-4 border-b border-slate-800">
        <div class="relative">
          <Search class="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input type="text" placeholder="Buscar conversas..." class="input-field pl-10 text-sm py-2" />
        </div>
      </div>
      <div class="flex-1 overflow-y-auto">
        <div v-for="n in 8" :key="n" class="p-4 flex gap-3 hover:bg-slate-900 cursor-pointer border-b border-slate-900 group">
          <div class="w-12 h-12 rounded-full bg-slate-800 flex-shrink-0 relative">
            <div class="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full"></div>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex justify-between items-start">
              <p class="font-bold text-sm truncate">Carlos Eduado</p>
              <span class="text-[10px] text-slate-500">14:20</span>
            </div>
            <p class="text-xs text-slate-400 truncate mt-1">Olá, gostaria de saber mais sobre os planos...</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Chat -->
    <div class="flex-1 flex flex-col bg-slate-950/20">
      <div class="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/40">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-slate-800"></div>
          <div>
            <p class="font-bold text-sm">Carlos Eduardo</p>
            <p class="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Online</p>
          </div>
        </div>
        <div class="flex gap-2">
          <button class="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
            <Phone class="w-4 h-4" />
          </button>
          <button class="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
            <MoreVertical class="w-4 h-4" />
          </button>
        </div>
      </div>

      <div class="flex-1 p-6 space-y-4 overflow-y-auto">
        <div v-for="n in 3" :key="n" class="space-y-4">
          <div class="flex justify-start">
            <div class="max-w-[70%] glass-card p-4 text-sm rounded-tl-none">
              Olá! Em que podemos ajudar hoje?
            </div>
          </div>
          <div class="flex justify-end">
            <div class="max-w-[70%] bg-primary-600 p-4 text-sm rounded-lg rounded-tr-none shadow-lg shadow-primary-900/20">
              Quero saber o valor do plano Pro para 5 atendentes.
            </div>
          </div>
        </div>
      </div>

      <div class="p-4 bg-slate-900/40 border-t border-slate-800">
        <div class="flex gap-4">
          <button class="p-2 hover:bg-slate-800 rounded-lg text-slate-400">
            <Paperclip class="w-5 h-5" />
          </button>
          <div class="flex-1 relative">
            <input type="text" placeholder="Digite sua mensagem..." class="input-field pr-12" />
            <button class="absolute right-2 top-1.5 p-1.5 bg-primary-600 hover:bg-primary-500 rounded-md transition-colors text-white">
              <Send class="w-4 h-4" />
            </button>
          </div>
          <button class="p-2 hover:bg-slate-800 rounded-lg text-slate-400">
            <Mic class="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>

    <!-- Details Sidebar (Optional) -->
    <div class="w-64 border-l border-slate-800 p-6 hidden xl:block">
      <h3 class="font-bold text-sm uppercase tracking-widest text-slate-500 mb-6">Informações</h3>
      <div class="space-y-6">
        <div>
          <p class="text-xs text-slate-500 mb-1">Telefone</p>
          <p class="text-sm font-medium">+55 (11) 98877-6655</p>
        </div>
        <div>
          <p class="text-xs text-slate-500 mb-1">Tags</p>
          <div class="flex flex-wrap gap-2">
            <span class="px-2 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-bold rounded uppercase">Lead</span>
            <span class="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded uppercase">Interessado</span>
          </div>
        </div>
        <div class="pt-6 border-t border-slate-800">
          <button class="w-full btn-primary text-sm py-2">Transferir Chat</button>
          <button class="w-full glass-card mt-2 text-sm py-2 hover:text-red-400">Encerrar Conversa</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { 
  Search, 
  Phone, 
  MoreVertical, 
  Paperclip, 
  Send, 
  Mic
} from 'lucide-vue-next';
</script>
