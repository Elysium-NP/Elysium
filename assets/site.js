/* ELYSIUM — comportement partagé des pages contenu : curseur instrument + révélation au scroll.
   Zéro dépendance. Dégrade proprement (pas de JS = tout visible, curseur natif). */
(function(){
  "use strict";
  var reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;

  // Signale que le JS tourne : la CSS ne masque les .reveal QUE si cette classe est là
  // (sinon échec JS = page blanche). Posée avant tout traitement.
  document.documentElement.classList.add('reveal-ready');

  // ---- révélation au scroll (fade-up) ----
  var items = [].slice.call(document.querySelectorAll('.reveal'));
  if (reduce || !('IntersectionObserver' in window)) {
    items.forEach(function(el){ el.classList.add('in'); });
  } else {
    // seuil 0 (et NON 0.12) : un élément plus haut que l'écran ne peut jamais occuper 12% de sa
    // propre surface dans la fenêtre -> avec 0.12 il ne se révélait JAMAIS (bug CGV, bloc de 10 000px).
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0 });
    items.forEach(function(el){ io.observe(el); });
  }

  // ---- trait néon qui se trace sous chaque en-tête de section (signature Elysium) ----
  var NS = 'http://www.w3.org/2000/svg';
  document.querySelectorAll('.sec-head').forEach(function(sh){
    var h2 = sh.querySelector('h2');
    var host = h2 ? h2.parentNode : sh;
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'trace'); svg.setAttribute('viewBox', '0 0 170 20'); svg.setAttribute('aria-hidden', 'true');
    var path = document.createElementNS(NS, 'path');
    path.setAttribute('d', 'M2 14 H120 l16 -9'); path.setAttribute('pathLength', '1');   // ligne + tick vers le haut (« lecture »)
    var node = document.createElementNS(NS, 'circle');
    node.setAttribute('class', 'tnode'); node.setAttribute('cx', '136'); node.setAttribute('cy', '5'); node.setAttribute('r', '2.4');
    svg.appendChild(path); svg.appendChild(node); host.appendChild(svg);
  });

  // ---- champ de télémétrie du hero (grille de points instrument, réagit au curseur) ----
  (function(){
    var cv = document.querySelector('.phead .pfield');
    if (!cv) return;
    var host = cv.closest('.phead') || cv.parentElement;
    var ctx = cv.getContext('2d');
    var DPR = Math.min(window.devicePixelRatio || 1, 2), W = 0, H = 0, gap = 26, cols = 0, rows = 0;
    var mx = -999, my = -999, visible = true;
    function resize(){
      var r = host.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      cv.width = W * DPR; cv.height = H * DPR; cv.style.width = W + 'px'; cv.style.height = H + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      gap = W < 640 ? 30 : 26;                 // moins dense sur mobile
      cols = Math.ceil(W / gap) + 1; rows = Math.ceil(H / gap) + 1;
    }
    resize(); addEventListener('resize', resize, { passive:true });
    host.addEventListener('pointermove', function(e){ var r = host.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; }, { passive:true });
    host.addEventListener('pointerleave', function(){ mx = -999; my = -999; });
    function draw(t){
      var time = t * 0.001;
      ctx.clearRect(0, 0, W, H);
      for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) {
        var x = i * gap, y = j * gap;
        var wave = Math.sin(x * 0.013 + y * 0.010 + time * 0.95) * 0.5 + 0.5;
        var dx = x - mx, dy = y - my, d = Math.sqrt(dx*dx + dy*dy), near = Math.max(0, 1 - d / 170);
        var a = 0.045 + wave * 0.10 + near * 0.55;
        var rad = 0.7 + wave * 0.55 + near * 2.4;
        ctx.beginPath(); ctx.arc(x, y, rad, 0, 6.2832);
        ctx.fillStyle = 'rgba(46,155,255,' + a.toFixed(3) + ')'; ctx.fill();
      }
    }
    if (reduce) { draw(0); }
    else {
      (function loop(t){ if (visible) draw(t); requestAnimationFrame(loop); })(0);
      if ('IntersectionObserver' in window)
        new IntersectionObserver(function(es){ visible = es[0].isIntersecting; }).observe(host);
    }
  })();

  // ---- boutons magnétiques (le CTA suit légèrement le curseur, comme la landing) ----
  if (!reduce && matchMedia('(hover:hover) and (pointer:fine)').matches) {
    document.querySelectorAll('.btn').forEach(function(b){
      b.addEventListener('pointermove', function(e){
        var r = b.getBoundingClientRect();
        b.style.transform = 'translate(' + ((e.clientX - r.left - r.width/2) * 0.3).toFixed(1) + 'px,'
                                         + ((e.clientY - r.top - r.height/2) * 0.45).toFixed(1) + 'px)';
      }, { passive:true });
      b.addEventListener('pointerleave', function(){ b.style.transform = ''; });
    });
  }

  // ---- menu mobile (hamburger -> panneau plein écran) ----
  var burger = document.querySelector('.burger'), sheet = document.querySelector('.msheet');
  if (burger && sheet) {
    var setOpen = function(on){
      burger.setAttribute('aria-expanded', on ? 'true' : 'false');
      sheet.classList.toggle('open', on);
      document.body.style.overflow = on ? 'hidden' : '';   // verrouille le scroll de fond
    };
    burger.addEventListener('click', function(){
      setOpen(burger.getAttribute('aria-expanded') !== 'true');
    });
    sheet.addEventListener('click', function(e){ if (e.target.closest('a')) setOpen(false); });
    addEventListener('keydown', function(e){ if (e.key === 'Escape') setOpen(false); });
  }

  // ---- nav consciente de la connexion (maquette localStorage) : si un compte est ouvert,
  //      le CTA « Connexion » devient « Mon espace » -> espace.html (sinon, revenir à l'espace
  //      obligeait à repasser par le login). Remplacé par Supabase Auth en phase suivante. ----
  try {
    var _u = JSON.parse(localStorage.getItem('ely_user_demo') || 'null');
    if (_u) {
      document.querySelectorAll('a.go, a.go-m').forEach(function(a){
        if (!/connexion/i.test(a.getAttribute('href') || '')) return;   // clean URLs (Cloudflare Pages) : connexion.html -> /connexion
        a.setAttribute('href', 'espace.html');
        var s = a.querySelector('.mnum'); a.textContent = ''; if (s) a.appendChild(s);
        a.appendChild(document.createTextNode('Mon espace'));
      });
      // déjà connecté : les CTA d'inscription ne renvoient plus vers l'inscription.
      // Payé -> espace membre ; PAS encore payé -> choix de la formule (sinon impasse : « je ne peux plus choisir »).
      var _dest = _u.paid ? 'espace.html' : 'choisir.html';
      var _lbl  = _u.paid ? 'Accéder à mon espace' : 'Choisir ma formule';
      document.querySelectorAll('a.btn[href*="inscription"]').forEach(function(a){
        a.setAttribute('href', _dest);
        a.textContent = _lbl;
      });
    }
  } catch (e) {}

  // ---- curseur instrument (viseur) : point instantané + anneau qui suit en douceur ----
  var fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  var cur = document.querySelector('.cur'), dot = document.querySelector('.curdot');
  if (fine && cur && dot) {
    var mx = innerWidth/2, my = innerHeight/2, cx = mx, cy = my, raf;
    addEventListener('mousemove', function(e){
      mx = e.clientX; my = e.clientY;
      dot.style.transform = 'translate(' + mx + 'px,' + my + 'px)';
    }, { passive:true });
    (function loop(){ cx += (mx-cx)*0.2; cy += (my-cy)*0.2;
      cur.style.transform = 'translate(' + cx + 'px,' + cy + 'px)';
      raf = requestAnimationFrame(loop); })();
    document.querySelectorAll('a,button,summary,.btn,.link').forEach(function(el){
      el.addEventListener('mouseenter', function(){ cur.classList.add('hot'); });
      el.addEventListener('mouseleave', function(){ cur.classList.remove('hot'); });
    });
  }

  // ---- FIGURES : le nombre monte quand la section entre (méthode + coachs) — no-op ailleurs ----
  (function(){
    var host = document.querySelector('.figures'); if (!host) return;
    var red = matchMedia('(prefers-reduced-motion:reduce)').matches;
    var jobs = [].slice.call(host.querySelectorAll('.v')).map(function(v){
      var tn = v.firstChild; if (!tn || tn.nodeType !== 3) return null;
      var m = tn.textContent.match(/^(\D*)(\d+)(.*)$/); if (!m) return null;
      return { tn: tn, pre: m[1], tgt: +m[2], suf: m[3] };
    }).filter(Boolean);
    if (!jobs.length) return;
    function run(j){
      if (red || j.tgt <= 2){ j.tn.textContent = j.pre + j.tgt + j.suf; return; }  // 0/1/2 : pas d'anim
      var t0 = null, dur = 1400;
      function step(ts){ if (!t0) t0 = ts; var p = Math.min(1, (ts - t0) / dur);
        j.tn.textContent = j.pre + Math.round(j.tgt * (1 - Math.pow(1 - p, 3))) + j.suf;
        if (p < 1) requestAnimationFrame(step); }
      requestAnimationFrame(step);
      setTimeout(function(){ j.tn.textContent = j.pre + j.tgt + j.suf; }, dur + 300);  // fallback garanti
    }
    function go(){ jobs.forEach(run); }
    if ('IntersectionObserver' in window){
      var io = new IntersectionObserver(function(es){ if (es[0].isIntersecting){ go(); io.disconnect(); } }, { threshold: 0.4 });
      io.observe(host);
    } else go();
  })();
})();
