import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../api';

export const useAuthStore = defineStore('auth', () => {
    const user = ref<any>(null);
    const token = ref(localStorage.getItem('access_token'));
    const isAuthenticated = computed(() => !!token.value);

    async function login(credentials: any) {
        try {
            const { data } = await api.post('/api/Identity/login', credentials);
            token.value = data.token;
            user.value = data.user;
            localStorage.setItem('access_token', data.token);
            return data;
        } catch (error) {
            console.error('Login failed', error);
            throw error;
        }
    }

    function logout() {
        user.value = null;
        token.value = null;
        localStorage.removeItem('access_token');
        window.location.href = '/login';
    }

    return {
        user,
        token,
        isAuthenticated,
        login,
        logout,
    };
});
