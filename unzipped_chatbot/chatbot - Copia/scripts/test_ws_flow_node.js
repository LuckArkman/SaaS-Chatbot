/**
 * Teste do fluxo Webhook → API SaaS → WebSocket (JSON-RPC receive_message).
 *
 * Alinhado com:
 * - docs/API_SAAS_CHATBOT_REFERENCIA_COMPLETA.md (gateway/webhook/{channel})
 * - OmniChannelApiClient (login form-urlencoded, gateway payload)
 * - GatewayWebhookController::buildDefaultWebhookJson (corpo do webhook)
 *
 * Uso: node scripts/test_ws_flow_node.js
 *
 * Porta: Swagger pode mostrar 8000; API_BASE_URL no painel costuma ser 8001 — ajuste API_PORT.
 *
 * QR Code: fluxo real WhatsApp = POST /api/v1/bot/start + GET /api/v1/bot/qr (pareamento).
 * Este script simula mensagem entrante sem QR via POST /gateway/webhook/whatsapp.
 */

const axios = require('axios');
const WebSocket = require('ws');

const API_HOST = process.env.API_HOST || 'localhost';
const API_PORT = process.env.API_PORT || '8001';
const BASE_URL = `http://${API_HOST}:${API_PORT}/api/v1`;

const testUser = {
  fullName: 'WS Flow Test User',
  full_name: 'WS Flow Test User',
  email: `ws_flow_${Date.now()}@example.com`,
  password: 'Password123!',
  tenantName: `Tenant WS ${Date.now()}`,
  tenant_name: `Tenant WS ${Date.now()}`,
};

let authToken = '';
let tenantId = '';

/** Cabeçalhos iguais ao cliente PHP (Bearer + X-Tenant-ID). */
function saasHeaders() {
  const h = { Authorization: `Bearer ${authToken}` };
  if (tenantId !== '') {
    h['X-Tenant-ID'] = String(tenantId);
  }
  return h;
}

function extractTenantId(obj) {
  if (!obj || typeof obj !== 'object') return '';
  if (obj.tenant_id != null) return String(obj.tenant_id);
  if (obj.tenantId != null) return String(obj.tenantId);
  const t = obj.tenant;
  if (t && typeof t === 'object') {
    if (t.id != null) return String(t.id);
    if (t.tenant_id != null) return String(t.tenant_id);
    if (t.tenantId != null) return String(t.tenantId);
  }
  return '';
}

/** Corpo inspirado em GatewayWebhookController (event + data + tenant_id). */
function buildGatewayWebhookBody(text) {
  const phoneDigits = '5511999999999';
  const body = {
    event: 'messages.upsert',
    data: {
      from: phoneDigits,
      text,
      timestamp: Math.round(Date.now()),
    },
  };
  if (tenantId !== '') {
    body.tenant_id = /^\d+$/.test(String(tenantId)) ? Number(tenantId) : tenantId;
  }
  return body;
}

function contentFromReceiveMessage(parsed) {
  const p = parsed && parsed.params;
  if (!p || typeof p !== 'object') return '';
  const c = p.content;
  return typeof c === 'string' ? c : c != null ? String(c) : '';
}

async function runWebSocketFlowTest() {
  console.log('Iniciando teste do fluxo Webhook → WS (frontend)...\n');
  console.log(`BASE_URL=${BASE_URL}\n`);

  try {
    // 1) Registar (mesmo payload que OmniChannelApiClient::authRegister)
    const registerRes = await axios.post(`${BASE_URL}/auth/register`, {
      email: testUser.email,
      password: testUser.password,
      fullName: testUser.fullName,
      tenantName: testUser.tenantName,
      full_name: testUser.full_name,
      tenant_name: testUser.tenant_name,
    });

    tenantId =
      extractTenantId(registerRes.data) ||
      extractTenantId(registerRes.data?.user) ||
      '';

    // Login: OAuth2-style — application/x-www-form-urlencoded, username + password
    const loginParams = new URLSearchParams();
    loginParams.append('username', testUser.email);
    loginParams.append('password', testUser.password);

    const loginRes = await axios.post(`${BASE_URL}/auth/login`, loginParams.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    authToken =
      loginRes.data.access_token ||
      loginRes.data.accessToken ||
      loginRes.data.token ||
      '';

    if (!authToken) {
      throw new Error('Login não devolveu access_token');
    }

    tenantId =
      tenantId ||
      extractTenantId(loginRes.data) ||
      '';

    if (!tenantId) {
      const meRes = await axios.get(`${BASE_URL}/auth/me`, { headers: saasHeaders() });
      tenantId = extractTenantId(meRes.data);
    }

    console.log('Usuario registado e autenticado. tenant_id:', tenantId || '(omitido — depende da API)');

    // 2) WebSocket: sem barra antes de ?token= (modelo em SaaSEndpointHints / test_rpc_ws.py)
    const wsPath = `/api/v1/ws?token=${encodeURIComponent(authToken)}`;
    const wsUrl = `ws://${API_HOST}:${API_PORT}${wsPath}`;
    console.log('\n[2] Ligacao WebSocket:', wsUrl.replace(authToken, '<TOKEN>'));

    const wsClient = new WebSocket(wsUrl);

    await new Promise((resolve, reject) => {
      wsClient.on('open', () => {
        console.log('WebSocket aberto.');
        resolve();
      });
      wsClient.on('error', reject);
    });

    let messageReceived = false;
    const expectedText = 'Mensagem Auditada com Sucesso!';

    wsClient.on('message', (data) => {
      let parsed;
      try {
        parsed = JSON.parse(data.toString());
      } catch {
        console.log('[FRONTEND] evento nao-JSON:', data.toString().slice(0, 200));
        return;
      }
      console.log('[FRONTEND] evento:', JSON.stringify(parsed, null, 2));

      if (parsed.method === 'receive_message') {
        const content = contentFromReceiveMessage(parsed);
        if (content === expectedText) {
          messageReceived = true;
        }
      }
    });

    // 3) Gateway: POST /api/v1/gateway/webhook/whatsapp (nao existe /gateway/whatsapp)
    console.log('\n[3] POST gateway/webhook/whatsapp (simula webhook Evolution-style)...');
    const gwRes = await axios.post(
      `${BASE_URL}/gateway/webhook/whatsapp`,
      buildGatewayWebhookBody(expectedText),
      { headers: { ...saasHeaders(), 'Content-Type': 'application/json' } }
    );
    console.log('Resposta gateway HTTP', gwRes.status, gwRes.data);

    console.log('\nAguardando receive_message no WS (max 5s)...');
    for (let i = 0; i < 50; i++) {
      if (messageReceived) break;
      await new Promise((r) => setTimeout(r, 100));
    }

    if (messageReceived) {
      console.log('\nSUCESSO: fluxo Webhook -> API -> WS funciona para o texto esperado.');
    } else {
      console.error('\nFALHA: receive_message nao chegou ou content diferente.');
      console.error('Dicas: confirme API_PORT; bot precisa estar aceite para alguns backends; veja logs da SaaS.');
    }

    wsClient.close();
  } catch (error) {
    const err = error.response ? error.response.data : error.message;
    console.error('\nERRO:', err);
    process.exitCode = 1;
  }
}

runWebSocketFlowTest();
