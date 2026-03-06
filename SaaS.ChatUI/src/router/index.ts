import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/login',
            name: 'login',
            component: () => import('../views/auth/Login.vue'),
            meta: { layout: 'auth' }
        },
        {
            path: '/',
            component: () => import('../layouts/DefaultLayout.vue'),
            children: [
                {
                    path: '',
                    name: 'dashboard',
                    component: () => import('../views/tenant/Dashboard.vue'),
                    meta: { requiresAuth: true }
                },
                {
                    path: 'tenants',
                    name: 'tenants',
                    component: () => import('../views/superadmin/Tenants.vue'),
                    meta: { requiresAuth: true, role: 'SuperAdmin' }
                },
                {
                    path: 'chat',
                    name: 'chat',
                    component: () => import('../views/chat/ChatHub.vue'),
                    meta: { requiresAuth: true }
                },
                {
                    path: 'agent-builder',
                    name: 'agent-builder',
                    component: () => import('../views/flowbuilder/Builder.vue'),
                    meta: { requiresAuth: true }
                }
            ]
        }
    ]
});

router.beforeEach((to, _from, next) => {
    const auth = useAuthStore();

    if (to.meta.requiresAuth && !auth.isAuthenticated) {
        next('/login');
    } else {
        next();
    }
});

export default router;
