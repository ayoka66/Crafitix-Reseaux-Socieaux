/* Interface d'administration : s'ouvre en cliquant sur le texte de droit d'auteur. */
(function () {
  'use strict';

  var SESSION_KEY = 'mycrafitix:admin';
  var saved = null;   // dernière version enregistrée
  var draft = null;   // version en cours d'édition (aperçu en direct)
  var open = false;
  var newPassword = '';
  var nodes = {};     // overlay, panel

  var ICON_CHOICES = [
    ['tiktok', 'TikTok'], ['discord', 'Discord'], ['twitch', 'Twitch'],
    ['youtube', 'YouTube'], ['instagram', 'Instagram'], ['x', 'X / Twitter'],
    ['gta', 'GTA / Étoile'], ['link', 'Lien générique']
  ];

  /* ---------- Utilitaires ---------- */

  function h(tag, props) {
    var e = document.createElement(tag);
    props = props || {};
    Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (k === 'class') e.className = v;
      else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), v);
      else if (k === 'value') e.value = v;
      else if (k === 'checked') e.checked = v;
      else e.setAttribute(k, v);
    });
    for (var i = 2; i < arguments.length; i++) {
      var kids = [].concat(arguments[i]);
      for (var j = 0; j < kids.length; j++) {
        var c = kids[j];
        if (c == null || c === false) continue;
        e.append(c.nodeType ? c : document.createTextNode(c));
      }
    }
    return e;
  }

  function field(label, input, hint) {
    return h('label', { class: 'adm-field' }, h('span', {}, label), input, hint ? h('small', {}, hint) : null);
  }

  function toast(msg, bad) {
    var t = h('div', { class: 'adm-toast' + (bad ? ' bad' : '') }, msg);
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }

  var raf = 0;
  function preview() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(function () { window.App.render(draft); });
  }

  function dirty() {
    return JSON.stringify(draft) !== JSON.stringify(saved) || !!newPassword;
  }

  /* ---------- Connexion ---------- */

  function authed() {
    try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch (e) { return false; }
  }

  function showLogin() {
    var overlay = h('div', { class: 'adm-overlay' });
    var err = h('div', { class: 'err' });
    var input = h('input', { type: 'password', placeholder: 'Mot de passe', autocomplete: 'current-password' });
    var box = h('form', { class: 'adm-login adm' },
      h('h2', {}, 'Accès admin'),
      input,
      err,
      h('div', { class: 'adm-row', style: 'margin-top:10px' },
        h('button', { class: 'adm-btn pri', type: 'submit' }, 'Entrer'),
        h('button', { class: 'adm-btn', type: 'button', onclick: close }, 'Annuler'))
    );

    function close() { overlay.remove(); box.remove(); }
    overlay.addEventListener('click', close);

    box.addEventListener('submit', function (ev) {
      ev.preventDefault();
      err.textContent = '';
      window.Config.sha256(input.value).then(function (hash) {
        if (hash === window.App.config.security.hash) {
          try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (e) { /* ignore */ }
          close();
          openPanel();
        } else if (window.App.config.botSecurity && hash === window.App.config.botSecurity.hash && window.BotAdmin) {
          close();
          window.BotAdmin.open();
        } else {
          setTimeout(function () {
            err.textContent = 'Mot de passe incorrect.';
            input.select();
          }, 400);
        }
      }).catch(function () {
        err.textContent = 'Connexion sécurisée (HTTPS) requise.';
      });
    });

    document.body.append(overlay, box);
    input.focus();
  }

  /* ---------- Panneau ---------- */

  function openPanel() {
    if (open) return;
    open = true;
    saved = window.Config.clone(window.App.config);
    draft = window.Config.clone(saved);
    newPassword = '';

    nodes.overlay = h('div', { class: 'adm-overlay', onclick: tryClose });
    nodes.panel = h('aside', { class: 'adm-panel adm', role: 'dialog', 'aria-label': 'Administration' });
    document.body.append(nodes.overlay, nodes.panel);
    buildPanel();
    document.addEventListener('keydown', onKey);
  }

  function onKey(e) { if (e.key === 'Escape') tryClose(); }

  function tryClose() {
    if (dirty() && !confirm('Quitter sans enregistrer les modifications ?')) return;
    closePanel();
  }

  function closePanel() {
    window.App.render(window.App.config);
    nodes.overlay.remove();
    nodes.panel.remove();
    document.removeEventListener('keydown', onKey);
    open = false;
  }

  function buildPanel() {
    var body = h('div', { class: 'adm-body' },
      secProfile(), secLinks(), secGta(), secEngine(), secSite());

    var importInput = h('input', { type: 'file', accept: 'application/json,.json', hidden: '' });
    importInput.addEventListener('change', function () {
      var f = importInput.files[0];
      if (!f) return;
      f.text().then(function (txt) {
        draft = window.Config.normalize(JSON.parse(txt));
        refreshAll();
        toast('Configuration importée (pense à enregistrer)');
      }).catch(function () { toast('Fichier JSON invalide', true); });
    });

    nodes.panel.replaceChildren(
      h('div', { class: 'adm-top' },
        h('h2', {}, 'Admin · ', h('b', {}, 'MyCrafitix')),
        h('button', { class: 'adm-btn sm', type: 'button', onclick: tryClose }, 'Fermer')),
      body,
      h('div', { class: 'adm-foot' },
        h('button', { class: 'adm-btn pri', type: 'button', onclick: doSave }, 'Enregistrer'),
        h('button', { class: 'adm-btn', type: 'button', onclick: doExport }, 'Exporter config.json'),
        h('button', { class: 'adm-btn', type: 'button', onclick: function () { importInput.click(); } }, 'Importer'),
        h('span', { class: 'grow' }),
        h('button', { class: 'adm-btn dng', type: 'button', onclick: doReset }, 'Réinitialiser'),
        importInput)
    );
  }

  function refreshAll() {
    var top = nodes.panel.querySelector('.adm-body');
    var scroll = top ? top.scrollTop : 0;
    buildPanel();
    nodes.panel.querySelector('.adm-body').scrollTop = scroll;
    preview();
  }

  /* ---------- Sections ---------- */

  function secProfile() {
    var p = draft.profile;

    var img = h('img', { alt: '' });
    var prev = h('div', { class: 'prev' });
    function setPrev() {
      prev.replaceChildren();
      if (p.avatar) {
        img.onerror = function () { img.remove(); };
        img.src = p.avatar;
        prev.appendChild(img);
      }
    }
    setPrev();

    var file = h('input', { type: 'file', accept: 'image/*', hidden: '' });
    file.addEventListener('change', function () {
      if (!file.files[0]) return;
      resizeImage(file.files[0], 384).then(function (data) {
        p.avatar = data;
        urlInput.value = '(image importée)';
        setPrev();
        preview();
      }).catch(function () { toast('Image illisible', true); });
    });

    var urlInput = h('input', {
      type: 'text',
      value: p.avatar.indexOf('data:') === 0 ? '(image importée)' : p.avatar,
      placeholder: 'https://…/photo.png',
      oninput: function (e) { p.avatar = e.target.value.trim(); setPrev(); preview(); }
    });
    urlInput.addEventListener('focus', function () { if (p.avatar.indexOf('data:') === 0) urlInput.select(); });

    return h('section', { class: 'adm-sec' },
      h('h3', {}, 'Profil'),
      h('div', { class: 'adm-av' }, prev,
        h('div', { class: 'adm-row' },
          h('button', { class: 'adm-btn sm', type: 'button', onclick: function () { file.click(); } }, 'Importer une image'),
          h('button', { class: 'adm-btn sm dng', type: 'button', onclick: function () { p.avatar = ''; urlInput.value = ''; setPrev(); preview(); } }, 'Retirer'),
          file)),
      field('URL de la photo de profil', urlInput,
        'Une image importée est stockée dans ce navigateur. Pour l’avoir partout, mets plutôt une URL.'),
      field('Nom affiché', h('input', { type: 'text', value: p.name, oninput: function (e) { p.name = e.target.value; preview(); } })),
      h('div', { class: 'adm-grid' },
        field('Texte du statut', h('input', { type: 'text', value: p.statusText, oninput: function (e) { p.statusText = e.target.value; preview(); } })),
        h('div', { style: 'padding-top:20px' },
          h('label', { class: 'adm-check' },
            h('input', { type: 'checkbox', checked: p.statusOn, onchange: function (e) { p.statusOn = e.target.checked; preview(); } }),
            'Afficher le statut')))
    );
  }

  function secLinks() {
    var list = h('div');

    function move(i, d) {
      var j = i + d;
      if (j < 0 || j >= draft.links.length) return;
      var t = draft.links[i]; draft.links[i] = draft.links[j]; draft.links[j] = t;
      refreshAll();
    }

    draft.links.forEach(function (l, i) {
      var sel = h('select', { onchange: function (e) { l.icon = e.target.value; preview(); } },
        ICON_CHOICES.map(function (c) { return h('option', { value: c[0] }, c[1]); }));
      sel.value = l.icon;

      list.appendChild(h('div', { class: 'adm-link' },
        h('div', { class: 'top' },
          h('input', { type: 'text', value: l.label, placeholder: 'Nom', oninput: function (e) { l.label = e.target.value; preview(); } }),
          h('input', { type: 'color', value: l.color, title: 'Couleur', oninput: function (e) { l.color = e.target.value; preview(); } })),
        h('input', { type: 'url', value: l.url, placeholder: 'https://…', oninput: function (e) { l.url = e.target.value.trim(); preview(); } }),
        h('div', { class: 'tools' },
          h('div', { class: 'adm-row' }, sel,
            h('label', { class: 'adm-check', style: 'margin:0' },
              h('input', { type: 'checkbox', checked: l.visible, onchange: function (e) { l.visible = e.target.checked; preview(); } }),
              'Visible')),
          h('div', { class: 'adm-row' },
            h('button', { class: 'adm-btn sm', type: 'button', title: 'Monter', onclick: function () { move(i, -1); } }, '↑'),
            h('button', { class: 'adm-btn sm', type: 'button', title: 'Descendre', onclick: function () { move(i, 1); } }, '↓'),
            h('button', { class: 'adm-btn sm dng', type: 'button', title: 'Supprimer', onclick: function () {
              if (!confirm('Supprimer le lien « ' + l.label + ' » ?')) return;
              draft.links.splice(i, 1);
              refreshAll();
            } }, '✕')))
      ));
    });

    return h('section', { class: 'adm-sec' },
      h('h3', {}, 'Liens'),
      list,
      h('button', { class: 'adm-btn', type: 'button', onclick: function () {
        draft.links.push({ id: 'link-' + Date.now(), label: 'Nouveau lien', url: '', icon: 'link', color: '#22c55e', visible: true });
        refreshAll();
      } }, '+ Ajouter un lien'));
  }

  function secGta() {
    var g = draft.gta;

    function txt(key, label, ph, hint) {
      return field(label, h('input', {
        type: 'text', value: g[key], placeholder: ph || '',
        oninput: function (e) { g[key] = e.target.value; preview(); }
      }), hint);
    }

    return h('section', { class: 'adm-sec' },
      h('h3', {}, 'Univers GTA V · FiveM'),
      h('label', { class: 'adm-check' },
        h('input', { type: 'checkbox', checked: g.enabled, onchange: function (e) { g.enabled = e.target.checked; preview(); } }),
        'Afficher la carte GTA V sur le site'),
      txt('title', 'Titre de la carte', 'Los Santos · GTA V RP'),
      h('div', { class: 'adm-grid' },
        txt('server', 'Serveur', 'Nom du serveur FiveM'),
        txt('character', 'Personnage RP', 'Prénom Nom'),
        txt('job', 'Métier', 'Mécanicien, policier…'),
        txt('crew', 'Crew / gang', 'Nom du crew')),
      field('Niveau de recherche (étoiles) : 0 à 5',
        h('input', { type: 'number', min: '0', max: '5', step: '1', value: String(g.wanted), oninput: function (e) {
          var n = parseInt(e.target.value, 10);
          g.wanted = isNaN(n) ? 0 : Math.max(0, Math.min(5, n));
          preview();
        } })),
      field('Description / mission en cours',
        h('textarea', { placeholder: 'Quelques mots sur ton aventure à Los Santos…', oninput: function (e) { g.note = e.target.value; preview(); } }, g.note)),
      field('Tags (séparés par des virgules)',
        h('input', { type: 'text', value: g.tags.join(', '), oninput: function (e) {
          g.tags = e.target.value.split(',').map(function (t) { return t.trim(); }).filter(Boolean);
          preview();
        } })),
      h('div', { class: 'adm-grid' },
        txt('joinLabel', 'Texte du bouton', 'Rejoindre le serveur'),
        field('Lien du bouton', h('input', {
          type: 'url', value: g.joinUrl, placeholder: 'https://cfx.re/join/…',
          oninput: function (e) { g.joinUrl = e.target.value.trim(); preview(); }
        }))));
  }

  function secEngine() {
    var e = draft.engine;
    return h('section', { class: 'adm-sec' },
      h('h3', {}, 'Son moteur'),
      h('label', { class: 'adm-check' },
        h('input', { type: 'checkbox', checked: e.enabled, onchange: function (ev) { e.enabled = ev.target.checked; preview(); } }),
        'Afficher le contrôle du son moteur sur le site'),
      field('Volume par défaut pour un nouveau visiteur', h('input', {
        type: 'range', min: '0', max: '100', value: String(e.volume),
        oninput: function (ev) { e.volume = parseInt(ev.target.value, 10); }
      }), 'Chaque visiteur peut ensuite ajuster le sien ; ce réglage ne change que son point de départ.'));
  }

  function secSite() {
    var pw1 = h('input', { type: 'password', autocomplete: 'new-password', placeholder: 'Nouveau mot de passe (min. 6 caractères)' });
    var pw2 = h('input', { type: 'password', autocomplete: 'new-password', placeholder: 'Confirmer' });
    function sync() { newPassword = pw1.value && pw1.value === pw2.value && pw1.value.length >= 6 ? pw1.value : ''; }
    pw1.addEventListener('input', sync);
    pw2.addEventListener('input', sync);

    return h('section', { class: 'adm-sec' },
      h('h3', {}, 'Site & sécurité'),
      field('Texte du droit d’auteur (après « © année »)',
        h('input', { type: 'text', value: draft.footer.text, oninput: function (e) { draft.footer.text = e.target.value; preview(); } }),
        'C’est ce texte, en bas de page, qui ouvre cette interface.'),
      field('Changer le mot de passe', pw1),
      field('', pw2, 'Laisse vide pour conserver le mot de passe actuel.'));
  }

  /* ---------- Actions ---------- */

  function doSave() {
    var pwCheck = newPassword
      ? window.Config.sha256(newPassword).then(function (hash) { draft.security.hash = hash; })
      : Promise.resolve();

    pwCheck.then(function () {
      var clean = window.Config.normalize(draft);
      if (!window.Config.save(clean)) {
        toast('Enregistrement impossible (image trop lourde ?)', true);
        return;
      }
      window.App.config = clean;
      saved = window.Config.clone(clean);
      draft = window.Config.clone(clean);
      newPassword = '';
      window.App.render(clean);
      refreshAll();
      toast('Enregistré dans ce navigateur');
    }).catch(function () { toast('Erreur lors de l’enregistrement', true); });
  }

  function doExport() {
    var data = window.Config.normalize(draft);
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var a = h('a', { href: URL.createObjectURL(blob), download: 'config.json' });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    toast('config.json téléchargé');
  }

  function doReset() {
    if (!confirm('Effacer les réglages de ce navigateur et revenir au config.json du site ?')) return;
    window.Config.reset();
    window.Config.load().then(function (cfg) {
      window.App.config = cfg;
      saved = window.Config.clone(cfg);
      draft = window.Config.clone(cfg);
      newPassword = '';
      window.App.render(cfg);
      refreshAll();
      toast('Réglages réinitialisés');
    });
  }

  function resizeImage(file, size) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var s = Math.min(img.width, img.height);
        var c = document.createElement('canvas');
        c.width = c.height = size;
        c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
        URL.revokeObjectURL(url);
        var out = c.toDataURL('image/webp', 0.88);
        if (out.indexOf('data:image/webp') !== 0) out = c.toDataURL('image/jpeg', 0.88);
        resolve(out);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('image')); };
      img.src = url;
    });
  }

  /* ---------- Déclencheur : le texte de droit d'auteur ---------- */

  document.getElementById('footer-btn').addEventListener('click', function () {
    if (open) return;
    if (window.BotAdmin && window.BotAdmin.isOpen()) return;
    if (authed()) { openPanel(); return; }
    if (window.BotAdmin && window.BotAdmin.authed()) { window.BotAdmin.open(); return; }
    showLogin();
  });

  window.SiteAdmin = { isOpen: function () { return open; }, authed: authed };
})();
