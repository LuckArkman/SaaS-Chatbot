<template>
  <div class="space-y-8">
    <div class="flex justify-between items-center">
      <div>
        <h2 class="text-3xl font-bold">Instâncias WhatsApp</h2>
        <p class="text-slate-400">Gerencie suas conexões e status dos bots.</p>
      </div>
      <button @click="createInstance" class="btn-primary flex items-center gap-2">
        <PlusCircle class="w-5 h-5" />
        Nova Instância
      </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      <div v-for="bot in bots" :key="bot.id" class="glass-card p-6 space-y-6 relative overflow-hidden group">
        <!-- Status Indicator -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div :class="`w-3 h-3 rounded-full ${getStatusColor(bot.status)}`"></div>
            <span class="text-xs font-bold uppercase tracking-wider text-slate-300">{{ bot.status }}</span>
          </div>
          <button @click="deleteBot(bot.id)" class="text-slate-500 hover:text-red-400 transition-colors">
            <Trash2 class="w-4 h-4" />
          </button>
        </div>

        <div class="flex items-center gap-4">
          <div class="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center border border-slate-700">
            <Smartphone class="w-8 h-8 text-slate-500" />
          </div>
          <div>
            <p class="font-bold">{{ bot.session_name }}</p>
            <p class="text-sm text-slate-500">{{ bot.phone_number || 'Não conectado' }}</p>
          </div>
        </div>

        <!-- Connection Action -->
        <div v-if="bot.status === 'qrcode' || bot.status === 'disconnected'" class="pt-4 border-t border-slate-800">
             <button @click="showQR(bot)" class="w-full py-2 bg-emerald-600/10 text-emerald-400 border border-emerald-600/20 rounded-lg text-sm font-bold hover:bg-emerald-600/20 transition-all">
                Escanear QR Code
             </button>
        </div>
      </div>
    </div>

    <!-- QR Modal (Simplified) -->
    <div v-if="selectedBot" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div class="glass-card max-w-sm w-full p-8 text-center space-y-6">
            <h3 class="text-xl font-bold">Conectar WhatsApp</h3>
            <div class="bg-white p-4 rounded-xl mx-auto w-fit">
                <img :src="selectedBot.qrcode_base64" class="w-64 h-64" alt="QR Code" />
            </div>
            <p class="text-sm text-slate-400">Abra o WhatsApp no seu celular > Configurações > Dispositivos Conectados.</p>
            <button @click="selectedBot = null" class="w-full py-2 text-slate-400 hover:text-white">Fechar</button>
        </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import api from '../../api';
import { PlusCircle, Smartphone, Trash2 } from 'lucide-vue-next';

const bots = ref<any[]>([]);
const selectedBot = ref<any>(null);

async function fetchBots() {
    const { data } = await api.get('/bot/');
    bots.value = data;
}

async function createInstance() {
     const name = `Bot_${Math.floor(Math.random() * 1000)}`;
     await api.post('/bot/', { session_name: name });
     fetchBots();
}

function showQR(bot: any) {
    selectedBot.value = bot;
}

function getStatusColor(status: string) {
    switch(status) {
        case 'connected': return 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]';
        case 'qrcode': return 'bg-orange-500';
        default: return 'bg-slate-500';
    }
}

async function deleteBot(id: number) {
    if(confirm('Tem certeza?')) {
        await api.delete(`/bot/${id}`);
        fetchBots();
    }
}

onMounted(fetchBots);
</script>
