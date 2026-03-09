<template>
  <div class="h-screen -m-8 flex flex-col bg-slate-950 overflow-hidden">
    <!-- Toolbar -->
    <div class="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/50 backdrop-blur-md z-10">
      <div class="flex items-center gap-4">
        <button @click="$router.back()" class="p-2 hover:bg-slate-800 rounded-lg transition-colors">
          <ArrowLeft class="w-5 h-5" />
        </button>
        <div>
          <h2 class="font-bold">Agente de Boas-vindas</h2>
          <p class="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Flowbuilder v2.0</p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2 mr-4 text-xs text-slate-400">
          <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          Salvamento Automático Ativo
        </div>
        <button class="px-4 py-2 border border-slate-700 hover:bg-slate-800 rounded-lg text-sm font-medium transition-all">
          Testar Fluxo
        </button>
        <button class="btn-primary flex items-center gap-2">
          <Save class="w-4 h-4" />
          Publicar
        </button>
      </div>
    </div>

    <div class="flex-1 relative flex">
      <!-- Nodes Palette -->
      <aside class="w-64 border-r border-slate-800 p-6 space-y-6 bg-slate-950 z-10 overflow-y-auto">
        <div>
          <h3 class="text-xs font-bold text-slate-500 uppercase mb-4">Ações do Sistema</h3>
          <div class="space-y-2">
            <div draggable="true" @dragstart="onDragStart($event, 'message')" class="flex items-center gap-3 p-3 bg-slate-900 border border-slate-800 rounded-lg hover:border-primary-500 cursor-grab active:cursor-grabbing group">
              <MessageSquare class="w-5 h-5 text-blue-500" />
              <span class="text-sm font-medium">Mensagem</span>
            </div>
            <div draggable="true" @dragstart="onDragStart($event, 'ai')" class="flex items-center gap-3 p-3 bg-slate-900 border border-slate-800 rounded-lg hover:border-purple-500 cursor-grab active:cursor-grabbing group">
              <Bot class="w-5 h-5 text-purple-500" />
              <span class="text-sm font-medium">Cérebro IA</span>
            </div>
            <div draggable="true" @dragstart="onDragStart($event, 'handover')" class="flex items-center gap-3 p-3 bg-slate-900 border border-slate-800 rounded-lg hover:border-orange-500 cursor-grab active:cursor-grabbing group">
              <UserCheck class="w-5 h-5 text-orange-500" />
              <span class="text-sm font-medium">Transbordo</span>
            </div>
          </div>
        </div>

        <div>
          <h3 class="text-xs font-bold text-slate-500 uppercase mb-4">Lógica</h3>
          <div class="space-y-2">
            <div draggable="true" @dragstart="onDragStart($event, 'condition')" class="flex items-center gap-3 p-3 bg-slate-900 border border-slate-800 rounded-lg hover:border-emerald-500 cursor-grab active:cursor-grabbing group">
              <GitFork class="w-5 h-5 text-emerald-500" />
              <span class="text-sm font-medium">Condição</span>
            </div>
            <div draggable="true" @dragstart="onDragStart($event, 'wait')" class="flex items-center gap-3 p-3 bg-slate-900 border border-slate-800 rounded-lg hover:border-yellow-500 cursor-grab active:cursor-grabbing group">
              <Clock class="w-5 h-5 text-yellow-500" />
              <span class="text-sm font-medium">Espera</span>
            </div>
          </div>
        </div>
      </aside>

      <!-- Flow Canvas -->
      <div class="flex-1 bg-slate-950" @drop="onDrop" @dragover.prevent>
        <VueFlow
          v-model="elements"
          @connect="onConnect"
          :default-edge-options="{ type: 'smoothstep', animated: true, style: { stroke: '#38bdf8' } }"
          fit-view-on-init
        >
          <Background pattern-color="#1e293b" :gap="20" />
          <Controls />
        </VueFlow>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { VueFlow, useVueFlow } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import {
  ArrowLeft,
  Save,
  MessageSquare,
  Bot,
  Briefcase,
  Users
} from 'lucide-vue-next';

const { project } = useVueFlow();

const elements = ref<any[]>([
  {
    id: 'start',
    type: 'input',
    label: 'Início do Fluxo',
    position: { x: 250, y: 50 },
    style: { background: '#0ea5e9', color: 'white', borderRadius: '8px', border: 'none', padding: '10px' }
  }
]);

const onConnect = (params: any) => {
  elements.value.push(params);
};

const onDragStart = (event: DragEvent, nodeType: string) => {
  if (event.dataTransfer) {
    event.dataTransfer.setData('application/vueflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  }
};

const onDrop = (event: DragEvent) => {
  const type = event.dataTransfer?.getData('application/vueflow');
  if (!type) return;

  const position = project({ x: event.clientX - 300, y: event.clientY - 100 });
  
  const newNode = {
    id: `node_${Date.now()}`,
    type,
    label: type.charAt(0).toUpperCase() + type.slice(1),
    position,
    style: { background: '#1e293b', color: 'white', border: '1px solid #334155', borderRadius: '8px', padding: '10px' }
  };

  elements.value.push(newNode);
};
</script>

<style>
/* Vue Flow dark theme overrides */
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';

.vue-flow__node {
  @apply shadow-2xl;
}

.vue-flow__edge-path {
  stroke-width: 2;
}

.vue-flow__controls {
  @apply bg-slate-900 border border-slate-800 rounded-lg overflow-hidden !important;
}

.vue-flow__controls-button {
  @apply border-slate-800 bg-slate-950 fill-white !important;
}

.vue-flow__controls-button:hover {
  @apply bg-slate-800 !important;
}
</style>
