/* ELYSIUM — comportement partagé des pages contenu : curseur instrument + révélation au scroll.
   Zéro dépendance. Dégrade proprement (pas de JS = tout visible, curseur natif). */
// PRIX DE L'E-BOOK « Bien manger, au gramme près » : UNE seule valeur pour tout le site
// (valeur offerte avec la Formule Elysium + achat à l'unité). À changer ici, et dans supabase/boutique.sql
// (produits.prix_cents) pour le montant réellement encaissé par Stripe.
window.ELY_PRIX_EBOOK = '14,90 €';
(function(){
  "use strict";
  // valeur de l'e-book offert, partout où la page la demande (<span class="valeur-ebook">)
  document.querySelectorAll('.valeur-ebook').forEach(function(e){ e.textContent='(valeur '+window.ELY_PRIX_EBOOK+')'; });
  // iOS n'applique :active au toucher que si la page écoute les touchers (cartes de formule)
  document.addEventListener('touchstart', function(){}, { passive:true });
  var reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;

  // MAQUETTE DU STYLE « COMME UNE APPLI CONNUE » SUR LA VITRINE (lot 2, à valider) : ?style=appli l'allume, ?style=site
  // l'éteint ; retenu pendant la visite (sessionStorage). Sans le paramètre, le site public ne change pas.
  try{
    var stl=/[?&]style=(appli|site)(?:&|#|$)/.exec(location.search); if(stl) sessionStorage.setItem('ely_style',stl[1]);
    if(sessionStorage.getItem('ely_style')==='appli'&&!document.body.classList.contains('membre')){
      document.body.classList.add('membre','apercu-appli');
      var ab=document.createElement('div'); ab.className='apercu-bandeau';
      ab.innerHTML='Aperçu du nouveau style, pour validation. <a href="?style=site">Revenir au site actuel</a>';
      document.body.appendChild(ab);
      // la maquette poussée (feuille et script dédiés, chargés seulement ici)
      var lk=document.createElement('link'); lk.rel='stylesheet'; lk.href='assets/apercu-appli.css?v=3'; document.head.appendChild(lk);
      var sc=document.createElement('script'); sc.src='assets/apercu-appli.js?v=1'; document.body.appendChild(sc);
    }
  }catch(e){}

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

  // ---- CLAIR / OBSCUR (Dimitri 27/09) : bouton dans le menu (ou l'en-tête des pages membre).
  //      Le choix est retenu (localStorage ely_theme) et posé dès le <head> de chaque page (pas de flash). ----
  (function(){
    var html=document.documentElement;
    var LUNE='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/></svg>';
    var SOLEIL='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/></svg>';
    function obscur(){ return html.getAttribute('data-theme')==='obscur'; }
    var btns=[];
    function maj(){ btns.forEach(function(b){ var o=obscur();
      b.innerHTML=(o?SOLEIL:LUNE)+(b.dataset.lbl?'<span>'+(o?'Version claire':'Version obscure')+'</span>':'');
      b.setAttribute('aria-label',o?'Passer en version claire':'Passer en version obscure'); b.title=b.getAttribute('aria-label'); }); }
    function bouton(parent,avant,lbl){ if(!parent) return; var b=document.createElement('button'); b.type='button'; b.className='theme-btn';
      if(lbl) b.dataset.lbl='1'; parent.insertBefore(b,avant||null); btns.push(b);
      b.addEventListener('click',function(){ var o=!obscur(); if(o) html.setAttribute('data-theme','obscur'); else html.removeAttribute('data-theme');
        try{ localStorage.setItem('ely_theme',o?'obscur':'clair'); }catch(e){} maj(); }); }
    var nav=document.querySelector('nav.menu');
    if(nav) bouton(nav, nav.querySelector('a.go'));
    bouton(document.querySelector('.msheet'),null,true);
    var q=document.querySelector('.qtop'); if(q) bouton(q,null);
    var c=document.querySelector('.chead .who'); if(c) bouton(c,c.firstChild);
    maj();
  })();

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
      // PASTILLE « messages non lus » (Dimitri 27/09) : réponses des coachs pas encore lues.
      // Requête directe à la base avec la session déjà ouverte (les pages vitrine ne chargent pas
      // la bibliothèque Supabase). Le RLS ne renvoie que les messages de CE client.
      // ponytail: session expirée = pas de pastille jusqu'à la prochaine visite de l'espace (qui la renouvelle)
      (function(){
        var SB='https://xchahmcflineiupqmges.supabase.co', KEY='sb_publishable_CBtiKYoE1OKZ5ag_wGvmtQ_rRCzaV2p';
        var ses; try{ ses=JSON.parse(localStorage.getItem('sb-xchahmcflineiupqmges-auth-token')||'null'); }catch(e){}
        if(!ses||!ses.access_token||!ses.user||(ses.expires_at&&ses.expires_at*1000<Date.now())) return;
        var id=ses.user.id;
        fetch(SB+'/rest/v1/messages?select=id&client_id=eq.'+id+'&auteur_id=neq.'+id+'&lu_at=is.null',
          {headers:{apikey:KEY,Authorization:'Bearer '+ses.access_token}})
          .then(function(r){ return r.ok?r.json():[]; }).then(function(l){
            var n=(l||[]).length; if(!n) return;
            var titre=n+(n>1?' nouveaux messages':' nouveau message')+' de tes coachs';
            document.querySelectorAll('a.go, a.go-m, .burger').forEach(function(el){
              if(el.tagName==='A'&&!/espace/.test(el.getAttribute('href')||'')) return;
              var b=document.createElement('b'); b.className='pastille';   // <b> : les <span> du burger sont ses barres b.textContent=n; b.title=titre;
              b.setAttribute('aria-label',titre); el.appendChild(b);
            });
          }).catch(function(){});
      })();
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

  // ---- CHIFFRES : le nombre monte de 0 à sa valeur au premier passage à l'écran, sur TOUTES
  //      les pages (.figures, .rstat). Gère « −39 kg », « +15,6 kg », « 500+ ».
  (function(){
    var red = matchMedia('(prefers-reduced-motion:reduce)').matches;
    [].slice.call(document.querySelectorAll('.figures .v, .rstat .v')).forEach(function(v){
      var tn = v.firstChild; if (!tn || tn.nodeType !== 3) return;
      var m = tn.textContent.match(/^(\D*?)(\d+)(?:,(\d+))?(\D*)$/); if (!m) return;
      var dec = m[3] ? m[3].length : 0, tgt = parseFloat(m[2] + '.' + (m[3] || 0)), fin = tn.textContent;
      if (red || tgt <= 2) return;                                  // 0/1/2 : pas d'anim
      function aff(x){ tn.textContent = m[1] + x.toFixed(dec).replace('.', ',') + m[4]; }
      function run(){ var t0 = null, dur = 1400;
        (function step(ts){ if (!t0) t0 = ts; var p = Math.min(1, (ts - t0) / dur);
          aff(tgt * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); else tn.textContent = fin; })(performance.now());
        setTimeout(function(){ tn.textContent = fin; }, dur + 300); }  // filet garanti
      if (!('IntersectionObserver' in window)) return;
      aff(0);
      var io = new IntersectionObserver(function(es){ if (es[0].isIntersecting){ io.disconnect(); run(); } }, { threshold: 0.4 });
      io.observe(v);
    });
  })();

  // ---- logo : les arcs se re-dessinent au survol ET au clic (on retrouve le plaisir du chargement) ----
  //      Web Animations API : animation NEUVE à chaque fois -> repart systématiquement, sans collision de noms.
  if (!reduce) {
    var elgRedraw = function(l){
      l.querySelectorAll('.elg-ring path').forEach(function(p){
        p.animate([
          { strokeDashoffset: '335', filter: 'drop-shadow(0 0 0 rgba(46,155,255,0)) drop-shadow(0 0 0 rgba(46,155,255,0)) drop-shadow(0 0 0 rgba(46,155,255,0))' },
          { filter: 'drop-shadow(0 0 4px #2E9BFF) drop-shadow(0 0 16px #2E9BFF) drop-shadow(0 0 34px rgba(46,155,255,.9))', offset: .55 },
          { strokeDashoffset: '0', filter: 'drop-shadow(0 0 3px #2E9BFF) drop-shadow(0 0 12px #2E9BFF) drop-shadow(0 0 26px rgba(46,155,255,.8))' }
        ], { duration: 1000, easing: 'cubic-bezier(.5,.05,.15,1)' });
      });
    };
    document.querySelectorAll('.logo').forEach(function(l){
      l.addEventListener('mouseenter', function(){ elgRedraw(l); });
      l.addEventListener('click', function(){ elgRedraw(l); });
    });
  }
})();

/* TRANSITIONS entre pages (voir site.css) : arrivée après le premier affichage ; sortie 0,3 s au
   clic sur un lien interne, vers l'adresse FINALE (sans le détour de la redirection .html). */
(function(){
  var html=document.documentElement;
  function arrive(){ requestAnimationFrame(function(){ requestAnimationFrame(function(){ html.classList.add('arrive'); }); }); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',arrive,{once:true}); else arrive();
  addEventListener('pageshow',function(e){ if(e.persisted){ html.classList.remove('page-sort'); html.classList.add('arrive'); } });   // retour arrière
  if(matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('a[href]');
    if(!a||e.defaultPrevented||e.button||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||(a.target&&a.target!=='_self')||a.hasAttribute('download')) return;
    var u=new URL(a.href,location.href);
    if(u.origin!==location.origin||u.protocol==='file:'||(u.pathname===location.pathname&&u.search===location.search)) return;
    e.preventDefault(); html.classList.add('page-sort');
    var cible=u.pathname.replace(/\/index\.html$/,'/').replace(/\.html$/,'')+u.search+u.hash;   // /methode.html -> /methode
    setTimeout(function(){ location.href=cible; },760);   // le rideau est fermé : on change de page
  });
})();
