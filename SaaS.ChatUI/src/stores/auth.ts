import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../api';

export const useAuthStore = defineStore('auth', () => {
    const user = ref<any>(null);
    const token = ref(localStorage.getItem('access_token'));
    const isAuthenticated = computed(() => !!token.value);

    async function login(credentials: any) {
        try {
            const formData = new URLSearchParams();
            formData.append('username', credentials.email);
            formData.append('password', credentials.password);

            const { data } = await api.post('/auth/login', formData, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            token.value = data.access_token;
            localStorage.setItem('access_token', data.access_token);

            // Busca dados do usuário após login
            const userRes = await api.get('/auth/me');
            user.value = userRes.data;

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
