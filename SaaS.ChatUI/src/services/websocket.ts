import { useAuthStore } from '../stores/auth';

class WebSocketService {
    private ws: WebSocket | null = null;
    private listeners: ((msg: any) => void)[] = [];

    connect() {
        const auth = useAuthStore();
        if (!auth.token) return;

        const wsUrl = import.meta.env.VITE_WS_URL || `ws://${window.location.host}/api/v1/ws`;
        this.ws = new WebSocket(`${wsUrl}?token=${auth.token}`);

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.listeners.forEach(callback => callback(data));
        };

        this.ws.onclose = () => {
            console.log('WebSocket disconnected. Retrying in 5s...');
            setTimeout(() => this.connect(), 5000);
        };
    }

    onMessage(callback: (msg: any) => void) {
        this.listeners.push(callback);
    }

    sendMessage(message: any) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }
}

export const wsService = new WebSocketService();
