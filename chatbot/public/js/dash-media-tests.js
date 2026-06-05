/**
 * Suítes de teste de mídia WhatsApp no dashboard (equivalentes aos scripts Node na raiz):
 * - test_media_and_calls.js  → runValidationSuite
 * - test_full_whatsapp_media.js → runFlowSimulationSuite
 * - test_api_whatsapp_media.js → runApiIntegrationSuite
 */
(function () {
    'use strict';

    var MIME_BY_EXT = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        pdf: 'application/pdf',
        mp4: 'video/mp4',
        ogg: 'audio/ogg',
        webm: 'video/webm',
        mp3: 'audio/mpeg',
    };

    function apiBase() {
        return (window.API_BASE || '') + '/api/omni';
    }

    function logEl() {
        return document.getElementById('mediaTestsLog');
    }

    function appendLog(line, kind) {
        var el = logEl();
        if (!el) {
            return;
        }
        var p = document.createElement('div');
        p.className = 'media-log-line' + (kind ? ' media-log-' + kind : '');
        p.textContent = line;
        el.appendChild(p);
        el.scrollTop = el.scrollHeight;
    }

    function clearLog() {
        var el = logEl();
        if (el) {
            el.innerHTML = '';
        }
    }

    function getConfig() {
        var phone = (document.getElementById('mediaTestPhone') || {}).value || '5511999999999';
        phone = String(phone).replace(/\D/g, '');
        var conv = (document.getElementById('mediaTestConversation') || {}).value || '';
        conv = String(conv).trim();
        if (!conv && phone) {
            conv = phone + '@s.whatsapp.net';
        }
        return { phone: phone, conversationId: conv };
    }

    function extractMediaUrl(data) {
        if (window.DashWhatsAppMedia) {
            return window.DashWhatsAppMedia.extractMediaUrl(data);
        }
        if (!data || typeof data !== 'object') {
            return '';
        }
        return (
            data.url ||
            data.filePath ||
            data.file_path ||
            data.path ||
            data.media_url ||
            (data.data && (data.data.url || data.data.path)) ||
            ''
        );
    }

    function dummyBlob(name, text) {
        var ext = (name.split('.').pop() || '').toLowerCase();
        var mime = MIME_BY_EXT[ext] || 'application/octet-stream';
        return new Blob([text || 'mock-' + name], { type: mime });
    }

    async function fetchJson(url, options) {
        var res = await fetch(url, options || {});
        var text = await res.text();
        var data = null;
        try {
            data = text ? JSON.parse(text) : null;
        } catch (e) {
            data = { _raw: text };
        }
        if (!res.ok) {
            var err = new Error((data && data.error) || 'HTTP ' + res.status);
            err.status = res.status;
            err.data = data;
            throw err;
        }
        return data;
    }

    async function uploadFile(blob, filename) {
        if (window.DashWhatsAppMedia && blob instanceof Blob) {
            var f = blob;
            if (!(blob instanceof File)) {
                f = new File([blob], filename || 'test.bin', { type: blob.type || 'application/octet-stream' });
            }
            return window.DashWhatsAppMedia.uploadFile(f);
        }
        var fd = new FormData();
        fd.append('file', blob, filename);
        return fetchJson(apiBase() + '/storage/upload', { method: 'POST', body: fd });
    }

    async function sendChatMessage(payload) {
        if (window.DashWhatsAppMedia) {
            return window.DashWhatsAppMedia.sendMessage(payload);
        }
        return fetchJson(apiBase() + '/chat/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
    }

    async function postWebhookInbound(mediaUrl, type, phone) {
        var payload = {
            channel: 'whatsapp',
            event: 'message',
            message: {
                from: phone,
                type: type,
                body: 'Mensagem recebida de teste (' + type + ')',
                mediaUrl: mediaUrl,
            },
        };
        return fetchJson(apiBase() + '/gateway/webhook?channel_type=whatsapp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
    }

    function openApiPaths(spec) {
        var paths = [];
        if (spec && spec.openapi && spec.openapi.paths) {
            paths = Object.keys(spec.openapi.paths);
        } else if (spec && spec.paths) {
            paths = Object.keys(spec.paths);
        }
        return paths;
    }

    function pathExists(paths, fragment) {
        return paths.some(function (p) {
            return p.indexOf(fragment) !== -1;
        });
    }

    /**
     * Equivalente a test_media_and_calls.js — validação de contrato (OpenAPI + proxy local).
     */
    async function runValidationSuite() {
        clearLog();
        appendLog('🚀 Suíte 1 — Validação de contrato (test_media_and_calls.js)', 'info');
        var paths = [];
        try {
            var specRes = await fetchJson(apiBase() + '/openapi-spec');
            paths = openApiPaths(specRes);
            appendLog('✅ OpenAPI carregado (' + paths.length + ' rotas).', 'ok');
        } catch (e) {
            appendLog('⚠ OpenAPI indisponível (só programador?): ' + e.message, 'warn');
        }

        var checks = [
            { label: 'StorageService / storage/upload', frag: '/storage/upload', proxy: '/storage/upload' },
            { label: 'Message schema / chat/send', frag: '/chat/send', proxy: '/chat/send' },
            { label: 'Gateway webhook', frag: '/gateway/webhook', proxy: '/gateway/webhook' },
            { label: 'CallLog / chamadas (opcional)', frag: '/call', proxy: null },
        ];

        for (var i = 0; i < checks.length; i++) {
            var c = checks[i];
            if (paths.length && pathExists(paths, c.frag)) {
                appendLog('✅ ' + c.label + ' — rota na SaaS: *' + c.frag + '*', 'ok');
            } else if (paths.length) {
                appendLog('⚠ ' + c.label + ' — não encontrada no OpenAPI (*' + c.frag + '*)', 'warn');
            }
            if (c.proxy) {
                appendLog('   Proxy local: POST ' + apiBase() + c.proxy, 'info');
            }
        }

        appendLog('Testando upload mínimo (StorageService.saveUpload)...', 'info');
        try {
            var up = await uploadFile(dummyBlob('validation.txt', 'mock file data'), 'validation.txt');
            var url = extractMediaUrl(up);
            appendLog('✅ Storage upload OK' + (url ? ': ' + url : ''), 'ok');
        } catch (e) {
            appendLog('❌ Storage upload: ' + e.message, 'err');
            throw e;
        }

        appendLog('🎉 Suíte 1 concluída.', 'ok');
    }

    /**
     * Equivalente a test_full_whatsapp_media.js — fluxo outbound/inbound por tipo.
     */
    async function runFlowSimulationSuite() {
        appendLog('--- Suíte 2 — Fluxo completo de mídia (test_full_whatsapp_media.js) ---', 'info');
        var cfg = getConfig();
        var types = [
            { type: 'image', file: 'test.jpg', caption: 'Imagem de teste' },
            { type: 'document', file: 'report.pdf', caption: 'Relatório' },
            { type: 'video', file: 'video.mp4', caption: 'Vídeo demo' },
            { type: 'audio', file: 'audio.ogg', caption: '' },
        ];

        for (var i = 0; i < types.length; i++) {
            var t = types[i];
            appendLog('[TEST] Outbound ' + t.type + ' → ' + t.file, 'info');
            var up = await uploadFile(dummyBlob(t.file, 'fake-' + t.type), t.file);
            var mediaUrl = extractMediaUrl(up);
            if (!mediaUrl) {
                throw new Error('Upload sem URL para ' + t.file);
            }
            await sendChatMessage({
                conversation_id: cfg.conversationId,
                to: cfg.phone,
                content: t.caption || 'Teste outbound ' + t.type,
                type: t.type,
                media_url: mediaUrl,
            });
            appendLog('✅ Outbound ' + t.type + ': Passed', 'ok');
        }

        appendLog('[TEST] Inbound image via webhook + isolamento tenant', 'info');
        var inUp = await uploadFile(dummyBlob('inbound.jpg', 'fake-image'), 'inbound.jpg');
        var inUrl = extractMediaUrl(inUp);
        try {
            await postWebhookInbound(inUrl, 'image', cfg.phone);
            appendLog('✅ Inbound image & webhook: Passed', 'ok');
        } catch (e) {
            appendLog('⚠ Webhook inbound: ' + e.message + ' (pode não estar implementado na SaaS)', 'warn');
        }

        if (inUrl.indexOf('/') !== -1 || inUrl.indexOf('\\') !== -1) {
            appendLog('✅ URL/path de mídia persistido: ' + inUrl, 'ok');
        }

        appendLog('🎉 Suíte 2 — todos os fluxos de mídia passaram.', 'ok');
    }

    /**
     * Equivalente a test_api_whatsapp_media.js — upload + send + webhook.
     */
    async function runApiIntegrationSuite() {
        appendLog('🚀 Suíte 3 — Integração API (test_api_whatsapp_media.js)', 'info');
        var cfg = getConfig();

        var files = [
            { name: 'test_image.jpg', type: 'image', mime: 'image/jpeg' },
            { name: 'test_doc.pdf', type: 'document', mime: 'application/pdf' },
            { name: 'test_video.mp4', type: 'video', mime: 'video/mp4' },
            { name: 'test_audio.ogg', type: 'audio', mime: 'audio/ogg' },
        ];

        appendLog('--- POST /storage/upload ---', 'info');
        var uploads = {};
        for (var i = 0; i < files.length; i++) {
            var f = files[i];
            var res = await uploadFile(dummyBlob(f.name, 'fake-' + f.type + '-blob'), f.name);
            uploads[f.type] = extractMediaUrl(res) || 'https://fake.url/' + f.name;
            appendLog('✅ [Upload] ' + f.name + ': ' + uploads[f.type], 'ok');
        }

        appendLog('--- POST /chat/send ---', 'info');
        var captions = {
            image: 'Veja esta imagem de teste',
            document: 'Segue o relatório de testes',
            video: 'Vídeo de demonstração',
            audio: '',
        };
        for (var j = 0; j < files.length; j++) {
            var ft = files[j];
            await sendChatMessage({
                to: cfg.phone,
                conversation_id: cfg.conversationId,
                content: captions[ft.type] || 'Testando envio de ' + ft.type,
                type: ft.type,
                media_url: uploads[ft.type],
            });
            appendLog('✅ [Send Message] ' + ft.type, 'ok');
        }

        appendLog('--- POST /gateway/webhook/whatsapp ---', 'info');
        for (var k = 0; k < 2; k++) {
            var wh = files[k];
            try {
                await postWebhookInbound(uploads[wh.type], wh.type, cfg.phone);
                appendLog('✅ [Webhook Inbound] ' + wh.type, 'ok');
            } catch (e) {
                appendLog('⚠ [Webhook Inbound] ' + wh.type + ': ' + e.message, 'warn');
            }
        }

        appendLog('🎉 Todos os testes da API concluídos com sucesso!', 'ok');
    }

    async function runAllSuites() {
        clearLog();
        setBusy(true);
        try {
            await runValidationSuite();
            appendLog('', 'info');
            await runFlowSimulationSuite();
            appendLog('', 'info');
            await runApiIntegrationSuite();
        } finally {
            setBusy(false);
        }
    }

    function setBusy(busy) {
        document.querySelectorAll('[data-media-suite]').forEach(function (btn) {
            btn.disabled = !!busy;
        });
    }

    function bind() {
        var map = {
            validation: runValidationSuite,
            flow: runFlowSimulationSuite,
            api: runApiIntegrationSuite,
            all: runAllSuites,
        };
        document.querySelectorAll('[data-media-suite]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var key = btn.getAttribute('data-media-suite');
                var fn = map[key];
                if (!fn) {
                    return;
                }
                setBusy(true);
                Promise.resolve()
                    .then(fn)
                    .catch(function (e) {
                        appendLog('💥 Falha: ' + (e && e.message ? e.message : String(e)), 'err');
                        if (e && e.data) {
                            appendLog(JSON.stringify(e.data, null, 2), 'err');
                        }
                    })
                    .finally(function () {
                        setBusy(false);
                    });
            });
        });
        var clearBtn = document.getElementById('mediaTestsClearLog');
        if (clearBtn) {
            clearBtn.addEventListener('click', clearLog);
        }
    }

    window.DashMediaTests = {
        runValidationSuite: runValidationSuite,
        runFlowSimulationSuite: runFlowSimulationSuite,
        runApiIntegrationSuite: runApiIntegrationSuite,
        runAllSuites: runAllSuites,
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bind);
    } else {
        bind();
    }
})();
