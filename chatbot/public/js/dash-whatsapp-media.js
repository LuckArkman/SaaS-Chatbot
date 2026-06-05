/**
 * Mídia WhatsApp no dashboard — upload (storage), envio (chat/send) e render no histórico.
 * Equivalente funcional aos scripts test_*_whatsapp_media.js, para uso no painel Conversas.
 */
(function () {
    'use strict';

    var MIME_BY_EXT = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
        pdf: 'application/pdf',
        mp4: 'video/mp4',
        webm: 'video/webm',
        ogg: 'audio/ogg',
        mp3: 'audio/mpeg',
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };

    var MEDIA_TYPES = ['image', 'video', 'audio', 'document', 'sticker'];

    function apiBase() {
        return (window.API_BASE || '') + '/api/omni';
    }

    function esc(s) {
        var d = document.createElement('div');
        d.textContent = s == null ? '' : String(s);
        return d.innerHTML;
    }

    function extractMediaUrl(data) {
        if (!data || typeof data !== 'object') {
            return '';
        }
        return (
            data.url ||
            data.filePath ||
            data.file_path ||
            data.path ||
            data.media_url ||
            data.mediaUrl ||
            (data.data && (data.data.url || data.data.path || data.data.media_url)) ||
            ''
        );
    }

    function inferTypeFromFile(file) {
        if (!file) {
            return 'document';
        }
        var mime = (file.type || '').toLowerCase();
        var name = (file.name || '').toLowerCase();
        var ext = name.indexOf('.') >= 0 ? name.split('.').pop() : '';
        if (ext === 'webp') {
            return 'sticker';
        }
        if (mime.indexOf('image/') === 0 || ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'gif') {
            return 'image';
        }
        if (mime.indexOf('video/') === 0 || ext === 'mp4' || ext === 'webm') {
            return 'video';
        }
        if (mime.indexOf('audio/') === 0 || ext === 'ogg' || ext === 'mp3') {
            return 'audio';
        }
        return 'document';
    }

    async function fetchJson(url, options) {
        var opts = Object.assign({ credentials: 'same-origin' }, options || {});
        var res = await fetch(url, opts);
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

    async function uploadFile(file) {
        var fd = new FormData();
        fd.append('file', file, file.name || 'upload.bin');
        return fetchJson(apiBase() + '/storage/upload', { method: 'POST', body: fd });
    }

    async function sendMessage(payload) {
        return fetchJson(apiBase() + '/chat/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
    }

    function messageMediaUrl(msg) {
        if (!msg || typeof msg !== 'object') {
            return '';
        }
        return (
            msg.media_url ||
            msg.mediaUrl ||
            msg.media ||
            (msg.attachment && (msg.attachment.url || msg.attachment.path)) ||
            ''
        );
    }

    function messageType(msg) {
        if (!msg || typeof msg !== 'object') {
            return '';
        }
        var t = String(msg.type || msg.message_type || msg.messageType || '').toLowerCase();
        if (t.indexOf('image') !== -1) {
            return 'image';
        }
        if (t.indexOf('video') !== -1) {
            return 'video';
        }
        if (t.indexOf('audio') !== -1 || t === 'ptt' || t === 'voice') {
            return 'audio';
        }
        if (t.indexOf('document') !== -1 || t === 'file') {
            return 'document';
        }
        if (MEDIA_TYPES.indexOf(t) !== -1) {
            return t;
        }
        return t;
    }

    function isMediaMessage(msg) {
        var url = messageMediaUrl(msg);
        if (url) {
            return true;
        }
        var t = messageType(msg);
        return MEDIA_TYPES.indexOf(t) !== -1;
    }

    function resolvePublicUrl(url) {
        if (!url) {
            return '';
        }
        if (/^https?:\/\//i.test(url) || url.indexOf('//') === 0) {
            return url;
        }
        var base = (window.API_BASE || '').replace(/\/$/, '');
        var saas = (window.SAAS_PUBLIC_URL || window.API_SAAS_PUBLIC || '').replace(/\/$/, '');
        var root = saas || base.replace(/\/public\/?$/, '');
        if (url.charAt(0) === '/') {
            return root ? root + url : url;
        }
        return url;
    }

    function renderMessageInner(msg) {
        var url = resolvePublicUrl(messageMediaUrl(msg));
        var type = messageType(msg);
        var text = msg.content || msg.text || msg.body || '';
        if (!url) {
            return esc(text);
        }
        var html = '';
        if (type === 'image' || type === 'sticker' || (!type && /\.(jpe?g|png|gif|webp)(\?|$)/i.test(url))) {
            html =
                '<a href="' +
                esc(url) +
                '" target="_blank" rel="noopener" class="chat-media-link">' +
                '<img src="' +
                esc(url) +
                '" alt="Imagem" class="chat-media-img" loading="lazy" style="' + (type === 'sticker' ? 'background:transparent; border-radius:0; width:150px; height:auto; box-shadow:none;' : '') + '">' +
                '</a>';
        } else if (type === 'video') {
            html = '<video src="' + esc(url) + '" controls class="chat-media-video" preload="metadata"></video>';
        } else if (type === 'audio') {
            html = '<audio src="' + esc(url) + '" controls class="chat-media-audio" preload="metadata"></audio>';
        } else {
            var label = msg.file_name || msg.fileName || 'Documento';
            html =
                '<a href="' +
                esc(url) +
                '" target="_blank" rel="noopener" class="chat-media-doc">📎 ' +
                esc(label) +
                '</a>';
        }
        if (text) {
            html += '<div class="chat-media-caption">' + esc(text) + '</div>';
        }
        return html;
    }

    /**
     * Envia ficheiro: upload → chat/send com type + media_url.
     */
    async function sendFile(opts) {
        opts = opts || {};
        var conversationId = opts.conversationId || '';
        if (!conversationId) {
            throw new Error('Selecione uma conversa antes de enviar mídia.');
        }
        var file = opts.file;
        if (!file) {
            throw new Error('Nenhum ficheiro selecionado.');
        }
        var type = opts.type || inferTypeFromFile(file);
        var uploadRes = await uploadFile(file);
        var mediaUrl = extractMediaUrl(uploadRes);
        if (!mediaUrl) {
            throw new Error('Upload concluído mas a API não devolveu URL da mídia.');
        }
        var payload = {
            conversation_id: conversationId,
            content: opts.content != null ? String(opts.content) : '',
            type: type,
            media_url: mediaUrl,
        };
        if (opts.to) {
            payload.to = opts.to;
        }
        var sendRes = await sendMessage(payload);
        return { upload: uploadRes, send: sendRes, media_url: mediaUrl, type: type };
    }

    /**
     * Liga anexo ao composer do chat (botão 📎 + input file).
     * options: { getConversationId, inputEl, sendBtnEl, attachBtnEl, fileInputEl, onSent, onError }
     */
    function attachToComposer(options) {
        options = options || {};
        var fileInput =
            options.fileInputEl ||
            document.getElementById('utalkChatFile') ||
            document.querySelector('[data-utalk-chat-file]');
        var attachBtn =
            options.attachBtnEl ||
            document.getElementById('utalkChatAttach') ||
            document.querySelector('[data-utalk-chat-attach]');
        if (!fileInput) {
            return false;
        }
        if (!attachBtn) {
            attachBtn = document.createElement('button');
            attachBtn.type = 'button';
            attachBtn.id = 'utalkChatAttach';
            attachBtn.className = 'chat-attach-btn';
            attachBtn.setAttribute('aria-label', 'Anexar ficheiro');
            attachBtn.textContent = '📎';
            var host = options.inputEl || document.querySelector('[data-utalk-chat-input]') || document.querySelector('.chat-composer');
            if (host && host.parentNode) {
                host.parentNode.insertBefore(attachBtn, host);
            }
        }
        attachBtn.addEventListener('click', function () {
            fileInput.click();
        });
        fileInput.addEventListener('change', function () {
            var file = fileInput.files && fileInput.files[0];
            fileInput.value = '';
            if (!file) {
                return;
            }
            var getCid =
                options.getConversationId ||
                function () {
                    return window.UTALK_ACTIVE_CONVERSATION_ID || '';
                };
            var conversationId = getCid();
            var content = '';
            if (options.inputEl) {
                content = options.inputEl.value || '';
            } else {
                var inp = document.querySelector('[data-utalk-chat-input]') || document.getElementById('chatMessageInput');
                if (inp) {
                    content = inp.value || '';
                }
            }
            attachBtn.disabled = true;
            sendFile({ conversationId: conversationId, file: file, content: content })
                .then(function (result) {
                    if (options.inputEl) {
                        options.inputEl.value = '';
                    }
                    var inp2 = document.querySelector('[data-utalk-chat-input]') || document.getElementById('chatMessageInput');
                    if (inp2) {
                        inp2.value = '';
                    }
                    if (typeof options.onSent === 'function') {
                        options.onSent(result);
                    }
                })
                .catch(function (err) {
                    if (typeof options.onError === 'function') {
                        options.onError(err);
                    } else {
                        alert(err && err.message ? err.message : 'Erro ao enviar mídia.');
                    }
                })
                .finally(function () {
                    attachBtn.disabled = false;
                });
        });
        return true;
    }

    window.DashWhatsAppMedia = {
        apiBase: apiBase,
        extractMediaUrl: extractMediaUrl,
        inferTypeFromFile: inferTypeFromFile,
        uploadFile: uploadFile,
        sendMessage: sendMessage,
        sendFile: sendFile,
        messageMediaUrl: messageMediaUrl,
        messageType: messageType,
        isMediaMessage: isMediaMessage,
        resolvePublicUrl: resolvePublicUrl,
        renderMessageInner: renderMessageInner,
        attachToComposer: attachToComposer,
    };
})();
