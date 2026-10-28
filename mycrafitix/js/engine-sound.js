/* Bruit de moteur en fond, synthétisé avec Web Audio (aucun fichier audio
   externe, donc aucun extrait de jeu protégé n'est utilisé). Lecture, pause
   et coupure du son, plus un réglage de volume, en bas à gauche du site. */
(function () {
  'use strict';

  var KEY = 'mycrafitix:engine:v1';
  var ctxA = null, nodes = null, running = false, muted = false, volume = 0.55;

  var btn = document.getElementById('engine-toggle');
  var muteBtn = document.getElementById('engine-mute');
  var vol = document.getElementById('engine-vol');
  var wrap = document.getElementById('engine');
  if (!btn || !wrap) return;

  function readLocal() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; }
  }
  function writeLocal() {
    try { localStorage.setItem(KEY, JSON.stringify({ muted: muted, volume: volume })); } catch (e) { /* ignore */ }
  }

  // Construit le moteur sonore : un bourdonnage grave (fondamentale + harmoniques
  // façon moteur à combustion) plus un souffle d'air filtré, et une légère
  // oscillation aléatoire du régime pour que ça ne tourne jamais "en boucle".
  function build() {
    var ac = new (window.AudioContext || window.webkitAudioContext)();
    var master = ac.createGain();
    master.gain.value = 0;
    master.connect(ac.destination);

    var rpm = ac.createGain(); // porte le "régime" par le detune des oscillateurs
    var base = 46; // Hz, grave comme un ralenti V8

    function osc(type, mul, g) {
      var o = ac.createOscillator();
      o.type = type;
      o.frequency.value = base * mul;
      var gn = ac.createGain();
      gn.gain.value = g;
      o.connect(gn);
      gn.connect(master);
      o.start();
      return o;
    }

    var o1 = osc('sawtooth', 1, 0.5);
    var o2 = osc('square', 2, 0.22);
    var o3 = osc('sawtooth', 3.98, 0.12);

    // Souffle d'air : bruit blanc filtré en passe-bande, mélangé bas.
    var bufSize = 2 * ac.sampleRate;
    var buf = ac.createBuffer(1, bufSize, ac.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    var noise = ac.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    var bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 180;
    bp.Q.value = 0.7;
    var noiseGain = ac.createGain();
    noiseGain.gain.value = 0.16;
    noise.connect(bp);
    bp.connect(noiseGain);
    noiseGain.connect(master);
    noise.start();

    var lowpass = ac.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 900;
    master.disconnect();
    master.connect(lowpass);
    lowpass.connect(ac.destination);

    // Variation lente et aléatoire du régime, comme un ralenti qui respire.
    var lfo = ac.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.18;
    var lfoGain = ac.createGain();
    lfoGain.gain.value = 5;
    lfo.connect(lfoGain);
    [o1, o2, o3].forEach(function (o) { lfoGain.connect(o.detune); });
    lfo.start();

    var tick = setInterval(function () {
      var jitter = (Math.random() - 0.5) * 10;
      [o1, o2, o3].forEach(function (o) {
        o.detune.setTargetAtTime(jitter, ac.currentTime, 1.2);
      });
    }, 1800);

    return { ac: ac, master: master, stopTimer: function () { clearInterval(tick); } };
  }

  function ensure() {
    if (ctxA) return Promise.resolve();
    nodes = build();
    ctxA = nodes.ac;
    return Promise.resolve();
  }

  function applyGain() {
    if (!nodes) return;
    var g = muted ? 0 : volume * 0.22; // 0.22 = plafond raisonnable, c'est un fond sonore
    nodes.master.gain.setTargetAtTime(running ? g : 0, ctxA.currentTime, 0.25);
  }

  function setRunning(on) {
    running = on;
    btn.setAttribute('aria-pressed', String(on));
    btn.querySelector('.ic-play').hidden = on;
    btn.querySelector('.ic-pause').hidden = !on;
    btn.setAttribute('aria-label', on ? 'Mettre en pause le moteur' : 'Lancer le son du moteur');
    if (on) {
      ensure().then(function () {
        if (ctxA.state === 'suspended') ctxA.resume();
        applyGain();
      });
    } else if (ctxA) {
      applyGain();
    }
  }

  function setMuted(on) {
    muted = on;
    muteBtn.setAttribute('aria-pressed', String(on));
    muteBtn.querySelector('.ic-snd').hidden = on;
    muteBtn.querySelector('.ic-mute').hidden = !on;
    muteBtn.setAttribute('aria-label', on ? 'Réactiver le son' : 'Couper le son');
    applyGain();
    writeLocal();
  }

  btn.addEventListener('click', function () { setRunning(!running); writeLocal(); });
  muteBtn.addEventListener('click', function () { setMuted(!muted); });
  vol.addEventListener('input', function () {
    volume = Number(vol.value) / 100;
    applyGain();
    writeLocal();
  });

  // Restaure les préférences de ce navigateur (jamais de lecture auto sans geste,
  // les navigateurs la bloquent de toute façon tant qu'on n'a pas interagi).
  var saved = readLocal();
  document.addEventListener('app:ready', function () {
    var cfg = (window.App && window.App.config && window.App.config.engine) || {};
    if (cfg.enabled === false) { wrap.hidden = true; return; }
    if (typeof saved.volume !== 'number' && typeof cfg.volume === 'number') {
      volume = Math.max(0, Math.min(1, cfg.volume / 100));
    }
    vol.value = String(Math.round(volume * 100));
  }, { once: true });

  if (typeof saved.volume === 'number') { volume = Math.max(0, Math.min(1, saved.volume)); vol.value = String(Math.round(volume * 100)); }
  if (typeof saved.muted === 'boolean') setMuted(saved.muted);

  document.addEventListener('visibilitychange', function () {
    if (document.hidden && ctxA && ctxA.state === 'running') ctxA.suspend();
    else if (!document.hidden && running && ctxA && ctxA.state === 'suspended') ctxA.resume();
  });

  window.EngineSound = {
    setRunning: setRunning,
    isRunning: function () { return running; }
  };
})();
