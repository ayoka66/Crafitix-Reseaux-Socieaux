/* Fond animé : bulles vertes qui flottent et réagissent à la souris. */
(function () {
  'use strict';

  var canvas = document.getElementById('bg');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var GREEN = '34,197,94';
  var LINK_DIST = 125;
  var MOUSE_RADIUS = 170;

  var w = 0, h = 0, dpr = 1;
  var parts = [];
  var mouse = { x: -9999, y: -9999, active: false };
  var par = { x: 0, y: 0, tx: 0, ty: 0 };
  var last = 0;

  // Sprite de halo pré-rendu (beaucoup plus léger que shadowBlur).
  var sprite = document.createElement('canvas');
  sprite.width = sprite.height = 64;
  (function () {
    var s = sprite.getContext('2d');
    var g = s.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(' + GREEN + ',1)');
    g.addColorStop(0.22, 'rgba(' + GREEN + ',0.95)');
    g.addColorStop(0.4, 'rgba(' + GREEN + ',0.28)');
    g.addColorStop(1, 'rgba(' + GREEN + ',0)');
    s.fillStyle = g;
    s.fillRect(0, 0, 64, 64);
  })();

  function rand(a, b) { return a + Math.random() * (b - a); }

  function make() {
    var glow = Math.random() < 0.34;
    var angle = Math.random() * Math.PI * 2;
    var speed = glow ? rand(0.1, 0.26) : rand(0.03, 0.14);
    return {
      x: rand(0, w), y: rand(0, h),
      bx: Math.cos(angle) * speed, by: Math.sin(angle) * speed,
      ox: 0, oy: 0,
      r: glow ? rand(2, 4.4) : rand(0.6, 1.4),
      glow: glow,
      depth: glow ? rand(0.7, 1.4) : rand(0.2, 0.6),
      a: glow ? rand(0.7, 1) : rand(0.22, 0.5),
      // Léger bercement sinusoïdal pour un mouvement plus organique.
      bob: rand(0, Math.PI * 2),
      bobSpeed: rand(0.01, 0.025)
    };
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var target = Math.round(Math.max(70, Math.min(190, (w * h) / 10500)));
    while (parts.length < target) parts.push(make());
    parts.length = target;
  }

  function step(dt) {
    // Parallaxe douce
    par.x += (par.tx - par.x) * 0.06 * dt;
    par.y += (par.ty - par.y) * 0.06 * dt;

    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];

      if (mouse.active) {
        var dx = p.x - mouse.x, dy = p.y - mouse.y;
        if (dx > -MOUSE_RADIUS && dx < MOUSE_RADIUS && dy > -MOUSE_RADIUS && dy < MOUSE_RADIUS) {
          var d2 = dx * dx + dy * dy;
          if (d2 < MOUSE_RADIUS * MOUSE_RADIUS && d2 > 0.01) {
            var d = Math.sqrt(d2);
            var f = Math.pow(1 - d / MOUSE_RADIUS, 2) * 0.5 * dt;
            p.ox += (dx / d) * f;
            p.oy += (dy / d) * f;
          }
        }
      }

      // Amortissement plus doux : la bulle s'éloigne puis revient en glissant, sans à-coup.
      p.ox *= Math.pow(0.965, dt);
      p.oy *= Math.pow(0.965, dt);
      p.bob += p.bobSpeed * dt;
      var wobble = Math.sin(p.bob) * 0.05;
      p.x += (p.bx + p.ox + wobble) * dt;
      p.y += (p.by + p.oy + Math.cos(p.bob * 0.8) * 0.05) * dt;

      var m = 20;
      if (p.x < -m) p.x = w + m; else if (p.x > w + m) p.x = -m;
      if (p.y < -m) p.y = h + m; else if (p.y > h + m) p.y = -m;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    var n = parts.length, i, j, p, q;

    // Liaisons entre bulles proches
    ctx.lineWidth = 1;
    for (i = 0; i < n; i++) {
      p = parts[i];
      var px = p.x + par.x * p.depth, py = p.y + par.y * p.depth;
      for (j = i + 1; j < n; j++) {
        q = parts[j];
        var qx = q.x + par.x * q.depth, qy = q.y + par.y * q.depth;
        var dx = px - qx, dy = py - qy;
        if (dx > LINK_DIST || dx < -LINK_DIST || dy > LINK_DIST || dy < -LINK_DIST) continue;
        var d2 = dx * dx + dy * dy;
        if (d2 < LINK_DIST * LINK_DIST) {
          var al = (1 - Math.sqrt(d2) / LINK_DIST) * 0.1;
          ctx.strokeStyle = 'rgba(' + (p.glow || q.glow ? GREEN : '160,170,165') + ',' + al.toFixed(3) + ')';
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(qx, qy);
          ctx.stroke();
        }
      }

      // Liaison avec le curseur
      if (mouse.active) {
        var mx = px - mouse.x, my = py - mouse.y;
        var md2 = mx * mx + my * my;
        if (md2 < MOUSE_RADIUS * MOUSE_RADIUS * 1.2) {
          var ma = (1 - Math.sqrt(md2) / (MOUSE_RADIUS * 1.1)) * 0.28;
          if (ma > 0) {
            ctx.strokeStyle = 'rgba(' + GREEN + ',' + ma.toFixed(3) + ')';
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        }
      }
    }

    // Bulles
    for (i = 0; i < n; i++) {
      p = parts[i];
      var x = p.x + par.x * p.depth, y = p.y + par.y * p.depth;
      if (p.glow) {
        var s = p.r * 7;
        ctx.globalAlpha = p.a;
        ctx.drawImage(sprite, x - s / 2, y - s / 2, s, s);
      } else {
        ctx.globalAlpha = p.a;
        ctx.fillStyle = '#9aa3a0';
        ctx.beginPath();
        ctx.arc(x, y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function frame(t) {
    var dt = Math.min(3, (t - last) / 16.667 || 1);
    last = t;
    step(reduce ? dt * 0.35 : dt);
    draw();
    requestAnimationFrame(frame);
  }

  function onMove(e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
    par.tx = -(e.clientX / w - 0.5) * 36;
    par.ty = -(e.clientY / h - 0.5) * 36;
  }

  function onLeave() {
    mouse.active = false;
    par.tx = 0;
    par.ty = 0;
  }

  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerdown', onMove, { passive: true });
  window.addEventListener('pointerleave', onLeave);
  window.addEventListener('blur', onLeave);
  document.addEventListener('mouseleave', onLeave);

  resize();
  requestAnimationFrame(frame);
})();
