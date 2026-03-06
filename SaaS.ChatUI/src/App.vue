<template>
  <RouterView />
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useAuthStore } from './stores/auth';

const auth = useAuthStore();

onMounted(() => {
  // Logic to validate token or fetch user data on mount
});
</script>

<style>
/* Global transitions or fonts if needed */
</style>
