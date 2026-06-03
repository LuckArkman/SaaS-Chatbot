/**
 * Intercepta fetch() para o proxy local /api/omni — regista pedido e resposta em sessionStorage.
 * Painel flutuante: DashApiCallLog.attachFloatingPanel()
 */
(function () {
    if (window.__DASH_API_FETCH_PATCHED__) {
        return;
    }
    window.__DASH_API_FETCH_PATCHED__ = true;

    var STORAGE_KEY = 'dash_api_call_log_v2';
    var MAX_ENTRIES = 150;
    var MAX_BODY_CHARS = 14000;

    function resolveUrl(input) {
        if (typeof input === 'string') {
            return input;
        }
        if (input && typeof input.url === 'string') {
            return input.url;
        }
        return '';
    }

    function shouldLogUrl(url) {
        if (!url) {
            return false;
        }
        try {
            var p = url;
            if (/^https?:\/\//i.test(url) || url.indexOf('//') === 0) {
                var a = document.createElement('a');
                a.href = url;
                if (a.hostname !== window.location.hostname) {
                    return false;
                }
                p = (a.pathname || '') + (a.search || '');
            }
            return p.indexOf('/api/omni') !== -1;
        } catch (e) {
            return false;
        }
    }

    function truncate(s, n) {
        if (s == null) {
            return '';
        }
        s = String(s);
        if (s.length <= n) {
            return s;
        }
        return s.slice(0, n) + '\n… [truncado, total ' + s.length + ' caracteres]';
    }

    function summarizeBody(body) {
        if (body == null || body === '') {
            return null;
        }
        if (typeof body === 'string') {
            return truncate(body, MAX_BODY_CHARS);
        }
        if (typeof FormData !== 'undefined' && body instanceof FormData) {
            var parts = [];
            try {
                body.forEach(function (v, k) {
                    parts.push(k + '=' + (typeof v === 'string' ? truncate(v, 800) : '[ficheiro/binário]'));
                });
            } catch (e) {}
            return parts.length ? parts.join('\n') : '[FormData vazio]';
        }
        if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) {
            return truncate(body.toString(), MAX_BODY_CHARS);
        }
        try {
            return truncate(JSON.stringify(body), MAX_BODY_CHARS);
        } catch (e) {
            return '[corpo não serializável]';
        }
    }

    function pushEntry(entry) {
        try {
            var a = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
            if (!Array.isArray(a)) {
                a = [];
            }
            a.unshift(entry);
            if (a.length > MAX_ENTRIES) {
                a.length = MAX_ENTRIES;
            }
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(a));
        } catch (e) {}
    }

    var origFetch = window.fetch;
    window.fetch = function (input, init) {
        init = init || {};
        var url = resolveUrl(input);
        var logIt = shouldLogUrl(url);
        var method = 'GET';
        if (init && init.method) {
            method = String(init.method).toUpperCase();
        } else if (input instanceof Request) {
            method = String(input.method || 'GET').toUpperCase();
        }
        var reqBody = null;
        if (logIt) {
            if (typeof input === 'string' || input instanceof URL) {
                reqBody = summarizeBody(init.body);
            } else if (input instanceof Request) {
                reqBody = '[Request — corpo não lido]';
            }
        }
        var t0 = logIt ? performance.now() : 0;

        return origFetch.apply(this, arguments).then(function (response) {
            if (!logIt) {
                return response;
            }
            var clone = response.clone();
            clone.text().then(function (text) {
                var preview = text;
                if (preview.length > MAX_BODY_CHARS) {
                    preview = preview.slice(0, MAX_BODY_CHARS) + '\n… [truncado]';
                }
                var parsed = null;
                try {
                    parsed = text ? JSON.parse(text) : null;
                } catch (e) {
                    parsed = undefined;
                }
                pushEntry({
                    t: new Date().toISOString(),
                    method: method,
                    url: url,
                    requestBody: reqBody,
                    status: response.status,
                    ok: response.ok,
                    durationMs: Math.round(performance.now() - t0),
                    responseBody: parsed !== undefined ? (parsed !== null ? parsed : preview) : preview
                });
                if (window.DashApiCallLog && typeof window.DashApiCallLog._notify === 'function') {
                    window.DashApiCallLog._notify();
                }
            }).catch(function () {});
            return response;
        });
    };

    function esc(s) {
        if (s == null) {
            return '';
        }
        var d = document.createElement('div');
        d.textContent = String(s);
        return d.innerHTML;
    }

    function formatJson(obj) {
        try {
            return JSON.stringify(obj, null, 2);
        } catch (e) {
            return String(obj);
        }
    }

    function displayBody(val) {
        if (val == null || val === '') {
            return '—';
        }
        if (typeof val === 'string') {
            try {
                return esc(formatJson(JSON.parse(val)));
            } catch (e2) {
                return esc(val);
            }
        }
        return esc(formatJson(val));
    }

    function getAll() {
        try {
            var a = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
            return Array.isArray(a) ? a : [];
        } catch (e) {
            return [];
        }
    }

    function renderEntry(e, i) {
        var statusClass = e.ok ? 'dash-log-ok' : 'dash-log-err';
        var req =
            e.requestBody != null && e.requestBody !== ''
                ? displayBody(e.requestBody)
                : '— (sem corpo ou GET)';
        var resp = displayBody(e.responseBody);
        return (
            '<div class="dash-log-item" data-idx="' + i + '">' +
            '<button type="button" class="dash-log-item-head" aria-expanded="false">' +
            '<span class="dash-log-meta">' + esc(e.t) + '</span>' +
            '<span class="dash-log-method">' + esc(e.method) + '</span>' +
            '<span class="dash-log-status ' + statusClass + '">' + esc(String(e.status)) + '</span>' +
            '<span class="dash-log-ms">' + esc(String(e.durationMs)) + ' ms</span>' +
            '<span class="dash-log-url">' + esc(e.url) + '</span>' +
            '</button>' +
            '<div class="dash-log-body hidden">' +
            '<div class="dash-log-block"><strong>Enviado</strong><pre class="dash-log-pre">' + req + '</pre></div>' +
            '<div class="dash-log-block"><strong>Recebido</strong><pre class="dash-log-pre">' + resp + '</pre></div>' +
            '</div></div>'
        );
    }

    function bindAccordion(root) {
        root.querySelectorAll('.dash-log-item-head').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var item = btn.closest('.dash-log-item');
                var body = item.querySelector('.dash-log-body');
                var open = btn.getAttribute('aria-expanded') === 'true';
                btn.setAttribute('aria-expanded', open ? 'false' : 'true');
                body.classList.toggle('hidden', open);
            });
        });
    }

    function renderListHTML() {
        var list = getAll();
        if (!list.length) {
            return '<p class="dash-log-empty">Ainda não há chamadas a <code>/api/omni</code> neste separador. Navega no painel (conversas, contatos, etc.) e volta aqui.</p>';
        }
        var html = '';
        for (var i = 0; i < list.length; i++) {
            html += renderEntry(list[i], i);
        }
        return html;
    }

    function renderInto(container, options) {
        injectPanelStyles();
        options = options || {};
        var showToolbar = options.toolbar !== false;
        var toolbar = showToolbar
            ? '<div class="dash-log-toolbar">' +
              '<button type="button" class="dash-log-btn" data-action="refresh">Atualizar</button>' +
              '<button type="button" class="dash-log-btn" data-action="clear">Limpar registo</button>' +
              '<button type="button" class="dash-log-btn dash-log-btn-primary" data-action="export">Copiar JSON</button>' +
              '</div>' +
              '<p class="dash-log-hint">Só são registados pedidos ao proxy <strong>local</strong> que contêm <code>/api/omni</code>. Os dados ficam no <code>sessionStorage</code> deste separador (até fechares o browser).</p>'
            : '';
        container.innerHTML =
            toolbar +
            '<div class="dash-log-list" id="dashApiLogListInner">' +
            renderListHTML() +
            '</div>';
        var listEl = container.querySelector('#dashApiLogListInner');
        bindAccordion(listEl);
        container.querySelectorAll('[data-action]').forEach(function (b) {
            b.addEventListener('click', function () {
                var act = b.getAttribute('data-action');
                if (act === 'refresh') {
                    renderInto(container, options);
                } else if (act === 'clear') {
                    if (confirm('Limpar todo o registo deste separador?')) {
                        try {
                            sessionStorage.removeItem(STORAGE_KEY);
                        } catch (e) {}
                        renderInto(container, options);
                    }
                } else if (act === 'export') {
                    var txt = JSON.stringify(getAll(), null, 2);
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(txt).then(function () {
                            b.textContent = 'Copiado!';
                            setTimeout(function () {
                                b.textContent = 'Copiar JSON';
                            }, 1600);
                        });
                    } else {
                        prompt('Copia o texto:', txt);
                    }
                }
            });
        });
    }

    var panelStyles =
        '.dash-log-fab{position:fixed;bottom:1.25rem;right:1.25rem;z-index:9998;width:52px;height:52px;border-radius:50%;border:none;background:#4338ca;color:#fff;font-size:0.7rem;font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(67,56,202,0.45);font-family:inherit;line-height:1.1;padding:4px}' +
        '.dash-log-fab:hover{background:#3730a3}' +
        '.dash-log-drawer{position:fixed;top:0;right:0;width:min(520px,96vw);height:100%;background:#fff;box-shadow:-4px 0 24px rgba(0,0,0,0.12);z-index:9999;display:flex;flex-direction:column;transform:translateX(100%);transition:transform 0.25s ease;font-family:Inter,system-ui,sans-serif}' +
        '.dash-log-drawer.open{transform:translateX(0)}' +
        '.dash-log-drawer-head{padding:1rem 1rem 0.75rem;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;gap:0.5rem;flex-shrink:0}' +
        '.dash-log-drawer-head h2{margin:0;font-size:1rem;color:#111}' +
        '.dash-log-drawer-head button{background:#f3f4f6;border:none;padding:0.4rem 0.65rem;border-radius:8px;cursor:pointer;font-size:0.8rem}' +
        '.dash-log-drawer-scroll{flex:1;overflow:auto;padding:0.75rem 1rem 1.5rem}' +
        '.dash-log-backdrop{position:fixed;inset:0;background:rgba(15,23,42,0.35);z-index:9997;opacity:0;pointer-events:none;transition:opacity 0.2s}' +
        '.dash-log-backdrop.show{opacity:1;pointer-events:auto}' +
        '.dash-log-toolbar{display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.75rem;align-items:center}' +
        '.dash-log-btn{padding:0.45rem 0.75rem;border-radius:8px;border:1px solid #d1d5db;background:#fff;font-size:0.8rem;cursor:pointer;font-family:inherit}' +
        '.dash-log-btn-primary{background:#4338ca;color:#fff;border-color:#4338ca}' +
        '.dash-log-hint{font-size:0.72rem;color:#6b7280;margin:0 0 0.75rem;line-height:1.45}' +
        '.dash-log-empty{font-size:0.85rem;color:#64748b;line-height:1.5}' +
        '.dash-log-item{border:1px solid #e5e7eb;border-radius:10px;margin-bottom:0.5rem;overflow:hidden;background:#fafafa}' +
        '.dash-log-item-head{width:100%;text-align:left;padding:0.55rem 0.65rem;background:#fff;border:none;cursor:pointer;display:grid;grid-template-columns:auto auto auto 1fr;gap:0.35rem 0.5rem;align-items:center;font-size:0.72rem;font-family:ui-monospace,monospace}' +
        '.dash-log-meta{grid-column:1/-1;color:#9ca3af;font-size:0.65rem}' +
        '.dash-log-method{font-weight:700;color:#1d4ed8}' +
        '.dash-log-status{font-weight:700}' +
        '.dash-log-ok{color:#15803d}' +
        '.dash-log-err{color:#b91c1c}' +
        '.dash-log-ms{color:#6b7280}' +
        '.dash-log-url{grid-column:1/-1;word-break:break-all;color:#374151;font-size:0.68rem}' +
        '.dash-log-body{padding:0.65rem;border-top:1px solid #e5e7eb;background:#f9fafb}' +
        '.dash-log-block{margin-bottom:0.5rem}' +
        '.dash-log-block strong{font-size:0.7rem;color:#4b5563}' +
        '.dash-log-pre{margin:0.35rem 0 0;font-size:0.68rem;white-space:pre-wrap;word-break:break-word;max-height:220px;overflow:auto;background:#0f172a;color:#e2e8f0;padding:0.5rem;border-radius:6px}' +
        '.registro-api-fullpage .dash-log-pre{max-height:min(58vh,520px)}' +
        '.hidden{display:none!important}';

    function injectPanelStyles() {
        if (document.getElementById('dash-api-call-log-styles')) {
            return;
        }
        var s = document.createElement('style');
        s.id = 'dash-api-call-log-styles';
        s.textContent = panelStyles;
        document.head.appendChild(s);
    }

    function attachFloatingPanel() {
        if (document.getElementById('dashApiLogFab')) {
            return;
        }
        if (document.body && document.body.getAttribute('data-dash-api-log-fullpage') === '1') {
            return;
        }
        injectPanelStyles();
        var fab = document.createElement('button');
        fab.type = 'button';
        fab.id = 'dashApiLogFab';
        fab.className = 'dash-log-fab';
        fab.setAttribute('title', 'Registo de chamadas à API');
        fab.textContent = 'API';
        var backdrop = document.createElement('div');
        backdrop.className = 'dash-log-backdrop';
        backdrop.id = 'dashApiLogBackdrop';
        var drawer = document.createElement('aside');
        drawer.className = 'dash-log-drawer';
        drawer.id = 'dashApiLogDrawer';
        drawer.setAttribute('aria-label', 'Registo de chamadas API');
        drawer.innerHTML =
            '<div class="dash-log-drawer-head">' +
            '<h2>Registo API</h2>' +
            '<div><a href="#" id="dashApiLogFullLink" style="font-size:0.75rem;margin-right:0.5rem;color:#4338ca">Página completa</a><button type="button" id="dashApiLogClose">Fechar</button></div></div>' +
            '<div class="dash-log-drawer-scroll" id="dashApiLogPanelRoot"></div>';
        document.body.appendChild(backdrop);
        document.body.appendChild(drawer);
        document.body.appendChild(fab);
        var root = document.getElementById('dashApiLogPanelRoot');
        var base = (window.API_BASE || '').replace(/\/$/, '');
        var fullLink = document.getElementById('dashApiLogFullLink');
        if (fullLink) {
            fullLink.href = (base ? base.replace(/\/$/, '') + '/' : '') + 'registro-api';
        }
        function openDrawer() {
            backdrop.classList.add('show');
            drawer.classList.add('open');
            renderInto(root, { toolbar: true });
        }
        function closeDrawer() {
            backdrop.classList.remove('show');
            drawer.classList.remove('open');
        }
        fab.addEventListener('click', openDrawer);
        document.getElementById('dashApiLogClose').addEventListener('click', closeDrawer);
        backdrop.addEventListener('click', closeDrawer);
        window.DashApiCallLog._notify = function () {
            if (drawer.classList.contains('open') && root) {
                renderInto(root, { toolbar: true });
            }
        };
    }

    function domReady(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn);
        } else {
            fn();
        }
    }

    window.DashApiCallLog = {
        key: STORAGE_KEY,
        getAll: getAll,
        clear: function () {
            try {
                sessionStorage.removeItem(STORAGE_KEY);
            } catch (e) {}
        },
        exportJson: function () {
            return JSON.stringify(getAll(), null, 2);
        },
        renderInto: renderInto,
        attachFloatingPanel: function () {
            domReady(attachFloatingPanel);
        },
        _notify: function () {}
    };

    domReady(attachFloatingPanel);
})();
