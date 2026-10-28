/* Configuration du site : valeurs par défaut, chargement, sauvegarde. */
(function () {
  'use strict';

  var KEY = 'mycrafitix:config:v1';

  // Mot de passe admin par défaut : "mycrafitix" (à changer dans l'admin).
  var DEFAULTS = {
    profile: {
      name: 'MYCRAFITIX',
      avatar: 'assets/avatar.webp',
      statusText: 'En ligne',
      statusOn: true
    },
    links: [
      { id: 'tiktok',  label: 'TikTok',  url: 'https://www.tiktok.com/@mycrafitix', icon: 'tiktok',  color: '#161618', visible: true },
      { id: 'discord', label: 'Discord', url: 'https://discord.gg/B8WE8nm4Wt',      icon: 'discord', color: '#5865f2', visible: true },
      { id: 'twitch',  label: 'Twitch',  url: 'https://www.twitch.tv/mycrafitixtw', icon: 'twitch',  color: '#9146ff', visible: true }
    ],
    gta: {
      enabled: true,
      title: 'Los Santos · GTA V RP',
      server: '',
      character: '',
      job: '',
      crew: '',
      wanted: 0,
      tags: ['GTA V', 'FiveM', 'Los Santos'],
      note: '',
      joinLabel: '',
      joinUrl: ''
    },
    engine: { enabled: true, volume: 55, autoplay: false },
    footer: { text: 'MYCRAFITIX' },
    // Mot de passe admin site par défaut : "mycrafitix".
    security: { hash: 'eaf39c50feb9396e4ae291da229b8edfd394a26b7aae1362895537b20424b9b4' },
    // Mot de passe admin bot par défaut : "MyCrafitixW13".
    botSecurity: { hash: 'd8d26e820ef94db09c3592a56a89ca2260739b0f642402b89cbcfbac4bd2526e' }
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function str(v, d) { return typeof v === 'string' ? v : d; }

  // Fusionne un objet quelconque avec les valeurs par défaut, en validant les types.
  function normalize(src) {
    var d = clone(DEFAULTS);
    if (!src || typeof src !== 'object') return d;

    var p = src.profile || {};
    d.profile.name = str(p.name, d.profile.name);
    d.profile.avatar = str(p.avatar, d.profile.avatar);
    d.profile.statusText = str(p.statusText, d.profile.statusText);
    if (typeof p.statusOn === 'boolean') d.profile.statusOn = p.statusOn;

    if (Array.isArray(src.links)) {
      d.links = src.links
        .filter(function (l) { return l && typeof l === 'object'; })
        .map(function (l, i) {
          return {
            id: str(l.id, 'link-' + i),
            label: str(l.label, 'Lien'),
            url: str(l.url, ''),
            icon: str(l.icon, 'link'),
            color: /^#[0-9a-f]{6}$/i.test(l.color) ? l.color : '#22c55e',
            visible: l.visible !== false
          };
        });
    }

    var g = src.gta || {};
    ['title', 'server', 'character', 'job', 'crew', 'note', 'joinLabel', 'joinUrl'].forEach(function (k) {
      d.gta[k] = str(g[k], d.gta[k]);
    });
    if (typeof g.enabled === 'boolean') d.gta.enabled = g.enabled;
    if (typeof g.wanted === 'number') d.gta.wanted = Math.max(0, Math.min(5, Math.round(g.wanted)));
    if (Array.isArray(g.tags)) {
      d.gta.tags = g.tags.filter(function (t) { return typeof t === 'string' && t.trim(); }).map(function (t) { return t.trim(); });
    }

    var en = src.engine || {};
    if (typeof en.enabled === 'boolean') d.engine.enabled = en.enabled;
    if (typeof en.autoplay === 'boolean') d.engine.autoplay = en.autoplay;
    if (typeof en.volume === 'number') d.engine.volume = Math.max(0, Math.min(100, Math.round(en.volume)));

    if (src.footer) d.footer.text = str(src.footer.text, d.footer.text);
    if (src.security && /^[0-9a-f]{64}$/.test(src.security.hash)) d.security.hash = src.security.hash;
    if (src.botSecurity && /^[0-9a-f]{64}$/.test(src.botSecurity.hash)) d.botSecurity.hash = src.botSecurity.hash;
    return d;
  }

  function readLocal() {
    try {
      var raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  // Ordre de priorité : réglages enregistrés dans ce navigateur > config.json > valeurs par défaut.
  function load() {
    return fetch('config.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; })
      .then(function (remote) {
        var local = readLocal();
        return normalize(local || remote);
      });
  }

  function save(cfg) {
    try {
      localStorage.setItem(KEY, JSON.stringify(cfg));
      return true;
    } catch (e) { return false; }
  }

  function reset() {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  }

  function sha256(text) {
    if (!window.crypto || !crypto.subtle) return Promise.reject(new Error('crypto indisponible'));
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) {
        return b.toString(16).padStart(2, '0');
      }).join('');
    });
  }

  window.Config = {
    DEFAULTS: DEFAULTS,
    clone: clone,
    normalize: normalize,
    load: load,
    save: save,
    reset: reset,
    sha256: sha256
  };
})();
