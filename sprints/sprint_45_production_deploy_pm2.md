# Sprint 45: Deploy Final em Produção via PM2 / Nginx Reverse Proxy

**Tema**: Go-Live.
**Objetivo**: O pico final. Migrar os processos .NET para Python na VPS definitivamente.

## 📋 Checklist de Migração

### 1. Configuração Nginx
- [ ] Atualizar o proxy reverso para apontar das portas antigas para as novas APIs Python
- [ ] Configurar SSL (Certbot) se necessário

### 2. PM2 Production Config
- [ ] Migrar as definições do `ecosystem.config.js` .NET para Python (usando `interpreter: python3`)
- [ ] Configurar logs persistentes e monitoramento proativo via PM2 Plus ou Web Monit

### 3. Desativação .NET
- [ ] Encerrar processos .NET antigos (`pm2 delete all` e `docker stop ...`)
- [ ] Validar que o sistema está 100% Python/FastAPI backend

**Status**: [ ] Pendente | [ ] Em Progresso | [ ] Concluído
