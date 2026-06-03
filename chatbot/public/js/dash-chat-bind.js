/**
 * Liga DashWhatsAppMedia ao painel Conversas (/home).
 * Inclua este script após dash-whatsapp-media.js e o partial chat-composer-media.php no composer.
 */
(function () {
    'use strict';

    function getConversationId() {
        if (typeof window.UTALK_GET_CONVERSATION_ID === 'function') {
            return window.UTALK_GET_CONVERSATION_ID() || '';
        }
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
                if (window.DashWhatsAppMedia.isMediaMessage(msg)) {
                    el.innerHTML = window.DashWhatsAppMedia.renderMessageInner(msg);
                    el.classList.add('chat-bubble--media');
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
        });

        patchRenderMessageBubble();

        var list = document.querySelector('[data-utalk-chat-messages]') || document.getElementById('chatMessages');
        if (list) {
            enhanceHistoryMessages(list);
            if (typeof MutationObserver !== 'undefined') {
                var obs = new MutationObserver(function () {
                    enhanceHistoryMessages(list);
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
