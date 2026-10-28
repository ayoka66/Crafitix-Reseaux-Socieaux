/* Rendu de la page publique à partir de la configuration. */
(function () {
  'use strict';

  var ICONS = {
    tiktok: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z"/></svg>',
    discord: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/></svg>',
    twitch: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.43l-3 3v-3H6.857V1.714h13.714Z"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.6 15.6V8.4l6.2 3.6-6.2 3.6z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
    gta: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.1 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5"/></svg>'
  };

  function $(s) { return document.querySelector(s); }

  function safeUrl(u) {
    try {
      var x = new URL(u, location.href);
      return /^(https?:|mailto:)$/.test(x.protocol) ? x.href : '#';
    } catch (e) { return '#'; }
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function renderProfile(p) {
    document.title = p.name || 'MyCrafitix';
    $('#name').textContent = p.name;

    var av = $('#avatar');
    av.replaceChildren();
    if (p.avatar) {
      var img = new Image();
      img.alt = '';
      img.decoding = 'async';
      img.onerror = function () { img.remove(); };
      img.src = p.avatar;
      av.appendChild(img);
    }

    var st = $('#status');
    st.hidden = !p.statusOn;
    $('#status-text').textContent = p.statusText;
  }

  function renderLinks(links) {
    var box = $('#links');
    box.replaceChildren();
    links.forEach(function (l) {
      if (!l.visible || !l.url) return;
      var a = el('a', 'link');
      a.href = safeUrl(l.url);
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.style.setProperty('--c', l.color);

      var ic = el('span', 'ico');
      ic.innerHTML = ICONS[l.icon] || ICONS.link;
      a.appendChild(ic);
      a.appendChild(el('span', 'lbl', l.label));
      a.appendChild(el('span', 'arr', '→'));
      box.appendChild(a);
    });
  }

  function renderGta(g) {
    var box = $('#gta');
    box.replaceChildren();
    if (!g.enabled) { box.hidden = true; return; }

    var head = el('div', 'gta-head');
    var badge = el('span', 'gta-badge', 'LS');
    head.appendChild(badge);
    head.appendChild(el('span', 'gta-title', g.title));

    var stars = el('span', 'gta-stars');
    stars.setAttribute('aria-label', 'Niveau de recherche : ' + g.wanted + ' sur 5');
    for (var i = 0; i < 5; i++) {
      stars.appendChild(el('i', i < g.wanted ? 'on' : '', '★'));
    }
    head.appendChild(stars);
    box.appendChild(head);

    var rows = [
      ['Serveur', g.server],
      ['Personnage', g.character],
      ['Métier', g.job],
      ['Crew', g.crew]
    ].filter(function (r) { return r[1]; });

    if (rows.length) {
      var dl = el('dl', 'gta-rows');
      rows.forEach(function (r) {
        var row = el('div');
        row.appendChild(el('dt', null, r[0]));
        row.appendChild(el('dd', null, r[1]));
        dl.appendChild(row);
      });
      box.appendChild(dl);
    }

    if (g.note) box.appendChild(el('p', 'gta-note', g.note));

    if (g.tags.length) {
      var tags = el('div', 'gta-tags');
      g.tags.forEach(function (t) { tags.appendChild(el('span', null, t)); });
      box.appendChild(tags);
    }

    if (g.joinUrl) {
      var a = el('a', 'gta-join', g.joinLabel || 'Rejoindre le serveur');
      a.href = safeUrl(g.joinUrl);
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      box.appendChild(a);
    }

    box.hidden = false;
  }

  function renderFooter(f) {
    $('#footer-btn').textContent = '© ' + new Date().getFullYear() + ' ' + f.text;
  }

  function render(cfg) {
    renderProfile(cfg.profile);
    renderLinks(cfg.links);
    renderGta(cfg.gta);
    renderFooter(cfg.footer);
  }

  window.App = { render: render, icons: ICONS };

  window.Config.load().then(function (cfg) {
    window.App.config = cfg;
    render(cfg);
    requestAnimationFrame(function () { document.body.classList.add('ready'); });
    document.dispatchEvent(new CustomEvent('app:ready'));
  });
})();
