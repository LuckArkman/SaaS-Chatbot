/**
 * Liga DashWhatsAppMedia ao painel Conversas (/home).
 * Inclua este script após dash-whatsapp-media.js e o partial chat-composer-media.php no composer.
 */
(function () {
    'use strict';

    /**
     * Retorna o ID da conversa ativa sem auto-referência.
     * Lê exclusivamente window.UTALK_ACTIVE_CONVERSATION_ID (definido por selectConversation)
     * ou o input oculto #activeConversationId.
     */
    function getConversationId() {
        // Lê diretamente a variável global — sem chamar window.UTALK_GET_CONVERSATION_ID
        // para evitar recursão infinita (foi esse bug que impedia o envio de anexos).
        if (window.UTALK_ACTIVE_CONVERSATION_ID) {
            return String(window.UTALK_ACTIVE_CONVERSATION_ID);
        }
        var hidden = document.getElementById('activeConversationId');
        if (hidden && hidden.value) {
            return hidden.value;
        }
        var dataEl = document.querySelector('[data-active-conversation-id]');
        if (dataEl) {
            return dataEl.getAttribute('data-active-conversation-id') || dataEl.value || '';
        }
        return '';
    }

    function patchRenderMessageBubble() {
        if (!window.DashWhatsAppMedia || window.__UTALK_MEDIA_RENDER_PATCHED__) {
            return;
        }
        window.__UTALK_MEDIA_RENDER_PATCHED__ = true;

        var original = window.UTALK_RENDER_MESSAGE;
        window.UTALK_RENDER_MESSAGE = function (msg, isOutgoing) {
            if (window.DashWhatsAppMedia.isMediaMessage(msg)) {
                var wrap = document.createElement('div');
                wrap.className = 'chat-bubble' + (isOutgoing ? ' chat-bubble--out' : ' chat-bubble--in');
                wrap.innerHTML = window.DashWhatsAppMedia.renderMessageInner(msg);
                return wrap;
            }
            if (typeof original === 'function') {
                return original(msg, isOutgoing);
            }
            var fallback = document.createElement('div');
            fallback.className = 'chat-bubble' + (isOutgoing ? ' chat-bubble--out' : ' chat-bubble--in');
            fallback.textContent = msg.content || msg.text || msg.body || '';
            return fallback;
        };
    }

    function enhanceHistoryMessages(container) {
        if (!container || !window.DashWhatsAppMedia) {
            return;
        }
        container.querySelectorAll('[data-message-json]').forEach(function (el) {
            try {
                var msg = JSON.parse(el.getAttribute('data-message-json') || '{}');
                if (window.DashWhatsAppMedia.isMediaMessage(msg) && !el.hasAttribute('data-enhanced-media')) {
                    el.innerHTML = window.DashWhatsAppMedia.renderMessageInner(msg);
                    el.classList.add('chat-bubble--media');
                    el.setAttribute('data-enhanced-media', '1');
                }
            } catch (e) {}
        });
        container.querySelectorAll('.chat-bubble:not(.chat-bubble--media-enhanced)').forEach(function (bubble) {
            var url = bubble.getAttribute('data-media-url');
            if (url) {
                bubble.innerHTML = window.DashWhatsAppMedia.renderMessageInner({
                    media_url: url,
                    type: bubble.getAttribute('data-media-type') || 'image',
                    content: bubble.textContent,
                });
                bubble.classList.add('chat-bubble--media-enhanced');
            }
        });
    }

    function bind() {
        if (!window.DashWhatsAppMedia) {
            return;
        }
        var composer = document.querySelector('[data-utalk-chat-composer]');
        if (!composer && !document.getElementById('utalkChatFile')) {
            return;
        }

        // Expõe getConversationId globalmente para uso externo,
        // mas NÃO lemos window.UTALK_GET_CONVERSATION_ID dentro de getConversationId
        // para evitar recursão infinita.
        window.UTALK_GET_CONVERSATION_ID = getConversationId;

        DashWhatsAppMedia.attachToComposer({
            getConversationId: getConversationId,
            inputEl: document.querySelector('[data-utalk-chat-input]') || document.getElementById('chatMessageInput'),
            onSent: function () {
                if (typeof window.UTALK_RELOAD_CHAT_HISTORY === 'function') {
                    window.UTALK_RELOAD_CHAT_HISTORY();
                }
                var list = document.querySelector('[data-utalk-chat-messages]') || document.getElementById('chatMessages');
                if (list) {
                    enhanceHistoryMessages(list);
                }
            },
            onError: function (err) {
                var msg = (err && err.message) ? err.message : 'Erro ao enviar arquivo.';
                console.error('[UTalk] Falha no envio de midia:', err);
                if (typeof window.utalkShowToast === 'function') {
                    window.utalkShowToast(msg, 'error');
                } else {
                    alert(msg);
                }
            },
        });

        patchRenderMessageBubble();

        var list = document.querySelector('[data-utalk-chat-messages]') || document.getElementById('chatMessages');
        if (list) {
            enhanceHistoryMessages(list);
            if (typeof MutationObserver !== 'undefined') {
                var obs = new MutationObserver(function (mutations) {
                    var shouldEnhance = false;
                    for (var i = 0; i < mutations.length; i++) {
                        if (mutations[i].addedNodes.length > 0) {
                            shouldEnhance = true;
                            break;
                        }
                    }
                    if (shouldEnhance) {
                        enhanceHistoryMessages(list);
                    }
                });
                obs.observe(list, { childList: true, subtree: true });
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bind);
    } else {
        bind();
    }
})();
