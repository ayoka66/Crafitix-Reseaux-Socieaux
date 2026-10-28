/* Deuxième interface admin : configuration du bot Discord.
   S'ouvre avec le même bouton (© en bas de page) mais un autre mot de passe.
   Le jeton du bot n'est jamais mis dans config.json : il reste, au choix,
   uniquement dans ce navigateur, et sert seulement à relayer une requête
   vers notre propre fonction serveur (api/discord-send.js), jamais stocké
   côté serveur de façon permanente. */
(function () {
  'use strict';

  var SESSION_KEY = 'mycrafitix:admin:bot';
  var CFG_KEY = 'mycrafitix:botconfig:v1';
  var TOKEN_KEY = 'mycrafitix:bottoken:v1'; // navigateur uniquement, jamais exporté

  var DEFAULT_CFG = {
    guildName: '',
    welcome: { enabled: false, channelId: '', message: 'Bienvenue {user} sur le serveur !', autoRoleId: '' },
    leveling: { enabled: false, xpPerMessage: 5, levelUpMessage: 'GG {user}, tu passes niveau {level} !' },
    automod: {
      enabled: false,
      bannedWords: [],
      antiInvite: true,
      antiSpam: true,
      maxMentions: 5,
      warnMessage: 'Merci de respecter le règlement du serveur.',
      logChannelId: ''
    },
    announce: { channelId: '', lastMessage: '' }
  };

  var SECTIONS = [
    { group: 'VUE D’ENSEMBLE', items: [{ id: 'connect', label: 'Connexion du bot' }] },
    { group: 'ACCUEIL DES MEMBRES', items: [{ id: 'welcome', label: 'Arrivées & rôle auto' }] },
    { group: 'ENGAGEMENT', items: [{ id: 'leveling', label: 'Niveaux & XP' }] },
    { group: 'SÉCURITÉ', items: [{ id: 'automod', label: 'Auto-modération' }] },
    { group: 'COMMUNICATION', items: [{ id: 'announce', label: 'Message automatique' }] }
  ];

  var open = false;
  var cfg = null, token = '', channelIdForToken = '';
  var nodes = {}, activeSection = 'connect';

  /* ---------- Utilitaires (indépendants de admin.js) ---------- */

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
    setTimeout(function () { t.remove(); }, 2800);
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /* ---------- Stockage ---------- */

  function loadCfg() {
    try {
      var raw = localStorage.getItem(CFG_KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      return Object.assign(clone(DEFAULT_CFG), parsed || {}, {
        welcome: Object.assign(clone(DEFAULT_CFG.welcome), (parsed && parsed.welcome) || {}),
        leveling: Object.assign(clone(DEFAULT_CFG.leveling), (parsed && parsed.leveling) || {}),
        automod: Object.assign(clone(DEFAULT_CFG.automod), (parsed && parsed.automod) || {}),
        announce: Object.assign(clone(DEFAULT_CFG.announce), (parsed && parsed.announce) || {})
      });
    } catch (e) { return clone(DEFAULT_CFG); }
  }

  function saveCfg() {
    try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); return true; } catch (e) { return false; }
  }

  function loadToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; }
  }

  function rememberToken(remember) {
    try {
      if (remember) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch (e) { /* ignore */ }
  }

  /* ---------- Connexion ---------- */

  function authed() {
    try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch (e) { return false; }
  }

  function markAuthed() {
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (e) { /* ignore */ }
  }

  /* ---------- Panneau ---------- */

  function openPanel() {
    if (open) return;
    open = true;
    markAuthed();
    cfg = loadCfg();
    token = loadToken();
    activeSection = 'connect';

    nodes.overlay = h('div', { class: 'adm-overlay', onclick: close });
    nodes.panel = h('aside', { class: 'adm-panel bot-panel adm', role: 'dialog', 'aria-label': 'Administration du bot Discord' });
    document.body.append(nodes.overlay, nodes.panel);
    build();
  }

  function close() {
    nodes.overlay.remove();
    nodes.panel.remove();
    open = false;
  }

  function build() {
    nodes.panel.replaceChildren(
      h('div', { class: 'adm-top' },
        h('h2', {}, 'Bot Discord · ', h('b', {}, 'MyCrafitix')),
        h('button', { class: 'adm-btn sm', type: 'button', onclick: close }, 'Fermer')),
      h('div', { class: 'bot-layout' }, nav(), content())
    );
  }

  function nav() {
    var box = h('nav', { class: 'bot-nav' });
    SECTIONS.forEach(function (sec) {
      box.appendChild(h('div', { class: 'bot-nav-group' }, sec.group));
      sec.items.forEach(function (it) {
        box.appendChild(h('button', {
          class: 'bot-nav-item' + (activeSection === it.id ? ' active' : ''),
          type: 'button',
          onclick: function () { activeSection = it.id; build(); }
        }, it.label));
      });
    });
    return box;
  }

  function content() {
    var box = h('div', { class: 'bot-content' });
    var renderers = { connect: secConnect, welcome: secWelcome, leveling: secLeveling, automod: secAutomod, announce: secAnnounce };
    box.appendChild((renderers[activeSection] || secConnect)());
    return box;
  }

  /* ---------- Section : connexion ---------- */

  function secConnect() {
    var rememberBox = h('label', { class: 'adm-check' },
      h('input', { type: 'checkbox', checked: !!loadToken(), onchange: function (e) { rememberToken(e.target.checked); } }),
      'Se souvenir du jeton dans ce navigateur (déconseillé sur un ordinateur partagé)');

    var tokenInput = h('input', {
      type: 'password', value: token, autocomplete: 'off', placeholder: 'Collé depuis le portail développeurs Discord',
      oninput: function (e) { token = e.target.value.trim(); }
    });

    var statusLine = h('p', { class: 'bot-status' }, 'Pas encore testé.');

    return h('div', {},
      h('h3', { class: 'bot-h' }, 'Connexion du bot'),
      h('p', { class: 'bot-help' },
        'Le jeton n’est jamais écrit dans config.json ni partagé avec les visiteurs du site : il ne sert qu’à relayer, depuis ton navigateur, une requête vers notre fonction ',
        h('code', {}, 'api/discord-send.js'), ', qui l’envoie à Discord. Garde-le secret : quiconque le possède peut faire parler ton bot.'),
      field('Jeton du bot (Bot Token)', tokenInput),
      rememberBox,
      field('ID du salon par défaut', h('input', {
        type: 'text', value: cfg.announce.channelId, placeholder: 'Clic droit sur le salon → Copier l’identifiant',
        oninput: function (e) { cfg.announce.channelId = e.target.value.trim(); }
      }), 'Active le mode développeur Discord (Paramètres → Avancés) pour voir « Copier l’identifiant ».'),
      h('div', { class: 'adm-row', style: 'margin-top:4px' },
        h('button', { class: 'adm-btn pri', type: 'button', onclick: function () {
          testConnection(statusLine);
        } }, 'Tester la connexion')),
      statusLine
    );
  }

  function testConnection(statusLine) {
    if (!token) { statusLine.textContent = 'Colle d’abord un jeton.'; statusLine.className = 'bot-status bad'; return; }
    statusLine.textContent = 'Connexion…';
    statusLine.className = 'bot-status';
    fetch('/api/discord-send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'whoami', token: token }) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (res.ok) {
          statusLine.textContent = 'Connecté en tant que ' + (res.j.username || 'bot') + '.';
          statusLine.className = 'bot-status ok';
        } else {
          statusLine.textContent = 'Échec : ' + (res.j.error || 'jeton refusé par Discord.');
          statusLine.className = 'bot-status bad';
        }
      })
      .catch(function () {
        statusLine.textContent = 'La fonction api/discord-send n’est pas déployée ici (normal en local sans Vercel). Déploie le site sur Vercel pour tester.';
        statusLine.className = 'bot-status bad';
      });
  }

  /* ---------- Section : accueil ---------- */

  function secWelcome() {
    var w = cfg.welcome;
    return h('div', {},
      h('h3', { class: 'bot-h' }, 'Arrivées & rôle automatique'),
      h('p', { class: 'bot-help' }, 'Géré par le script du bot (dossier « discord-bot »), pas par le site lui-même : ce réglage s’exporte avec le bouton en bas pour que le bot le lise.'),
      h('label', { class: 'adm-check' },
        h('input', { type: 'checkbox', checked: w.enabled, onchange: function (e) { w.enabled = e.target.checked; } }),
        'Activer le message de bienvenue'),
      field('ID du salon de bienvenue', h('input', { type: 'text', value: w.channelId, oninput: function (e) { w.channelId = e.target.value.trim(); } })),
      field('Message de bienvenue', h('textarea', { oninput: function (e) { w.message = e.target.value; } }, w.message),
        'Utilise {user} pour mentionner le nouveau membre.'),
      field('ID du rôle donné automatiquement', h('input', { type: 'text', value: w.autoRoleId, oninput: function (e) { w.autoRoleId = e.target.value.trim(); } }), 'Laisse vide pour ne donner aucun rôle.')
    );
  }

  /* ---------- Section : niveaux ---------- */

  function secLeveling() {
    var l = cfg.leveling;
    return h('div', {},
      h('h3', { class: 'bot-h' }, 'Niveaux & XP'),
      h('label', { class: 'adm-check' },
        h('input', { type: 'checkbox', checked: l.enabled, onchange: function (e) { l.enabled = e.target.checked; } }),
        'Activer les niveaux (XP gagnée à chaque message)'),
      field('XP par message', h('input', { type: 'number', min: '1', max: '100', value: String(l.xpPerMessage), oninput: function (e) { l.xpPerMessage = Math.max(1, parseInt(e.target.value, 10) || 5); } })),
      field('Message de passage de niveau', h('textarea', { oninput: function (e) { l.levelUpMessage = e.target.value; } }, l.levelUpMessage),
        'Utilise {user} et {level}.')
    );
  }

  /* ---------- Section : automodération ---------- */

  function secAutomod() {
    var a = cfg.automod;
    return h('div', {},
      h('h3', { class: 'bot-h' }, 'Auto-modération'),
      h('label', { class: 'adm-check' },
        h('input', { type: 'checkbox', checked: a.enabled, onchange: function (e) { a.enabled = e.target.checked; } }),
        'Activer l’auto-modération'),
      field('Mots interdits (séparés par des virgules)', h('input', {
        type: 'text', value: a.bannedWords.join(', '),
        oninput: function (e) { a.bannedWords = e.target.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean); }
      })),
      h('div', { class: 'adm-grid' },
        h('label', { class: 'adm-check' }, h('input', { type: 'checkbox', checked: a.antiInvite, onchange: function (e) { a.antiInvite = e.target.checked; } }), 'Bloquer les liens d’invitation Discord'),
        h('label', { class: 'adm-check' }, h('input', { type: 'checkbox', checked: a.antiSpam, onchange: function (e) { a.antiSpam = e.target.checked; } }), 'Anti-spam (messages répétés rapides)')),
      field('Mentions max. dans un message', h('input', { type: 'number', min: '1', max: '30', value: String(a.maxMentions), oninput: function (e) { a.maxMentions = Math.max(1, parseInt(e.target.value, 10) || 5); } })),
      field('Message d’avertissement', h('input', { type: 'text', value: a.warnMessage, oninput: function (e) { a.warnMessage = e.target.value; } })),
      field('ID du salon de logs de modération', h('input', { type: 'text', value: a.logChannelId, oninput: function (e) { a.logChannelId = e.target.value.trim(); } }), 'Laisse vide pour ne pas journaliser.')
    );
  }

  /* ---------- Section : message automatique ---------- */

  function secAnnounce() {
    var ann = cfg.announce;
    var msg = h('textarea', { placeholder: 'Le message à envoyer avec le bot…', oninput: function (e) { ann.lastMessage = e.target.value; } }, ann.lastMessage);
    var channel = h('input', { type: 'text', value: ann.channelId, placeholder: 'ID du salon', oninput: function (e) { ann.channelId = e.target.value.trim(); } });
    var out = h('p', { class: 'bot-status' });

    return h('div', {},
      h('h3', { class: 'bot-h' }, 'Envoyer un message automatique'),
      h('p', { class: 'bot-help' }, 'Envoie un message immédiat dans un salon, avec le bot, depuis ce panneau (nécessite le jeton renseigné dans « Connexion du bot » et le site déployé sur Vercel).'),
      field('Salon de destination (ID)', channel),
      field('Message', msg),
      h('div', { class: 'adm-row' },
        h('button', { class: 'adm-btn pri', type: 'button', onclick: function () { sendNow(channel.value.trim(), msg.value, out); } }, 'Envoyer maintenant')),
      out
    );
  }

  function sendNow(channelId, message, out) {
    if (!token) { out.textContent = 'Renseigne d’abord le jeton dans « Connexion du bot ».'; out.className = 'bot-status bad'; return; }
    if (!channelId) { out.textContent = 'Indique l’ID du salon.'; out.className = 'bot-status bad'; return; }
    if (!message.trim()) { out.textContent = 'Le message est vide.'; out.className = 'bot-status bad'; return; }

    out.textContent = 'Envoi…';
    out.className = 'bot-status';
    fetch('/api/discord-send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'send', token: token, channelId: channelId, message: message })
    })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (res.ok) { out.textContent = 'Message envoyé ✓'; out.className = 'bot-status ok'; }
        else { out.textContent = 'Échec : ' + (res.j.error || 'Discord a refusé la requête.'); out.className = 'bot-status bad'; }
      })
      .catch(function () {
        out.textContent = 'La fonction api/discord-send n’est pas joignable ici. Déploie le site sur Vercel (les fonctions /api/* y fonctionnent).';
        out.className = 'bot-status bad';
      });
  }

  /* ---------- Export / sauvegarde ---------- */

  function doSave() {
    if (!saveCfg()) { toast('Enregistrement impossible', true); return; }
    toast('Configuration du bot enregistrée dans ce navigateur');
  }

  function doExport() {
    var blob = new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json' });
    var a = h('a', { href: URL.createObjectURL(blob), download: 'bot-config.json' });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    toast('bot-config.json téléchargé — place-le à côté du script du bot');
  }

  /* ---------- API publique pour admin.js ---------- */

  window.BotAdmin = {
    open: openPanel,
    isOpen: function () { return open; },
    authed: authed
  };

  // Les boutons Enregistrer / Exporter sont ajoutés dans le pied du panneau,
  // généré ici pour rester cohérent avec build().
  var origBuild = build;
  build = function () {
    origBuild();
    nodes.panel.appendChild(h('div', { class: 'adm-foot' },
      h('button', { class: 'adm-btn pri', type: 'button', onclick: doSave }, 'Enregistrer'),
      h('button', { class: 'adm-btn', type: 'button', onclick: doExport }, 'Exporter bot-config.json'),
      h('span', { class: 'grow' }),
      h('a', { class: 'adm-btn', href: 'https://discord.com/developers/applications', target: '_blank', rel: 'noopener' }, 'Portail développeurs')));
  };
})();
