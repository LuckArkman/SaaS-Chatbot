<template>
  <div class="space-y-8">
    <div class="flex justify-between items-center">
      <div>
        <h2 class="text-3xl font-bold">Visão Geral</h2>
        <p class="text-slate-400">Resumo da sua operação nos últimos 30 dias.</p>
      </div>
      <div class="flex gap-4">
        <button class="glass-card px-4 py-2 hover:bg-slate-800 transition-colors flex items-center gap-2">
          <Calendar class="w-4 h-4" />
          Últimos 30 dias
        </button>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div v-for="stat in stats" :key="stat.name" class="glass-card p-6 space-y-4">
        <div class="flex items-center justify-between">
          <div :class="`p-2 rounded-lg ${stat.color}`">
            <component :is="stat.icon" class="w-5 h-5 text-white" />
          </div>
          <span class="text-xs font-semibold text-emerald-400">+{{ stat.trend }}%</span>
        </div>
        <div>
          <p class="text-slate-400 text-sm">{{ stat.name }}</p>
          <p class="text-2xl font-bold">{{ stat.value }}</p>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Recent Activity -->
      <div class="lg:col-span-2 glass-card p-6">
        <div class="flex justify-between items-center mb-6">
          <h3 class="font-bold text-lg">Atividade Recente</h3>
          <button class="text-primary-500 text-sm font-medium hover:underline">Ver tudo</button>
        </div>
        <div class="space-y-4">
          <div v-for="n in 5" :key="n" class="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-900 transition-colors border border-transparent hover:border-slate-800">
            <div class="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
              <User class="w-5 h-5 text-slate-400" />
            </div>
            <div class="flex-1">
              <p class="font-medium text-sm">Cliente #{{ 1024 + n }}</p>
              <p class="text-xs text-slate-500">Iniciou conversa via WhatsApp</p>
            </div>
            <div class="text-right">
              <p class="text-xs text-slate-500">há {{ n * 2 }} min</p>
              <span class="text-[10px] uppercase font-bold text-primary-500">Novo</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="glass-card p-6 flex flex-col">
        <h3 class="font-bold text-lg mb-6">Ações Rápidas</h3>
        <div class="space-y-3 flex-1">
          <button class="w-full glass-card border-dashed hover:border-primary-500 hover:text-primary-500 p-4 transition-all flex flex-col items-center gap-2">
            <PlusCircle class="w-6 h-6" />
            <span class="text-sm font-medium">Conectar WhatsApp</span>
          </button>
          <button class="w-full glass-card border-dashed hover:border-purple-500 hover:text-purple-500 p-4 transition-all flex flex-col items-center gap-2">
            <Workflow class="w-6 h-6" />
            <span class="text-sm font-medium">Criar Nova Automação</span>
          </button>
        </div>
        <div class="mt-6 p-4 bg-primary-600/10 rounded-lg border border-primary-600/20">
          <p class="text-xs text-primary-300">Seu plano **Business** expira em 12 dias. Faça o upgrade agora para garantir funcionalidades premium.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { 
import {
  MessageSquare,
  Users,
  Workflow,
  Clock,
  Calendar,
  PlusCircle,
  User
} from 'lucide-vue-next';

const stats = [
  { name: 'Total de Conversas', value: '12,482', icon: MessageSquare, color: 'bg-blue-500', trend: 12 },
  { name: 'Contatos Únicos', value: '4,103', icon: Users, color: 'bg-purple-500', trend: 8 },
  { name: 'Automações Ativas', value: '18', icon: Workflow, color: 'bg-emerald-500', trend: 24 },
  { name: 'Tempo Médio Resposta', value: '1m 24s', icon: Clock, color: 'bg-orange-500', trend: 15 },
];
</script>
