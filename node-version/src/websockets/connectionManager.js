const { WebSocketServer, WebSocket } = require('ws');
const redisService = require('../config/redis');
const logger = require('../utils/logger');
const url = require('url');

/**
 * Gerenciador de Conexões WebSockets (Substitui ws.py)
 * Usando pacote 'ws' nativo para garantir compatibilidade 100% 
 * com os clientes que conectam via wss://.../api/v1/ws/
 */
class ConnectionManager {
  constructor() {
    this.wss = null;
    // Estrutura: { "TENANT_A": { "user_1": [ws, ws] } }
    this.activeConnections = {};
    // Cache de IDs de mensagens entregues para evitar duplicidade no frontend: { "message_id": timestamp }
    this.deliveredMessageIds = new Map();
  }

  init(server) {
    this.wss = new WebSocketServer({ noServer: true });

    // Intercepta a tentativa de Upgrade de HTTP para WS
    server.on('upgrade', (request, socket, head) => {
      const pathname = url.parse(request.url).pathname;
      
      // O front-end antigo/app externo espera essa rota exata
      if (pathname === '/api/v1/ws/') {
        this.wss.handleUpgrade(request, socket, head, (ws) => {
          this.wss.emit('connection', ws, request);
        });
      } else {
        // Se a rota não for /api/v1/ws/, ignora ou destroi
        socket.destroy();
      }
    });

    this.wss.on('connection', (ws, request) => {
      const parsedUrl = url.parse(request.url, true);
      const token = parsedUrl.query.token;

      if (!token) {
        logger.warn(`[WS] Conexão rejeitada: token ausente`);
        ws.close(1008, 'Missing token');
        return;
      }

      let tenantId, userId;
      try {
        const SECRET_KEY = process.env.SECRET_KEY || '09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7';
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, SECRET_KEY);
        tenantId = decoded.tenant_id?.toUpperCase();
        userId = decoded.sub; // O sub do JWT guarda o ID do usuário
      } catch (err) {
        logger.warn(`[WS] Conexão rejeitada: token inválido (${err.message})`);
        ws.close(1008, 'Invalid token');
        return;
      }

      if (!tenantId || !userId) {
        logger.warn(`[WS] Conexão rejeitada: tenant_id ou user_id ausentes no payload do token`);
        ws.close(1008, 'Invalid token payload');
        return;
      }

      // Hack para dar "id" pro socket (facilita o tracking interno)
      ws.id = `${tenantId}-${userId}-${Date.now()}`;

      this.connect(tenantId, userId, ws);

      ws.on('close', () => {
        this.disconnect(tenantId, userId, ws);
      });
      
      ws.on('error', (err) => {
        logger.warn(`[WS] Socket Error: ${err.message}`);
      });
    });
    
    logger.info('🔌 Native WebSocket (ws) ConnectionManager inicializado em /api/v1/ws/');
  }

  async connect(tenantId, userId, ws) {
    if (!this.activeConnections[tenantId]) {
      this.activeConnections[tenantId] = {};
    }
    if (!this.activeConnections[tenantId][userId]) {
      this.activeConnections[tenantId][userId] = [];
    }
    
    this.activeConnections[tenantId][userId].push(ws);
    
    try {
      await redisService.set(`presence:${tenantId}:${userId}`, 'online', 3600);
    } catch (e) {
      logger.warn(`[WS] Redis indisponível para atualizar presença: ${e.message}`);
    }

    logger.info(`[WS] 🟢 Conectado | tenant='${tenantId}' | user='${userId}'`);
  }

  async disconnect(tenantId, userId, ws) {
    try {
      const userSockets = this.activeConnections[tenantId]?.[userId];
      if (userSockets) {
        this.activeConnections[tenantId][userId] = userSockets.filter(s => s.id !== ws.id);
        
        if (this.activeConnections[tenantId][userId].length === 0) {
          delete this.activeConnections[tenantId][userId];
          try {
            await redisService.delete(`presence:${tenantId}:${userId}`);
          } catch (e) {}
        }
      }
      
      if (Object.keys(this.activeConnections[tenantId] || {}).length === 0) {
        delete this.activeConnections[tenantId];
      }
      
      logger.info(`[WS] 🔴 Desconectado | tenant='${tenantId}' | user='${userId}'`);
    } catch (e) {
      logger.warn(`[WS] Erro na desconexão: ${e.message}`);
    }
  }

  /**
   * Helper para evitar a entrega duplicada de mensagens no WebSocket (Deduplicação Híbrida: ID e Semântica)
   * Garante exatamente-uma-entrega mesmo se os canais (Baileys nativo vs Webhook de ponte externa) usarem IDs e formatos diferentes.
   */
  isDuplicateMessage(message) {
    if (!message || !message.method || !message.params) return false;
    
    const isMessageEvent = message.method === 'new_message' || message.method === 'receive_message';
    if (!isMessageEvent) return false;

    const params = message.params;
    const messageId = params.message_id || params.id;
    
    // Extrai telefone, conteúdo e origem de forma ultra-tolerante
    const phone = params.contact_phone || params.phone || params.conversation_id || (params.contact && (params.contact.phone || params.contact.phone_number));
    const content = params.content || '';
    const source = params.source || (params.from_me ? 'agent' : 'user');
    
    const now = Date.now();
    
    // Limpeza de chaves expiradas para evitar vazamento de memória (4s para assinaturas, 15s para IDs de mensagens)
    for (const [key, timestamp] of this.deliveredMessageIds.entries()) {
      const isSignature = key.startsWith('sig:');
      const maxAge = isSignature ? 4000 : 15000;
      if (now - timestamp > maxAge) {
        this.deliveredMessageIds.delete(key);
      }
    }

    // 1. Deduplicação por ID de Mensagem legítimo
    if (messageId && !String(messageId).includes('Date') && !String(messageId).match(/^\d+$/)) {
      const idKey = `id:${messageId}`;
      if (this.deliveredMessageIds.has(idKey)) {
        logger.info(`[WS] 🛡️ Mensagem duplicada descartada por ID (ID: ${messageId})`);
        return true;
      }
      this.deliveredMessageIds.set(idKey, now);
    }

    // 2. Deduplicação Semântica (Telefone + Conteúdo + Origem) para barrar Webhooks e pontes concorrentes
    if (phone && content) {
      const cleanPhone = String(phone).replace(/\D/g, '');
      const signature = `sig:${cleanPhone}:${content}:${source}`;

      if (this.deliveredMessageIds.has(signature)) {
        logger.info(`[WS] 🛡️ Mensagem duplicada descartada por Assinatura Semântica (Telefone: ${cleanPhone}, Conteúdo: "${content.substring(0, 20)}")`);
        return true;
      }
      this.deliveredMessageIds.set(signature, now);
    }

    return false;
  }

  async sendPersonalMessage(tenantId, userId, message) {
    if (this.isDuplicateMessage(message)) return;

    const userSockets = this.activeConnections[tenantId]?.[userId];
    if (userSockets && userSockets.length > 0) {
      const msgStr = JSON.stringify(message);
      for (const ws of userSockets) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(msgStr);
        }
      }
    }
  }

  async broadcastToTenant(tenantId, message) {
    tenantId = tenantId.toUpperCase();
    if (this.isDuplicateMessage(message)) return 0;
    
    const tenantSockets = this.activeConnections[tenantId];
    if (!tenantSockets) {
      logger.debug(`[WS] broadcast ignorado (nenhum usuário online) | tenant='${tenantId}'`);
      return 0;
    }

    const msgStr = JSON.stringify(message);
    let count = 0;
    
    for (const userId of Object.keys(tenantSockets)) {
      for (const ws of tenantSockets[userId]) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(msgStr);
        }
      }
      count++;
    }

    logger.debug(`[WS] broadcast | tenant='${tenantId}' | method='${message.method}'`);
    return count;
  }

  async publishEvent(tenantId, payload, userId = null) {
    tenantId = tenantId.toUpperCase();

    // ── NORMALIZAÇÃO DE CONTRATO (Garantir Telefone em Mensagens) ────────────
    if (payload.method === 'new_message' || payload.method === 'receive_message') {
      const params = payload.params || {};
      // Garante que o telefone esteja presente tanto como 'contact_phone' quanto 'phone'
      const phone = params.contact_phone || params.phone || params.conversation_id;
      if (phone) {
        payload.params.contact_phone = phone;
        payload.params.phone = phone;
      } else {
        logger.warn(`[WS] ⚠️ Tentativa de enviar mensagem sem telefone para o front-end (tenant: ${tenantId})`);
      }
    }

    // Normalização legado para payloads simples que vêm como { type: '...', ... }
    if (payload.type && !payload.method) {
      const evtType = payload.type;
      delete payload.type;
      if (evtType === 'bot_status_update') {
        payload = { method: 'bot_system_event', params: { event: payload.status, battery: '100%', session: payload.session } };
      } else if (evtType === 'bot_qrcode_update') {
        payload = { method: 'update_bot_qr', params: { qrcode: payload.qrcode, session: payload.session } };
      } else {
        payload = { method: evtType, params: payload };
      }
    }

    if (userId) {
      await this.sendPersonalMessage(tenantId, userId, payload);
    } else {
      await this.broadcastToTenant(tenantId, payload);
    }
  }
}

const connectionManager = new ConnectionManager();
module.exports = connectionManager;
