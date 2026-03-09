<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div>
        <h2 class="text-3xl font-bold">Gestão de Tenants</h2>
        <p class="text-slate-400">Gerencie todos os clientes e revendas da plataforma.</p>
      </div>
      <button class="btn-primary flex items-center gap-2">
        <Plus class="w-5 h-5" />
        Novo Tenant
      </button>
    </div>

    <div class="glass-card overflow-hidden">
      <table class="w-full text-left">
        <thead class="bg-slate-900/50 border-b border-slate-800">
          <tr>
            <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Empresa</th>
            <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Plano</th>
            <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
            <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Consumo</th>
            <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Ações</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-800">
          <tr v-for="tenant in tenants" :key="tenant.id" class="hover:bg-slate-900/40 transition-colors group">
            <td class="px-6 py-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-primary-500">
                  {{ tenant.name.charAt(0) }}
                </div>
                <div>
                  <p class="font-bold text-sm">{{ tenant.name }}</p>
                  <p class="text-xs text-slate-500">{{ tenant.slug }}</p>
                </div>
              </div>
            </td>
            <td class="px-6 py-4">
              <span class="px-2 py-1 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                {{ tenant.plan }}
              </span>
            </td>
            <td class="px-6 py-4">
              <span 
                class="flex items-center gap-1.5 text-xs font-medium"
                :class="tenant.status === 'Ativo' ? 'text-emerald-500' : 'text-red-500'"
              >
                <div :class="`w-1.5 h-1.5 rounded-full ${tenant.status === 'Ativo' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`"></div>
                {{ tenant.status }}
              </span>
            </td>
            <td class="px-6 py-4">
              <div class="w-32 py-1">
                <div class="flex justify-between text-[10px] mb-1">
                  <span class="text-slate-500">Mensagens</span>
                  <span class="text-slate-300">{{ tenant.usage }}%</span>
                </div>
                <div class="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    class="h-full bg-primary-600 rounded-full" 
                    :style="{ width: tenant.usage + '%' }"
                  ></div>
                </div>
              </div>
            </td>
            <td class="px-6 py-4">
              <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button class="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white">
                  <Edit3 class="w-4 h-4" />
                </button>
                <button class="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-red-400">
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Plus, Edit3, Trash2 } from 'lucide-vue-next';

const tenants = [
  { id: 1, name: 'Tech Solutions', slug: 'tech-solutions', plan: 'Enterprise', status: 'Ativo', usage: 78 },
  { id: 2, name: 'Marketing Pro', slug: 'mkt-pro', plan: 'Business', status: 'Ativo', usage: 45 },
  { id: 3, name: 'Store Master', slug: 'store-master', plan: 'Lite', status: 'Inativo', usage: 0 },
  { id: 4, name: 'Global Health', slug: 'global-health', plan: 'Enterprise', status: 'Ativo', usage: 92 },
];
</script>
