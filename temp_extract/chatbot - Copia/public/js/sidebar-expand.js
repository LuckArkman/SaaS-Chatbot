(function () {
    var KEY = 'utalk_sidebar_expanded';

    function injectLabels(sidebar) {
        var nav = sidebar.querySelector('.sidebar-nav');
        if (!nav) return;
        nav.querySelectorAll('a[title]').forEach(function (a) {
            if (a.querySelector('.sidebar-nav-label')) return;
            var t = a.getAttribute('title');
            if (!t) return;
            var span = document.createElement('span');
            span.className = 'sidebar-nav-label';
            span.textContent = t;
            a.appendChild(span);
        });
    }

    function init() {
        var sidebar = document.getElementById('appSidebar');
        if (!sidebar) return;
        injectLabels(sidebar);
        var toggle = document.getElementById('sidebarToggle');

        function apply(expanded) {
            sidebar.classList.toggle('sidebar--expanded', expanded);
            if (toggle) {
                toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
                toggle.setAttribute('title', expanded ? 'Recolher menu' : 'Expandir menu');
                toggle.setAttribute('aria-label', expanded ? 'Recolher menu' : 'Expandir menu');
            }
            try {
                localStorage.setItem(KEY, expanded ? '1' : '0');
            } catch (e) {}
        }

        var saved = null;
        try {
            saved = localStorage.getItem(KEY);
        } catch (e) {}
        apply(saved === '1');

        if (toggle) {
            toggle.addEventListener('click', function () {
                apply(!sidebar.classList.contains('sidebar--expanded'));
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
